import type { Book, Conversation, ConversationDetail, Note, NoteKind, SendMessageResponse } from './types'

const API_BASE = 'http://localhost:5037'

/** fetch med JSON + fel vid icke-2xx. Anroparen visar felet. */
async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  })
  if (!res.ok) throw new Error(`API ${res.status} på ${path}`)
  return res.json() as Promise<T>
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
  const path = bookId ? `/api/conversations?bookId=${bookId}` : '/api/conversations'
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

/** Hämtar alla anteckningar för en bok. */
export function listNotes(bookId: string): Promise<Note[]> {
  return apiFetch<Note[]>(`/api/books/${bookId}/notes`)
}

/** Sparar en anteckning (rating krävs för Betyg). */
export function createNote(
  bookId: string,
  kind: NoteKind,
  content: string,
  rating: number | null,
): Promise<Note> {
  return apiFetch<Note>(`/api/books/${bookId}/notes`, {
    method: 'POST',
    body: JSON.stringify({ kind, content, rating }),
  })
}
