import { visibleCommands } from './CommandMenu'
import type { CommandName } from './CommandMenu'

/** Startsida vid rot: klickbara kommandon + hint, likt Riders välkomstvy. */
export function StartPage({ onPick }: { onPick: (name: CommandName) => void }) {
  return (
    <div className="start-page">
      <div className="start-title">bokcirkeln</div>
      {visibleCommands('root').map((c) => (
        <button key={c.name} type="button" className="command-item" onClick={() => onPick(c.name)}>
          <span className="cmd">/{c.name}</span>
          <span className="dim">{c.description}</span>
        </button>
      ))}
      <div className="dim">skriv / för kommandon · pilar + Enter funkar också</div>
    </div>
  )
}
