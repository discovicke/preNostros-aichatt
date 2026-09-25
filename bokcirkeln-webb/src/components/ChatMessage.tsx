import type { ChatMessage as ChatMessageType } from '../api/types'
import { Markdown } from './Markdown'

/**
 * En chattrad. Användarens text ekas rått efter ❯ (det du skrev ska synas exakt).
 * AI-svaret särskiljs med sidlinje + padding (se .line.theirs) och renderas som
 * markdown - utom under pågående strömning, då ofärdig markdown (t.ex. oavslutad
 * **fet**) skulle flimra. Medan första token inte anlänt visas "skriver…"
 * inne i bubblan istället för som separat rad under den.
 */
export function ChatMessage({
  message,
  streaming,
  aborted,
}: {
  message: ChatMessageType
  streaming: boolean
  aborted?: boolean
}) {
  if (message.role === 'user') {
    return (
      <div className="line mine" title={message.createdAt}>
        <span className="who">❯</span>
        <div className="text">{message.content}</div>
      </div>
    )
  }

  const waiting = streaming && message.content.length === 0
  return (
    <div className={streaming 
        ? 'line theirs streaming' 
        : 'line theirs'}
      title={message.createdAt}>
      <div className="text">
        {waiting 
            ? <span className="thinking">preNostros skriver…</span> 
            : streaming 
              ? message.content 
              : <><Markdown content={message.content} />{aborted && !streaming && <span className="dim"> · avbrutet</span>}</>}
      </div>
    </div>
  )
}
