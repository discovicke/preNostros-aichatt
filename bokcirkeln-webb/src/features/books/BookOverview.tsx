import { useEffect, useState } from 'react'
import { getBook, getBookSummary, listConversations, listNotes } from '../../api/bokcirkelnApi'
import type { Conversation, Note } from '../../api/types'

const KINDS = ['Citat', 'Tanke', 'Analys', 'Betyg'] as const

/** Översikt i bok-kontext: summary, klickbara samtal, anteckningar per kind. */
export function BookOverview({
  bookId,
  notesRefresh,
  convRefresh,
  onSelectConversation,
}: {
  bookId: string
  notesRefresh: number
  convRefresh: number
  onSelectConversation: (id: string) => void
}) {
  const [summary, setSummary] = useState<string | null>(null)
  const [counts, setCounts] = useState<string | null>(null)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [notes, setNotes] = useState<Note[]>([])

  useEffect(() => {
    // Guard mot race: byts bok mitt i hämtningen ignoreras det sena svaret.
    let cancelled = false
    async function load() {
      try {
        const [convs, fetchedNotes, book] = await Promise.all([
          listConversations(bookId),
          listNotes(bookId),
          getBook(bookId),
        ])
        if (cancelled) return
        setCounts(`${convs.length} samtal | ${fetchedNotes.length} anteckningar | betyg ${book.rating ?? '–'}`)
        setConversations(convs)
        setNotes(fetchedNotes)
        // Lagrad text först — backfill via modellen bara för gamla böcker.
        if (book.summary) {
          setSummary(book.summary)
          return
        }
        const text = await getBookSummary(bookId)
        if (!cancelled) 
          setSummary(text)
      } catch {
        if (!cancelled) 
          setSummary(null)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [bookId, notesRefresh, convRefresh])

  return (
    <>
      <div className="term-box">
        <div className="box-title">$ översikt</div>
        {summary 
            ? <div>{summary}</div> 
            : <div className="dim">Sammanfattar…</div>}
        {counts && <div className="dim">{counts}</div>}
      </div>
      <div className="term-box">
        <div className="box-title">$ samtal</div>
        {conversations.map((conversation) => (
          <button key={conversation.id} type="button" className="command-item" onClick={() => onSelectConversation(conversation.id)}>
            <span className="tone-conv">○ {conversation.title}</span>
          </button>
        ))}
        {conversations.length === 0 && <div className="dim">inga samtal ännu | skriv i chattrutan för att starta ett</div>}
        <div className="dim">/samtal för tangentbordsflödet | /help för alla kommandon</div>
      </div>
      <div className="term-box">
        <div className="box-title">$ anteckningar</div>
        {KINDS.map((kind) => {
          const items = notes.filter((note) => note.kind === kind)
          if (items.length === 0) 
            return null
          return (
            <div key={kind}>
              <div className="dim">
                {kind.toLowerCase()} ({items.length})
              </div>
              {items.map((note) => (
                <div key={note.id}>
                  - [{note.kind}
                  {note.kind === 'Betyg' && note.rating ? (
                    <span className="rating">{` ★${note.rating}/5`}</span>
                  ) : (
                    ''
                  )}]{note.content 
                    ? ` ${note.content}` 
                    : ''}
                </div>
              ))}
            </div>
          )
        })}
        {notes.length === 0 && <div className="dim">inga anteckningar ännu</div>}
        <div className="dim">/anteckning för att spara | /anteckning-radera för att radera</div>
      </div>
    </>
  )
}
