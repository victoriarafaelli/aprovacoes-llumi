'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ContentFormData, isVideoFormat } from '@/types'
import { ContentFormFields, EMPTY_CONTENT } from '@/components/ContentFormFields'

// ─── Card de conteúdo ─────────────────────────────────────────────────────────
function ContentCard({
  index,
  total,
  content,
  onChange,
  onRemove,
  onMoveUp,
  onMoveDown,
}: {
  index: number
  total: number
  content: ContentFormData
  onChange: (data: ContentFormData) => void
  onRemove: () => void
  onMoveUp: () => void
  onMoveDown: () => void
}) {
  return (
    <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
      {/* Header do card */}
      <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-gray-50">
        <span className="text-xs font-semibold text-gray-400 tracking-wide uppercase">
          Conteúdo {index + 1}
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={onMoveUp}
            disabled={index === 0}
            title="Mover para cima"
            className="text-gray-300 hover:text-indigo-400 disabled:opacity-20 transition-colors w-6 h-6 flex items-center justify-center"
          >
            ↑
          </button>
          <button
            onClick={onMoveDown}
            disabled={index === total - 1}
            title="Mover para baixo"
            className="text-gray-300 hover:text-indigo-400 disabled:opacity-20 transition-colors w-6 h-6 flex items-center justify-center"
          >
            ↓
          </button>
          <button
            onClick={onRemove}
            className="text-gray-300 hover:text-red-400 transition-colors text-xl leading-none w-6 h-6 flex items-center justify-center ml-1"
            aria-label="Remover"
          >
            ×
          </button>
        </div>
      </div>

      <div className="px-5 py-4 flex flex-col gap-4">
        <ContentFormFields content={content} onChange={onChange} />
      </div>
    </div>
  )
}

// ─── Página principal ─────────────────────────────────────────────────────────
export default function CriarPage() {
  const [clientName, setClientName]     = useState('')
  const [monthRef, setMonthRef]         = useState('')
  const [contents, setContents]         = useState<ContentFormData[]>([EMPTY_CONTENT()])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [shareLink, setShareLink]       = useState<string | null>(null)
  const [copied, setCopied]             = useState(false)
  const [error, setError]               = useState<string | null>(null)

  const addContent    = () => setContents((prev) => [...prev, EMPTY_CONTENT()])
  const updateContent = (index: number, data: ContentFormData) =>
    setContents((prev) => prev.map((c, i) => (i === index ? data : c)))
  const removeContent = (index: number) => {
    if (contents.length === 1) return
    setContents((prev) => prev.filter((_, i) => i !== index))
  }
  const moveContent = (from: number, to: number) => {
    setContents((prev) => {
      const next = [...prev]
      const [item] = next.splice(from, 1)
      next.splice(to, 0, item)
      return next
    })
  }

  const handleSubmit = async () => {
    setError(null)

    if (!clientName.trim()) return setError('Informe o nome do cliente.')
    if (!monthRef.trim())   return setError('Informe o mês de referência.')

    for (let i = 0; i < contents.length; i++) {
      const c = contents[i]
      if (!c.title.trim())
        return setError(`Preencha o título do conteúdo ${i + 1}.`)
      if (c.social_networks.length === 0)
        return setError(`Selecione ao menos uma rede para o conteúdo ${i + 1}.`)
      if (isVideoFormat(c.type) && !c.video_script.trim())
        return setError(`Preencha o roteiro do conteúdo ${i + 1}.`)
      if (!isVideoFormat(c.type) && !c.copy_text.trim())
        return setError(`Preencha a copy do conteúdo ${i + 1}.`)
    }

    setIsSubmitting(true)
    try {
      const res = await fetch('/api/plans', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          client_name:     clientName.trim(),
          month_reference: monthRef.trim(),
          contents,
        }),
      })
      const data = await res.json()
      if (!res.ok) return setError(data.error || 'Erro ao criar planejamento.')
      setShareLink(`${window.location.origin}/aprovar/${data.share_token}`)
    } catch {
      setError('Erro de conexão. Tente novamente.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCopy = () => {
    if (!shareLink) return
    navigator.clipboard.writeText(shareLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // ── Tela de sucesso ───────────────────────────────────────────────────────
  if (shareLink) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center flex flex-col items-center gap-5">
          <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center">
            <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Link gerado!</h2>
            <p className="text-sm text-gray-500 mt-1">
              Copie o link abaixo e envie para o seu cliente pelo WhatsApp.
            </p>
          </div>
          <div className="w-full flex flex-col gap-2">
            <div className="bg-gray-50 border border-gray-100 rounded-xl px-3 py-2.5">
              <span className="text-xs text-gray-400 break-all">{shareLink}</span>
            </div>
            <button
              onClick={handleCopy}
              className={`w-full py-3 rounded-xl text-sm font-semibold transition-all ${
                copied ? 'bg-green-500 text-white' : 'bg-indigo-600 hover:bg-indigo-700 text-white'
              }`}
            >
              {copied ? 'Copiado!' : 'Copiar link'}
            </button>
          </div>
          <Link href="/" className="text-sm text-gray-400 hover:text-gray-600 transition-colors">
            Voltar para o início
          </Link>
        </div>
      </main>
    )
  }

  // ── Formulário ────────────────────────────────────────────────────────────
  return (
    <main className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
          <Link href="/" className="text-gray-400 hover:text-gray-600 transition-colors text-lg">←</Link>
          <h1 className="text-lg font-bold text-gray-900">Novo planejamento</h1>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 flex flex-col gap-5">
        {/* Dados do cliente */}
        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm flex flex-col gap-4">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Informações</h2>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Nome do cliente</label>
            <input
              type="text"
              placeholder='Ex: "Clínica Bella Vita"'
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Mês de referência</label>
            <input
              type="text"
              placeholder='Ex: "Maio 2026"'
              value={monthRef}
              onChange={(e) => setMonthRef(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-transparent"
            />
          </div>
        </div>

        {/* Conteúdos */}
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-700">
            Conteúdos <span className="text-gray-400 font-normal">({contents.length})</span>
          </h2>
        </div>

        {contents.map((content, index) => (
          <ContentCard
            key={index}
            index={index}
            total={contents.length}
            content={content}
            onChange={(data) => updateContent(index, data)}
            onRemove={() => removeContent(index)}
            onMoveUp={() => moveContent(index, index - 1)}
            onMoveDown={() => moveContent(index, index + 1)}
          />
        ))}

        <button
          onClick={addContent}
          className="flex items-center justify-center gap-2 border-2 border-dashed border-gray-200 rounded-2xl py-4 text-sm text-gray-400 hover:border-indigo-300 hover:text-indigo-500 transition-colors"
        >
          + Adicionar conteúdo
        </button>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-4 py-3">
            {error}
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-semibold py-3.5 rounded-xl text-sm transition-colors"
        >
          {isSubmitting ? 'Gerando link...' : 'Gerar link de aprovação'}
        </button>

        <div className="h-6" />
      </div>
    </main>
  )
}
