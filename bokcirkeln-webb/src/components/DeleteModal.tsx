import { useEffect, useState } from 'react'
import { deleteBook, deleteConversation, getBook, getConversation } from '../api/bokcirkelnApi'
import { ConfirmModal } from './ConfirmModal'

/** Radera bok (cascade) eller samtal. Tvåstegs-bekräftelse. */
export function DeleteModal({
  kind,
  id,
  onDeleted,
}: {
  kind: 'book' | 'conversation'
  id: string
  onDeleted: () => void
}) {
  const [name, setName] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      try {
        setName(kind === 'book' 
            ? (await getBook(id)).title 
            : (await getConversation(id)).title)
      } catch {
        setError('Kunde inte ladda.')
      }
    }
    void load()
  }, [kind, id])

  async function handleConfirm() {
    try {
      if (kind === 'book') 
        await deleteBook(id)
      else await deleteConversation(id)
      onDeleted()
    } catch {
      setError('Kunde inte radera.')
    }
  }

  if (!name && !error) {
    return <div className="dim">Laddar…</div>
  }

  return (
    <div>
      {error && <div className="terminal-error">! {error}</div>}
      {name && (
        <ConfirmModal
          question={
            kind === 'book'
              ? `Radera "${name}" med samtal, meddelanden och anteckningar?`
              : `Radera samtalet "${name}" med alla meddelanden?`
          }
          confirmLabel="Radera"
          onConfirm={() => void handleConfirm()}
        />
      )}
    </div>
  )
}
