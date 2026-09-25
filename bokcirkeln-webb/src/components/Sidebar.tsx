import { useEffect, useState } from 'react'
import { listBooks, listConversations, listNotes } from '../api/bokcirkelnApi'
import type { Book, Conversation } from '../api/types'

/**
 * Trädsidebar: böcker → samtal + anteckningsräknare för vald bok.
 * Återanvänder App:ens select-funktioner - ingen egen navigationslogik.
 */
export function Sidebar({
  selectedBookId,
  conversationId,
  bookRefresh,
  convRefresh,
  notesRefresh,
  disabled,
  onSelectBook,
  onSelectConversation,
  onCreateBook,
  onShowNotes,
}: {
  selectedBookId: string | null
  conversationId: string | null
  bookRefresh: number
  convRefresh: number
  notesRefresh: number
  disabled: boolean
  onSelectBook: (id: string | null) => void
  onSelectConversation: (id: string) => void
  onCreateBook: () => void
  onShowNotes: () => void
}) {
  const [books, setBooks] = useState<Book[]>([])
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [noteCount, setNoteCount] = useState(0)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const fetched = await listBooks()
        if (!cancelled) 
          setBooks(fetched)
      } catch {
        if (!cancelled) 
          setBooks([])
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [bookRefresh])

  useEffect(() => {
    if (!selectedBookId) {
      setConversations([])
      setNoteCount(0)
      return
    }
    let cancelled = false
    const bookId = selectedBookId
    async function load() {
      try {
        const [convs, notes] = await Promise.all([
          listConversations(bookId),
          listNotes(bookId),
        ])
        if (cancelled) 
          return
        setConversations(convs)
        setNoteCount(notes.length)
      } catch {
        if (!cancelled) {
          setConversations([])
          setNoteCount(0)
        }
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [selectedBookId, convRefresh, notesRefresh])

  return (
    <nav className="sidebar" aria-label="Bibliotek">
      <div className="sidebar-title">~ bibliotek</div>
      {books.length === 0 && <div className="dim">inga böcker ännu</div>}
      {books.map((book) => {
        const expanded = book.id === selectedBookId
        return (
          <div key={book.id}>
            <button
              type="button"
              className={expanded 
                  ? 'command-item active' 
                  : 'command-item'}
              disabled={disabled}
              onClick={() => onSelectBook(expanded 
                  ? null 
                  : book.id)}
            >
              <span className="tone-book">§ {book.title}</span>
              {book.rating 
                  ? <span className="rating">★{book.rating}/5</span> 
                  : null}
            </button>
            {expanded && (
              <div className="sidebar-children">
                {conversations.map((conv) => (
                  <button
                    key={conv.id}
                    type="button"
                    className={conv.id === conversationId 
                        ? 'command-item active' 
                        : 'command-item'}
                    disabled={disabled}
                    onClick={() => onSelectConversation(conv.id)}
                  >
                    <span className="tone-conv">
                      {conv.id === conversationId 
                          ? '> ' 
                          : ''}○ {conv.title}
                    </span>
                  </button>
                ))}
                {conversations.length === 0 && (
                  <div className="dim">inga samtal - skriv för att starta ett</div>
                )}
                <button
                  type="button"
                  className="command-item"
                  disabled={disabled}
                  onClick={onShowNotes}
                >
                  <span className="dim">□ {noteCount} anteckningar</span>
                </button>
              </div>
            )}
          </div>
        )
      })}
      <button type="button" className="command-item" disabled={disabled} onClick={onCreateBook}>
        <span className="cmd">+ ny bok</span>
      </button>
    </nav>
  )
}
