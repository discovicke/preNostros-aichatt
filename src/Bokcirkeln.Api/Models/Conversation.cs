using System.ComponentModel.DataAnnotations;

namespace Bokcirkeln.Api.Models;

/// <summary>
/// Ett samtal (en chatt-tråd) mellan användaren och bokcirkelsledaren.
/// </summary>
/// <remarks>
/// Motsvarar tabellen <c>Conversations</c>.
/// Kan vara fristående eller kopplad till en <see cref="Book"/> via <see cref="BookId"/>.
/// Äger flera <see cref="Message"/> som raderas automatiskt om samtalet raderas.
/// </remarks>
public class Conversation
{
    /// <summary>
    /// Unikt id för samtalet. Genereras automatiskt vid <c>new Conversation()</c>.
    /// </summary>
    public Guid Id { get; set; } = Guid.NewGuid();

    /// <summary>
    /// Rubrik som visas i samtalslistan, t.ex. "Diskussion om Mörkret kap 1–3".
    /// </summary>
    [Required, MaxLength(200)]
    public string Title { get; set; } = string.Empty;

    /// <summary>
    /// Id för kopplad bok. Null betyder att samtalet inte är kopplat till någon bok än.
    /// </summary>
    public Guid? BookId { get; set; }

    /// <summary>
    /// Den kopplade boken, om <see cref="BookId"/> är satt. Annars null.
    /// </summary>
    public Book? Book { get; set; }
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// Alla meddelanden i samtalet, i kronologisk ordning.
    /// </summary>
    public List<Message> Messages { get; set; } = [];
}
