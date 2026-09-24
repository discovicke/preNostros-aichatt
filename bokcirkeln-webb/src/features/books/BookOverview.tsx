import { useEffect, useState } from 'react'
import { getBook, getBookSummary, listConversations, listNotes } from '../../api/bokcirkelnApi'

/** Översikt i bok-kontext utan valt samtal: lagrad summary + antalsrad. */
export function BookOverview({ bookId }: { bookId: string }) {
  const [summary, setSummary] = useState<string | null>(null)
  const [counts, setCounts] = useState<string | null>(null)

  useEffect(() => {
    // Guard mot race: byts bok mitt i hämtningen ignoreras det sena svaret.
    let cancelled = false
    async function load() {
      try {
        const [convs, notes, book] = await Promise.all([
          listConversations(bookId),
          listNotes(bookId),
          getBook(bookId),
        ])
        if (cancelled) return
        setCounts(`${convs.length} samtal · ${notes.length} anteckningar · betyg ${book.rating ?? '–'}`)
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
    <div className="overview">
      <div className="dim">översikt</div>
      {summary ? <div>{summary}</div> : <div className="dim">Sammanfattar…</div>}
      {counts && <div className="dim">{counts}</div>}
      <div className="dim">/samtal för att gå in · /help för alla kommandon</div>
    </div>
  )
}
