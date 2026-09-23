import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { createBook, listBooks, updateBook } from '../api/bokcirkelnApi'
import type { Book } from '../api/types'

/** Böcker: lista, skapa, redigera, välj aktiv bok. */
export function BookPanel({
  selectedId,
  onSelect,
}: {
  selectedId: string | null
  onSelect: (id: string | null) => void
}) {
  const [books, setBooks] = useState<Book[]>([])
  const [title, setTitle] = useState('')
  const [author, setAuthor] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editAuthor, setEditAuthor] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      try {
        setBooks(await listBooks())
      } catch {
        setError('Kunde inte ladda böcker.')
      }
    }
    void load()
  }, [])

  async function handleCreate(e: FormEvent) {
    e.preventDefault()
    if (!title.trim() || !author.trim()) return
    try {
      const book = await createBook(title.trim(), author.trim())
      setTitle('')
      setAuthor('')
      setBooks((b) => [book, ...b])
      onSelect(book.id)
    } catch {
      setError('Kunde inte skapa boken.')
    }
  }

  function startEdit(book: Book) {
    setEditingId(book.id)
    setEditTitle(book.title)
    setEditAuthor(book.author)
  }

  async function handleUpdate(e: FormEvent) {
    e.preventDefault()
    if (!editingId || !editTitle.trim() || !editAuthor.trim()) return
    try {
      const updated = await updateBook(editingId, editTitle.trim(), editAuthor.trim())
      setBooks((b) => b.map((x) => (x.id === updated.id 
          ? updated 
          : x)))
      setEditingId(null)
    } catch {
      setError('Kunde inte spara.')
    }
  }

  return (
    <section className="panel">
      <h3>$ ls böcker</h3>
      {error && <div className="terminal-error">! {error}</div>}
      <ul className="plain-list">
        {books.map((b) => (
          <li key={b.id} className={b.id === selectedId 
              ? 'selected' 
              : ''}>
            <button
              type="button"
              className="link-button"
              onClick={() => onSelect(b.id === selectedId 
                  ? null 
                  : b.id)}
            >
              {b.title} <span className="dim">av {b.author}</span>
            </button>{' '}
            <button type="button" className="mini-button" onClick={() => startEdit(b)}>
              redigera
            </button>
          </li>
        ))}
        {books.length === 0 && <li className="dim">inga böcker ännu</li>}
      </ul>
      {editingId ? (
        <form onSubmit={(e) => void handleUpdate(e)} className="stack">
          <input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} aria-label="Titel" />
          <input value={editAuthor} onChange={(e) => setEditAuthor(e.target.value)} aria-label="Författare" />
          <div className="row">
            <button type="submit">spara</button>
            <button type="button" className="terminal-button" onClick={() => setEditingId(null)}>
              avbryt
            </button>
          </div>
        </form>
      ) : (
        <form onSubmit={(e) => void handleCreate(e)} className="stack">
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Titel" />
          <input value={author} onChange={(e) => setAuthor(e.target.value)} placeholder="Författare" />
          <button type="submit" disabled={!title.trim() || !author.trim()}>
            + bok
          </button>
        </form>
      )}
    </section>
  )
}
