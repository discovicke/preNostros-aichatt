import type { Book, Conversation, ConversationDetail, Note, NoteKind, SendMessageResponse } from './types'

const API_BASE = 'http://localhost:5037'

/** fetch med JSON + fel vid icke-2xx. Anroparen visar felet. */
async function apiFetch<TResponse>(path: string, init?: RequestInit): Promise<TResponse> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  })
  if (!res.ok) 
    throw new Error(`API ${res.status} på ${path}`)
  return res.json() as Promise<TResponse>
}

/** Skapar ett nytt samtal, valfritt kopplat till en bok. */
export function createConversation(title: string, bookId: string | null): Promise<Conversation> {
  return apiFetch<Conversation>('/api/conversations', {
    method: 'POST',
    body: JSON.stringify({ title, bookId }),
  })
}

/** Hämtar samtal, nyaste först. Filtrera med bok-id. */
export function listConversations(bookId?: string | null): Promise<Conversation[]> {
  const path = bookId 
      ? `/api/conversations?bookId=${bookId}` 
      : '/api/conversations'
  return apiFetch<Conversation[]>(path)
}

/** Hämtar ett samtal med hela meddelandehistoriken. */
export function getConversation(id: string): Promise<ConversationDetail> {
  return apiFetch<ConversationDetail>(`/api/conversations/${id}`)
}

/** Skickar ett meddelande, får bokcirkelsledarens svar. */
export function sendMessage(conversationId: string, content: string): Promise<SendMessageResponse> {
  return apiFetch<SendMessageResponse>(`/api/conversations/${conversationId}/messages`, {
    method: 'POST',
    body: JSON.stringify({ content }),
  })
}

/** En SSE-händelse från svarströmmen: token-chunk, fel eller slut. */
interface StreamEvent {
  event: 'token' | 'error' | 'done'
  data: string
}

/** Delar upp en rå SSE-händelse (rader fram till tomrad) i typ + data. */
function parseStreamEvent(rawEvent: string): StreamEvent | null {
  let eventType = 'message'
  const dataLines: string[] = []
  for (const line of rawEvent.split('\n')) {
    if (line.startsWith('event:')) {
      eventType = line.slice('event:'.length).trim()
    } else if (line.startsWith('data:')) {
      dataLines.push(line.slice('data:'.length).trim())
    }
  }
  const data = dataLines.join('\n')
  if (data === '[DONE]') 
    return { event: 'done', data }
  if (eventType === 'error') 
    return { event: 'error', data }
  if (!data) 
    return null
  return { event: 'token', data }
}

/**
 * Skickar ett meddelande och strömmar svaret token för token.
 * Anropar onToken för varje chunk; klar när löftet resolvas.
 * Kastar Error vid HTTP-fel, fel mitt i strömmen eller avsaknad av strömstöd.
 */
export async function sendMessageStream(
  conversationId: string,
  content: string,
  onToken: (token: string) => void,
  signal?: AbortSignal,
): Promise<void> {
  const res = await fetch(`${API_BASE}/api/conversations/${conversationId}/messages/stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content }),
    signal,
  })
  await consumeStream(res, conversationId, onToken)
}

/**
 * Regenererar det senaste svaret utan nytt användarmeddelande.
 * Samma SSE-protokoll och felhantering som sendMessageStream.
 */
export async function sendRegenerateStream(
  conversationId: string,
  onToken: (token: string) => void,
  signal?: AbortSignal,
): Promise<void> {
  const res = await fetch(`${API_BASE}/api/conversations/${conversationId}/messages/regenerate`, {
    method: 'POST',
    signal,
  })
  await consumeStream(res, conversationId, onToken)
}

/** Läser en SSE-svarström till [DONE] och anropar onToken per token-chunk. */
async function consumeStream(
  res: Response,
  conversationId: string,
  onToken: (token: string) => void,
): Promise<void> {
  if (!res.ok)
    throw new Error(`API ${res.status} på /api/conversations/${conversationId}/messages/stream`)
  if (!res.body)
    throw new Error('Strömning stöds inte i webbläsaren.')

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  for (;;) {
    const { done, value } = await reader.read()
    if (done) 
      break
    buffer += decoder.decode(value, { stream: true })
    let boundary = buffer.indexOf('\n\n')
    while (boundary !== -1) {
      const streamEvent = parseStreamEvent(buffer.slice(0, boundary))
      buffer = buffer.slice(boundary + 2)
      if (streamEvent?.event === 'error') {
        const message = (JSON.parse(streamEvent.data) as { error?: string }).error ?? 'Okänt strömfel.'
        throw new Error(message)
      }
      if (streamEvent?.event === 'token') {
        onToken((JSON.parse(streamEvent.data) as { token: string }).token)
      }
      boundary = buffer.indexOf('\n\n')
    }
  }
}

/** Hämtar alla böcker, nyaste först. */
export function listBooks(): Promise<Book[]> {
  return apiFetch<Book[]>('/api/books')
}

/** Skapar en ny bok. */
export function createBook(title: string, author: string): Promise<Book> {
  return apiFetch<Book>('/api/books', {
    method: 'POST',
    body: JSON.stringify({ title, author }),
  })
}

/** Uppdaterar titel och författare på en bok. */
export function updateBook(id: string, title: string, author: string): Promise<Book> {
  return apiFetch<Book>(`/api/books/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ title, author }),
  })
}

/** Hämtar en enskild bok. */
export function getBook(id: string): Promise<Book> {
  return apiFetch<Book>(`/api/books/${id}`)
}

/** Sätter eller rensar bokens betyg (null = rensa). */
export function updateBookRating(bookId: string, rating: number | null, motivation: string | null): Promise<Book> {
  return apiFetch<Book>(`/api/books/${bookId}/rating`, {
    method: 'PUT',
    body: JSON.stringify({ rating, motivation }),
  })
}

const summaryCache = new Map<string, string>()

/** Hämtar AI-sammanfattning (cachas per bok i sessionen). */
export async function getBookSummary(bookId: string): Promise<string> {
  const cached = summaryCache.get(bookId)
  if (cached !== undefined) 
    return cached
  const res = await apiFetch<{ summary: string }>(`/api/books/${bookId}/summary`)
  summaryCache.set(bookId, res.summary)
  return res.summary
}

/** Hämtar alla anteckningar för en bok. */
export function listNotes(bookId: string): Promise<Note[]> {
  return apiFetch<Note[]>(`/api/books/${bookId}/notes`)
}

/** Sparar en anteckning (rating krävs för Betyg, text valfri för Betyg). */
export function createNote(
  bookId: string,
  kind: NoteKind,
  content: string | null,
  rating: number | null,
): Promise<Note> {
  return apiFetch<Note>(`/api/books/${bookId}/notes`, {
    method: 'POST',
    body: JSON.stringify({ kind, content, rating }),
  })
}

/** Anrop utan svarskropp (204). Kastar Error vid fel. */
async function apiVoid(path: string, init?: RequestInit): Promise<void> {
  const res = await fetch(`${API_BASE}${path}`, init)
  if (!res.ok) 
    throw new Error(`API ${res.status} på ${path}`)
}

/** Raderar en bok med samtal och anteckningar. */
export function deleteBook(id: string): Promise<void> {
  return apiVoid(`/api/books/${id}`, { method: 'DELETE' })
}

/** Döper om ett samtal. */
export function updateConversation(id: string, title: string): Promise<Conversation> {
  return apiFetch<Conversation>(`/api/conversations/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ title }),
  })
}

/** Raderar ett samtal med meddelanden. */
export function deleteConversation(id: string): Promise<void> {
  return apiVoid(`/api/conversations/${id}`, { method: 'DELETE' })
}

/** Uppdaterar innehåll och/eller betyg på en anteckning. */
export function updateNote(
  bookId: string,
  noteId: string,
  content: string | null,
  rating: number | null,
): Promise<Note> {
  return apiFetch<Note>(`/api/books/${bookId}/notes/${noteId}`, {
    method: 'PUT',
    body: JSON.stringify({ content, rating }),
  })
}

/** Raderar en anteckning. */
export function deleteNote(bookId: string, noteId: string): Promise<void> {
  return apiVoid(`/api/books/${bookId}/notes/${noteId}`, { method: 'DELETE' })
}
