'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  FinalReviewItemFormData, EMPTY_ITEM, getMediaKind, isInFeedGrid,
  resolveFeedCoverUrl, resolveFeedCoverAdjustment,
} from '@/types/final'
import { ItemFormFields } from '@/components/ItemFormFields'
import { FeedGridPreview, FeedGridPreviewItem } from '@/components/FeedGridPreview'
import { FeedCoverAdjustModal } from '@/components/FeedCoverAdjustModal'

// ─── Card de item ─────────────────────────────────────────────────────────────
function ItemCard({
  index,
  total,
  item,
  folder,
  onChange,
  onRemove,
  onMoveUp,
  onMoveDown,
}: {
  index: number
  total: number
  item: FinalReviewItemFormData
  folder: string
  onChange: (data: FinalReviewItemFormData) => void
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
            type="button"
            onClick={onMoveUp}
            disabled={index === 0}
            className="text-gray-300 hover:text-indigo-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors w-6 h-6 flex items-center justify-center text-base"
            aria-label="Mover para cima"
          >
            ↑
          </button>
          <button
            type="button"
            onClick={onMoveDown}
            disabled={index === total - 1}
            className="text-gray-300 hover:text-indigo-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors w-6 h-6 flex items-center justify-center text-base"
            aria-label="Mover para baixo"
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
        <ItemFormFields item={item} folder={folder} itemKey={index} onChange={onChange} />
      </div>
    </div>
  )
}

// ─── Prévia de Feed (ao vivo, direto do estado do formulário) ─────────────────
// Mesmo título/subtítulo/visual já publicado em /final/[id] e
// /final/aprovar/[token] — só antecipa a mesma experiência para a criação,
// sem chamar API nem salvar nada: reage a qualquer mudança em `items`.
function LiveFeedPreviewCard({
  items,
  onAdjustCover,
}: {
  items: FinalReviewItemFormData[]
  onAdjustCover: (item: FeedGridPreviewItem, originalIndex: number) => void
}) {
  if (!items.some((i) => isInFeedGrid(i.type))) return null
  return (
    <div className="bg-white border-2 border-gray-100 rounded-2xl shadow-sm overflow-hidden">
      <div className="px-5 pt-4 pb-3 border-b border-gray-50">
        <p className="text-sm font-semibold text-gray-900">Prévia de Feed</p>
        <p className="text-xs text-gray-400 mt-0.5">Confira como ficará o feed deste mês 🩶</p>
      </div>
      <div className="px-5 py-4 flex justify-center">
        <FeedGridPreview items={items} editable onAdjustCover={onAdjustCover} />
      </div>
    </div>
  )
}

// ─── Página principal ─────────────────────────────────────────────────────────
export default function FinalCriarPage() {
  // Gerado uma vez por sessão de criação — identifica a pasta no Storage
  const [uploadSession] = useState<string>(() =>
    typeof crypto !== 'undefined'
      ? crypto.randomUUID().replace(/-/g, '')
      : Math.random().toString(36).slice(2).padEnd(32, '0')
  )

  const [clientName,      setClientName]      = useState('')
  const [monthRef,        setMonthRef]        = useState('')
  const [items,           setItems]           = useState<FinalReviewItemFormData[]>([EMPTY_ITEM()])
  const [isSubmitting,    setIsSubmitting]    = useState(false)
  const [shareLink,       setShareLink]       = useState<string | null>(null)
  const [copied,          setCopied]          = useState(false)
  const [error,           setError]           = useState<string | null>(null)
  const [adjustingIndex,  setAdjustingIndex]  = useState<number | null>(null)

  const addItem    = () => setItems((prev) => [...prev, EMPTY_ITEM()])
  const updateItem = (i: number, data: FinalReviewItemFormData) =>
    setItems((prev) => prev.map((it, idx) => (idx === i ? data : it)))
  const removeItem = (i: number) => {
    if (items.length === 1) return
    setItems((prev) => prev.filter((_, idx) => idx !== i))
  }
  const moveItem = (from: number, to: number) => {
    setItems((prev) => {
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

    for (let i = 0; i < items.length; i++) {
      const it   = items[i]
      const kind = getMediaKind(it.type)
      if (!it.title.trim())
        return setError(`Preencha o título do conteúdo ${i + 1}.`)
      if (it.social_networks.length === 0)
        return setError(`Selecione ao menos uma rede para o conteúdo ${i + 1}.`)
      if (kind !== 'none' && !it.media_items.some((m) => m.url.trim()))
        return setError(`Envie ao menos um arquivo de mídia para o conteúdo ${i + 1}.`)
    }

    setIsSubmitting(true)
    try {
      const res = await fetch('/api/final-reviews', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          client_name:     clientName.trim(),
          month_reference: monthRef.trim(),
          storage_folder:  uploadSession,
          items,
        }),
      })
      const data = await res.json()
      if (!res.ok) return setError(data.error || 'Erro ao criar aprovação.')
      setShareLink(`${window.location.origin}/final/aprovar/${data.share_token}`)
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
              Copie o link abaixo e envie para o cliente pelo WhatsApp.
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
          <Link href="/final" className="text-sm text-gray-400 hover:text-gray-600 transition-colors">
            Voltar para aprovações finais
          </Link>
        </div>
      </main>
    )
  }

  // ── Formulário ────────────────────────────────────────────────────────────
  return (
    <main className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-2xl lg:max-w-6xl mx-auto px-4 py-4 flex items-center gap-3">
          <Link href="/final" className="text-gray-400 hover:text-gray-600 transition-colors text-lg">←</Link>
          <h1 className="text-lg font-bold text-gray-900">Nova aprovação final</h1>
        </div>
      </div>

      {/* Desktop: formulário à esquerda (~2/3) + Prévia de Feed fixa à direita
          (~1/3). Mobile/tablet: uma coluna só, com a prévia entre Informações
          e Conteúdos (ver LiveFeedPreviewCard "lg:hidden" abaixo). */}
      <div className="max-w-2xl lg:max-w-6xl mx-auto px-4 py-6 lg:grid lg:grid-cols-[2fr_1fr] lg:gap-6 lg:items-start">
        <div className="flex flex-col gap-5">
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

          {/* Prévia de Feed — só em mobile/tablet, entre Informações e Conteúdos.
              Em desktop ela vive na aside sticky ao lado (mesmo componente). */}
          <div className="lg:hidden">
            <LiveFeedPreviewCard items={items} onAdjustCover={(_, idx) => setAdjustingIndex(idx)} />
          </div>

          {/* Conteúdos */}
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-700">
              Conteúdos <span className="text-gray-400 font-normal">({items.length})</span>
            </h2>
          </div>

          {items.map((item, index) => (
            <ItemCard
              key={index}
              index={index}
              total={items.length}
              item={item}
              folder={uploadSession}
              onChange={(data) => updateItem(index, data)}
              onRemove={() => removeItem(index)}
              onMoveUp={() => moveItem(index, index - 1)}
              onMoveDown={() => moveItem(index, index + 1)}
            />
          ))}

          <button
            onClick={addItem}
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
            {isSubmitting ? 'Criando aprovação...' : 'Gerar link de aprovação final'}
          </button>

          <div className="h-6" />
        </div>

        {/* Prévia de Feed — desktop, coluna fixa e sticky (não sobrepõe: fica
            abaixo do header sticky e some em telas menores que lg). */}
        <aside className="hidden lg:block lg:sticky lg:top-20 lg:self-start">
          <LiveFeedPreviewCard items={items} onAdjustCover={(_, idx) => setAdjustingIndex(idx)} />
        </aside>
      </div>

      {/* Ajuste de enquadramento — review ainda não existe, então salva
          direto no estado local do formulário (sem API). Só é enviado ao
          servidor quando "Gerar link de aprovação final" for clicado. */}
      {adjustingIndex !== null && items[adjustingIndex] && resolveFeedCoverUrl(items[adjustingIndex]) && (
        <FeedCoverAdjustModal
          key={adjustingIndex}
          imageUrl={resolveFeedCoverUrl(items[adjustingIndex])!}
          initial={resolveFeedCoverAdjustment(items[adjustingIndex])}
          onClose={() => setAdjustingIndex(null)}
          onSave={(adj) => {
            updateItem(adjustingIndex, {
              ...items[adjustingIndex],
              feed_cover_position_x: adj.positionX,
              feed_cover_position_y: adj.positionY,
              feed_cover_zoom:       adj.zoom,
            })
            setAdjustingIndex(null)
          }}
        />
      )}
    </main>
  )
}
