using System.ComponentModel.DataAnnotations;

namespace Bokcirkeln.Api.Models;

/// <summary>
/// Bestående kunskap om en bok: citat, tanke, analys eller betyg.
/// </summary>
/// <remarks>
/// Motsvarar tabellen <c>Notes</c>.
/// Till skillnad från <see cref="Message"/> (som är löpande prat) är detta något
/// användaren aktivt vill spara och hitta tillbaka till.
/// Kräver alltid en <see cref="Book"/>, kan valfritt peka på ett <see cref="Conversation"/>.
/// </remarks>
public class Note
{
    /// <summary>
    /// Unikt id för anteckningen. Genereras automatiskt vid <c>new Note()</c>.
    /// </summary>
    public Guid Id { get; set; } = Guid.NewGuid();
    
    public Guid BookId { get; set; }
    
    public Book Book { get; set; } = null!;

    /// <summary>
    /// Id för samtalet där anteckningen uppstod. Null om den skapades fristående.
    /// </summary>
    public Guid? ConversationId { get; set; }

    /// <summary>
    /// Samtalet där anteckningen uppstod, om <see cref="ConversationId"/> är satt. Annars null.
    /// </summary>
    public Conversation? Conversation { get; set; }

    /// <summary>
    /// Typ av anteckning: citat, tanke, analys eller betyg.
    /// </summary>
    /// <remarks>
    /// Lagras som heltal i SQLite (EF Cores standardmappning för enum).
    /// Observera att defaultvärdet är <see cref="NoteKind.Citat"/> (0)
    /// eftersom enum är en värdetyp - sätt alltid <c>Kind</c> explicit vid skapande.
    /// </remarks>
    public NoteKind Kind { get; set; }

    [Required]
    public string Content { get; set; } = string.Empty;

    [Range(1, 5)]
    public int? Rating { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
