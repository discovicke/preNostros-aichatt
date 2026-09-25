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

/**
 * Markdown med terminaltema (se .md-* i App.css).
 * Rå HTML parsas aldrig - AI-texten har ingen XSS-yta.
 * Betoning sker med vanlig markdown (**fet**, *kursiv*, `kod`) och stylas
 * via .md-* i App.css - samma teknik som Claude/OpenCode: återhållsam
 * inline-betoning istället för egenhändiga ??-markörer.
 */
export function Markdown({ content }: { content: string }) {
  return <ThemedMarkdown content={content} />
}
