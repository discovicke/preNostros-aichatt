import { visibleCommands } from './CommandMenu'
import type { Level } from './CommandMenu'

const GROUPS: { level: Level; title: string }[] = [
  { level: 'root', title: 'utanför bok' },
  { level: 'book', title: 'i bok' },
  { level: 'conversation', title: 'i samtal' },
]

/** Kommandon grupperade per nivå. Visar alltid hela referensen. */
export function HelpModal() {
  return (
    <div>
      {GROUPS.map((group) => (
        <div key={group.level}>
          <div className="dim">{group.title}</div>
          {visibleCommands(group.level).map((cmd) => (
            <div key={cmd.name} className="help-row">
              <span className="cmd">/{cmd.name}</span>
              <span className="dim">{cmd.description}</span>
            </div>
          ))}
        </div>
      ))}
      <div className="dim">Döp om och radera verkar på vald bok / aktivt samtal.</div>
    </div>
  )
}
