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
      {!bookTitle && !convTitle && <span className="dim">~ hemma | välj en bok med <span className="cmd">/bok</span></span>}
      {bookTitle && !convTitle && (
        <span className="tone-book">
          § {bookTitle} <span className="dim">| <span className="cmd">/samtal</span> för att öppna diskussioner</span>
        </span>
      )}
      {bookTitle && convTitle && (
        <span>
          <span className="tone-book">§ {bookTitle}</span>
          <span className="dim">{' > '}</span>
          <span className="tone-conv">○ {convTitle}</span>
        </span>
      )}
      {!bookTitle && convTitle && <span className="tone-conv">○ {convTitle}</span>}
    </div>
  )
}
