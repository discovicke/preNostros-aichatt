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
    public async Task<string> SendMessageAsync(Guid conversationId, string content,
        CancellationToken cancellationToken = default)
    {
        var conversation = await LoadConversationAsync(conversationId, cancellationToken);

        _db.Messages.Add(new Message
        {
            ConversationId = conversation.Id,
            Role = "user",
            Content = content
        });
        await _db.SaveChangesAsync(cancellationToken);

        var prompt = BuildPrompt(conversation);
        ClientResult<ChatCompletion> result =
            await GetChatClient().CompleteChatAsync(prompt, cancellationToken: cancellationToken);
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

    /// <summary>
    /// Skickar ett användarmeddelande och strömmar modellens svar token för token.
    /// </summary>
    /// <remarks>
    /// Samma flöde som <see cref="SendMessageAsync"/>, men svaret rapporteras
    /// via <paramref name="onToken"/> allt eftersom det genereras så att klienten
    /// kan rendera det löpande. Hela svaret sparas som <see cref="Message"/> med
    /// rollen <c>"assistant"</c> när strömmen är klar - även partiellt om klienten
    /// avbryter mitt i (det användaren hann se är det som sparas).
    /// </remarks>
    /// <param name="conversationId">Id för samtalet att svara i.</param>
    /// <param name="content">Användarens meddelandetext.</param>
    /// <param name="onToken">Anropas med varje textchunk från modellen.</param>
    /// <param name="cancellationToken">CT</param>
    /// <returns>Hela modellens svarstext.</returns>
    /// <exception cref="KeyNotFoundException">Kastas när samtalet inte finns.</exception>
    /// <exception cref="InvalidOperationException">Kastas när Azure OpenAI inte är konfigurerat.</exception>
    public async Task<string> StreamMessageAsync(Guid conversationId, string content,
        Func<string, Task> onToken, CancellationToken cancellationToken = default)
    {
        var conversation = await LoadConversationAsync(conversationId, cancellationToken);

        _db.Messages.Add(new Message
        {
            ConversationId = conversation.Id,
            Role = "user",
            Content = content
        });
        await _db.SaveChangesAsync(cancellationToken);

        var prompt = BuildPrompt(conversation);
        var replyBuilder = new StringBuilder();
        var cancelled = false;
        try
        {
            AsyncCollectionResult<StreamingChatCompletionUpdate> stream =
                GetChatClient().CompleteChatStreamingAsync(prompt, cancellationToken: cancellationToken);
            await foreach (StreamingChatCompletionUpdate update in stream.WithCancellation(cancellationToken))
            {
                foreach (ChatMessageContentPart part in update.ContentUpdate)
                {
                    if (string.IsNullOrEmpty(part.Text))
                        continue;
                    replyBuilder.Append(part.Text);
                    await onToken(part.Text);
                }
            }
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
            // Klienten bröt strömmen — spara det partiella svaret nedan.
            cancelled = true;
        }

        var reply = replyBuilder.ToString();
        if (reply.Length > 0)
        {
            _db.Messages.Add(new Message
            {
                ConversationId = conversation.Id,
                Role = "assistant",
                Content = reply
            });
            // Vid avbrott är token redan cancellerad — spara ändå det partiella svaret.
            await _db.SaveChangesAsync(cancelled ? CancellationToken.None : cancellationToken);
        }

        return reply;
    }

    /// <summary>Läser in ett samtal med bok, anteckningar och meddelanden.</summary>
    /// <param name="conversationId">Id för samtalet.</param>
    /// <param name="cancellationToken">CT</param>
    /// <returns>Samtalet med relaterade data.</returns>
    /// <exception cref="KeyNotFoundException">Kastas när samtalet inte finns.</exception>
    private async Task<Conversation> LoadConversationAsync(Guid conversationId,
        CancellationToken cancellationToken)
    {
        return await _db.Conversations
                       .Include(c => c.Book)
                       !.ThenInclude(b => b!.Notes)
                       .Include(c => c.Messages)
                       .FirstOrDefaultAsync(c => c.Id == conversationId, cancellationToken)
                   ?? throw new KeyNotFoundException($"Samtalet {conversationId} hittades inte.");
    }

    /// <summary>Hämtar en kort AI-sammanfattning av vad boken handlar om.</summary>
    /// <param name="bookId">Id för boken.</param>
    /// <param name="cancellationToken">CT</param>
    /// <returns>Sammanfattningstexten. Sparas på boken.</returns>
    /// <exception cref="KeyNotFoundException">Kastas när boken inte finns.</exception>
    public async Task<string> GetBookSummaryAsync(Guid bookId, CancellationToken cancellationToken = default)
    {
        var book = await _db.Books
                       .Include(b => b.Notes)
                       .FirstOrDefaultAsync(b => b.Id == bookId, cancellationToken)
                   ?? throw new KeyNotFoundException($"Boken {bookId} hittades inte.");

        var builder = new StringBuilder();
        builder.AppendLine(
            $"Sammanfatta boken \"{book.Title}\" av \"{book.Author}\" på max 800 tecken, utan stora spoilers.");
        builder.AppendLine("Sammanfattningen ska innehålla två sektioner: Om boken (kort vad boken handlar om, likt beskrivningen på en boks rygg) och Teman i boken.");
        builder.AppendLine("Dessa ska inte ha en varsin rubrik, men ska delas in i två tydliga sektioner med radbrytning mellan.");
        builder.AppendLine("Varje sektion ska max vara 3-4 meningar långa.");
        builder.AppendLine("Fokusera på bokens huvudtema, karaktärer och stämning, och undvik att avslöja viktiga vändpunkter.");
        builder.AppendLine("Använd en avslappnad, lättillgänglig ton; som om du berättar för en vän vad boken handlar om.");
        builder.AppendLine("Använd sparsam markdown: **fet** för betoning där det lyfter texten.");
        builder.AppendLine($"Bok: \"{book.Title}\" av {book.Author}.");
        foreach (var note in book.Notes.OrderBy(n => n.CreatedAt).TakeLast(10))
        {
            builder.AppendLine(note.Kind == NoteKind.Betyg && note.Rating.HasValue
                ? $"- Mitt betyg {note.Rating}/5: {note.Content}"
                : $"- Min {note.Kind.ToString().ToLowerInvariant()}: {note.Content}");
        }

        List<ChatMessage> prompt =
        [
            new SystemChatMessage(
                "Du är en bokälskare som skriver korta, engagerande sammanfattningar på naturlig svenska."),
            new UserChatMessage(builder.ToString())
        ];
        ClientResult<ChatCompletion> result =
            await GetChatClient().CompleteChatAsync(prompt, cancellationToken: cancellationToken);
        var summary = result.Value.Content.Count > 0
            ? result.Value.Content[0].Text
            : string.Empty;
        book.Summary = summary;
        await _db.SaveChangesAsync(cancellationToken);
        return summary;
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
        builder.AppendLine("Du är en vass, torr och ärlig diskussionspartner som skriver som en kille född på 90- eller 00-talet snackar med en polare: talspråk, slang och lingo, korta meningar, noll fluff, torr humor. Tänk Mikael Yvesand - inga klyschor, inga föreläsningar, inga motiverande floskler. Slangen ska kännas naturlig, aldrig påklistrad.");
        builder.AppendLine("Din uppgift är att vara en tanketändare, inte en ryggdunkare: utmana läsaren, vänd på perspektiven, kom med heta takes och obekväma frågor. Håller du inte med, säg det rakt ut med motivering.");
        builder.AppendLine("Ditt mål är att hjälpa läsaren att utforska böcker på djupet genom att lägga fram egna takes och ibland ställa öppna frågor, lyfta fram teman och koppla bokens värld till verkligheten.");
        builder.AppendLine("Du är ingen ledare, utan en jämställd samtalspartner.");
        builder.AppendLine("Riktlinjer:");
        builder.AppendLine("- Var **nyfiken och temafokuserad**: Utforska underliggande teman, symbolik och karaktärers motiv.");
        builder.AppendLine("- Var **personlig och avslappnad**: Använd en naturlig, vardaglig ton och uttryck subtila åsikter för att inspirera.");
        builder.AppendLine("- **Koppla till verkligheten**: Visa hur böckens teman kan relateras till vardagliga upplevelser eller samhällsfrågor.");
        builder.AppendLine("- **Undvik spoilers**: Avslöja inte framtida händelser, om inte läsaren explicit ber om det.");
        builder.AppendLine("- **Var ett bollplank**: Kom med motbilder och vändningar läsaren får reagera på - frågor bara när det faller sig naturligt.");
        builder.AppendLine("Anpassa längd och form efter frågan: kort fråga eller reaktion från läsaren → svara kort (2–5 meningar löptext). Bara längre analyser får struktur med ###-rubriker. Du får använda punktlistor och > för citat sparsamt när det behövs för att belysa något större i en diskussion. Rubriker och listor är undantag, inte regel.");
        builder.AppendLine("Varken ryggdunkare eller bråkstake av princip: jämför det läsaren säger mot bokens faktiska innehåll och mot hur boken generellt uppfattas, och landa där det är sant. Håll med när läsaren har rätt, säg emot med motiveringar när den förenklar eller har fel. Inled aldrig med smicker (\"Vad härligt\", \"Vilken bra observation\"). Gå rakt på sak med egen substans — konkreta påståenden läsaren kan reagera på, inte tomma allmänheter om hur författare \"bygger miljö med ordval\".");
        builder.AppendLine("Avsluta som i ett vanligt samtal: ibland med en rak åsikt eller tes läsaren får ta ställning till, ibland med en fråga - bara när det faller sig naturligt. Ställ aldrig en fråga av plikt, och annonsera den aldrig.");
        builder.AppendLine("Använd **fet** sparsamt, bara för nyckelord (2–5 per svar) - aldrig hela meningar. Inga tabeller om inte läsaren ber om det eller det verkligen behövs.");
        
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