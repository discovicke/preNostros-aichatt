import type { AnchorHTMLAttributes, ReactNode } from 'react'
import MarkdownToJsx from 'markdown-to-jsx'

/** Länk som alltid öppnas i ny flik utan opener-access. */
function MarkdownLink({ children, ...rest }: AnchorHTMLAttributes<HTMLAnchorElement>) {
  return (
    <a {...rest} target="_blank" rel="noreferrer" className="md-link">
      {children as ReactNode}
    </a>
  )
}

/** Ett markdown-segment med terminaltema. */
function ThemedMarkdown({ content }: { content: string }) {
  return (
    <MarkdownToJsx
      options={{
        disableParsingRawHTML: true,
        forceBlock: true,
        overrides: {
          p: { props: { className: 'md-p' } },
          strong: { props: { className: 'md-strong' } },
          code: { props: { className: 'md-code' } },
          pre: { props: { className: 'md-block' } },
          ul: { props: { className: 'md-list' } },
          ol: { props: { className: 'md-list md-ordered' } },
          blockquote: { props: { className: 'md-quote' } },
          a: { component: MarkdownLink },
          h1: { props: { className: 'md-heading' } },
          h2: { props: { className: 'md-heading' } },
          h3: { props: { className: 'md-heading' } },
        },
      }}
    >
      {content}
    </MarkdownToJsx>
  )
}

/** Ett stycke av innehållet: vanlig text eller en ??-fråga från modellen. */
type ContentPart = string | { question: string }

/**
 * Delar upp ??...??-markörer (AI:ns fråga till läsaren) i egna delar.
 * Matchningar över styckegränser ignoreras - de renderas som vanlig text
 * istället för att trasiga markörer ska spräcka blockstrukturen.
 * Oparade ?? lämnas orörda (ofarliga tecken som knappt syns).
 */
function splitQuestions(content: string): ContentPart[] {
  // Rader som bara innehåller ? är aldrig äkta prosa — modellen råkar ibland
  // lämna ett löst frågetecken efter den avslutande ??-markören.
  const cleaned = content.replace(/^\s*\?{1,3}\s*$/gm, '')
  const parts: ContentPart[] = []
  const pattern = /\?\?(.+?)\?\?/gs
  let cursor = 0
  let match: RegExpExecArray | null
  while ((match = pattern.exec(cleaned)) !== null) {
    if (match[1].includes('\n\n') || match[1].trim().length === 0)
      continue
    // Svälj upp till två ? direkt efter stängande markör (??fråga????-fallet) —
    // äkta text har aldrig ? klistrade direkt mot ??.
    let end = match.index + match[0].length
    let swallowed = 0
    while (swallowed < 2 && cleaned[end] === '?') {
      end += 1
      swallowed += 1
    }
    // Garantera frågetecken — modellen glömmer det ibland innanför markören.
    const trimmed = match[1].trim()
    const question = trimmed.endsWith('?') || trimmed.endsWith('!')
      ? trimmed
      : `${trimmed}?`
    parts.push(cleaned.slice(cursor, match.index))
    parts.push({ question })
    cursor = end
  }
  parts.push(cleaned.slice(cursor))
  return parts.filter((part) => typeof part !== 'string' || part.length > 0)
}

/**
 * Markdown med terminaltema (se .md-* i App.css).
 * Rå HTML parsas aldrig - AI-texten har ingen XSS-yta.
 * Renderas bara för färdiga svar (aldrig under strömning), så halva
 * ??-markörer hinner aldrig blinka.
 */
export function Markdown({ content }: { content: string }) {
  const parts = splitQuestions(content)
  return (
    <>
      {parts.map((part, index) =>
        typeof part === 'string' ? (
          <ThemedMarkdown key={index} content={part} />
        ) : (
          <div key={index} className="md-question">
            <ThemedMarkdown content={part.question} />
          </div>
        ))}
    </>
  )
}
