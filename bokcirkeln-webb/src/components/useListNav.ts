import { useState } from 'react'

/** Piltangentsnavigering för en lista med givet antal rader. */
export function useListNav(count: number) {
  const [index, setIndex] = useState(0)
  const safeIndex = count === 0 
      ? 0 
      : Math.min(index, count - 1)

  /** Flytta markeringen. Lopar runt i båda riktningarna. */
  function move(delta: number) {
    if (count === 0) 
      return
    setIndex((((safeIndex + delta) % count) + count) % count)
  }

  /** Sätt markeringen direkt (mus-hover). */
  function highlight(targetIndex: number) {
    setIndex(targetIndex)
  }

  return { index: safeIndex, move, highlight }
}

/** Sant när fokus står i ett textfält - då ska pilarna inte kapas av listan. */
export function isTyping(): boolean {
  const tag = document.activeElement?.tagName.toLowerCase() ?? ''
  return tag === 'input' || tag === 'textarea' || tag === 'select'
}
