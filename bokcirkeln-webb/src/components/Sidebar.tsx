import { useEffect, useState } from 'react'
import { listBooks, listConversations } from '../api/bokcirkelnApi'
import type { Book, Conversation } from '../api/types'

/** Smal dev-lista: böcker + aktiva bokens samtal. Tas bort senare. */
export function Sidebar({
  selectedBookId,
  activeConversationId,
  bookRefresh,
  convRefresh,
  onSelectBook,
  onSelectConversation,
}: {
  selectedBookId: string | null
  activeConversationId: string | null
  bookRefresh: number
  convRefresh: number
  onSelectBook: (id: string | null) => void
  onSelectConversation: (id: string) => void
}) {
  const [books, setBooks] = useState<Book[]>([])
  const [conversations, setConversations] = useState<Conversation[]>([])

  useEffect(() => {
    async function load() {
      try {
        setBooks(await listBooks())
      } catch {
        // Dev-stöd: riktiga fel visas i modalerna.
      }
    }
    void load()
  }, [bookRefresh])

  useEffect(() => {
    async function load() {
      try {
        setConversations(await listConversations(selectedBookId))
      } catch {
        // Dev-stöd: riktiga fel visas i modalerna.
      }
    }
    void load()
  }, [selectedBookId, convRefresh])

  return (
    <aside className="sidebar">
      <div className="side-dev">dev; radera innan redovisning.</div>
      <div className="side-group">
        <div className="dim">böcker</div>
        {books.map((b) => (
          <button
            key={b.id}
            type="button"
            className={b.id === selectedBookId 
                ? 'side-item active' 
                : 'side-item'}
            onClick={() => onSelectBook(b.id === selectedBookId ? null : b.id)}
          >
            {b.title}
          </button>
        ))}
      </div>
      <div className="side-group">
        <div className="dim">samtal</div>
        {conversations.map((c) => (
          <button
            key={c.id}
            type="button"
            className={c.id === activeConversationId 
                ? 'side-item active' 
                : 'side-item'}
            onClick={() => onSelectConversation(c.id)}
          >
            {c.title}
          </button>
        ))}
      </div>
    </aside>
  )
}
