import { useEffect, useRef, useState } from 'react'
import type { FormEvent, KeyboardEvent } from 'react'
import { createConversation, getBook, getConversation, sendMessageStream } from './api/bokcirkelnApi'
import type { ChatMessage as ChatMessageType } from './api/types'
import { BookCreateModal } from './features/books/BookCreateModal'
import { BookModal } from './features/books/BookModal'
import { BookOverview } from './features/books/BookOverview'
import { ChatMessage } from './components/ChatMessage'
import { visibleCommands } from './components/CommandMenu'
import type { CommandName, Level } from './components/CommandMenu'
import { CommandMenu } from './components/CommandMenu'
import { ContextBanner } from './components/ContextBanner'
import { ConversationCreateModal } from './features/conversations/ConversationCreateModal'
import { ConversationModal } from './features/conversations/ConversationModal'
import { DeleteModal } from './components/DeleteModal'
import { HelpModal } from './components/HelpModal'
import { Modal } from './components/Modal'
import { NoteCreateModal } from './features/notes/NoteCreateModal'
import { NoteDeleteModal } from './features/notes/NoteDeleteModal'
import { NoteListModal } from './features/notes/NoteListModal'
import { RatingModal } from './features/books/RatingModal'
import { RenameModal } from './components/RenameModal'
import { StartPage } from './components/StartPage'
import './App.css'

/** Terminal-chatt: böcker, samtal, betyg + chatt mot bokcirkel-API:t. */
export default function App() {
  const [selectedBookId, setSelectedBookId] = useState<string | null>(null)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [convRefresh, setConvRefresh] = useState(0)
  const [notesRefresh, setNotesRefresh] = useState(0)
  const [bookRefresh, setBookRefresh] = useState(0)
  const [messages, setMessages] = useState<ChatMessageType[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  // Id för bubblan som strömmas just nu — den renderas rått tills svaret är klart.
  const [streamingId, setStreamingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [command, setCommand] = useState<CommandName | null>(null)
  const [overlay, setOverlay] = useState<null | 'book-create' | 'conversation-create' | 'note-create'>(null)
  const [menuIndex, setMenuIndex] = useState(0)
  const [statusBook, setStatusBook] = useState<string | null>(null)
  const [statusConv, setStatusConv] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  // Pågående svarström - avbryts vid navigation så inga tokens läcker in i fel vy.
  const streamController = useRef<AbortController | null>(null)

  // Håll senaste raden synlig.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, sending])

  // Statusraden: hämta titlar för valda id:n.
  useEffect(() => {
    let cancelled = false
    async function load() {
      if (!selectedBookId) {
        setStatusBook(null)
        return
      }
      try {
        const title = (await getBook(selectedBookId)).title
        if (!cancelled) setStatusBook(title)
      } catch {
        if (!cancelled) setStatusBook(null)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [selectedBookId, bookRefresh])

  useEffect(() => {
    let cancelled = false
    async function load() {
      if (!conversationId) {
        setStatusConv(null)
        return
      }
      try {
        const title = (await getConversation(conversationId)).title
        if (!cancelled) setStatusConv(title)
      } catch {
        if (!cancelled) setStatusConv(null)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [conversationId, convRefresh])

  // Aktuell nivå styr vilka kommandon som syns.
  const level: Level = conversationId 
      ? 'conversation' 
      : selectedBookId 
          ? 'book' 
          : 'root'

  // Menykommandon: filtrera på ordet efter "/".
  const showMenu = input.startsWith('/') && !sending
  const matches = visibleCommands(level).filter((command) => command.name.startsWith(input.slice(1).split(' ')[0]))

  /** Stänger modal och ger fokus tillbaka till chatten. */
  function closeCommand() {
    setCommand(null)
    inputRef.current?.focus()
  }

  /** /lämna agerar direkt, övriga kommandon öppnar modal. */
  function openCommand(name: CommandName) {
    if (name === 'lämna') {
      leaveAll()
      return
    }
    setInput('')
    setError(null)
    setMenuIndex(0)
    setCommand(name)
  }

  /** Gå in i bok: rensa samtal + chatt. */
  function selectBook(id: string | null) {
    streamController.current?.abort()
    streamController.current = null
    setStreamingId(null)
    setSelectedBookId(id)
    setConversationId(null)
    setMessages([])
  }

  /** Lämna allt, tillbaka till rot. Tyst i rot. */
  function leaveAll() {
    streamController.current?.abort()
    streamController.current = null
    setStreamingId(null)
    setInput('')
    setError(null)
    setSelectedBookId(null)
    setConversationId(null)
    setMessages([])
  }

  /** Enter på /-text: /lämna agerar direkt, övrigt öppnar modal. */
  function runSlashCommand(raw: string) {
    const word = raw.split(' ')[0]
    const options = visibleCommands(level).filter((command) => command.name.startsWith(word))
    const pick = options[Math.min(menuIndex, Math.max(options.length - 1, 0))]
    if (!pick) {
      setError('Okänt kommando - skriv /help för alla kommandon')
      return
    }
    openCommand(pick.name)
  }

  /** Pilar navigerar menyn, Esc tömmer input. Enter skickas av formuläret. */
  function handleInputKey(e: KeyboardEvent<HTMLInputElement>) {
    if (!showMenu || matches.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setMenuIndex((index) => (index + 1) % matches.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setMenuIndex((index) => (index - 1 + matches.length) % matches.length)
    } else if (e.key === 'Escape') {
      setInput('')
    }
  }

  /** Skapar alltid ett helt nytt samtal (kopplat till vald bok). */
  async function createFreshConversation(): Promise<string> {
    const conv = await createConversation('Nytt samtal', selectedBookId)
    setConversationId(conv.id)
    setConvRefresh((previous) => previous + 1)
    return conv.id
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
    if (text.startsWith('/')) {
      runSlashCommand(text.slice(1))
      return
    }
    setInput('')
    setError(null)
    setSending(true)
    // Visa din rad direkt, svaret strömmas in token för token.
    // Samtal skapas lazy vid första meddelandet - ingen tomma samtal i listan.
    setMessages((previousMessages) => [...previousMessages, localMessage('user', text)])
    try {
      const id = conversationId ?? (await createFreshConversation())
      const controller = new AbortController()
      streamController.current = controller
      const placeholder = localMessage('assistant', '')
      // Tom assistentrad direkt — tokens fylls på allt eftersom de anländer.
      setMessages((previousMessages) => [...previousMessages, placeholder])
      setStreamingId(placeholder.id)
      await sendMessageStream(id, text, (token) => {
        setMessages((previousMessages) =>
          previousMessages.map((message) =>
            message.id === placeholder.id
              ? { ...message, content: message.content + token }
              : message))
      }, controller.signal)
    } catch (error) {
      // Avbruten ström (navigation) - det partiella svaret ligger redan kvar.
      if (error instanceof DOMException && error.name === 'AbortError') 
        return
      setError('Något gick fel - försök igen.')
    } finally {
      setStreamingId(null)
      streamController.current = null
      setSending(false)
    }
  }

  return (
    <div className="terminal">
      <header className="terminal-header">
        <button
          type="button"
          className="terminal-button"
          onClick={leaveAll}
          disabled={!selectedBookId && !conversationId}
          title="Lämna bok/samtal - tillbaka till rot (/lämna)"
        >
          /lämna
        </button>
        <span className="terminal-title">preNostros</span>
      </header>

      <div className="content">
        <div className="main-col">
          <ContextBanner bookTitle={statusBook} convTitle={statusConv} />
          <main className="terminal-body">
        {!selectedBookId && !conversationId ? (
          <StartPage onPick={openCommand} />
        ) : (
          <>
            {selectedBookId && !conversationId && (
          <BookOverview
            bookId={selectedBookId}
            notesRefresh={notesRefresh}
            convRefresh={convRefresh}
            onSelectConversation={(id) => void selectConversation(id)}
          />
        )}
            {messages.map((message) => (
              <ChatMessage key={message.id} message={message} streaming={message.id === streamingId} />
            ))}
            {sending && !streamingId && <div className="thinking">preNostros skriver…</div>}
          </>
        )}
        {error && <div className="terminal-error">! {error}</div>}
        <div ref={bottomRef} />
      </main>

      <div className="input-zone">
        {showMenu && (
          <CommandMenu
            commands={matches}
            selectedIndex={Math.min(menuIndex, Math.max(matches.length - 1, 0))}
            onPick={openCommand}
          />
        )}
        <form className="terminal-input" onSubmit={(e) => void handleSubmit(e)}>
          <span className="prompt">❯</span>
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => {
              setInput(e.target.value)
              setMenuIndex(0)
            }}
            onKeyDown={handleInputKey}
          placeholder="Skriv till preNostros…"
          title="Vanlig text chattar - börja med / för kommandon (/help visar alla)"
          disabled={sending}
          autoFocus
        />
        <button type="submit" disabled={sending || !input.trim()}>
          skicka
        </button>
        </form>
        </div>
        </div>
      </div>
      {command === 'bok' && !overlay && (
        <Modal title="/bok" onClose={closeCommand} showClose={false}>
          <BookModal
            selectedId={selectedBookId}
            onSelect={selectBook}
            onCreate={() => setOverlay('book-create')}
            onClose={closeCommand}
          />
        </Modal>
      )}
      {command === 'samtal' && !overlay && (
        <Modal title="/samtal" onClose={closeCommand}>
          <ConversationModal
            bookId={selectedBookId}
            activeId={conversationId}
            onSelect={(id) => void selectConversation(id)}
            onCreate={() => setOverlay('conversation-create')}
            onClose={closeCommand}
          />
        </Modal>
      )}
      {command === 'betyg' && (
        <Modal title="/betyg" onClose={closeCommand}>
          {selectedBookId ? (
            <RatingModal
              bookId={selectedBookId}
              onSaved={() => {
                setNotesRefresh((previous) => previous + 1)
                closeCommand()
              }}
            />
          ) : (
            <div className="dim">Välj en bok först med <span className="cmd">/bok</span>.</div>
          )}
        </Modal>
      )}
      {command === 'anteckning' && !overlay && (
        <Modal title="/anteckning" onClose={closeCommand}>
          {selectedBookId ? (
            <NoteListModal bookId={selectedBookId} onCreate={() => setOverlay('note-create')} />
          ) : (
            <div className="dim">Välj en bok först med <span className="cmd">/bok</span>.</div>
          )}
        </Modal>
      )}
      {overlay === 'book-create' && (
        <Modal title="/bok-ny" onClose={() => setOverlay(null)}>
          <BookCreateModal
            onCreated={(id) => {
              setSelectedBookId(id)
              setBookRefresh((previous) => previous + 1)
              setOverlay(null)
            }}
          />
        </Modal>
      )}
      {overlay === 'conversation-create' && (
        <Modal title="/samtal-ny" onClose={() => setOverlay(null)}>
          <ConversationCreateModal
            bookId={selectedBookId}
            onCreated={(id) => {
              setConversationId(id)
              setMessages([])
              setConvRefresh((previous) => previous + 1)
              setOverlay(null)
            }}
          />
        </Modal>
      )}
      {overlay === 'note-create' && selectedBookId && (
        <Modal title="/anteckning-ny" onClose={() => setOverlay(null)}>
          <NoteCreateModal
            bookId={selectedBookId}
            onCreated={() => {
              setNotesRefresh((previous) => previous + 1)
              setOverlay(null)
            }}
          />
        </Modal>
      )}
      {command === 'döp-om' && (
        <Modal title="/döp-om" onClose={closeCommand}>
          {conversationId ? (
            <RenameModal
              kind="conversation"
              id={conversationId}
              onSaved={() => {
                setConvRefresh((previous) => previous + 1)
                closeCommand()
              }}
            />
          ) : selectedBookId ? (
            <RenameModal
              kind="book"
              id={selectedBookId}
              onSaved={(title) => {
                setStatusBook(title)
                setBookRefresh((previous) => previous + 1)
                closeCommand()
              }}
            />
          ) : (
            <div className="dim">Välj en bok eller ett samtal först.</div>
          )}
        </Modal>
      )}
      {command === 'radera' && (
        <Modal title="/radera" onClose={closeCommand}>
          {conversationId ? (
            <DeleteModal
              kind="conversation"
              id={conversationId}
              onDeleted={() => {
                setConversationId(null)
                setMessages([])
                setConvRefresh((previous) => previous + 1)
                closeCommand()
              }}
            />
          ) : selectedBookId ? (
            <DeleteModal
              kind="book"
              id={selectedBookId}
              onDeleted={() => {
                setSelectedBookId(null)
                setConversationId(null)
                setMessages([])
                setBookRefresh((previous) => previous + 1)
                closeCommand()
              }}
            />
          ) : (
            <div className="dim">Välj en bok eller ett samtal först.</div>
          )}
        </Modal>
      )}
      {command === 'help' && (
        <Modal title="/help" onClose={closeCommand}>
          <HelpModal />
        </Modal>
      )}
      {command === 'anteckningar' && !overlay && (
        <Modal title="/anteckningar" onClose={closeCommand}>
          {selectedBookId ? (
            <NoteListModal bookId={selectedBookId} onCreate={() => setOverlay('note-create')} />
          ) : (
            <div className="dim">Välj en bok först med <span className="cmd">/bok</span>.</div>
          )}
        </Modal>
      )}
      {command === 'anteckning-radera' && (
        <Modal title="/anteckning-radera" onClose={closeCommand}>
          {selectedBookId ? (
            <NoteDeleteModal
              bookId={selectedBookId}
              onDeleted={() => {
                setNotesRefresh((previous) => previous + 1)
                closeCommand()
              }}
            />
          ) : (
            <div className="dim">Välj en bok först med <span className="cmd">/bok</span>.</div>
          )}
        </Modal>
      )}
    </div>
  )
}

/** Tillfällig rad innan servern svarat (servern sparar sin egen kopia). */
function localMessage(role: string, content: string): ChatMessageType {
  return { id: crypto.randomUUID(), role, content, createdAt: new Date().toISOString() }
}
