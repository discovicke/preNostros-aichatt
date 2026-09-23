import type { Conversation, SendMessageResponse } from './types'

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

/** Skapar ett nytt samtal. */
export function createConversation(title: string): Promise<Conversation> {
  return apiFetch<Conversation>('/api/conversations', {
    method: 'POST',
    body: JSON.stringify({ title, bookId: null }),
  })
}

/** Skickar ett meddelande, får bokcirkelsledarens svar. */
export function sendMessage(conversationId: string, content: string): Promise<SendMessageResponse> {
  return apiFetch<SendMessageResponse>(`/api/conversations/${conversationId}/messages`, {
    method: 'POST',
    body: JSON.stringify({ content }),
  })
}
