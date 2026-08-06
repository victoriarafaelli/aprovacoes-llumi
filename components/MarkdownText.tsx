'use client'

/**
 * MarkdownText — renderização segura de Markdown (negrito, listas) para
 * campos de texto livre (copy, roteiro, legenda, observações).
 *
 * remark-breaks converte quebras de linha simples em <br />, preservando
 * a aparência de conteúdo antigo (sem sintaxe Markdown) que hoje é exibido
 * com `whitespace-pre-wrap` — sem esse plugin, Markdown padrão colapsaria
 * cada \n dentro de um parágrafo, mudando a aparência de todo o histórico.
 *
 * Não renderiza HTML bruto (sem rehype-raw, sem dangerouslySetInnerHTML) —
 * qualquer tag HTML digitada pelo usuário aparece como texto literal.
 *
 * O className recebido é aplicado no container e herdado pelos elementos
 * internos (cor e tamanho de fonte são propriedades CSS herdáveis), então
 * cada call site mantém sua variante visual atual só passando a mesma
 * classe que usava no <p> antigo (sem `whitespace-pre-wrap`).
 */

import ReactMarkdown, { type Components } from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkBreaks from 'remark-breaks'

const components: Components = {
  p:      ({ children }) => <p className="mb-4 last:mb-0">{children}</p>,
  strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
  em:     ({ children }) => <em className="italic">{children}</em>,
  ul:     ({ children }) => <ul className="list-disc list-outside pl-5 mb-2 last:mb-0 space-y-0.5">{children}</ul>,
  ol:     ({ children }) => <ol className="list-decimal list-outside pl-5 mb-2 last:mb-0 space-y-0.5">{children}</ol>,
  li:     ({ children }) => <li>{children}</li>,
  a: ({ children, href }) => (
    <a href={href} target="_blank" rel="noopener noreferrer" className="underline">
      {children}
    </a>
  ),
}

export function MarkdownText({
  text,
  className = '',
}: {
  text: string | null | undefined
  className?: string
}) {
  if (!text) return null

  return (
    <div className={className}>
      <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]} components={components}>
        {text}
      </ReactMarkdown>
    </div>
  )
}
