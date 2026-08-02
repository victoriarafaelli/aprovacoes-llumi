'use client'

/**
 * MarkdownField — textarea com barra de formatação simples (negrito, lista
 * com marcadores, lista numerada) que insere sintaxe Markdown na seleção
 * atual do cursor. Mesma interface (value/onChange/rows/placeholder/
 * className) da textarea que substitui — troca direta em cada formulário.
 *
 * O texto renderizado é lido por MarkdownText (mesmas regras de segurança:
 * sem HTML bruto, sem dangerouslySetInnerHTML).
 */

import { useRef } from 'react'

function ToolbarButton({
  onClick,
  title,
  children,
}: {
  onClick: () => void
  title: string
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()} // evita perder o foco/seleção da textarea
      onClick={onClick}
      title={title}
      className="w-7 h-7 flex items-center justify-center rounded-lg text-xs font-semibold text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
    >
      {children}
    </button>
  )
}

export function MarkdownField({
  value,
  onChange,
  rows = 4,
  placeholder,
  className,
}: {
  value: string
  onChange: (value: string) => void
  rows?: number
  placeholder?: string
  className?: string
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const applySelection = (start: number, end: number, newValue: string) => {
    onChange(newValue)
    requestAnimationFrame(() => {
      const el = textareaRef.current
      if (!el) return
      el.focus()
      el.setSelectionRange(start, end)
    })
  }

  const handleBold = () => {
    const el = textareaRef.current
    if (!el) return
    const start = el.selectionStart
    const end = el.selectionEnd
    const selected = value.slice(start, end)
    const text = selected || 'texto em negrito'
    const newValue = value.slice(0, start) + `**${text}**` + value.slice(end)
    applySelection(start + 2, start + 2 + text.length, newValue)
  }

  const handleList = (marker: (lineIndex: number) => string) => {
    const el = textareaRef.current
    if (!el) return
    const start = el.selectionStart
    const end = el.selectionEnd

    const lineStart = value.lastIndexOf('\n', start - 1) + 1
    const nextBreak  = value.indexOf('\n', end > start ? end - 1 : end)
    const lineEnd    = nextBreak === -1 ? value.length : nextBreak

    const block = value.slice(lineStart, lineEnd)
    const lines = block.length ? block.split('\n') : ['']
    const newBlock = lines.map((line, i) => `${marker(i)}${line}`).join('\n')

    const newValue = value.slice(0, lineStart) + newBlock + value.slice(lineEnd)
    applySelection(lineStart, lineStart + newBlock.length, newValue)
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-0.5 -mb-0.5">
        <ToolbarButton onClick={handleBold} title="Negrito">
          B
        </ToolbarButton>
        <ToolbarButton onClick={() => handleList(() => '- ')} title="Lista com marcadores">
          •≡
        </ToolbarButton>
        <ToolbarButton onClick={() => handleList((i) => `${i + 1}. `)} title="Lista numerada">
          1.≡
        </ToolbarButton>
      </div>
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        placeholder={placeholder}
        className={className}
      />
    </div>
  )
}
