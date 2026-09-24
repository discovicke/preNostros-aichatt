/** Kontextnivå: utanför bok, i bok, eller i samtal. */
export type Level = 'root' | 'book' | 'conversation'

/** Giltiga slash-kommandon. */
export type CommandName =
  | 'bok'
  | 'samtal'
  | 'anteckning'
  | 'anteckningar'
  | 'anteckning-radera'
  | 'betyg'
  | 'döp-om'
  | 'radera'
  | 'lämna'
  | 'help'

/** Ett kommando: namn, beskrivning, användning och nivåer där det syns. */
export interface SlashCommand {
  name: CommandName
  description: string
  usage: string
  levels: Level[]
}

/** Alla kommandon. Delas av meny, Enter och /help. */
export const COMMANDS: SlashCommand[] = [
  { name: 'bok', description: 'välj bok (hoppa mellan böcker)', usage: '/bok', levels: ['root', 'book', 'conversation'] },
  { name: 'samtal', description: 'välj eller starta samtal', usage: '/samtal', levels: ['root', 'book', 'conversation'] },
  { name: 'anteckning', description: 'spara citat, tanke eller analys', usage: '/anteckning', levels: ['book'] },
  { name: 'anteckningar', description: 'läs allt om vald bok', usage: '/anteckningar', levels: ['book'] },
  { name: 'anteckning-radera', description: 'radera anteckning', usage: '/anteckning-radera', levels: ['book'] },
  { name: 'betyg', description: 'visa/sätt betyg 1–5', usage: '/betyg', levels: ['book'] },
  { name: 'döp-om', description: 'döp om vald bok / aktivt samtal', usage: '/döp-om', levels: ['book', 'conversation'] },
  { name: 'radera', description: 'radera vald bok / aktivt samtal', usage: '/radera', levels: ['book', 'conversation'] },
  { name: 'lämna', description: 'lämna allt, tillbaka till rot', usage: '/lämna', levels: ['root', 'book', 'conversation'] },
  { name: 'help', description: 'visa alla kommandon', usage: '/help', levels: ['root', 'book', 'conversation'] },
]

/** Kommandon tillgängliga på given nivå. */
export function visibleCommands(level: Level): SlashCommand[] {
  return COMMANDS.filter((cmd) => cmd.levels.includes(level))
}

/** Förslagslista under input. Pilar/Enter styrs från App. */
export function CommandMenu({
  commands,
  selectedIndex,
  onPick,
}: {
  commands: SlashCommand[]
  selectedIndex: number
  onPick: (name: CommandName) => void
}) {
  if (commands.length === 0) {
    return (
      <div className="command-menu">
        <div className="command-hint">okänt kommando - skriv <span className="cmd">/help</span> för alla kommandon</div>
      </div>
    )
  }
  return (
    <div className="command-menu">
      {commands.map((command, index) => (
        <button
          key={command.name}
          type="button"
          className={index === selectedIndex 
              ? 'command-item active' 
              : 'command-item'}
          onClick={() => onPick(command.name)}
        >
          <span className="cmd">/{command.name}</span>
          <span className="dim">{command.description}</span>
        </button>
      ))}
    </div>
  )
}
