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

/**
 * Markdown med terminaltema (se .md-* i App.css).
 * Rå HTML parsas aldrig - AI-texten har ingen XSS-yta.
 */
export function Markdown({ content }: { content: string }) {
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
