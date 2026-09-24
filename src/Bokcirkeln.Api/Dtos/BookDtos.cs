using System.ComponentModel.DataAnnotations;

namespace Bokcirkeln.Api.Dtos;

/// <summary>Begäran för att skapa en bok.</summary>
public sealed record CreateBookRequest
{
    /// <summary>Bokens titel.</summary>
    [Required, MaxLength(200)]
    public string Title { get; init; } = string.Empty;

    /// <summary>Bokens författare.</summary>
    [Required, MaxLength(200)]
    public string Author { get; init; } = string.Empty;
}

/// <summary>Begäran för att uppdatera en bok.</summary>
public sealed record UpdateBookRequest
{
    /// <summary>Bokens titel.</summary>
    [Required, MaxLength(200)]
    public string Title { get; init; } = string.Empty;

    /// <summary>Bokens författare.</summary>
    [Required, MaxLength(200)]
    public string Author { get; init; } = string.Empty;
}

/// <summary>En bok i list- och detaljvyer.</summary>
public sealed record BookResponse(Guid Id, string Title, string Author, int? Rating, string? RatingMotivation, string? Summary, DateTime CreatedAt);

/// <summary>Begäran för att sätta eller rensa bokens betyg.</summary>
public sealed record UpdateBookRatingRequest
{
    /// <summary>Betyg 1–5, eller null för att rensa.</summary>
    [Range(1, 5)]
    public int? Rating { get; init; }

    /// <summary>Valfri motivering.</summary>
    public string? Motivation { get; init; }
}

/// <summary>AI-sammanfattning av vad boken handlar om.</summary>
/// <param name="Summary">Sammanfattningstexten.</param>
public sealed record BookSummaryResponse(string Summary);
