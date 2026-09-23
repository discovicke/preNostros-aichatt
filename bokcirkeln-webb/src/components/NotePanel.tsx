import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { createNote, listNotes } from '../api/bokcirkelnApi'
import type { Note, NoteKind } from '../api/types'

const KINDS: NoteKind[] = ['Citat', 'Tanke', 'Analys', 'Betyg']
const RATINGS = ['1', '2', '3', '4', '5']

/** Betyg och anteckningar för vald bok. */
export function NotePanel({ bookId }: { bookId: string }) {
  const [notes, setNotes] = useState<Note[]>([])
  const [kind, setKind] = useState<NoteKind>('Tanke')
  const [content, setContent] = useState('')
  const [rating, setRating] = useState('5')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      setError(null)
      try {
        setNotes(await listNotes(bookId))
      } catch {
        setError('Kunde inte ladda anteckningar.')
      }
    }
    void load()
  }, [bookId])

  async function handleCreate(e: FormEvent) {
    e.preventDefault()
    if (!content.trim()) return
    try {
      const note = await createNote(bookId, kind, content.trim(), kind === 'Betyg' 
          ? Number(rating) 
          : null)
      setNotes((n) => [note, ...n])
      setContent('')
    } catch {
      setError('Kunde inte spara.')
    }
  }

  return (
    <section className="panel">
      <h3>$ betyg & anteckningar</h3>
      {error && <div className="terminal-error">! {error}</div>}
      <form onSubmit={(e) => void handleCreate(e)} className="stack">
        <div className="row">
          <select value={kind} onChange={(e) => setKind(e.target.value as NoteKind)} aria-label="Typ">
            {KINDS.map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>
          {kind === 'Betyg' && (
            <select value={rating} onChange={(e) => setRating(e.target.value)} aria-label="Betyg">
              {RATINGS.map((r) => (
                <option key={r} value={r}>
                  {r}/5
                </option>
              ))}
            </select>
          )}
        </div>
        <input value={content} onChange={(e) => setContent(e.target.value)} placeholder="Citat, tanke…" />
        <button type="submit" disabled={!content.trim()}>
          spara
        </button>
      </form>
      <ul className="plain-list">
        {notes.map((n) => (
          <li key={n.id}>
            - [{n.kind}
            {n.kind === 'Betyg' && n.rating 
                ? ` ${n.rating}/5` 
                : ''}] {n.content}
          </li>
        ))}
        {notes.length === 0 && <li className="dim">inget sparat ännu</li>}
      </ul>
    </section>
  )
}
