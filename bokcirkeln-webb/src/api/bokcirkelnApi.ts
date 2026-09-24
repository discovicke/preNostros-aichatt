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
