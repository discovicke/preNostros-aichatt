using System.ComponentModel.DataAnnotations;

namespace Bokcirkeln.Api.Models;

/// <summary>
/// En bok som diskussioner och anteckningar kan kopplas till.
/// </summary>
/// <remarks>
/// Motsvarar tabellen <c>Books</c> i SQLite.
/// En bok kan ha många <see cref="Conversation"/> och många <see cref="Note"/>.
/// </remarks>
public class Book
{
    public Guid Id { get; set; } = Guid.NewGuid();
    
    [Required, MaxLength(200)]
    public string Title { get; set; } = string.Empty;
    
    [Required, MaxLength(200)]
    public string Author { get; set; } = string.Empty;
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// Alla samtal som handlar om den här boken.
    /// </summary>
    public List<Conversation> Conversations { get; set; } = [];

    /// <summary>
    /// Alla sparade anteckningar (citat, tankar, betyg) för den här boken.
    /// </summary>
    public List<Note> Notes { get; set; } = [];
}
