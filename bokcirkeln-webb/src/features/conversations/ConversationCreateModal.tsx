import { useState } from 'react'
import type { FormEvent } from 'react'
import { createConversation } from '../../api/bokcirkelnApi'

/** Skapa nytt samtal för given bok (eller okopplat). */
export function ConversationCreateModal({
  bookId,
  onCreated,
}: {
  bookId: string | null
  onCreated: (id: string) => void
}) {
  const [title, setTitle] = useState('')
  const [error, setError] = useState<string | null>(null)

  async function handleCreate(e: FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    try {
      const conv = await createConversation(title.trim(), bookId)
      onCreated(conv.id)
    } catch {
      setError('Kunde inte skapa samtalet.')
    }
  }

  return (
    <div>
      {error && <div className="terminal-error">! {error}</div>}
      <form onSubmit={(e) => void handleCreate(e)} className="stack">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Nytt samtal…"
          data-autofocus
        />
        <button type="submit" disabled={!title.trim()}>
          + samtal
        </button>
      </form>
    </div>
  )
}
