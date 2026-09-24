using System.ClientModel;
using Bokcirkeln.Api.Data;
using Bokcirkeln.Api.Dtos;
using Bokcirkeln.Api.Models;
using Bokcirkeln.Api.Services;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.EntityFrameworkCore;

namespace Bokcirkeln.Api.Endpoints;

/// <summary>Böcker och deras sparade anteckningar.</summary>
public static class BookEndpoints
{
    /// <summary>Mappar bok-endpointsen under /api/books.</summary>
    public static RouteGroupBuilder MapBookEndpoints(this IEndpointRouteBuilder routes)
    {
        RouteGroupBuilder group = routes.MapGroup("/api/books").WithTags("Books");

        group.MapPost("/", Create).AddEndpointFilter<ValidationFilter<CreateBookRequest>>();
        group.MapGet("/", List);
        group.MapGet("/{id:guid}", GetById);
        group.MapDelete("/{id:guid}", DeleteBook);
        group.MapPut("/{id:guid}", Update).AddEndpointFilter<ValidationFilter<UpdateBookRequest>>();
        group.MapPut("/{id:guid}/rating", UpdateRating).AddEndpointFilter<ValidationFilter<UpdateBookRatingRequest>>();
        group.MapGet("/{id:guid}/summary", GetSummary);
        group.MapGet("/{id:guid}/notes", ListNotes);
        group.MapPost("/{id:guid}/notes", CreateNote).AddEndpointFilter<ValidationFilter<CreateNoteRequest>>();
        group.MapPut("/{bookId:guid}/notes/{noteId:guid}", UpdateNote).AddEndpointFilter<ValidationFilter<UpdateNoteRequest>>();
        group.MapDelete("/{bookId:guid}/notes/{noteId:guid}", DeleteNote);

        return group;
    }

    /// <summary>Skapar en ny bok.</summary>
    private static async Task<Created<BookResponse>> Create(CreateBookRequest request, AppDbContext db, CancellationToken ct)
    {
        var book = new Book { Title = request.Title, Author = request.Author };
        db.Books.Add(book);
        await db.SaveChangesAsync(ct);
        return TypedResults.Created($"/api/books/{book.Id}", Map(book));
    }

    /// <summary>Hämtar alla böcker, nyaste först.</summary>
    private static async Task<Ok<List<BookResponse>>> List(AppDbContext db, CancellationToken ct)
    {
        var books = await db.Books.OrderByDescending(b => b.CreatedAt).ToListAsync(ct);
        return TypedResults.Ok(books.Select(Map).ToList());
    }

    /// <summary>Hämtar en enskild bok.</summary>
    private static async Task<Results<Ok<BookResponse>, NotFound>> GetById(Guid id, AppDbContext db, CancellationToken ct)
    {
        var book = await db.Books.FirstOrDefaultAsync(b => b.Id == id, ct);
        return book is null 
            ? TypedResults.NotFound() 
            : TypedResults.Ok(Map(book));
    }

    /// <summary>Uppdaterar titel och författare på en bok.</summary>
    private static async Task<Results<Ok<BookResponse>, NotFound>> Update(Guid id, UpdateBookRequest request, AppDbContext db, CancellationToken ct)
    {
        var book = await db.Books.FirstOrDefaultAsync(b => b.Id == id, ct);
        if (book is null)
            return TypedResults.NotFound();

        book.Title = request.Title;
        book.Author = request.Author;
        await db.SaveChangesAsync(ct);
        return TypedResults.Ok(Map(book));
    }

    /// <summary>Sätter eller rensar bokens betyg (1–5 eller null).</summary>
    private static async Task<Results<Ok<BookResponse>, NotFound>> UpdateRating(Guid id, UpdateBookRatingRequest request, AppDbContext db, CancellationToken ct)
    {
        var book = await db.Books.FirstOrDefaultAsync(b => b.Id == id, ct);
        if (book is null)
            return TypedResults.NotFound();

        book.Rating = request.Rating;
        book.RatingMotivation = string.IsNullOrWhiteSpace(request.Motivation) 
            ? null 
            : request.Motivation;
        await db.SaveChangesAsync(ct);
        return TypedResults.Ok(Map(book));
    }

    /// <summary>Hämtar en AI-sammanfattning av vad boken handlar om.</summary>
    private static async Task<Results<Ok<BookSummaryResponse>, NotFound, ProblemHttpResult>> GetSummary(
        Guid id, AppDbContext db, ChatService chat, CancellationToken ct)
    {
        if (!await db.Books.AnyAsync(b => b.Id == id, ct))
            return TypedResults.NotFound();

        try
        {
            var summary = await chat.GetBookSummaryAsync(id, ct);
            return TypedResults.Ok(new BookSummaryResponse(summary));
        }
        catch (ClientResultException ex)
        {
            return TypedResults.Problem(
                detail: $"AI-tjänsten svarade {ex.Status}: {ex.Message}",
                statusCode: StatusCodes.Status502BadGateway);
        }
    }

    /// <summary>Hämtar alla anteckningar för en bok.</summary>
    private static async Task<Results<Ok<List<NoteResponse>>, NotFound>> ListNotes(Guid id, AppDbContext db, CancellationToken ct)
    {
        if (!await db.Books.AnyAsync(b => b.Id == id, ct))
            return TypedResults.NotFound();

        var notes = await db.Notes
            .Where(n => n.BookId == id)
            .OrderByDescending(n => n.CreatedAt)
            .ToListAsync(ct);
        return TypedResults.Ok(notes.Select(Map).ToList());
    }

    /// <summary>Sparar en anteckning (citat, tanke, analys eller betyg) om en bok.</summary>
    private static async Task<Results<Created<NoteResponse>, NotFound, BadRequest<string>>> CreateNote(
        Guid id, CreateNoteRequest request, AppDbContext db, CancellationToken ct)
    {
        if (!await db.Books.AnyAsync(b => b.Id == id, ct))
            return TypedResults.NotFound();

        if (ValidateNote(request.Kind, request.Content, request.Rating) is string error)
            return TypedResults.BadRequest(error);

        var note = new Note
        {
            BookId = id,
            ConversationId = request.ConversationId,
            Kind = request.Kind,
            Content = request.Content,
            Rating = request.Rating
        };
        db.Notes.Add(note);
        await db.SaveChangesAsync(ct);
        return TypedResults.Created($"/api/books/{id}/notes/{note.Id}", Map(note));
    }

    /// <summary>Raderar en bok med samtal, meddelanden och anteckningar (cascade).</summary>
    private static async Task<Results<NoContent, NotFound>> DeleteBook(Guid id, AppDbContext db, CancellationToken ct)
    {
        var book = await db.Books.FirstOrDefaultAsync(b => b.Id == id, ct);
        if (book is null)
            return TypedResults.NotFound();

        db.Books.Remove(book);
        await db.SaveChangesAsync(ct);
        return TypedResults.NoContent();
    }

    /// <summary>Uppdaterar innehåll och/eller betyg på en anteckning (samma regler som vid skapande).</summary>
    private static async Task<Results<Ok<NoteResponse>, NotFound, BadRequest<string>>> UpdateNote(
        Guid bookId, Guid noteId, UpdateNoteRequest request, AppDbContext db, CancellationToken ct)
    {
        var note = await db.Notes.FirstOrDefaultAsync(n => n.Id == noteId && n.BookId == bookId, ct);
        if (note is null)
            return TypedResults.NotFound();

        if (ValidateNote(note.Kind, request.Content, request.Rating) is string error)
            return TypedResults.BadRequest(error);

        note.Content = string.IsNullOrWhiteSpace(request.Content) ? null : request.Content;
        note.Rating = request.Rating;
        await db.SaveChangesAsync(ct);
        return TypedResults.Ok(Map(note));
    }

    /// <summary>Raderar en anteckning.</summary>
    private static async Task<Results<NoContent, NotFound>> DeleteNote(Guid bookId, Guid noteId, AppDbContext db, CancellationToken ct)
    {
        var note = await db.Notes.FirstOrDefaultAsync(n => n.Id == noteId && n.BookId == bookId, ct);
        if (note is null)
            return TypedResults.NotFound();

        db.Notes.Remove(note);
        await db.SaveChangesAsync(ct);
        return TypedResults.NoContent();
    }

    /// <summary>Validerar note-reglerna. Returnerar felmeddelande eller null.</summary>
    private static string? ValidateNote(NoteKind kind, string? content, int? rating)
    {
        if (kind != NoteKind.Betyg && rating.HasValue)
            return "Rating är endast giltigt för Betyg.";
        if (kind != NoteKind.Betyg && string.IsNullOrWhiteSpace(content))
            return "Content krävs för Citat, Tanke och Analys.";
        return null;
    }

    /// <summary>Mappar en bok till API-format.</summary>
    private static BookResponse Map(Book b)
        => new(b.Id, b.Title, b.Author, b.Rating, b.RatingMotivation, b.Summary, b.CreatedAt);

    /// <summary>Mappar en anteckning till API-format.</summary>
    private static NoteResponse Map(Note n)
        => new(n.Id, n.Kind, n.Content, n.Rating, n.ConversationId, n.CreatedAt);
}
