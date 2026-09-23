using System.ComponentModel.DataAnnotations;

namespace Bokcirkeln.Api.Endpoints;

/// <summary>Validerar en request-DTO:s DataAnnotations, returnerar 400 vid fel.</summary>
/// <typeparam name="T">DTO-typen att validera.</typeparam>
public sealed class ValidationFilter<T> : IEndpointFilter where T : class
{
    /// <summary>Kör valideringen före endpointen.</summary>
    public async ValueTask<object?> InvokeAsync(EndpointFilterInvocationContext context, EndpointFilterDelegate next)
    {
        var dto = context.Arguments.OfType<T>().FirstOrDefault();
        if (dto is null)
            return await next(context);

        var results = new List<ValidationResult>();
        if (Validator.TryValidateObject(dto, new ValidationContext(dto), results, true))
            return await next(context);

        var errors = results
            .GroupBy(r => r.MemberNames.FirstOrDefault() ?? string.Empty)
            .ToDictionary(g => g.Key, g => g.Select(r => r.ErrorMessage ?? "Ogiltigt värde.").ToArray());
        return Results.ValidationProblem(errors);
    }
}
