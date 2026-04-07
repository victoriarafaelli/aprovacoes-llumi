'use client'

import { useEffect, useState } from 'react'
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

// ─── Card de conteúdo no detalhe ──────────────────────────────────────────────
function ContentDetailCard({ content, index }: { content: Content; index: number }) {
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
        {/* Linha 1: status à direita, badges à esquerda */}
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
          <StatusBadge status={content.approval_status} />
        </div>

        {/* Número + Título */}
        <div>
          <p className="text-xs text-gray-400 mb-0.5">#{index + 1}</p>
          <h3 className="font-semibold text-gray-900">{content.title}</h3>
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
            (a: Content, b: Content) => a.order_position - b.order_position
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
      <FilteredContentList contents={contents} plan={plan} />
    </main>
  )
}

// ─── Lista com filtro ─────────────────────────────────────────────────────────
type Filter = 'all' | 'pending' | 'approved' | 'rejected'

function FilteredContentList({ contents, plan }: { contents: Content[]; plan: Plan }) {
  const [filter, setFilter] = useState<Filter>('all')

  const stats = getPlanStats(contents)

  const filtered = filter === 'all'
    ? contents
    : contents.filter((c) => c.approval_status === filter)

  const filters: { key: Filter; label: string; count: number; activeClass: string }[] = [
    { key: 'all',      label: 'Todos',      count: stats.total,    activeClass: 'bg-gray-900 text-white' },
    { key: 'pending',  label: 'Pendentes',  count: stats.pending,  activeClass: 'bg-gray-700 text-white' },
    { key: 'approved', label: 'Aprovados',  count: stats.approved, activeClass: 'bg-green-600 text-white' },
    { key: 'rejected', label: 'Reprovados', count: stats.rejected, activeClass: 'bg-red-500 text-white' },
  ]

  return (
    <div className="max-w-2xl mx-auto px-4 py-5">
      {/* Tabs de filtro */}
      <div className="flex gap-2 mb-5 flex-wrap">
        {filters.map(({ key, label, count, activeClass }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
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

      {/* Cards de conteúdo */}
      {filtered.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-sm text-gray-400">Nenhum conteúdo nesta categoria.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {filtered.map((content, i) => (
            <ContentDetailCard
              key={content.id}
              content={content}
              // mantém numeração original mesmo com filtro ativo
              index={contents.indexOf(content)}
            />
          ))}
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
              onClick={() =>
                navigator.clipboard.writeText(
                  `${window.location.origin}/aprovar/${plan.share_token}`
                )
              }
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 px-2.5 py-1.5 rounded-lg hover:bg-indigo-50 transition-colors whitespace-nowrap"
            >
              Copiar
            </button>
          </div>
        </div>
      )}

      <div className="h-8" />
    </div>
  )
}
