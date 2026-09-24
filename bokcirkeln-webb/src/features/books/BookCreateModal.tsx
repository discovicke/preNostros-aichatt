import { useState } from 'react'
import type { FormEvent } from 'react'
import { createBook } from '../../api/bokcirkelnApi'

/** Skapa ny bok. Väljer den direkt. */
export function BookCreateModal({ onCreated }: { onCreated: (id: string) => void }) {
  const [title, setTitle] = useState('')
  const [author, setAuthor] = useState('')
  const [error, setError] = useState<string | null>(null)

  async function handleCreate(e: FormEvent) {
    e.preventDefault()
    if (!title.trim() || !author.trim()) return
    try {
      const book = await createBook(title.trim(), author.trim())
      onCreated(book.id)
    } catch {
      setError('Kunde inte skapa boken.')
    }
  }

  return (
    <div>
      {error && <div className="terminal-error">! {error}</div>}
      <form onSubmit={(e) => void handleCreate(e)} className="stack">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Titel"
          data-autofocus
        />
        <input value={author} onChange={(e) => setAuthor(e.target.value)} placeholder="Författare" />
        <button type="submit" disabled={!title.trim() || !author.trim()}>
          + bok
        </button>
      </form>
    </div>
  )
}
