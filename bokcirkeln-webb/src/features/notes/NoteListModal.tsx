import { useEffect, useState } from 'react'
import { listNotes } from '../../api/bokcirkelnApi'
import type { Note } from '../../api/types'

/** Skrivskyddad lista över alla anteckningar för vald bok. */
export function NoteListModal({ bookId, onCreate }: { bookId: string; onCreate: () => void }) {
  const [notes, setNotes] = useState<Note[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      try {
        setNotes(await listNotes(bookId))
      } catch {
        setError('Kunde inte ladda anteckningar.')
      }
    }
    void load()
  }, [bookId])

  return (
    <div>
      {error && <div className="terminal-error">! {error}</div>}
      {onCreate && (
        <button type="button" className="terminal-button" onClick={onCreate}>
          + Skapa ny anteckning
        </button>
      )}
      <ul className="plain-list">
        {notes.map((note) => (
          <li key={note.id}>
            - [{note.kind}
            {note.kind === 'Betyg' && note.rating 
                ? <span className="rating">{` ★${note.rating}/5`}</span> 
                : ''}]{note.content 
              ? ` ${note.content}` 
              : ''}
          </li>
        ))}
        {notes.length === 0 && <li className="dim">inget sparat ännu</li>}
      </ul>
    </div>
  )
}
