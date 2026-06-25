'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import AppTabs from '@/components/AppTabs'
import {
  FinalReview,
  FinalReviewItem,
  MediaItem,
  getReviewStats,
  getMediaKind,
  getYouTubeEmbedUrl,
  getVimeoEmbedUrl,
  isDirectImageUrl,
  isDirectVideoUrl,
  ensureHttps,
  formatDate,
  CONTENT_TYPE_LABELS,
  NETWORK_LABELS,
  MEDIA_ACCEPT,
  MEDIA_ACCEPT_HINT,
  EMPTY_MEDIA_ITEM,
} from '@/types/final'
import { MediaUploadSlot } from '@/components/MediaUploadSlot'

type ReviewStatus = 'draft' | 'sent' | 'completed'
type FilterTab    = 'all' | 'pending' | 'approved' | 'rejected'

// ─── Badge de status da review ────────────────────────────────────────────────
function StatusBadge({ status }: { status: ReviewStatus }) {
  const map = {
    draft:     { label: 'Rascunho',   cls: 'bg-gray-100 text-gray-500' },
    sent:      { label: 'Aguardando', cls: 'bg-amber-100 text-amber-700' },
    completed: { label: 'Finalizado', cls: 'bg-green-100 text-green-700' },
  }
  const { label, cls } = map[status]
  return <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${cls}`}>{label}</span>
}

// ─── Badge de aprovação ───────────────────────────────────────────────────────
function ApprovalBadge({ status }: { status: FinalReviewItem['approval_status'] }) {
  const map = {
    pending:  { label: 'Pendente',   cls: 'bg-gray-100 text-gray-500' },
    approved: { label: 'Aprovado',   cls: 'bg-green-100 text-green-700' },
    rejected: { label: 'Reprovado',  cls: 'bg-red-100 text-red-600' },
  }
  const { label, cls } = map[status]
  return <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${cls}`}>{label}</span>
}

// ─── Visualizador de mídia (item único) ───────────────────────────────────────
function MediaViewer({ url }: { url: string }) {
  const safe = ensureHttps(url.trim())

  const ytEmbed    = getYouTubeEmbedUrl(safe)
  const vimeoEmbed = getVimeoEmbedUrl(safe)
  const isImg      = isDirectImageUrl(safe)
  const isVid      = isDirectVideoUrl(safe)

  if (ytEmbed) {
    return (
      <div className="aspect-video w-full rounded-xl overflow-hidden bg-black">
        <iframe src={ytEmbed} className="w-full h-full" allowFullScreen allow="autoplay; encrypted-media" />
      </div>
    )
  }
  if (vimeoEmbed) {
    return (
      <div className="aspect-video w-full rounded-xl overflow-hidden bg-black">
        <iframe src={vimeoEmbed} className="w-full h-full" allowFullScreen allow="autoplay; encrypted-media" />
      </div>
    )
  }
  if (isImg) {
    return (
      <div className="w-full rounded-xl overflow-hidden bg-gray-100 flex items-center justify-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={safe} alt="" className="max-w-full max-h-[480px] object-contain" />
      </div>
    )
  }
  if (isVid) {
    return (
      <div className="w-full rounded-xl overflow-hidden bg-black">
        <video
          src={safe}
          controls
          playsInline
          preload="metadata"
          className="w-full max-h-[480px]"
        />
      </div>
    )
  }

  // Link genérico
  return (
    <a href={safe} target="_blank" rel="noopener noreferrer"
      className="flex items-center gap-2 border border-gray-200 rounded-xl px-4 py-3 text-sm text-indigo-600 hover:bg-indigo-50 transition-colors w-fit">
      <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round"
          d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
      </svg>
      Abrir mídia
    </a>
  )
}

// ─── Carrossel / Stories ──────────────────────────────────────────────────────
function CarouselViewer({ urls }: { urls: string[] }) {
  const [current, setCurrent] = useState(0)
  if (urls.length === 0) return null

  return (
    <div className="flex flex-col gap-2">
      <MediaViewer url={urls[current]} />
      {urls.length > 1 && (
        <div className="flex items-center justify-between">
          <button
            onClick={() => setCurrent((c) => Math.max(0, c - 1))}
            disabled={current === 0}
            className="text-gray-400 hover:text-gray-600 disabled:opacity-30 transition-colors px-2 py-1 rounded-lg text-sm"
          >
            ← Anterior
          </button>
          <span className="text-xs text-gray-400">{current + 1} / {urls.length}</span>
          <button
            onClick={() => setCurrent((c) => Math.min(urls.length - 1, c + 1))}
            disabled={current === urls.length - 1}
            className="text-gray-400 hover:text-gray-600 disabled:opacity-30 transition-colors px-2 py-1 rounded-lg text-sm"
          >
            Próximo →
          </button>
        </div>
      )}
      {/* Miniaturas indicadoras */}
      {urls.length > 1 && (
        <div className="flex gap-1.5 justify-center">
          {urls.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className={`w-2 h-2 rounded-full transition-all ${i === current ? 'bg-indigo-500' : 'bg-gray-200'}`}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Modal de edição de item ──────────────────────────────────────────────────
function EditItemModal({
  item,
  reviewId,
  storageFolder,
  onSave,
  onClose,
}: {
  item:          FinalReviewItem
  reviewId:      string
  /** Pasta no Supabase Storage para upload de mídias novas (32 hex chars).
   *  Para reviews antigas sem storage_folder, usa o reviewId sem hífens como fallback. */
  storageFolder: string
  onSave:        (updated: FinalReviewItem) => void
  onClose:       () => void
}) {
  const kind = getMediaKind(item.type)

  const [title,        setTitle]        = useState(item.title)
  const [caption,      setCaption]      = useState(item.caption ?? '')
  const [observations, setObservations] = useState(item.observations ?? '')
  const [publishDate,  setPublishDate]  = useState(item.publish_date ?? '')
  const [publishTime,  setPublishTime]  = useState(item.publish_time ?? '')
  const [saving,       setSaving]       = useState(false)
  const [saveError,    setSaveError]    = useState<string | null>(null)

  // Estado da mídia: inicializa com os dados do item.
  // Para registros antigos com media_items null → inicia com slot vazio.
  const [mediaItems, setMediaItems] = useState<MediaItem[]>(() => {
    const existing = item.media_items ?? []
    // Para tipos com mídia única: garante sempre ao menos 1 slot visível
    if (kind !== 'none' && kind !== 'multi' && kind !== 'stories' && existing.length === 0) {
      return [EMPTY_MEDIA_ITEM()]
    }
    return existing.length > 0 ? existing : []
  })

  const handleSave = async () => {
    if (!title.trim()) { setSaveError('O título é obrigatório.'); return }
    setSaving(true)
    setSaveError(null)
    try {
      // Só envia slots que têm URL (ignora slots vazios não preenchidos)
      const mediaToSave = mediaItems.filter((m) => m.url.trim() !== '')

      // Identifica quais URLs antigas foram substituídas ou removidas,
      // para limpeza do Storage após salvar com sucesso
      const oldUrls = (item.media_items ?? []).map((m) => m.url).filter(Boolean)
      const newUrls = new Set(mediaToSave.map((m) => m.url).filter(Boolean))
      const urlsToDelete = oldUrls.filter((url) => !newUrls.has(url))

      const res = await fetch(`/api/final-reviews/${reviewId}/items/${item.id}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          title:        title.trim(),
          caption:      caption      || null,
          observations: observations || null,
          publish_date: publishDate  || null,
          publish_time: publishTime  || null,
          media_items:  mediaToSave,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setSaveError(data.error || 'Erro ao salvar.'); setSaving(false); return }

      // Deleta arquivos antigos do Storage em background (não bloqueia o fluxo)
      // O link da aprovação continuará funcionando — os novos arquivos já foram salvos no banco.
      if (urlsToDelete.length > 0) {
        fetch('/api/final-reviews/delete-media', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ urls: urlsToDelete }),
        }).catch(() => { /* silencioso — Storage pode ser limpo manualmente se necessário */ })
      }

      onSave({ ...item, ...data })
    } catch {
      setSaveError('Erro de conexão. Tente novamente.')
    } finally {
      setSaving(false)
    }
  }

  const isMultiSlot = kind === 'multi' || kind === 'stories'

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm px-4 pb-4 sm:pb-0">
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-xl flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl">
          <h3 className="font-semibold text-gray-900">Editar conteúdo</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors text-xl leading-none">×</button>
        </div>

        <div className="px-5 py-4 flex flex-col gap-4">
          {/* Título */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Título</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-transparent"
            />
          </div>

          {/* ── Seção de Mídia ────────────────────────────────────────────── */}
          {kind !== 'none' && (
            <div>
              {/* Cabeçalho com tipo detectado + formatos aceitos */}
              <div className="flex items-baseline justify-between mb-2">
                <label className="text-xs font-medium text-gray-500">
                  {kind === 'multi'   ? 'Carrossel — slides'
                  : kind === 'stories' ? 'Stories — slides'
                  : kind === 'video'   ? 'Vídeo'
                  : 'Imagem'}
                </label>
                <span className="text-[11px] text-gray-400">
                  {kind === 'video'   ? 'MP4, WebM ou MOV'
                  : kind === 'image'   ? 'JPG, PNG, GIF, WebP'
                  : kind === 'stories' ? 'imagem ou vídeo por slide'
                  : /* multi */         'JPG, PNG, GIF, WebP'}
                </span>
              </div>

              {isMultiSlot ? (
                /* Múltiplos slides — carrossel ou stories */
                <div className="flex flex-col gap-3">
                  {kind === 'stories' && mediaItems.length > 0 && (
                    <p className="text-xs text-indigo-500 -mb-1 font-medium">
                      Cada slide pode ser imagem ou vídeo independentemente.
                    </p>
                  )}

                  {mediaItems.length === 0 ? (
                    <p className="text-xs text-gray-400 italic">Nenhum slide ainda. Adicione abaixo.</p>
                  ) : (
                    mediaItems.map((mi, slotIdx) => (
                      <div key={slotIdx}>
                        <MediaUploadSlot
                          accept={MEDIA_ACCEPT[kind]}
                          acceptHint={MEDIA_ACCEPT_HINT[kind]}
                          value={mi.url}
                          onChange={(url) =>
                            setMediaItems((prev) =>
                              prev.map((m, i) => (i === slotIdx ? { ...m, url } : m))
                            )
                          }
                          folder={storageFolder}
                          slotKey={`edit_${item.id.replace(/-/g, '')}_${slotIdx}`}
                          label={
                            kind === 'stories'
                              ? `Slide ${slotIdx + 1} · imagem ou vídeo`
                              : `Slide ${slotIdx + 1}`
                          }
                        />
                        {mediaItems.length > 1 && (
                          <button
                            type="button"
                            onClick={() =>
                              setMediaItems((prev) => prev.filter((_, i) => i !== slotIdx))
                            }
                            className="text-xs text-red-400 hover:text-red-600 transition-colors mt-1 pl-1"
                          >
                            Remover slide
                          </button>
                        )}
                      </div>
                    ))
                  )}

                  <button
                    type="button"
                    onClick={() => setMediaItems((prev) => [...prev, EMPTY_MEDIA_ITEM()])}
                    className="text-xs text-indigo-500 hover:text-indigo-700 font-medium transition-colors self-start pt-1"
                  >
                    + Adicionar slide
                  </button>
                </div>
              ) : (
                /* Slot único — imagem ou vídeo, conforme o tipo do item */
                <MediaUploadSlot
                  accept={MEDIA_ACCEPT[kind]}
                  acceptHint={MEDIA_ACCEPT_HINT[kind]}
                  value={mediaItems[0]?.url ?? ''}
                  onChange={(url) => setMediaItems([{ url, label: '' }])}
                  folder={storageFolder}
                  slotKey={`edit_${item.id.replace(/-/g, '')}_0`}
                />
              )}
            </div>
          )}

          {/* Legenda */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Legenda <span className="font-normal text-gray-300">(opcional)</span>
            </label>
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              rows={3}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-transparent resize-none"
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
                value={publishDate}
                onChange={(e) => setPublishDate(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-transparent"
              />
            </div>
            <div className="w-36">
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Horário <span className="font-normal text-gray-300">(opcional)</span>
              </label>
              <input
                type="time"
                value={publishTime}
                onChange={(e) => setPublishTime(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-transparent"
              />
            </div>
          </div>

          {/* Observações */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Observações <span className="font-normal text-gray-300">(opcional)</span>
            </label>
            <textarea
              value={observations}
              onChange={(e) => setObservations(e.target.value)}
              rows={2}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-transparent resize-none"
            />
          </div>

          {saveError && <p className="text-xs text-red-500">{saveError}</p>}
        </div>

        <div className="px-5 py-4 border-t border-gray-100 flex gap-2 sticky bottom-0 bg-white rounded-b-2xl">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl text-sm font-medium border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white transition-colors"
          >
            {saving ? 'Salvando...' : 'Salvar alterações'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Card de item ─────────────────────────────────────────────────────────────
function ItemCard({
  item,
  index,
  total,
  reordering,
  onMoveUp,
  onMoveDown,
  onEdit,
}: {
  item: FinalReviewItem
  index: number
  total: number
  reordering: boolean
  onMoveUp: () => void
  onMoveDown: () => void
  onEdit: () => void
}) {
  const kind       = getMediaKind(item.type)
  // Defende contra media_items null (registros antigos podem ter null no banco)
  const mediaUrls  = (item.media_items ?? []).map((m) => m.url).filter(Boolean)
  const isMulti    = kind === 'multi' || kind === 'stories'

  return (
    <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
      <div className="px-5 pt-4 pb-3 border-b border-gray-50">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-900 truncate">{item.title}</p>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className="text-xs text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full border border-gray-100">
                {CONTENT_TYPE_LABELS[item.type]}
              </span>
              {(item.social_networks ?? []).map((n) => (
                <span key={n} className="text-xs text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full border border-gray-100">
                  {NETWORK_LABELS[n]}
                </span>
              ))}
              {(item.publish_date || item.publish_time) && (
                <span className="text-xs text-gray-400">
                  {item.publish_date ? formatDate(item.publish_date) : ''}
                  {item.publish_time ? ` às ${item.publish_time.slice(0, 5)}` : ''}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {reordering ? (
              <>
                <button
                  onClick={onMoveUp}
                  disabled={index === 0}
                  className="text-gray-300 hover:text-indigo-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors w-7 h-7 flex items-center justify-center rounded-lg hover:bg-indigo-50"
                >↑</button>
                <button
                  onClick={onMoveDown}
                  disabled={index === total - 1}
                  className="text-gray-300 hover:text-indigo-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors w-7 h-7 flex items-center justify-center rounded-lg hover:bg-indigo-50"
                >↓</button>
              </>
            ) : (
              <button
                onClick={onEdit}
                className="text-xs font-medium text-indigo-500 hover:text-indigo-700 px-2.5 py-1 rounded-lg hover:bg-indigo-50 transition-colors"
              >
                Editar
              </button>
            )}
            <ApprovalBadge status={item.approval_status} />
          </div>
        </div>
      </div>

      <div className="px-5 py-4 flex flex-col gap-4">
        {/* Mídia */}
        {mediaUrls.length > 0 && (
          <div>
            {isMulti ? (
              <CarouselViewer urls={mediaUrls} />
            ) : (
              <MediaViewer url={mediaUrls[0]} />
            )}
          </div>
        )}

        {/* Legenda final */}
        {item.caption && (
          <div>
            <p className="text-xs font-medium text-gray-400 mb-1">Legenda</p>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{item.caption}</p>
          </div>
        )}

        {/* Observações */}
        {item.observations && (
          <div>
            <p className="text-xs font-medium text-gray-400 mb-1">Observações</p>
            <p className="text-sm text-gray-600 whitespace-pre-wrap">{item.observations}</p>
          </div>
        )}

        {/* Feedback do cliente */}
        {item.client_feedback && (
          <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
            <p className="text-xs font-semibold text-amber-700 mb-1">Feedback do cliente</p>
            <p className="text-sm text-amber-800 whitespace-pre-wrap">{item.client_feedback}</p>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Card de prévia do feed (read-only, visão do gerente) ────────────────────
function FeedPreviewManagerCard({ review }: { review: FinalReview }) {
  if (!review.feed_preview_url) return null

  const statusMap = {
    pending:  { label: 'Pendente',  cls: 'bg-gray-100 text-gray-500' },
    approved: { label: 'Aprovado',  cls: 'bg-green-100 text-green-700' },
    rejected: { label: 'Reprovado', cls: 'bg-red-100 text-red-600' },
  }
  const { label, cls } = statusMap[review.feed_preview_status ?? 'pending']

  const borderMap = {
    pending:  'border-gray-100',
    approved: 'border-green-200',
    rejected: 'border-red-200',
  }
  const border = borderMap[review.feed_preview_status ?? 'pending']

  return (
    <div className={`bg-white border-2 rounded-2xl shadow-sm overflow-hidden ${border}`}>
      <div className="px-5 pt-4 pb-3 border-b border-gray-50 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-gray-900">Prévia do Feed</p>
          <p className="text-xs text-gray-400 mt-0.5">Como o perfil vai ficar após as publicações</p>
        </div>
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${cls}`}>{label}</span>
      </div>
      <div className="px-5 py-4 flex flex-col gap-4">
        <div className="w-full rounded-xl overflow-hidden bg-gray-100 flex items-center justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={review.feed_preview_url}
            alt="Prévia do feed"
            className="w-full object-contain max-h-[480px]"
          />
        </div>
        {review.feed_preview_feedback && (
          <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
            <p className="text-xs font-semibold text-amber-700 mb-1">Feedback do cliente</p>
            <p className="text-sm text-amber-800 whitespace-pre-wrap">{review.feed_preview_feedback}</p>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Página ───────────────────────────────────────────────────────────────────
export default function FinalDetailPage() {
  const { id }     = useParams<{ id: string }>()
  const [review, setReview]   = useState<(FinalReview & { items: FinalReviewItem[] }) | null>(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter]   = useState<FilterTab>('all')
  const [copied, setCopied]   = useState(false)
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState<string | null>(null)
  const [reordering, setReordering] = useState(false)
  const [editing, setEditing]       = useState<FinalReviewItem | null>(null)

  useEffect(() => {
    fetch(`/api/final-reviews/${id}`)
      .then((r) => r.json())
      .then((d) => {
        // Se a API devolver { error: ... }, trata como "não encontrado"
        if (d && d.error) {
          setReview(null)
        } else {
          // Garante que items é sempre um array (proteção contra null do banco)
          setReview({ ...d, items: Array.isArray(d.items) ? d.items : [] })
        }
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [id])

  // ── Callbacks declarados ANTES dos early returns para não violar Rules of Hooks ──
  const updateItem = useCallback((updated: FinalReviewItem) => {
    setReview((prev) => {
      if (!prev) return prev
      return { ...prev, items: prev.items.map((it) => it.id === updated.id ? updated : it) }
    })
  }, [])

  const moveItem = useCallback(async (items: FinalReviewItem[], from: number, to: number) => {
    const next = [...items]
    const [item] = next.splice(from, 1)
    next.splice(to, 0, item)
    setReview((prev) => prev ? { ...prev, items: next } : prev)
    try {
      await fetch(`/api/final-reviews/${id}/reorder`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ order: next.map((it) => it.id) }),
      })
    } catch { /* silencioso */ }
  }, [id])

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50">
        <AppTabs />
        <div className="max-w-2xl mx-auto px-4 py-10 flex flex-col gap-4 animate-pulse">
          <div className="h-5 bg-gray-200 rounded w-1/3" />
          <div className="h-3 bg-gray-100 rounded w-1/4" />
          {[1, 2].map((i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5">
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-3" />
              <div className="aspect-video bg-gray-100 rounded-xl" />
            </div>
          ))}
        </div>
      </main>
    )
  }

  if (!review) {
    return (
      <main className="min-h-screen bg-gray-50">
        <AppTabs />
        <div className="max-w-2xl mx-auto px-4 py-24 text-center">
          <p className="text-gray-400 text-sm">Aprovação não encontrada.</p>
          <Link href="/final" className="inline-block mt-4 text-indigo-600 text-sm hover:underline">
            Voltar
          </Link>
        </div>
      </main>
    )
  }

  const stats        = getReviewStats(review.items)
  const shareUrl     = `${typeof window !== 'undefined' ? window.location.origin : ''}/final/aprovar/${review.share_token}`

  const filteredItems = review.items.filter((item) => {
    if (filter === 'all')      return true
    if (filter === 'pending')  return item.approval_status === 'pending'
    if (filter === 'approved') return item.approval_status === 'approved'
    if (filter === 'rejected') return item.approval_status === 'rejected'
    return true
  })

  const handleCopy = () => {
    navigator.clipboard.writeText(shareUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleSend = async () => {
    if (review.status !== 'draft') return
    setSendError(null)
    setSending(true)
    try {
      const res = await fetch(`/api/final-reviews/${id}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ status: 'sent' }),
      })
      const data = await res.json()
      if (!res.ok) return setSendError(data.error || 'Erro ao enviar.')
      setReview((prev) => prev ? { ...prev, status: 'sent' } : prev)
    } catch {
      setSendError('Erro de conexão.')
    } finally {
      setSending(false)
    }
  }

  const tabs: { key: FilterTab; label: string; count: number }[] = [
    { key: 'all',      label: 'Todos',      count: stats.total },
    { key: 'pending',  label: 'Pendentes',  count: stats.pending },
    { key: 'approved', label: 'Aprovados',  count: stats.approved },
    { key: 'rejected', label: 'Reprovados', count: stats.rejected },
  ]

  return (
    <main className="min-h-screen bg-gray-50">
      <AppTabs />

      {/* Header */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-2xl mx-auto px-4 py-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <Link href="/final" className="text-gray-400 hover:text-gray-600 transition-colors mt-0.5">←</Link>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl font-bold text-gray-900">{review.client_name}</h1>
                  <StatusBadge status={review.status} />
                </div>
                <p className="text-sm text-gray-500 mt-0.5">{review.month_reference}</p>
                {stats.total > 0 && (
                  <p className="text-xs text-gray-400 mt-1">
                    {stats.total} conteúdo{stats.total !== 1 ? 's' : ''}
                    {stats.approved > 0 && ` · ${stats.approved} aprovado${stats.approved !== 1 ? 's' : ''}`}
                    {stats.rejected > 0 && ` · ${stats.rejected} reprovado${stats.rejected !== 1 ? 's' : ''}`}
                    {stats.pending > 0  && ` · ${stats.pending} pendente${stats.pending !== 1 ? 's' : ''}`}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Link de compartilhamento */}
          {review.status !== 'draft' && (
            <div className="mt-4 flex items-center gap-2">
              <span className="text-xs text-gray-300 font-mono flex-1 truncate">
                /final/aprovar/{review.share_token}
              </span>
              <button
                onClick={handleCopy}
                className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-all shrink-0 ${
                  copied ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500 hover:bg-indigo-100 hover:text-indigo-700'
                }`}
              >
                {copied ? 'Copiado' : 'Copiar link'}
              </button>
            </div>
          )}

          {/* Botão de enviar (draft → sent) */}
          {review.status === 'draft' && (
            <div className="mt-4">
              <button
                onClick={handleSend}
                disabled={sending}
                className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors"
              >
                {sending ? 'Enviando...' : 'Gerar e enviar link'}
              </button>
              {sendError && <p className="text-xs text-red-500 mt-1">{sendError}</p>}
            </div>
          )}
        </div>

        {/* Abas de filtro + botão reordenar */}
        {stats.total > 0 && (
          <div className="max-w-2xl mx-auto px-4 flex items-center gap-0 border-t border-gray-50">
            <div className="flex flex-1 overflow-x-auto">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => { setFilter(tab.key); setReordering(false) }}
                  className={`px-4 py-3 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap ${
                    filter === tab.key
                      ? 'border-indigo-600 text-indigo-600'
                      : 'border-transparent text-gray-400 hover:text-gray-600'
                  }`}
                >
                  {tab.label}
                  {tab.count > 0 && (
                    <span className="ml-1.5 bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full text-[10px]">
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </div>
            {filter === 'all' && (
              <button
                onClick={() => setReordering((v) => !v)}
                className={`ml-2 px-3 py-1.5 rounded-xl text-xs font-semibold border shrink-0 transition-all ${
                  reordering
                    ? 'bg-indigo-600 text-white border-transparent'
                    : 'bg-white text-gray-500 border-gray-200 hover:border-indigo-300 hover:text-indigo-500'
                }`}
              >
                {reordering ? 'Concluir' : 'Reordenar'}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Itens */}
      <div className="max-w-2xl mx-auto px-4 py-6 flex flex-col gap-4">
        {/* Prévia do feed — sempre visível no topo, fora do filtro */}
        {filter === 'all' && <FeedPreviewManagerCard review={review} />}

        {review.feed_preview_url && filter === 'all' && review.items.length > 0 && (
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-gray-100" />
            <span className="text-xs text-gray-300 font-medium whitespace-nowrap">Conteúdos individuais</span>
            <div className="flex-1 h-px bg-gray-100" />
          </div>
        )}

        {filteredItems.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-gray-400 text-sm">Nenhum conteúdo nesta categoria.</p>
          </div>
        ) : (
          filteredItems.map((item) => {
            const originalIndex = review.items.indexOf(item)
            return (
              <ItemCard
                key={item.id}
                item={item}
                index={originalIndex}
                total={review.items.length}
                reordering={reordering}
                onMoveUp={() => moveItem(review.items, originalIndex, originalIndex - 1)}
                onMoveDown={() => moveItem(review.items, originalIndex, originalIndex + 1)}
                onEdit={() => setEditing(item)}
              />
            )
          })
        )}
      </div>

      {/* Modal de edição — key={editing.id} garante remontagem completa ao trocar de item,
           evitando que o estado de mediaItems de um tipo contamine outro */}
      {editing && (
        <EditItemModal
          key={editing.id}
          item={editing}
          reviewId={id}
          storageFolder={review.storage_folder ?? id.replace(/-/g, '')}
          onSave={(updated) => {
            updateItem(updated)
            setEditing(null)
          }}
          onClose={() => setEditing(null)}
        />
      )}
    </main>
  )
}
