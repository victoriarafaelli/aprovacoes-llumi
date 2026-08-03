'use client'

/**
 * MarkdownField — editor visual (WYSIWYG) de negrito e listas, comportamento
 * parecido com Word/Google Docs: nenhuma sintaxe Markdown aparece na tela
 * (sem `**`, `-`, `1.` visíveis), listas continuam automaticamente ao
 * apertar Enter e saem da lista com Enter duas vezes, numeração é automática.
 *
 * Por baixo, o conteúdo é serializado como Markdown puro (via tiptap-markdown)
 * — mesma string que sempre foi salva no banco e lida por MarkdownText no
 * link público. `breaks: true` replica o remark-breaks usado na renderização,
 * então texto antigo (sem sintaxe) carrega e edita normalmente.
 *
 * Mesma interface (value/onChange/rows/placeholder/className) da versão
 * anterior baseada em textarea — troca transparente em cada call site.
 */

import { useEffect, useRef } from 'react'
import { useEditor, EditorContent, Extension } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import { Markdown, type MarkdownStorage } from 'tiptap-markdown'

// tiptap-markdown não declara essa extensão de tipo — sem isso,
// `editor.storage.markdown` não é reconhecido pelo TypeScript.
declare module '@tiptap/core' {
  interface Storage {
    markdown: MarkdownStorage
  }
}

/**
 * O atalho padrão de Enter do ListItem (StarterKit) só tenta splitListItem —
 * quando o item já está vazio esse comando devolve false e não há fallback,
 * então o Enter fica "preso" criando item vazio atrás de item vazio.
 * Aqui a gente completa a cadeia: se não der pra dividir, tenta sair da
 * lista (liftListItem) — replica o "Enter duas vezes sai da lista" do
 * Word/Docs.
 */
const ExitListOnEmptyEnter = Extension.create({
  name: 'exitListOnEmptyEnter',
  addKeyboardShortcuts() {
    return {
      Enter: () =>
        this.editor.commands.first(({ commands }) => [
          () => commands.splitListItem('listItem'),
          () => commands.liftListItem('listItem'),
        ]),
    }
  },
})

function ToolbarButton({
  onClick,
  active,
  title,
  children,
}: {
  onClick: () => void
  active?: boolean
  title: string
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()} // evita perder o foco do editor
      onClick={onClick}
      title={title}
      className={`w-7 h-7 flex items-center justify-center rounded-lg text-xs font-semibold transition-colors ${
        active ? 'bg-indigo-100 text-indigo-700' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
      }`}
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
  // Guarda o último valor que o PRÓPRIO editor emitiu. Assim o efeito de
  // sincronização abaixo só reseta o conteúdo quando `value` muda por um
  // motivo externo (ex: trocar de conteúdo selecionado) — nunca por causa
  // do ciclo normal onUpdate → onChange → nova prop `value`, que senão
  // reseta o documento (e a posição do cursor) a cada tecla digitada.
  const lastEmittedRef = useRef(value)

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: false,
        blockquote: false,
        codeBlock: false,
        horizontalRule: false,
        link: false,
      }),
      Placeholder.configure({ placeholder: placeholder ?? '' }),
      Markdown.configure({ html: false, breaks: true, transformPastedText: true }),
      ExitListOnEmptyEnter,
    ],
    content: value,
    onUpdate: ({ editor }) => {
      const markdown = editor.storage.markdown.getMarkdown()
      lastEmittedRef.current = markdown
      onChange(markdown)
    },
  })

  useEffect(() => {
    if (!editor) return
    if (value !== lastEmittedRef.current) {
      lastEmittedRef.current = value
      editor.commands.setContent(value, { emitUpdate: false })
    }
  }, [value, editor])

  const minHeight = `${rows * 1.5 + 1}rem`

  return (
    <div className="flex flex-col gap-1">
      <style jsx global>{`
        .md-editor-content .ProseMirror { outline: none; }
        .md-editor-content .ProseMirror p { margin: 0 0 0.5rem 0; }
        .md-editor-content .ProseMirror p:last-child { margin-bottom: 0; }
        .md-editor-content .ProseMirror ul { list-style: disc; padding-left: 1.25rem; margin: 0 0 0.5rem 0; }
        .md-editor-content .ProseMirror ol { list-style: decimal; padding-left: 1.25rem; margin: 0 0 0.5rem 0; }
        .md-editor-content .ProseMirror li { margin: 0.125rem 0; }
        .md-editor-content .ProseMirror li p { margin: 0; }
        .md-editor-content .ProseMirror strong { font-weight: 600; }
        .md-editor-content .ProseMirror p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          float: left;
          height: 0;
          pointer-events: none;
          color: #d1d5db;
        }
      `}</style>
      <div className="flex items-center gap-0.5 -mb-0.5">
        <ToolbarButton
          onClick={() => editor?.chain().focus().toggleBold().run()}
          active={editor?.isActive('bold')}
          title="Negrito"
        >
          B
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor?.chain().focus().toggleBulletList().run()}
          active={editor?.isActive('bulletList')}
          title="Lista com marcadores"
        >
          •≡
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor?.chain().focus().toggleOrderedList().run()}
          active={editor?.isActive('orderedList')}
          title="Lista numerada"
        >
          1.≡
        </ToolbarButton>
      </div>
      <div className={`md-editor-content ${className ?? ''}`} style={{ minHeight, overflowY: 'auto' }}>
        <EditorContent editor={editor} />
      </div>
    </div>
  )
}
