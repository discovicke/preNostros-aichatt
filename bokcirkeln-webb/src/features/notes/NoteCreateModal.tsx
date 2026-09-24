import { useState } from 'react'
import type { FormEvent } from 'react'
import { createNote } from '../../api/bokcirkelnApi'
import type { NoteKind } from '../../api/types'

const KINDS: NoteKind[] = ['Citat', 'Tanke', 'Analys']

/** Skapa citat, tanke eller analys för vald bok. */
export function NoteCreateModal({ bookId, onCreated }: { bookId: string; onCreated: () => void }) {
  const [kind, setKind] = useState<NoteKind>('Tanke')
  const [content, setContent] = useState('')
  const [error, setError] = useState<string | null>(null)

  async function handleCreate(e: FormEvent) {
    e.preventDefault()
    if (!content.trim()) 
      return
    try {
      await createNote(bookId, kind, content.trim(), null)
      onCreated()
    } catch {
      setError('Kunde inte spara.')
    }
  }

  return (
    <div>
      {error && <div className="terminal-error">! {error}</div>}
      <form onSubmit={(e) => void handleCreate(e)} className="stack">
        <select value={kind} onChange={(e) => setKind(e.target.value as NoteKind)} aria-label="Typ">
          {KINDS.map((k) => (
            <option key={k} value={k}>
              {k}
            </option>
          ))}
        </select>
        <input
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Citat, tanke…"
          data-autofocus
        />
        <button type="submit" disabled={!content.trim()}>
          spara
        </button>
      </form>
    </div>
  )
}
