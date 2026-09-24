import { useEffect, useRef } from 'react'

/** Ett valbart radalternativ. */
export interface SelectOption {
  id: string
  label: string
  hint?: string
}

/**
 * Lista med mus- + tangentbordsmarkering i /commandmenu-stil.
 * Pilar/Enter styrs av ägaren (se useListNav) - här synkas bara musen.
 */
export function SelectList({
  options,
  selectedIndex,
  selectedId,
  onHighlight,
  onPick,
}: {
  options: SelectOption[]
  selectedIndex: number
  selectedId?: string | null
  onHighlight: (index: number) => void
  onPick: (id: string) => void
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([])

  // Håll markerad rad synlig vid piltangentsnavigering.
  useEffect(() => {
    refs.current[selectedIndex]?.scrollIntoView({ block: 'nearest' })
  }, [selectedIndex])

  return (
    <div className="select-list">
      {options.map((o, i) => (
        <button
          key={o.id}
          ref={(el) => {
            refs.current[i] = el
          }}
          type="button"
          className={i === selectedIndex 
              ? 'command-item active' 
              : 'command-item'}
          onMouseEnter={() => onHighlight(i)}
          onClick={() => onPick(o.id)}
        >
          <span>
            {o.id === selectedId 
                ? '> ' 
                : ''}
            {o.label}
          </span>
          {o.hint && <span className="dim">{o.hint}</span>}
        </button>
      ))}
    </div>
  )
}
