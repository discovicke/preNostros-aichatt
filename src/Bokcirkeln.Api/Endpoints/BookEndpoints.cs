using Bokcirkeln.Api.Data;
using Bokcirkeln.Api.Dtos;
using Bokcirkeln.Api.Models;
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
        group.MapGet("/{id:guid}/notes", ListNotes);
        group.MapPost("/{id:guid}/notes", CreateNote).AddEndpointFilter<ValidationFilter<CreateNoteRequest>>();

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
        List<Book> books = await db.Books.OrderByDescending(b => b.CreatedAt).ToListAsync(ct);
        return TypedResults.Ok(books.Select(Map).ToList());
    }

    /// <summary>Hämtar en enskild bok.</summary>
    private static async Task<Results<Ok<BookResponse>, NotFound>> GetById(Guid id, AppDbContext db, CancellationToken ct)
    {
        Book? book = await db.Books.FirstOrDefaultAsync(b => b.Id == id, ct);
        return book is null 
            ? TypedResults.NotFound() 
            : TypedResults.Ok(Map(book));
    }

    /// <summary>Hämtar alla anteckningar för en bok.</summary>
    private static async Task<Results<Ok<List<NoteResponse>>, NotFound>> ListNotes(Guid id, AppDbContext db, CancellationToken ct)
    {
        if (!await db.Books.AnyAsync(b => b.Id == id, ct))
            return TypedResults.NotFound();

        List<Note> notes = await db.Notes
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

        if (request.Kind == NoteKind.Betyg && request.Rating is null)
            return TypedResults.BadRequest("Betyg kräver ett Rating-värde 1–5.");

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

    /// <summary>Mappar en bok till API-format.</summary>
    private static BookResponse Map(Book b)
        => new(b.Id, b.Title, b.Author, b.CreatedAt);

    /// <summary>Mappar en anteckning till API-format.</summary>
    private static NoteResponse Map(Note n)
        => new(n.Id, n.Kind, n.Content, n.Rating, n.ConversationId, n.CreatedAt);
}
