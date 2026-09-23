/** Typer som speglar backend-DTOerna (JSON är camelCase). */

/** POST /api/conversations (201) och GET /api/conversations. */
export interface Conversation {
  id: string
  title: string
  bookId: string | null
  createdAt: string
}

/** GET /api/conversations/{id} — samtal med historik. */
export interface ConversationDetail extends Conversation {
  messages: ChatMessage[]
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

/** En bok. */
export interface Book {
  id: string
  title: string
  author: string
  createdAt: string
}

/** Typ av anteckning. Motsvarar backend-ens NoteKind. */
export type NoteKind = 'Citat' | 'Tanke' | 'Analys' | 'Betyg'

/** En sparad anteckning om en bok. */
export interface Note {
  id: string
  kind: NoteKind
  content: string
  rating: number | null
  conversationId: string | null
  createdAt: string
}
