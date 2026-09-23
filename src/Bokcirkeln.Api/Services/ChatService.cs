using System.ClientModel;
using System.Text;
using Bokcirkeln.Api.Data;
using Bokcirkeln.Api.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using OpenAI;
using OpenAI.Chat;

namespace Bokcirkeln.Api.Services;

/// <summary>
/// Inställningar för uppkopplingen mot Azure OpenAI.
/// </summary>
/// <remarks>
/// Binds från konfigurationssektionen <c>AzureOpenAI</c> via <c>IOptions{ChatServiceOptions}</c>.
/// <c>Endpoint</c> och <c>DeploymentName</c> är ofarliga och ligger i <c>appsettings.json</c>,
/// medan <c>ApiKey</c> är en hemlighet och sätts med User Secrets
/// (<c>dotnet user-secrets set "AzureOpenAI:ApiKey" "din-nyckel"</c>).
/// </remarks>
public class ChatServiceOptions
{
    public string Endpoint { get; set; } = string.Empty;
    public string ApiKey { get; set; } = string.Empty;
    public string DeploymentName { get; set; } = string.Empty;
}

/// <summary>
/// Samtalar med språkmodellen i rollen som bokcirkelsledare på svenska.
/// </summary>
public class ChatService(IOptions<ChatServiceOptions> options, AppDbContext db)
{
    /// <summary>
    /// Max antal historikmeddelanden som skickas till modellen per anrop.
    /// Håller tokenförbrukningen nere i långa samtal.
    /// </summary>
    private const int MaxHistoryMessages = 30;

    private readonly AppDbContext _db = db;
    private readonly ChatServiceOptions _options = options.Value;
    private ChatClient? _chat;

    /// <summary>
    /// Skickar ett användarmeddelande i ett samtal och returnerar modellens svar.
    /// </summary>
    /// <remarks>
    /// Flöde: samtalet läses in med bok, anteckningar och meddelanden.
    /// Användarens text sparas som <see cref="Message"/> med rollen <c>"user"</c>.
    /// Systemprompt + de senaste <see cref="MaxHistoryMessages"/> meddelandena skickas
    /// till modellen. Svaret sparas som <see cref="Message"/> med rollen
    /// <c>"assistant"</c> och returneras.
    /// </remarks>
    /// <param name="conversationId">Id för samtalet att svara i.</param>
    /// <param name="content">Användarens meddelandetext.</param>
    /// <param name="cancellationToken">CT</param>
    /// <returns>Modellens svarstext.</returns>
    /// <exception cref="KeyNotFoundException">Kastas när samtalet inte finns.</exception>
    /// <exception cref="InvalidOperationException">Kastas när Azure OpenAI inte är konfigurerat.</exception>
    public async Task<string> SendMessageAsync(Guid conversationId, string content, CancellationToken cancellationToken = default)
    {
        var conversation = await _db.Conversations
                               .Include(c => c.Book)
                               !.ThenInclude(b => b!.Notes)
                               .Include(c => c.Messages)
                               .FirstOrDefaultAsync(c => c.Id == conversationId, cancellationToken)
                           ?? throw new KeyNotFoundException($"Samtalet {conversationId} hittades inte.");

        _db.Messages.Add(new Message
        {
            ConversationId = conversation.Id,
            Role = "user",
            Content = content
        });
        await _db.SaveChangesAsync(cancellationToken);

        var prompt = BuildPrompt(conversation);
        ClientResult<ChatCompletion> result = await GetChatClient().CompleteChatAsync(prompt, cancellationToken: cancellationToken);
        var reply = result.Value.Content.Count > 0 
            ? result.Value.Content[0].Text 
            : string.Empty;

        _db.Messages.Add(new Message
        {
            ConversationId = conversation.Id,
            Role = "assistant",
            Content = reply
        });
        await _db.SaveChangesAsync(cancellationToken);

        return reply;
    }

    /// <summary>Skapar och cachar chattklienten vid första AI-anropet.</summary>
    private ChatClient GetChatClient() => _chat ??= CreateChatClient(_options);

    /// <summary>
    /// Skapar chattklienten mot Azure OpenAI utifrån inställningarna.
    /// </summary>
    /// <param name="serviceOptions">Endpoint, nyckel och deploymentnamn.</param>
    /// <returns>En <see cref="ChatClient"/> bunden till deploymenten.</returns>
    /// <exception cref="InvalidOperationException">Kastas när någon inställning saknas.</exception>
    private static ChatClient CreateChatClient(ChatServiceOptions serviceOptions)
    {
        if (string.IsNullOrWhiteSpace(serviceOptions.Endpoint)
            || string.IsNullOrWhiteSpace(serviceOptions.ApiKey)
            || string.IsNullOrWhiteSpace(serviceOptions.DeploymentName))
        {
            throw new InvalidOperationException(
                "Azure OpenAI är inte konfigurerat. Sätt Endpoint och DeploymentName i appsettings.json " +
                "och ApiKey via User Secrets: dotnet user-secrets set \"AzureOpenAI:ApiKey\" \"din-nyckel\".");
        }

        var client = new OpenAIClient(
            new ApiKeyCredential(serviceOptions.ApiKey),
            new OpenAIClientOptions { Endpoint = new Uri(serviceOptions.Endpoint) });
        return client.GetChatClient(serviceOptions.DeploymentName);
    }

    /// <summary>
    /// Bygger prompten: ett systemmeddelande (roll + bok + anteckningar) följt av samtalshistoriken.
    /// </summary>
    /// <param name="conversation">Samtalet med inläst bok, anteckningar och meddelanden.</param>
    /// <returns>Meddelandelista redo att skickas till modellen.</returns>
    private static List<ChatMessage> BuildPrompt(Conversation conversation)
    {
        List<ChatMessage> prompt = [new SystemChatMessage(BuildSystemPrompt(conversation))];

        var history = conversation.Messages
            .OrderBy(m => m.CreatedAt)
            .TakeLast(MaxHistoryMessages);

        prompt.AddRange(history.Select(message => (ChatMessage)(message.Role == "assistant"
            ? new AssistantChatMessage(message.Content)
            : new UserChatMessage(message.Content))));

        return prompt;
    }

    /// <summary>
    /// Bygger systemprompten som ger modellen rollen som bokcirkelsledare,
    /// med kontext om aktuell bok och sparade anteckningar.
    /// </summary>
    /// <param name="conversation">Samtalet med eventuellt kopplad bok och anteckningar.</param>
    /// <returns>Systemprompttexten.</returns>
    private static string BuildSystemPrompt(Conversation conversation)
    {
        var builder = new StringBuilder();
        builder.AppendLine("Du är en nyfiken och välinläst bokcirkelsledare som pratar svenska.");
        builder.AppendLine("Ställ öppna frågor, koppla till teman och karaktärer, och föreslå nya infallsvinklar.");
        builder.AppendLine("Undvik spoilers för delar av boken som samtalet ännu inte handlat om, om inte användaren ber om det.");

        if (conversation.Book is null) 
            return builder.ToString();
        builder.AppendLine($"Aktuell bok: \"{conversation.Book.Title}\" av {conversation.Book.Author}.");

        if (conversation.Book.Notes is not { Count: > 0 }) 
            return builder.ToString();
        builder.AppendLine("Sparade anteckningar om boken:");
        foreach (var note in conversation.Book.Notes.OrderBy(n => n.CreatedAt).TakeLast(10))
        {
            builder.AppendLine(note.Kind == NoteKind.Betyg && note.Rating.HasValue
                ? $"- Betyg {note.Rating}/5: {note.Content}"
                : $"- {note.Kind}: {note.Content}");
        }

        return builder.ToString();
    }
}
