import { useEffect, useState } from 'react'
import { getBook, getBookSummary, listConversations, listNotes } from '../../api/bokcirkelnApi'

/** Översikt i bok-kontext utan valt samtal: summary + antalsrad. */
export function BookOverview({ bookId }: { bookId: string }) {
  const [summary, setSummary] = useState<string | null>(null)
  const [counts, setCounts] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const [text, convs, notes, book] = await Promise.all([
          getBookSummary(bookId),
          listConversations(bookId),
          listNotes(bookId),
          getBook(bookId),
        ])
        setSummary(text)
        setCounts(`${convs.length} samtal · ${notes.length} anteckningar · betyg ${book.rating ?? '–'}`)
      } catch {
        setSummary(null)
      }
    }
    void load()
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
