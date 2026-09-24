using System.ClientModel;
using System.Text.Json;
using Bokcirkeln.Api.Data;
using Bokcirkeln.Api.Dtos;
using Bokcirkeln.Api.Models;
using Bokcirkeln.Api.Services;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.AspNetCore.Http.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

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
        group.MapPut("/{id:guid}", Rename).AddEndpointFilter<ValidationFilter<UpdateConversationRequest>>();
        group.MapDelete("/{id:guid}", DeleteConversation);
        group.MapPost("/{id:guid}/messages", SendMessage).AddEndpointFilter<ValidationFilter<SendMessageRequest>>();
        group.MapPost("/{id:guid}/messages/stream", StreamMessage).AddEndpointFilter<ValidationFilter<SendMessageRequest>>();

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

    /// <summary>Döper om ett samtal.</summary>
    private static async Task<Results<Ok<ConversationResponse>, NotFound>> Rename(Guid id, UpdateConversationRequest request, AppDbContext db, CancellationToken ct)
    {
        var conversation = await db.Conversations.FirstOrDefaultAsync(c => c.Id == id, ct);
        if (conversation is null)
            return TypedResults.NotFound();

        conversation.Title = request.Title;
        await db.SaveChangesAsync(ct);
        return TypedResults.Ok(Map(conversation));
    }

    /// <summary>Raderar ett samtal med meddelanden. Anteckningar frikopplas.</summary>
    private static async Task<Results<NoContent, NotFound>> DeleteConversation(Guid id, AppDbContext db, CancellationToken ct)
    {
        var conversation = await db.Conversations.FirstOrDefaultAsync(c => c.Id == id, ct);
        if (conversation is null)
            return TypedResults.NotFound();

        db.Conversations.Remove(conversation);
        await db.SaveChangesAsync(ct);
        return TypedResults.NoContent();
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

    /// <summary>
    /// Skickar ett meddelande och strömmar AIs svar som Server-Sent Events.
    /// </summary>
    /// <remarks>
    /// Protokoll: varje token skickas som <c>data: {"token":"..."}</c> följt av tom rad,
    /// strömmen avslutas med <c>data: [DONE]</c>. Fel före första token ger vanlig
    /// statuskod (404/502); fel mitt i strömmen skickas som <c>event: error</c>
    /// eftersom headers redan gått.
    /// </remarks>
    private static async Task StreamMessage(
        Guid id, SendMessageRequest request, ChatService chat,
        IOptions<JsonOptions> jsonOptions, HttpContext httpContext)
    {
        var cancellationToken = httpContext.RequestAborted;
        var response = httpContext.Response;
        // Samma camelCase-regler som övriga API-svar
        var jsonSettings = jsonOptions.Value.SerializerOptions;
        var streamed = false;
        try
        {
            await chat.StreamMessageAsync(id, request.Content, async token =>
            {
                if (!streamed)
                {
                    streamed = true;
                    response.StatusCode = StatusCodes.Status200OK;
                    response.ContentType = "text/event-stream";
                    response.Headers.CacheControl = "no-cache";
                    response.Headers["X-Accel-Buffering"] = "no";
                }
                await response.WriteAsync(
                    $"data: {JsonSerializer.Serialize(new StreamTokenEvent(token), jsonSettings)}\n\n",
                    cancellationToken);
                await response.Body.FlushAsync(cancellationToken);
            }, cancellationToken);

            if (!streamed)
            {
                response.StatusCode = StatusCodes.Status200OK;
                response.ContentType = "text/event-stream";
                response.Headers.CacheControl = "no-cache";
            }
            await response.WriteAsync("data: [DONE]\n\n", cancellationToken);
            await response.Body.FlushAsync(cancellationToken);
        }
        catch (KeyNotFoundException) when (!streamed)
        {
            response.StatusCode = StatusCodes.Status404NotFound;
        }
        catch (ClientResultException ex) when (!streamed)
        {
            response.StatusCode = StatusCodes.Status502BadGateway;
            await response.WriteAsync(
                $"AI-tjänsten svarade {ex.Status}: {ex.Message}", CancellationToken.None);
        }
        catch (ClientResultException ex)
        {
            await response.WriteAsync(
                $"event: error\ndata: {JsonSerializer.Serialize(new StreamErrorEvent($"AI-tjänsten svarade {ex.Status}: {ex.Message}"), jsonSettings)}\n\n",
                CancellationToken.None);
            await response.Body.FlushAsync(CancellationToken.None);
        }
        catch (OperationCanceledException)
        {
            // Klienten kopplade bort - partiella svaret redan sparat. Tyst avslut.
        }
    }

    /// <summary>Mappar ett samtal till listformat.</summary>
    private static ConversationResponse Map(Conversation conversation)
        => new(conversation.Id, conversation.Title, conversation.BookId, conversation.CreatedAt);

    /// <summary>Mappar ett meddelande till API-format.</summary>
    private static MessageResponse Map(Message message)
        => new(message.Id, message.Role, message.Content, message.CreatedAt);
}
