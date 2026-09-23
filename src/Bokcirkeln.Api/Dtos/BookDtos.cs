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

/// <summary>En bok i list- och detaljvyer.</summary>
public sealed record BookResponse(Guid Id, string Title, string Author, DateTime CreatedAt);
