import { visibleCommands } from './CommandMenu'
import type { CommandName } from './CommandMenu'

/** Startsida vid rot: klickbara kommandon + hint, likt Riders välkomstvy. */
export function StartPage({ onPick }: { onPick: (name: CommandName) => void }) {
  return (
    <div className="start-page">
      <div className="start-title">preNostros</div>
      {visibleCommands('root').map((cmd) => (
        <button key={cmd.name} type="button" className="command-item" onClick={() => onPick(cmd.name)}>
          <span className="cmd">/{cmd.name}</span>
          <span className="dim">{cmd.description}</span>
        </button>
      ))}
      <div className="dim">skriv / för kommandon | pilar + Enter funkar också</div>
    </div>
  )
}
