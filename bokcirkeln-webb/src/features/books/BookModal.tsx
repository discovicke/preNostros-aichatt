import { useEffect, useState } from 'react'
import { listBooks } from '../../api/bokcirkelnApi'
import type { Book } from '../../api/types'
import { SelectList } from '../../components/SelectList'
import { isTyping, useListNav } from '../../components/useListNav'

/** Bok-modal: välj bok med pilar/mus, Enter väljer. Skapa/redigera blir egna kommandon. */
export function BookModal({
  selectedId,
  onSelect,
  onCreate,
  onClose,
}: {
  selectedId: string | null
  onSelect: (id: string | null) => void
  onCreate: () => void
  onClose: () => void
}) {
  const [books, setBooks] = useState<Book[]>([])
  const [error, setError] = useState<string | null>(null)
  const nav = useListNav(books.length + 1)
  const rows = [{ id: '__create__', label: '+ Skapa ny bok' }, ...books.map((book) => ({ id: book.id, label: `§ ${book.title}`, hint: `av ${book.author}`, badge: book.rating ? `★${book.rating}/5` : undefined }))]
  const marked = rows[nav.index]

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

  function pick(id: string | null) {
    onSelect(id)
    onClose()
  }

  // Window-lyssnare (samma mönster som Modalens Esc): funkar oavsett fokus.
  // Prenumererar om varje render så closuren alltid ser färsk state.
  useEffect(() => {
    /** Pilar flyttar markering, Enter väljer markerad bok. */
    function onKey(e: KeyboardEvent) {
      if (isTyping()) 
        return
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        nav.move(1)
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        nav.move(-1)
      } else if (e.key === 'Enter' && document.activeElement?.tagName.toLowerCase() !== 'button') {
        e.preventDefault()
        if (!marked) 
          return
        if (marked.id === '__create__') 
          onCreate()
        else pick(marked.id === selectedId 
            ? null 
            : marked.id)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  return (
    <div>
      {error && <div className="terminal-error">! {error}</div>}
      <SelectList
        options={rows}
        selectedIndex={nav.index}
        selectedId={selectedId}
        tone="book"
        onHighlight={nav.highlight}
        onPick={(id) => {
          if (id === '__create__') 
            onCreate()
          else pick(id === selectedId 
              ? null 
              : id)
        }}
      />
      {books.length === 0 && <div className="dim">inga böcker ännu</div>}
    </div>
  )
}
