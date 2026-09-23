using System.ComponentModel.DataAnnotations;

namespace Bokcirkeln.Api.Dtos;

/// <summary>Begäran för att skapa ett samtal.</summary>
public sealed record CreateConversationRequest
{
    [Required, MaxLength(200)]
    public string Title { get; init; } = string.Empty;

    /// <summary>Kopplad bok, eller null för fristående samtal.</summary>
    public Guid? BookId { get; init; }
}

/// <summary>Ett samtal i listvyer.</summary>
public sealed record ConversationResponse(Guid Id, string Title, Guid? BookId, DateTime CreatedAt);

/// <summary>Ett samtal med hela meddelandehistoriken.</summary>
public sealed record ConversationDetailResponse(
    Guid Id,
    string Title,
    Guid? BookId,
    DateTime CreatedAt,
    List<MessageResponse> Messages);

/// <summary>Ett enskilt chattmeddelande.</summary>
public sealed record MessageResponse(Guid Id, string Role, string Content, DateTime CreatedAt);

/// <summary>Användarens meddelande till AI.</summary>
public sealed record SendMessageRequest
{
    /// <summary>Meddelandetexten.</summary>
    [Required]
    public string Content { get; init; } = string.Empty;
}

/// <summary>AIs svar.</summary>
/// <param name="Reply">Svarstexten.</param>
public sealed record SendMessageResponse(string Reply);
