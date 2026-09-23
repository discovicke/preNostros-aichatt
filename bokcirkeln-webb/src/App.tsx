import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { createConversation, getConversation, sendMessage } from './api/bokcirkelnApi'
import type { ChatMessage as ChatMessageType } from './api/types'
import { BookPanel } from './components/BookPanel'
import { ChatMessage } from './components/ChatMessage'
import { ConversationPanel } from './components/ConversationPanel'
import { NotePanel } from './components/NotePanel'
import './App.css'

/** Terminal-chatt: böcker, samtal, betyg + chatt mot bokcirkel-API:t. */
export default function App() {
  const [selectedBookId, setSelectedBookId] = useState<string | null>(null)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [convRefresh, setConvRefresh] = useState(0)
  const [messages, setMessages] = useState<ChatMessageType[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  // Håll senaste raden synlig.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, sending])

  /** Skapar alltid ett helt nytt samtal (kopplat till vald bok). */
  async function createFreshConversation(): Promise<string> {
    const conv = await createConversation('Nytt samtal', selectedBookId)
    setConversationId(conv.id)
    setConvRefresh((n) => n + 1)
    return conv.id
  }

  /** Nytt samtal via /new-knappen. */
  async function startNewConversation() {
    setError(null)
    setMessages([])
    try {
      await createFreshConversation()
    } catch {
      setError('Kunde inte nå API:t — körs backend på http://localhost:5037?')
    }
  }

  /** Laddar historik när ett samtal väljs i listan. */
  async function selectConversation(id: string) {
    if (sending || id === conversationId) return
    setError(null)
    setConversationId(id)
    try {
      const detail = await getConversation(id)
      setMessages(detail.messages)
    } catch {
      setError('Kunde inte ladda samtalet.')
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const text = input.trim()
    if (!text || sending) return
    setInput('')
    setError(null)
    setSending(true)
    // Visa din rad direkt, svaret läggs till när API:t svarat.
    // Samtal skapas lazy vid första meddelandet — ingen tomma samtal i listan.
    setMessages((m) => [...m, localMessage('user', text)])
    try {
      const id = conversationId ?? (await createFreshConversation())
      const answer = await sendMessage(id, text)
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
        <button
          type="button"
          className="terminal-button"
          onClick={() => void startNewConversation()}
          disabled={sending}
        >
          /new
        </button>
      </header>

      <div className="panels">
        <BookPanel selectedId={selectedBookId} onSelect={setSelectedBookId} />
        <ConversationPanel
          bookId={selectedBookId}
          activeId={conversationId}
          refreshKey={convRefresh}
          onSelect={(id) => void selectConversation(id)}
        />
        {selectedBookId && <NotePanel bookId={selectedBookId} />}
      </div>

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
          disabled={sending}
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
