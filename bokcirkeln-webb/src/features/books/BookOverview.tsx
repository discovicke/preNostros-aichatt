import { useEffect, useState } from 'react'
import { getBook, getBookSummary, listConversations, listNotes } from '../../api/bokcirkelnApi'
import type { Conversation, Note } from '../../api/types'

const KINDS = ['Citat', 'Tanke', 'Analys', 'Betyg'] as const

/** Översikt i bok-kontext: summary, klickbara samtal, anteckningar per kind. */
export function BookOverview({
  bookId,
  onSelectConversation,
}: {
  bookId: string
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
        setCounts(`${convs.length} samtal · ${fetchedNotes.length} anteckningar · betyg ${book.rating ?? '–'}`)
        setConversations(convs)
        setNotes(fetchedNotes)
        // Lagrad text först — backfill via modellen bara för gamla böcker.
        if (book.summary) {
          setSummary(book.summary)
          return
        }
        const text = await getBookSummary(bookId)
        if (!cancelled) setSummary(text)
      } catch {
        if (!cancelled) setSummary(null)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [bookId])

  return (
    <>
      <div className="term-box">
        <div className="box-title">$ översikt</div>
        {summary ? <div>{summary}</div> : <div className="dim">Sammanfattar…</div>}
        {counts && <div className="dim">{counts}</div>}
      </div>
      <div className="term-box">
        <div className="box-title">$ samtal</div>
        {conversations.map((c) => (
          <button key={c.id} type="button" className="command-item" onClick={() => onSelectConversation(c.id)}>
            <span>{c.title}</span>
          </button>
        ))}
        {conversations.length === 0 && <div className="dim">inga samtal ännu — skriv nedan för att starta ett</div>}
        <div className="dim">/samtal för tangentbordsflödet · /help för alla kommandon</div>
      </div>
      <div className="term-box">
        <div className="box-title">$ anteckningar</div>
        {KINDS.map((k) => {
          const items = notes.filter((n) => n.kind === k)
          if (items.length === 0) return null
          return (
            <div key={k}>
              <div className="dim">
                {k.toLowerCase()} ({items.length})
              </div>
              {items.map((n) => (
                <div key={n.id}>
                  - {n.kind === 'Betyg' && n.rating ? `[${n.rating}/5] ` : ''}
                  {n.content ?? ''}
                </div>
              ))}
            </div>
          )
        })}
        {notes.length === 0 && <div className="dim">inga anteckningar ännu</div>}
        <div className="dim">/anteckning för att spara · /anteckning-radera för att radera</div>
      </div>
    </>
  )
}
