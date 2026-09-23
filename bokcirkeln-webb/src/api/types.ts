/** POST /api/conversations (201) och GET /api/conversations. */
export interface Conversation {
  id: string
  title: string
  bookId: string | null
  createdAt: string
}

/** Ett chattmeddelande. role är "user" eller "assistant". */
export interface ChatMessage {
  id: string
  role: string
  content: string
  createdAt: string
}

/** Svaret från POST /api/conversations/{id}/messages. */
export interface SendMessageResponse {
  reply: string
}
