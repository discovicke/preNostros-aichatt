/** Centrerad lägesbanner: var i trädet man står. Bar text, ingen låda. */
export function ContextBanner({
  bookTitle,
  convTitle,
}: {
  bookTitle: string | null
  convTitle: string | null
}) {
  return (
    <div className="context-banner">
      {!bookTitle && !convTitle && <span className="dim">~ hemma - välj en bok med /bok</span>}
      {bookTitle && !convTitle && (
        <span>
          {bookTitle} <span className="dim">· /samtal för att öppna diskussioner</span>
        </span>
      )}
      {bookTitle && convTitle && (
        <span>
          <span className="dim">{bookTitle} › </span>
          {convTitle}
        </span>
      )}
      {!bookTitle && convTitle && <span>{convTitle}</span>}
    </div>
  )
}
