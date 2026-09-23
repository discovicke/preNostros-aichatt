using System.ComponentModel.DataAnnotations;

namespace Bokcirkeln.Api.Models;

/// <summary>
/// En enskild tur i ett samtal: antingen från användaren eller assistenten.
/// </summary>
/// <remarks>
/// Motsvarar tabellen <c>Messages</c>.
/// Tillhör alltid exakt en <see cref="Conversation"/> och raderas med den (cascade).
/// </remarks>
public class Message
{
    public Guid Id { get; set; } = Guid.NewGuid();

    /// <summary>
    /// Id för samtalet som meddelandet tillhör.
    /// </summary>
    public Guid ConversationId { get; set; }

    /// <summary>
    /// Samtalet som meddelandet tillhör.
    /// </summary>
    public Conversation Conversation { get; set; } = null!;

    /// <summary>
    /// Avsändarroll: <c>"user"</c> eller <c>"assistant"</c>.
    /// </summary>
    /// <remarks>
    /// Hålls som sträng för att mappa direkt mot OpenAI:s chattroller.
    /// </remarks>
    [Required, MaxLength(20)]
    public string Role { get; set; } = string.Empty;
    
    [Required]
    public string Content { get; set; } = string.Empty;
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
