import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'

/** Generisk modalruta. Stängs med Esc, x eller klick utanför. Tar fokus vid öppning. */
export function Modal({
  title,
  onClose,
  showClose = true,
  children,
}: {
  title: string
  onClose: () => void
  showClose?: boolean
  children: ReactNode
}) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Fokus till markerat fält om det finns, annars hit (pilarna når listorna).
    const field = ref.current?.querySelector('[data-autofocus]')
    if (field instanceof HTMLElement) 
      field.focus()
    else ref.current?.focus()
    // tabIndex={-1}: fokuserbar via kod, men inte med Tab.
  }, [])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') 
        onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        ref={ref}
        tabIndex={-1}
        className="modal"
        role="dialog"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <span>{title}</span>
          {showClose && (
            <button type="button" className="terminal-button" onClick={onClose} aria-label="Stäng">
              ✕
            </button>
          )}
        </div>
        {children}
      </div>
    </div>
  )
}
