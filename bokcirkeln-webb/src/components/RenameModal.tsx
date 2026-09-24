import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { getBook, getConversation, updateBook, updateConversation } from '../api/bokcirkelnApi'

/** Döp om bok eller samtal. Nuvarande värde förifyllt. */
export function RenameModal({
  kind,
  id,
  onSaved,
}: {
  kind: 'book' | 'conversation'
  id: string
  onSaved: (title: string) => void
}) {
  const [title, setTitle] = useState('')
  const [author, setAuthor] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      try {
        if (kind === 'book') {
          const book = await getBook(id)
          setTitle(book.title)
          setAuthor(book.author)
        } else {
          setTitle((await getConversation(id)).title)
        }
      } catch {
        setError('Kunde inte ladda.')
      }
    }
    void load()
  }, [kind, id])

  async function handleSave(e: FormEvent) {
    e.preventDefault()
    if (!title.trim() || (kind === 'book' && !author.trim())) 
      return
    try {
      if (kind === 'book') 
        await updateBook(id, title.trim(), author.trim())
      else await updateConversation(id, title.trim())
      onSaved(title.trim())
    } catch {
      setError('Kunde inte spara.')
    }
  }

  return (
    <div>
      {error && <div className="terminal-error">! {error}</div>}
      <form onSubmit={(e) => void handleSave(e)} className="stack">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          aria-label="Titel"
          data-autofocus
        />
        {kind === 'book' && (
          <input value={author} onChange={(e) => setAuthor(e.target.value)} aria-label="Författare" />
        )}
        <button type="submit" disabled={!title.trim() || (kind === 'book' && !author.trim())}>
          spara
        </button>
      </form>
    </div>
  )
}
