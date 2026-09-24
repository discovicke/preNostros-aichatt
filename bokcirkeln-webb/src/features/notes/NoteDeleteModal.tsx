import { useEffect, useState } from 'react'
import { deleteNote, listNotes } from '../../api/bokcirkelnApi'
import type { Note } from '../../api/types'
import { ConfirmModal } from '../../components/ConfirmModal'
import { SelectList } from '../../components/SelectList'
import { isTyping, useListNav } from '../../components/useListNav'

/** Enradsbeskrivning av en anteckning. */
function label(n: Note): string {
  const head = n.kind === 'Betyg' && n.rating 
      ? `${n.kind} ${n.rating}/5` 
      : n.kind
  return n.content 
      ? `${head}: ${n.content}` 
      : head
}

/** Radera anteckning: välj i lista, bekräfta. */
export function NoteDeleteModal({
  bookId,
  onDeleted,
}: {
  bookId: string
  onDeleted: () => void
}) {
  const [notes, setNotes] = useState<Note[]>([])
  const [picked, setPicked] = useState<Note | null>(null)
  const [error, setError] = useState<string | null>(null)
  const nav = useListNav(notes.length)
  const marked = notes[nav.index]

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

  // Window-lyssnare (samma mönster som Modalens Esc): funkar oavsett fokus.
  // Prenumererar om varje render så closuren alltid ser färsk state.
  useEffect(() => {
    /** Pilar flyttar markering, Enter väljer markerad anteckning. */
    function onKey(e: KeyboardEvent) {
      if (isTyping() || picked) return
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        nav.move(1)
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        nav.move(-1)
      } else if (e.key === 'Enter' && document.activeElement?.tagName.toLowerCase() !== 'button') {
        e.preventDefault()
        if (marked) setPicked(marked)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  async function handleConfirm() {
    if (!picked) return
    try {
      await deleteNote(bookId, picked.id)
      onDeleted()
    } catch {
      setError('Kunde inte radera.')
    }
  }

  if (picked) {
    return (
      <div>
        {error && <div className="terminal-error">! {error}</div>}
        <ConfirmModal
          question={`Radera "${label(picked)}"?`}
          confirmLabel="Radera"
          onConfirm={() => void handleConfirm()}
        />
        <div className="row">
          <button type="button" className="terminal-button" onClick={() => setPicked(null)}>
            tillbaka
          </button>
        </div>
      </div>
    )
  }

  return (
    <div>
      {error && <div className="terminal-error">! {error}</div>}
      <SelectList
        options={notes.map((n) => ({ id: n.id, label: label(n) }))}
        selectedIndex={nav.index}
        selectedId={null}
        onHighlight={nav.highlight}
        onPick={(id) => {
          const note = notes.find((n) => n.id === id)
          if (note) setPicked(note)
        }}
      />
      {notes.length === 0 && <div className="dim">inget att radera</div>}
    </div>
  )
}
