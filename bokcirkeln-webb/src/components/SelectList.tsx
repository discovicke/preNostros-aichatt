import { useEffect, useRef } from 'react'

/** Ett valbart radalternativ. */
export interface SelectOption {
  id: string
  label: string
  hint?: string
  badge?: string
}

/**
 * Lista med mus- + tangentbordsmarkering i /commandmenu-stil.
 * Pilar/Enter styrs av ägaren (se useListNav) - här synkas bara musen.
 */
export function SelectList({
  options,
  selectedIndex,
  selectedId,
  tone,
  onHighlight,
  onPick,
}: {
  options: SelectOption[]
  selectedIndex: number
  selectedId?: string | null
  tone?: 'book' | 'conv'
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
      {options.map((option, index) => (
        <button
          key={option.id}
          ref={(element) => {
            refs.current[index] = element
          }}
          type="button"
          className={index === selectedIndex 
              ? 'command-item active' 
              : 'command-item'}
          onMouseEnter={() => onHighlight(index)}
          onClick={() => onPick(option.id)}
        >
          <span
            className={tone === 'book' 
                ? 'tone-book' 
                : tone === 'conv' 
                    ? 'tone-conv' 
                    : undefined}
          >
            {option.id === selectedId 
                ? '> ' 
                : ''}
            {option.label}
          </span>
          {option.hint && <span className="dim">{option.hint}</span>}
          {option.badge && <span className="rating">{option.badge}</span>}
        </button>
      ))}
    </div>
  )
}
