# preNostros - bokcirkelchatt med generativ AI

Terminalchatt där du diskuterar böcker med en AI-samtalspartner: välj en bok,
starta ett samtal genom att bara skriva, spara citat/tankar/analyser/betyg som
anteckningar.

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
