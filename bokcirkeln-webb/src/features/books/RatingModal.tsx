import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { getBook, updateBookRating } from '../../api/bokcirkelnApi'

const RATINGS = ['–', '1', '2', '3', '4', '5']

/** Bokens betyg: visa aktuellt, sätt 1–5 eller rensa. */
export function RatingModal({ bookId, onSaved }: { bookId: string; onSaved: () => void }) {
  const [rating, setRating] = useState('–')
  const [content, setContent] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const book = await getBook(bookId)
        setRating(book.rating ? String(book.rating) : '–')
        setContent(book.ratingMotivation ?? '')
      } catch {
        setError('Kunde inte ladda betyget.')
      }
    }
    void load()
  }, [bookId])

  async function handleSave(e: FormEvent) {
    e.preventDefault()
    try {
      await updateBookRating(bookId, rating === '–' 
          ? null 
          : Number(rating), content.trim() || null)
      onSaved()
    } catch {
      setError('Kunde inte spara.')
    }
  }

  return (
    <div>
      {error && <div className="terminal-error">! {error}</div>}
      <form onSubmit={(e) => void handleSave(e)} className="stack">
        <div className="row">
          <span>Betyg:</span>
          <select value={rating} onChange={(e) => setRating(e.target.value)} aria-label="Betyg">
            {RATINGS.map((ratingOption) => (
              <option key={ratingOption} value={ratingOption}>
                {ratingOption === '–' 
                    ? '– inget betyg' 
                    : `${ratingOption}/5`}
              </option>
            ))}
          </select>
        </div>
        <input
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Motivering (valfri)…"
          data-autofocus
        />
        <button type="submit">spara</button>
      </form>
    </div>
  )
}
