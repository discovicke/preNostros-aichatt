# preNostros - bokcirkelchatt med generativ AI

> Skolprojekt i utbildningssyfte. Chatt där du diskuterar böcker med en AI-samtalspartner och sparar citat, tankar, analyser och betyg som anteckningar.

![.NET](https://img.shields.io/badge/.NET-10-512BD4)
![C#](https://img.shields.io/badge/C%23-239120?logo=csharp&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)
![Vite](https://img.shields.io/badge/Vite-frontend-646CFF?logo=vite&logoColor=white)
![SQLite](https://img.shields.io/badge/SQLite-EF_Core-003B57)
![LLM Integration](https://img.shields.io/badge/LLM_Integration-Azure_OpenAI-8E75B2)
![Status](https://img.shields.io/badge/Status-Skolprojekt-yellow)

## Vad är detta

Skolprojekt utvecklat i utbildningssyfte för att öva generativ AI och fullstack i praktiken. Backend är ett Minimal API i `src/Bokcirkeln.Api` med EF Core och SQLite, frontend i `bokcirkeln-webb` är en React-terminal med Vite. `ChatService` bygger systemprompt av roll plus bok plus anteckningar plus historik och strömmar svar som SSE från Azure OpenAI.

### Startsida
<img width="1832" height="1279" alt="image" src="https://github.com/user-attachments/assets/81f412d2-0960-4e32-9a3f-84fe453a342f" />

Ingången till preNostros, en terminalren startsida. Alla vägar in går via kommandon: `/bok`, `/samtal`, `/anteckningar`, `/help`. Ett försök till att göra ett friktionsfritt user interface utan menyer som blir bloat och gör så att man klickar sig vilse. Först väljer man en bok, sedan öppnar man ett samtal om vald bok.

> Det går att starta samtal utan en bok-kontext för den som vill diskutera allmänna saker kring litteratur (eller vad som nu behagar).


### Boköversikt
<img width="890" height="727" alt="image" src="https://github.com/user-attachments/assets/3fb07acc-55a3-480d-a794-36fe6c53819d" />

När man registrerar en bok skickas bokens titel och författare till preNostros LLM, som sammanfattar och lyfter ut vad boken handlar om samt dess teman. Det finns en statistikrad för antal samtal, anteckningar och vilket betyg användaren gett boken.
Trädet i sidan sidebar speglar samma struktur:
```
§ bok 
  ○ samtal
    `namn på samtal`
    `namn på ett annat samtal`
  □ [antal] anteckningar
§ en annan bok
[...] 
```
### Samtal
<img width="1828" height="1285" alt="image" src="https://github.com/user-attachments/assets/9b99ed2e-6e58-4790-8d92-8b542db62c7c" />

Själva diskussionen och programmets kärna; 
- din text projiceras nedtonat efter `❯`
- AI:ns svar markeras med grön sidlinje och en varm inline-betoning.

Första meddelandet skapar automatiskt samtalet, så det finns ingen risk att råka starta tomma samtal som måste städas efteråt.

> Pågående svar avbryts genom att trycka på `Esc` och kan genereras om med `↻ regenerera` utan att historiken dupliceras.

## Kom igång

**Backend** (.NET 10, SQLite + Azure OpenAI):

```powershell
dotnet ef database update --project src/Bokcirkeln.Api
dotnet run --project src/Bokcirkeln.Api
# API på http://localhost:5037
```

Sätt `AzureOpenAI:ApiKey` via User Secrets innan första AI-anropet:

```powershell
dotnet user-secrets set "AzureOpenAI:ApiKey" "<din-nyckel>" --project src/Bokcirkeln.Api
dotnet user-secrets set "AzureOpenAI:DeploymentName" "<ai-model-version>" --project src/Bokcirkeln.Api
dotnet user-secrets set "AzureOpenAI:Endpoint" "https://<din-resurs>.openai.azure.com/openai/v1" --project src/Bokcirkeln.Api
```

**Frontend** (React 19 + Vite):

```powershell
cd bokcirkeln-webb
npm install
npm run dev
```

## Användning

- Vanliga text chattar: första meddelandet i en bok skapar automatiskt ett samtal.
- Börja med `/` för kommandon (`/help` visar alla slash-commandon per nivå: rot / bok / samtal).
- **Esc** avbryter ett pågående svar (partiellt svar sparas, tom bubbla städas).
- **↻ regenerera** under senaste AI-svaret genererar om det utan ny användarrad.
- Sidebar: `§` böcker (cyan) -> `○` samtal (orange) -> `□` anteckningar.

## Arkitektur

- `src/Bokcirkeln.Api` | Minimal API + EF Core (SQLite): böcker, samtal,
  meddelanden, anteckningar. `ChatService` bygger systemprompt (roll + bok +
  anteckningar + historik) mot Azure OpenAI; svar strömmas som SSE.
- `bokcirkeln-webb` | React-terminal: `App.tsx` (state + strömning),
  `components/` (chatt, markdown, sidebar, modaler), `features/` (böcker,
  samtal, anteckningar), `api/` (klient + SSE-parsning).
