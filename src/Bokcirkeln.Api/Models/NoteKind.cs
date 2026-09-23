namespace Bokcirkeln.Api.Models;

/// <summary>
/// Typ av anteckning om en bok.
/// </summary>
/// <remarks>
/// Lagras som heltal i SQLite (EF Cores standardmappning för enum).
/// </remarks>
public enum NoteKind
{
    /// <summary>
    /// Ett sparat citat ur boken.
    /// </summary>
    Citat,

    /// <summary>
    /// En fri tanke eller reflektion kring boken.
    /// </summary>
    Tanke,

    /// <summary>
    /// En djupare analys, t.ex. av tema, karaktärer eller språk.
    /// </summary>
    Analys,

    /// <summary>
    /// Ett betyg 1–5. Kompletteras med <see cref="Note.Rating"/>.
    /// </summary>
    Betyg
}
