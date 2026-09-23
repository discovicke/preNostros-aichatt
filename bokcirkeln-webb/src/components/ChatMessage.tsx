import type { ChatMessage as ChatMessageType } from '../api/types'


export function ChatMessage({ message }: { message: ChatMessageType }) {
  const mine = message.role === 'user'
  return (
    <div className={mine 
        ? 'line mine' 
        : 'line theirs'}>
      <span className="who">{mine 
          ? 'du>' 
          : 'ai>'}</span>
      <span className="text">{message.content}</span>
    </div>
  )
}
