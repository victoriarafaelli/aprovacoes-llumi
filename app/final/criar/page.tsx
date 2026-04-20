'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  FinalReviewItemFormData,
  MediaItem,
  ContentType,
  SocialNetwork,
  NETWORKS_ORDER,
  CONTENT_TYPE_LABELS,
  NETWORK_LABELS,
  NETWORK_FORMATS,
  getCompatibleFormats,
  isNetworkCompatible,
  getMediaKind,
  EMPTY_ITEM,
  EMPTY_MEDIA_ITEM,
  MEDIA_FIELD_LABELS,
  MediaKind,
} from '@/types/final'

// ─── Seletor de redes ─────────────────────────────────────────────────────────
function NetworkSelector({
  selected,
  onToggle,
}: {
  selected: SocialNetwork[]
  onToggle: (n: SocialNetwork) => void
}) {
  return (
    <div className="flex gap-2 flex-wrap">
      {NETWORKS_ORDER.map((n) => {
        const isSel   = selected.includes(n)
        const isComp  = isNetworkCompatible(selected, n)
        const isAlone = isSel && selected.length === 1
        return (
          <button
            key={n}
            type="button"
            disabled={isAlone || (!isSel && !isComp)}
            onClick={() => onToggle(n)}
            title={!isSel && !isComp ? 'Incompatível com as redes selecionadas' : isAlone ? 'Pelo menos uma rede é obrigatória' : undefined}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all
              ${isSel ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                : isComp ? 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'
                : 'border-gray-100 bg-gray-50 text-gray-300 cursor-not-allowed'
              }`}
          >
            {NETWORK_LABELS[n]}
            {isSel && selected.length > 1 && <span className="ml-1.5 text-indigo-400 font-bold text-[10px]">×</span>}
          </button>
        )
      })}
    </div>
  )
}

// ─── Campos de mídia ──────────────────────────────────────────────────────────
function MediaFields({
  kind,
  type,
  mediaItems,
  onChange,
}: {
  kind: MediaKind
  type: ContentType
  mediaItems: MediaItem[]
  onChange: (items: MediaItem[]) => void
}) {
  if (kind === 'none') return null

  const fieldLabel = MEDIA_FIELD_LABELS[type]

  if (kind === 'video' || kind === 'image') {
    const item = mediaItems[0] ?? { url: '', label: '' }
    return (
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">{fieldLabel}</label>
        <input
          type="url"
          placeholder={kind === 'video' ? 'YouTube, Vimeo, Google Drive...' : 'Google Drive, Dropbox, URL direta...'}
          value={item.url}
          onChange={(e) => onChange([{ url: e.target.value, label: '' }])}
          className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-transparent"
        />
      </div>
    )
  }

  // multi (carrossel / stories)
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="text-xs font-medium text-gray-500">{fieldLabel}</label>
        <span className="text-xs text-gray-400">{mediaItems.length} slide{mediaItems.length !== 1 ? 's' : ''}</span>
      </div>
      <div className="flex flex-col gap-2">
        {mediaItems.map((item, idx) => (
          <div key={idx} className="flex items-center gap-2">
            <span className="text-xs text-gray-400 font-medium w-14 shrink-0 text-right">Slide {idx + 1}</span>
            <input
              type="url"
              placeholder="Google Drive, Dropbox, URL direta..."
              value={item.url}
              onChange={(e) => {
                const updated = mediaItems.map((m, i) => i === idx ? { ...m, url: e.target.value } : m)
                onChange(updated)
              }}
              className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-transparent"
            />
            {mediaItems.length > 1 && (
              <button
                type="button"
                onClick={() => onChange(mediaItems.filter((_, i) => i !== idx))}
                className="text-gray-300 hover:text-red-400 transition-colors p-1 shrink-0"
                aria-label="Remover slide"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={() => onChange([...mediaItems, EMPTY_MEDIA_ITEM()])}
        className="mt-2 text-xs text-indigo-500 hover:text-indigo-700 font-medium transition-colors"
      >
        + Adicionar slide
      </button>
    </div>
  )
}

// ─── Card de item ─────────────────────────────────────────────────────────────
function ItemCard({
  index,
  item,
  onChange,
  onRemove,
}: {
  index: number
  item: FinalReviewItemFormData
  onChange: (data: FinalReviewItemFormData) => void
  onRemove: () => void
}) {
  const compatibleFormats = getCompatibleFormats(item.social_networks)
  const kind              = getMediaKind(item.type)

  const handleNetworkToggle = (network: SocialNetwork) => {
    const already = item.social_networks.includes(network)
    if (already && item.social_networks.length === 1) return

    const newNetworks = already
      ? item.social_networks.filter((n) => n !== network)
      : [...item.social_networks, network]

    const newCompatible = getCompatibleFormats(newNetworks)
    const newType       = newCompatible.includes(item.type) ? item.type : newCompatible[0] ?? item.type
    const newKind       = getMediaKind(newType)

    // Reset media items to fit new kind
    const newMedia = newKind === 'none' ? [] : newKind === 'multi' ? [EMPTY_MEDIA_ITEM()] : [EMPTY_MEDIA_ITEM()]

    onChange({ ...item, social_networks: newNetworks, type: newType, media_items: newMedia })
  }

  const handleTypeChange = (type: ContentType) => {
    const newKind  = getMediaKind(type)
    const newMedia = newKind === 'none' ? [] : newKind === 'multi' ? [EMPTY_MEDIA_ITEM()] : [EMPTY_MEDIA_ITEM()]
    onChange({ ...item, type, media_items: newMedia })
  }

  return (
    <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-gray-50">
        <span className="text-xs font-semibold text-gray-400 tracking-wide uppercase">
          Conteúdo {index + 1}
        </span>
        <button
          onClick={onRemove}
          className="text-gray-300 hover:text-red-400 transition-colors text-xl leading-none w-6 h-6 flex items-center justify-center"
          aria-label="Remover"
        >
          ×
        </button>
      </div>

      <div className="px-5 py-4 flex flex-col gap-4">
        {/* Título */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Título</label>
          <input
            type="text"
            placeholder='Ex: "Reels 01 – Dica de produto"'
            value={item.title}
            onChange={(e) => onChange({ ...item, title: e.target.value })}
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-transparent"
          />
        </div>

        {/* Redes */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-medium text-gray-500">Rede social</label>
            {item.social_networks.length > 1 && (
              <span className="text-xs text-indigo-500 font-medium">
                {item.social_networks.length} redes selecionadas
              </span>
            )}
          </div>
          <NetworkSelector selected={item.social_networks} onToggle={handleNetworkToggle} />
        </div>

        {/* Formato */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-2">Formato</label>
          {compatibleFormats.length === 0 ? (
            <p className="text-xs text-red-500">Nenhum formato compatível com as redes selecionadas.</p>
          ) : (
            <div className="flex gap-2 flex-wrap">
              {compatibleFormats.map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => handleTypeChange(type)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${
                    item.type === type
                      ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                      : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'
                  }`}
                >
                  {CONTENT_TYPE_LABELS[type]}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Campos de mídia (condicional por formato) */}
        <MediaFields
          kind={kind}
          type={item.type}
          mediaItems={item.media_items}
          onChange={(items) => onChange({ ...item, media_items: items })}
        />

        {/* Legenda final */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">
            Legenda final <span className="font-normal text-gray-300">(opcional)</span>
          </label>
          <textarea
            placeholder="Texto que será publicado junto ao conteúdo..."
            value={item.caption}
            onChange={(e) => onChange({ ...item, caption: e.target.value })}
            rows={3}
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-transparent resize-none"
          />
        </div>

        {/* Data e horário */}
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Data de publicação <span className="font-normal text-gray-300">(opcional)</span>
            </label>
            <input
              type="date"
              value={item.publish_date}
              onChange={(e) => onChange({ ...item, publish_date: e.target.value })}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-transparent"
            />
          </div>
          <div className="w-36">
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Horário <span className="font-normal text-gray-300">(opcional)</span>
            </label>
            <input
              type="time"
              value={item.publish_time}
              onChange={(e) => onChange({ ...item, publish_time: e.target.value })}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-transparent"
            />
          </div>
        </div>

        {/* Link de referência */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">
            Link de referência <span className="font-normal text-gray-300">(opcional)</span>
          </label>
          <input
            type="url"
            placeholder="https://..."
            value={item.reference_url}
            onChange={(e) => onChange({ ...item, reference_url: e.target.value })}
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-transparent"
          />
        </div>

        {/* Observações */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">
            Observações <span className="font-normal text-gray-300">(opcional)</span>
          </label>
          <textarea
            placeholder="Diretrizes, contexto, instruções para o cliente..."
            value={item.observations}
            onChange={(e) => onChange({ ...item, observations: e.target.value })}
            rows={2}
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-transparent resize-none"
          />
        </div>
      </div>
    </div>
  )
}

// ─── Página ───────────────────────────────────────────────────────────────────
export default function FinalCriarPage() {
  const [clientName,   setClientName]   = useState('')
  const [monthRef,     setMonthRef]     = useState('')
  const [items,        setItems]        = useState<FinalReviewItemFormData[]>([EMPTY_ITEM()])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [shareLink,    setShareLink]    = useState<string | null>(null)
  const [copied,       setCopied]       = useState(false)
  const [error,        setError]        = useState<string | null>(null)

  const addItem    = () => setItems((prev) => [...prev, EMPTY_ITEM()])
  const updateItem = (i: number, data: FinalReviewItemFormData) =>
    setItems((prev) => prev.map((it, idx) => (idx === i ? data : it)))
  const removeItem = (i: number) => {
    if (items.length === 1) return
    setItems((prev) => prev.filter((_, idx) => idx !== i))
  }

  const handleSubmit = async () => {
    setError(null)
    if (!clientName.trim()) return setError('Informe o nome do cliente.')
    if (!monthRef.trim())   return setError('Informe o mês de referência.')

    for (let i = 0; i < items.length; i++) {
      const it = items[i]
      if (!it.title.trim()) return setError(`Preencha o título do conteúdo ${i + 1}.`)
      if (it.social_networks.length === 0) return setError(`Selecione ao menos uma rede para o conteúdo ${i + 1}.`)
      const kind = getMediaKind(it.type)
      if (kind !== 'none' && !it.media_items.some((m) => m.url.trim())) {
        return setError(`Adicione ao menos um link de mídia para o conteúdo ${i + 1}.`)
      }
    }

    setIsSubmitting(true)
    try {
      const res = await fetch('/api/final-reviews', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          client_name:     clientName.trim(),
          month_reference: monthRef.trim(),
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
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
          <Link href="/final" className="text-gray-400 hover:text-gray-600 transition-colors text-lg">←</Link>
          <h1 className="text-lg font-bold text-gray-900">Nova aprovação final</h1>
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
            Conteúdos <span className="text-gray-400 font-normal">({items.length})</span>
          </h2>
        </div>

        {items.map((item, index) => (
          <ItemCard
            key={index}
            index={index}
            item={item}
            onChange={(data) => updateItem(index, data)}
            onRemove={() => removeItem(index)}
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
          {isSubmitting ? 'Gerando link...' : 'Gerar link de aprovação final'}
        </button>

        <div className="h-6" />
      </div>
    </main>
  )
}
