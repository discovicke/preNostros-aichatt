import { useEffect, useState } from 'react'
import { listConversations } from '../../api/bokcirkelnApi'
import type { Conversation } from '../../api/types'
import { SelectList } from '../../components/SelectList'
import { isTyping, useListNav } from '../../components/useListNav'

/** Samtals-modal: bläddra med pilar/mus, Enter väljer. */
export function ConversationModal({
  bookId,
  activeId,
  onSelect,
  onCreate,
  onClose,
}: {
  bookId: string | null
  activeId: string | null
  onSelect: (id: string) => void
  onCreate: () => void
  onClose: () => void
}) {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [error, setError] = useState<string | null>(null)
  const rows = [{ id: '__create__', label: '+ Skapa nytt samtal' }, ...conversations.map((c) => ({ id: c.id, label: c.title }))]
  const nav = useListNav(rows.length)
  const marked = rows[nav.index]

  useEffect(() => {
    async function load() {
      try {
        const all = await listConversations(bookId)
        // I rot (ingen bok) visas bara okopplade samtal.
        setConversations(bookId 
            ? all 
            : all.filter((c) => !c.bookId))
      } catch {
        setError('Kunde inte ladda samtal.')
      }
    }
    void load()
  }, [bookId])

  function pick(id: string) {
    onSelect(id)
    onClose()
  }

  // Window-lyssnare (samma mönster som Modalens Esc): funkar oavsett fokus.
  // Prenumererar om varje render så closuren alltid ser färsk state.
  useEffect(() => {
    /** Pilar flyttar markering, Enter väljer markerat samtal. */
    function onKey(e: KeyboardEvent) {
      if (isTyping()) return
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
        else pick(marked.id)
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
        selectedId={activeId}
        onHighlight={nav.highlight}
        onPick={(id) => {
          if (id === '__create__') 
            onCreate()
          else 
            pick(id)
        }}
      />
      {conversations.length === 0 && <div className="dim">inga samtal ännu - skapa ett ovan</div>}
    </div>
  )
}
