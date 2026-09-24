using System.ComponentModel.DataAnnotations;
using Bokcirkeln.Api.Models;

namespace Bokcirkeln.Api.Dtos;

/// <summary>Begäran för att spara en anteckning om en bok.</summary>
public sealed record CreateNoteRequest
{
    /// <summary>Typ: Citat, Tanke, Analys eller Betyg.</summary>
    public NoteKind Kind { get; init; }

    /// <summary>Anteckningstext. Null tillåtet för Betyg (se reglerna i endpointen).</summary>
    public string? Content { get; init; }

    /// <summary>Betyg 1–5, krävs när Kind är Betyg.</summary>
    [Range(1, 5)]
    public int? Rating { get; init; }

    /// <summary>Samtalet den kom ifrån, om något.</summary>
    public Guid? ConversationId { get; init; }
}

/// <summary>En sparad anteckning.</summary>
public sealed record NoteResponse(
    Guid Id,
    NoteKind Kind,
    string? Content,
    int? Rating,
    Guid? ConversationId,
    DateTime CreatedAt);

/// <summary>Begäran för att uppdatera en anteckning (samma regler som vid skapande).</summary>
public sealed record UpdateNoteRequest
{
    public string? Content { get; init; }

    [Range(1, 5)]
    public int? Rating { get; init; }
}
