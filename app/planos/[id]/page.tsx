'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import {
  Plan,
  Content,
  SocialNetwork,
  getPlanStats,
  NETWORK_LABELS,
  NETWORK_COLORS,
  CONTENT_TYPE_LABELS,
  CONTENT_TYPE_COLORS,
  isVideoFormat,
  formatDate,
  ensureHttps,
} from '@/types'

// ─── Badges ───────────────────────────────────────────────────────────────────
function NetworkBadge({ network }: { network: SocialNetwork }) {
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${NETWORK_COLORS[network]}`}>
      {NETWORK_LABELS[network]}
    </span>
  )
}

function NetworkBadges({ networks }: { networks: SocialNetwork[] }) {
  return (
    <div className="flex flex-wrap gap-1">
      {networks.map((n) => <NetworkBadge key={n} network={n} />)}
    </div>
  )
}

function TypeBadge({ type }: { type: Content['type'] }) {
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${CONTENT_TYPE_COLORS[type]}`}>
      {CONTENT_TYPE_LABELS[type]}
    </span>
  )
}

function StatusBadge({ status }: { status: Content['approval_status'] }) {
  const map = {
    pending:  { label: 'Pendente',   cls: 'bg-gray-100 text-gray-500' },
    approved: { label: 'Aprovado',   cls: 'bg-green-100 text-green-700' },
    rejected: { label: 'Reprovado',  cls: 'bg-red-100 text-red-600' },
  }
  const { label, cls } = map[status]
  return (
    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${cls}`}>
      {label}
    </span>
  )
}

function PlanStatusBadge({ status }: { status: Plan['status'] }) {
  const map = {
    draft:     { label: 'Rascunho',   cls: 'bg-gray-100 text-gray-500' },
    sent:      { label: 'Aguardando', cls: 'bg-amber-100 text-amber-700' },
    completed: { label: 'Finalizado', cls: 'bg-green-100 text-green-700' },
  }
  const { label, cls } = map[status]
  return (
    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${cls}`}>
      {label}
    </span>
  )
}

// ─── Modal de edição de conteúdo ─────────────────────────────────────────────
function EditContentModal({
  content,
  planId,
  onSave,
  onClose,
}: {
  content: Content
  planId: string
  onSave: (updated: Content) => void
  onClose: () => void
}) {
  const [title,        setTitle]        = useState(content.title)
  const [copyText,     setCopyText]     = useState(content.copy_text ?? '')
  const [videoScript,  setVideoScript]  = useState(content.video_script ?? '')
  const [observations, setObservations] = useState(content.observations ?? '')
  const [publishDate,  setPublishDate]  = useState(content.publish_date ?? '')
  const [publishTime,  setPublishTime]  = useState(content.publish_time ?? '')
  const [referenceUrl, setReferenceUrl] = useState(content.reference_url ?? '')
  const [saving, setSaving]             = useState(false)
  const [saveError, setSaveError]       = useState<string | null>(null)

  const isVideo = isVideoFormat(content.type)

  const handleSave = async () => {
    if (!title.trim()) { setSaveError('O título é obrigatório.'); return }
    setSaving(true)
    setSaveError(null)
    try {
      const res = await fetch(`/api/plans/${planId}/contents/${content.id}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          title:        title.trim(),
          copy_text:    copyText    || null,
          video_script: videoScript || null,
          observations: observations || null,
          publish_date: publishDate  || null,
          publish_time: publishTime  || null,
          reference_url: referenceUrl || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setSaveError(data.error || 'Erro ao salvar.'); setSaving(false); return }
      onSave({ ...content, ...data })
    } catch {
      setSaveError('Erro de conexão. Tente novamente.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm px-4 pb-4 sm:pb-0">
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-xl flex flex-col">
        {/* Header */}
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

          {/* Copy ou Roteiro */}
          {!isVideo ? (
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Copy <span className="font-normal text-gray-300">(opcional)</span>
              </label>
              <textarea
                value={copyText}
                onChange={(e) => setCopyText(e.target.value)}
                rows={4}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-transparent resize-none"
              />
            </div>
          ) : (
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Roteiro <span className="font-normal text-gray-300">(opcional)</span>
              </label>
              <textarea
                value={videoScript}
                onChange={(e) => setVideoScript(e.target.value)}
                rows={4}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-transparent resize-none"
              />
            </div>
          )}

          {/* Link de referência */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Link de referência <span className="font-normal text-gray-300">(opcional)</span>
            </label>
            <input
              type="url"
              value={referenceUrl}
              onChange={(e) => setReferenceUrl(e.target.value)}
              placeholder="https://..."
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-transparent"
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

          {saveError && (
            <p className="text-xs text-red-500">{saveError}</p>
          )}
        </div>

        {/* Footer */}
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

// ─── Card de conteúdo no detalhe ──────────────────────────────────────────────
function ContentDetailCard({
  content,
  index,
  total,
  reordering,
  onMoveUp,
  onMoveDown,
  onEdit,
}: {
  content: Content
  index: number
  total: number
  reordering: boolean
  onMoveUp: () => void
  onMoveDown: () => void
  onEdit: () => void
}) {
  const [scriptOpen, setScriptOpen] = useState(false)
  const [obsOpen, setObsOpen]       = useState(false)
  const isVideo = isVideoFormat(content.type)

  const borderMap = {
    pending:  'border-l-gray-200',
    approved: 'border-l-green-400',
    rejected: 'border-l-red-400',
  }

  return (
    <div className={`bg-white rounded-2xl border border-gray-100 border-l-4 shadow-sm overflow-hidden ${borderMap[content.approval_status]}`}>
      <div className="px-5 py-4 flex flex-col gap-3">
        {/* Linha 1: status + ações à direita, badges à esquerda */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col gap-1.5">
            <NetworkBadges networks={content.social_networks} />
            <div className="flex items-center gap-1.5">
              <TypeBadge type={content.type} />
              {isVideo && (
                <span className="text-xs font-medium text-gray-400 italic">vídeo</span>
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
                  aria-label="Mover para cima"
                >↑</button>
                <button
                  onClick={onMoveDown}
                  disabled={index === total - 1}
                  className="text-gray-300 hover:text-indigo-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors w-7 h-7 flex items-center justify-center rounded-lg hover:bg-indigo-50"
                  aria-label="Mover para baixo"
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
            <StatusBadge status={content.approval_status} />
          </div>
        </div>

        {/* Número + Título + data/hora */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs text-gray-400 mb-0.5">#{index + 1}</p>
            <h3 className="font-semibold text-gray-900">{content.title}</h3>
          </div>
          {(content.publish_date || content.publish_time) && (
            <div className="text-right shrink-0">
              {content.publish_date && (
                <p className="text-xs font-medium text-gray-700">{formatDate(content.publish_date)}</p>
              )}
              {content.publish_time && (
                <p className="text-xs text-gray-400">{content.publish_time}</p>
              )}
            </div>
          )}
        </div>

        {/* Copy — para formatos não-vídeo */}
        {!isVideo && content.copy_text && (
          <div className="bg-gray-50 rounded-xl px-4 py-3 border border-gray-100">
            <p className="text-xs font-medium text-gray-400 mb-1.5">Copy</p>
            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
              {content.copy_text}
            </p>
          </div>
        )}

        {/* Roteiro — para formatos de vídeo */}
        {isVideo && content.video_script && (
          <div>
            <button
              onClick={() => setScriptOpen((v) => !v)}
              className="flex items-center gap-2 text-xs font-medium text-gray-500 hover:text-gray-700 transition-colors w-full text-left py-1"
            >
              <span className={`text-gray-300 transition-transform ${scriptOpen ? 'rotate-90' : ''}`}>▶</span>
              {scriptOpen ? 'Ocultar roteiro' : 'Ver roteiro'}
            </button>
            {scriptOpen && (
              <div className="mt-2 bg-purple-50 rounded-xl px-4 py-3 border border-purple-100">
                <p className="text-xs font-medium text-purple-500 mb-1.5">Roteiro</p>
                <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                  {content.video_script}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Link de referência */}
        {content.reference_url && (
          <a
            href={ensureHttps(content.reference_url)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-xs font-medium text-indigo-600 hover:text-indigo-800 bg-indigo-50 border border-indigo-100 rounded-xl px-3 py-2 transition-colors group/ref"
          >
            <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
            <span className="flex-1 truncate">Referência</span>
            <svg className="w-3 h-3 opacity-40 group-hover/ref:opacity-70 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        )}

        {/* Observações */}
        {content.observations && (
          <div>
            <button
              onClick={() => setObsOpen((v) => !v)}
              className="flex items-center gap-2 text-xs font-medium text-gray-500 hover:text-gray-700 transition-colors w-full text-left py-1"
            >
              <span className={`text-gray-300 transition-transform ${obsOpen ? 'rotate-90' : ''}`}>▶</span>
              {obsOpen ? 'Ocultar observações' : 'Ver observações'}
            </button>
            {obsOpen && (
              <div className="mt-2 bg-gray-50 rounded-xl px-4 py-3 border border-gray-100">
                <p className="text-xs font-medium text-gray-400 mb-1.5">Observações</p>
                <p className="text-sm text-gray-500 leading-relaxed whitespace-pre-wrap">
                  {content.observations}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Comentário do cliente */}
        {content.client_feedback && (
          <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
            <p className="text-xs font-medium text-amber-600 mb-1">Comentário do cliente</p>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{content.client_feedback}</p>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Página principal ─────────────────────────────────────────────────────────
export default function PlanoDetailPage() {
  const params = useParams()
  const id     = params.id as string

  const [plan, setPlan]         = useState<Plan | null>(null)
  const [contents, setContents] = useState<Content[]>([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    fetch(`/api/plans/${id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          setError(data.error)
        } else {
          setPlan(data)
          const sorted = [...(data.contents || [])].sort(
            (a: Content, b: Content) => (a.order_position ?? 0) - (b.order_position ?? 0)
          )
          setContents(sorted)
        }
        setLoading(false)
      })
      .catch(() => {
        setError('Erro ao carregar o planejamento.')
        setLoading(false)
      })
  }, [id])

  const updateContent = useCallback((updated: Content) => {
    setContents((prev) => prev.map((c) => c.id === updated.id ? updated : c))
  }, [])

  const reorderContents = useCallback(async (newOrder: Content[]) => {
    setContents(newOrder)
    try {
      await fetch(`/api/plans/${id}/reorder`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ order: newOrder.map((c) => c.id) }),
      })
    } catch { /* silencioso */ }
  }, [id])

  // Stats
  const stats = getPlanStats(contents)

  // ── Loading ──────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-7 h-7 border-2 border-indigo-300 border-t-indigo-600 rounded-full animate-spin" />
          <p className="text-sm text-gray-400">Carregando...</p>
        </div>
      </div>
    )
  }

  // ── Erro ─────────────────────────────────────────────────────────────────
  if (error || !plan) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-sm text-center">
          <p className="text-gray-400 text-sm">{error || 'Planejamento não encontrado.'}</p>
          <Link href="/" className="mt-4 inline-block text-indigo-600 text-sm hover:underline">
            Voltar ao início
          </Link>
        </div>
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3 mb-3">
            <Link
              href="/"
              className="text-gray-400 hover:text-gray-600 transition-colors text-lg leading-none"
            >
              ←
            </Link>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-400 uppercase tracking-wide font-medium truncate">
                {plan.month_reference}
              </p>
              <h1 className="text-lg font-bold text-gray-900 leading-tight truncate">
                {plan.client_name}
              </h1>
            </div>
            <PlanStatusBadge status={plan.status} />
          </div>

          {/* Resumo numérico */}
          <div className="flex items-center gap-4 text-sm">
            <span className="text-gray-400">
              {stats.total} conteúdo{stats.total !== 1 ? 's' : ''}
            </span>
            {stats.approved > 0 && (
              <span className="text-green-600 font-medium">{stats.approved} aprovado{stats.approved !== 1 ? 's' : ''}</span>
            )}
            {stats.rejected > 0 && (
              <span className="text-red-500 font-medium">{stats.rejected} reprovado{stats.rejected !== 1 ? 's' : ''}</span>
            )}
            {stats.pending > 0 && (
              <span className="text-gray-400">{stats.pending} pendente{stats.pending !== 1 ? 's' : ''}</span>
            )}
          </div>

          {/* Barra de progresso */}
          {stats.total > 0 && (
            <div className="h-1 bg-gray-100 rounded-full overflow-hidden flex mt-3">
              <div
                className="bg-green-400 transition-all"
                style={{ width: `${(stats.approved / stats.total) * 100}%` }}
              />
              <div
                className="bg-red-400 transition-all"
                style={{ width: `${(stats.rejected / stats.total) * 100}%` }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Filtros rápidos por status */}
      <FilteredContentList
        contents={contents}
        plan={plan}
        planId={id}
        onUpdateContent={updateContent}
        onReorder={reorderContents}
      />
    </main>
  )
}

// ─── Lista com filtro ─────────────────────────────────────────────────────────
type Filter = 'all' | 'pending' | 'approved' | 'rejected'

function FilteredContentList({
  contents,
  plan,
  planId,
  onUpdateContent,
  onReorder,
}: {
  contents: Content[]
  plan: Plan
  planId: string
  onUpdateContent: (updated: Content) => void
  onReorder: (newOrder: Content[]) => void
}) {
  const [filter,     setFilter]     = useState<Filter>('all')
  const [reordering, setReordering] = useState(false)
  const [editing,    setEditing]    = useState<Content | null>(null)
  const [copied,     setCopied]     = useState(false)

  const stats = getPlanStats(contents)

  const filtered = filter === 'all'
    ? contents
    : contents.filter((c) => c.approval_status === filter)

  const filterDefs: { key: Filter; label: string; count: number; activeClass: string }[] = [
    { key: 'all',      label: 'Todos',      count: stats.total,    activeClass: 'bg-gray-900 text-white' },
    { key: 'pending',  label: 'Pendentes',  count: stats.pending,  activeClass: 'bg-gray-700 text-white' },
    { key: 'approved', label: 'Aprovados',  count: stats.approved, activeClass: 'bg-green-600 text-white' },
    { key: 'rejected', label: 'Reprovados', count: stats.rejected, activeClass: 'bg-red-500 text-white' },
  ]

  const moveContent = (from: number, to: number) => {
    const next = [...contents]
    const [item] = next.splice(from, 1)
    next.splice(to, 0, item)
    onReorder(next)
  }

  const handleCopyLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/aprovar/${plan.share_token}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-5">
      {/* Toolbar: filtros + reordenar */}
      <div className="flex items-center gap-2 mb-5 flex-wrap">
        <div className="flex gap-2 flex-wrap flex-1">
          {filterDefs.map(({ key, label, count, activeClass }) => (
            <button
              key={key}
              onClick={() => { setFilter(key); setReordering(false) }}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                filter === key
                  ? `${activeClass} border-transparent`
                  : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
              }`}
            >
              {label}
              <span className={`ml-1.5 ${filter === key ? 'opacity-70' : 'text-gray-400'}`}>
                {count}
              </span>
            </button>
          ))}
        </div>
        {filter === 'all' && (
          <button
            onClick={() => setReordering((v) => !v)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all shrink-0 ${
              reordering
                ? 'bg-indigo-600 text-white border-transparent'
                : 'bg-white text-gray-500 border-gray-200 hover:border-indigo-300 hover:text-indigo-500'
            }`}
          >
            {reordering ? 'Concluir' : 'Reordenar'}
          </button>
        )}
      </div>

      {/* Cards de conteúdo */}
      {filtered.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-sm text-gray-400">Nenhum conteúdo nesta categoria.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {filtered.map((content) => {
            const originalIndex = contents.indexOf(content)
            return (
              <ContentDetailCard
                key={content.id}
                content={content}
                index={originalIndex}
                total={contents.length}
                reordering={reordering}
                onMoveUp={() => moveContent(originalIndex, originalIndex - 1)}
                onMoveDown={() => moveContent(originalIndex, originalIndex + 1)}
                onEdit={() => setEditing(content)}
              />
            )
          })}
        </div>
      )}

      {/* Link de aprovação */}
      {plan.status !== 'draft' && (
        <div className="mt-8 bg-white border border-gray-100 rounded-2xl p-4 shadow-sm flex flex-col gap-2">
          <p className="text-xs font-medium text-gray-500">Link de aprovação do cliente</p>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400 font-mono flex-1 truncate">
              {typeof window !== 'undefined' ? window.location.origin : ''}/aprovar/{plan.share_token}
            </span>
            <button
              onClick={handleCopyLink}
              className={`text-xs font-semibold px-2.5 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
                copied
                  ? 'text-green-600 bg-green-50'
                  : 'text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50'
              }`}
            >
              {copied ? 'Copiado!' : 'Copiar'}
            </button>
          </div>
        </div>
      )}

      <div className="h-8" />

      {/* Modal de edição */}
      {editing && (
        <EditContentModal
          content={editing}
          planId={planId}
          onSave={(updated) => {
            onUpdateContent(updated)
            setEditing(null)
          }}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  )
}
