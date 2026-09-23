import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { createConversation, sendMessage } from './api/bokcirkelnApi'
import type { ChatMessage as ChatMessageType } from './api/types'
import { ChatMessage } from './components/ChatMessage'
import './App.css'

export default function App() {
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [messages, setMessages] = useState<ChatMessageType[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  // Eget samtal vid start. Ref-guard behövs: StrictMode kör effekten 2 ggr i dev.
  const created = useRef(false)
  useEffect(() => {
    if (created.current) 
      return
    created.current = true
    void startNewConversation()
  }, [])

  // Håll senaste raden synlig.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, sending])

  async function startNewConversation() {
    setError(null)
    setMessages([])
    setConversationId(null)
    try {
      const conv = await createConversation('Nytt samtal')
      setConversationId(conv.id)
    } catch {
      setError('Kunde inte nå API:t - körs backend på http://localhost:5037?')
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const text = input.trim()
    if (!text || !conversationId || sending) 
      return
    setInput('')
    setError(null)
    setSending(true)
    // Visa användarens rad direkt, svaret renderas när det återkommit från servern
    setMessages((m) => [...m, localMessage('user', text)])
    try {
      const answer = await sendMessage(conversationId, text)
      setMessages((m) => [...m, localMessage('assistant', answer.reply)])
    } catch {
      setError('Något gick fel — försök igen.')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="terminal">
      <header className="terminal-header">
        <span className="prompt">bokcirkeln:~$</span>
        <span className="terminal-title">bokcirkel-chatt</span>
        <button type="button" className="terminal-button" onClick={() => void startNewConversation()} disabled={sending}>
          /new
        </button>
      </header>

      <main className="terminal-body">
        {messages.map((m) => (
          <ChatMessage key={m.id} message={m} />
        ))}
        {sending && <div className="thinking">bokcirkeln skriver…</div>}
        {error && <div className="terminal-error">! {error}</div>}
        <div ref={bottomRef} />
      </main>

      <form className="terminal-input" onSubmit={(e) => void handleSubmit(e)}>
        <span className="prompt">›</span>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Skriv till bokcirkeln…"
          disabled={sending || !conversationId}
          autoFocus
        />
        <button type="submit" disabled={sending || !input.trim()}>
          skicka
        </button>
      </form>
    </div>
  )
}

/** Tillfällig rad innan servern svarat (servern sparar sin egen kopia). */
function localMessage(role: string, content: string): ChatMessageType {
  return { id: crypto.randomUUID(), role, content, createdAt: new Date().toISOString() }
}
