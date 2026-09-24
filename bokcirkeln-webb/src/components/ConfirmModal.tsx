import { useState } from 'react'

/** Generisk tvåstegs-bekräftelse. Första klicket skärper, andra bekräftar. */
export function ConfirmModal({
  question,
  confirmLabel,
  onConfirm,
}: {
  question: string
  confirmLabel: string
  onConfirm: () => void
}) {
  const [armed, setArmed] = useState(false)

  return (
    <div className="stack">
      <div>{question}</div>
      <div className="row">
        {armed ? (
          <button type="button" className="danger-button" onClick={onConfirm}>
            Bekräfta: {confirmLabel.toLowerCase()}
          </button>
        ) : (
          <button type="button" className="danger-button" onClick={() => setArmed(true)}>
            {confirmLabel}
          </button>
        )}
      </div>
    </div>
  )
}
