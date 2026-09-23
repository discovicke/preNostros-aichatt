using System.ClientModel;
using Bokcirkeln.Api.Data;
using Bokcirkeln.Api.Dtos;
using Bokcirkeln.Api.Models;
using Bokcirkeln.Api.Services;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.EntityFrameworkCore;

namespace Bokcirkeln.Api.Endpoints;

/// <summary>Samtal och chattmeddelanden.</summary>
public static class ConversationEndpoints
{
    /// <summary>Mappar samtals-endpointsen under /api/conversations.</summary>
    public static RouteGroupBuilder MapConversationEndpoints(this IEndpointRouteBuilder routes)
    {
        var group = routes.MapGroup("/api/conversations").WithTags("Conversations");

        group.MapPost("/", Create).AddEndpointFilter<ValidationFilter<CreateConversationRequest>>();
        group.MapGet("/", List);
        group.MapGet("/{id:guid}", GetById);
        group.MapPost("/{id:guid}/messages", SendMessage).AddEndpointFilter<ValidationFilter<SendMessageRequest>>();

        return group;
    }

    /// <summary>Skapar ett nytt samtal, valfritt kopplat till en bok.</summary>
    private static async Task<Created<ConversationResponse>> Create(CreateConversationRequest request, AppDbContext db, CancellationToken ct)
    {
        var conversation = new Conversation { Title = request.Title, BookId = request.BookId };
        db.Conversations.Add(conversation);
        await db.SaveChangesAsync(ct);
        return TypedResults.Created($"/api/conversations/{conversation.Id}", Map(conversation));
    }

    /// <summary>Hämtar alla samtal, nyaste först. Filtrera med ?bookId=.</summary>
    private static async Task<Ok<List<ConversationResponse>>> List(AppDbContext db, Guid? bookId, CancellationToken ct)
    {
        var conversations = await db.Conversations
            .Where(c => bookId == null || c.BookId == bookId)
            .OrderByDescending(c => c.CreatedAt)
            .ToListAsync(ct);
        return TypedResults.Ok(conversations.Select(Map).ToList());
    }

    /// <summary>Hämtar ett samtal med alla meddelanden.</summary>
    private static async Task<Results<Ok<ConversationDetailResponse>, NotFound>> GetById(Guid id, AppDbContext db, CancellationToken ct)
    {
        var conversation = await db.Conversations
            .Include(c => c.Messages)
            .FirstOrDefaultAsync(c => c.Id == id, ct);
        if (conversation is null)
            return TypedResults.NotFound();

        return TypedResults.Ok(new ConversationDetailResponse(
            conversation.Id,
            conversation.Title,
            conversation.BookId,
            conversation.CreatedAt,
            conversation.Messages.OrderBy(m => m.CreatedAt).Select(Map).ToList()));
    }

    /// <summary>Skickar ett meddelande och får bokcirkelsledarens svar.</summary>
    private static async Task<Results<Ok<SendMessageResponse>, NotFound, ProblemHttpResult>> SendMessage(
        Guid id, SendMessageRequest request, ChatService chat, CancellationToken ct)
    {
        try
        {
            var reply = await chat.SendMessageAsync(id, request.Content, ct);
            return TypedResults.Ok(new SendMessageResponse(reply));
        }
        catch (KeyNotFoundException)
        {
            return TypedResults.NotFound();
        }
        catch (ClientResultException ex)
        {
            return TypedResults.Problem(
                detail: $"AI-tjänsten svarade {ex.Status}: {ex.Message}",
                statusCode: StatusCodes.Status502BadGateway);
        }
    }

    /// <summary>Mappar ett samtal till listformat.</summary>
    private static ConversationResponse Map(Conversation c)
        => new(c.Id, c.Title, c.BookId, c.CreatedAt);

    /// <summary>Mappar ett meddelande till API-format.</summary>
    private static MessageResponse Map(Message m)
        => new(m.Id, m.Role, m.Content, m.CreatedAt);
}
