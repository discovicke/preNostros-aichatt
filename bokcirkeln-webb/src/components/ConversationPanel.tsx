import { useEffect, useState } from 'react'
import { listConversations } from '../api/bokcirkelnApi'
import type { Conversation } from '../api/types'

/** Samtal för vald bok (alla om ingen vald). Klick laddar historiken. */
export function ConversationPanel({
  bookId,
  activeId,
  refreshKey,
  onSelect,
}: {
  bookId: string | null
  activeId: string | null
  refreshKey: number
  onSelect: (id: string) => void
}) {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      setError(null)
      try {
        setConversations(await listConversations(bookId))
      } catch {
        setError('Kunde inte ladda samtal.')
      }
    }
    void load()
  }, [bookId, refreshKey])

  return (
    <section className="panel">
      <h3>$ ls samtal</h3>
      {error && <div className="terminal-error">! {error}</div>}
      <ul className="plain-list">
        {conversations.map((c) => (
          <li key={c.id} className={c.id === activeId 
              ? 'selected' 
              : ''}>
            <button type="button" className="link-button" onClick={() => onSelect(c.id)}>
              {c.title}
            </button>
          </li>
        ))}
        {conversations.length === 0 && <li className="dim">inga samtal — skriv nedan för att starta ett</li>}
      </ul>
    </section>
  )
}
