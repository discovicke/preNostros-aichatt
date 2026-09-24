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
      {GROUPS.map((g) => (
        <div key={g.level}>
          <div className="dim">{g.title}</div>
          {visibleCommands(g.level).map((c) => (
            <div key={c.name} className="help-row">
              <span className="cmd">/{c.name}</span>
              <span className="dim">{c.description}</span>
            </div>
          ))}
        </div>
      ))}
      <div className="dim">Döp om och radera verkar på vald bok / aktivt samtal.</div>
    </div>
  )
}
