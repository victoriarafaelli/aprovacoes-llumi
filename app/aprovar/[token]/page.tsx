'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import {
  Content,
  Plan,
  ApprovalStatus,
  SocialNetwork,
  CONTENT_TYPE_LABELS,
  CONTENT_TYPE_COLORS,
  NETWORK_LABELS,
  NETWORK_COLORS,
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

// ─── Card de conteúdo para aprovação ─────────────────────────────────────────
function ApprovalCard({
  content,
  isReadOnly,
  onStatusChange,
}: {
  content: Content
  isReadOnly: boolean
  onStatusChange: (id: string, status: ApprovalStatus) => void
}) {
  const [scriptExpanded, setScriptExpanded] = useState(false)
  const [obsExpanded, setObsExpanded]       = useState(false)
  const [loading, setLoading]               = useState(false)

  const isVideo = isVideoFormat(content.type)

  const borderMap: Record<ApprovalStatus, string> = {
    pending:  'border-gray-200',
    approved: 'border-green-400',
    rejected: 'border-red-400',
  }
  const bgMap: Record<ApprovalStatus, string> = {
    pending:  'bg-white',
    approved: 'bg-green-50',
    rejected: 'bg-red-50',
  }

  const handleClick = async (newStatus: ApprovalStatus) => {
    if (isReadOnly || loading) return
    // Toggle: clicar no mesmo status volta para pendente
    const finalStatus = content.approval_status === newStatus ? 'pending' : newStatus
    setLoading(true)
    await onStatusChange(content.id, finalStatus)
    setLoading(false)
  }

  return (
    <div
      className={`rounded-2xl border-2 shadow-sm transition-all duration-300 overflow-hidden ${borderMap[content.approval_status]} ${bgMap[content.approval_status]}`}
    >
      <div className="px-5 pt-5 pb-4 flex flex-col gap-3">
        {/* Badges + status atual */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <NetworkBadges networks={content.social_networks} />
            <TypeBadge type={content.type} />
          </div>
          {content.approval_status === 'approved' && (
            <span className="text-xs font-semibold text-green-600">Aprovado</span>
          )}
          {content.approval_status === 'rejected' && (
            <span className="text-xs font-semibold text-red-500">Reprovado</span>
          )}
        </div>

        {/* Título */}
        <h3 className="font-semibold text-gray-900 text-base leading-snug">
          {content.title}
        </h3>

        {/* Copy (para formatos não-vídeo) */}
        {!isVideo && content.copy_text && (
          <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
            {content.copy_text}
          </p>
        )}

        {/* Roteiro (para formatos de vídeo) */}
        {isVideo && content.video_script && (
          <div>
            <button
              onClick={() => setScriptExpanded((v) => !v)}
              className="flex items-center gap-2 text-xs font-medium text-gray-500 hover:text-gray-700 transition-colors"
            >
              <span className={`text-gray-300 transition-transform ${scriptExpanded ? 'rotate-90' : ''}`}>▶</span>
              {scriptExpanded ? 'Ocultar roteiro' : 'Ver roteiro'}
            </button>
            {scriptExpanded && (
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
              onClick={() => setObsExpanded((v) => !v)}
              className="flex items-center gap-2 text-xs font-medium text-gray-500 hover:text-gray-700 transition-colors"
            >
              <span className={`text-gray-300 transition-transform ${obsExpanded ? 'rotate-90' : ''}`}>▶</span>
              {obsExpanded ? 'Ocultar observações' : 'Ver observações'}
            </button>
            {obsExpanded && (
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

      {/* Botões de aprovação */}
      {!isReadOnly && (
        <div className="px-5 pb-5 flex gap-2">
          <button
            disabled={loading}
            onClick={() => handleClick('approved')}
            className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border-2 transition-all active:scale-95 ${
              content.approval_status === 'approved'
                ? 'bg-green-500 border-green-500 text-white shadow-sm'
                : 'bg-white border-green-300 text-green-600 hover:bg-green-50'
            } ${loading ? 'opacity-50 cursor-wait' : ''}`}
          >
            Aprovar
          </button>
          <button
            disabled={loading}
            onClick={() => handleClick('rejected')}
            className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border-2 transition-all active:scale-95 ${
              content.approval_status === 'rejected'
                ? 'bg-red-500 border-red-500 text-white shadow-sm'
                : 'bg-white border-red-300 text-red-500 hover:bg-red-50'
            } ${loading ? 'opacity-50 cursor-wait' : ''}`}
          >
            Reprovar
          </button>
        </div>
      )}

      {/* Status read-only */}
      {isReadOnly && (
        <div className="px-5 pb-5">
          {content.approval_status === 'approved' && (
            <div className="text-center py-2 rounded-xl bg-green-100 text-green-700 text-sm font-semibold">
              Aprovado
            </div>
          )}
          {content.approval_status === 'rejected' && (
            <div className="text-center py-2 rounded-xl bg-red-100 text-red-600 text-sm font-semibold">
              Reprovado
            </div>
          )}
          {content.approval_status === 'pending' && (
            <div className="text-center py-2 rounded-xl bg-gray-100 text-gray-500 text-sm font-semibold">
              Não revisado
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Página principal ─────────────────────────────────────────────────────────
export default function AprovarPage() {
  const params = useParams()
  const token  = params.token as string

  const [plan, setPlan]           = useState<Plan | null>(null)
  const [contents, setContents]   = useState<Content[]>([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState<string | null>(null)
  const [finalizing, setFinalizing] = useState(false)
  const [done, setDone]           = useState(false)

  const isReadOnly = plan?.status === 'completed' || done

  // Carrega o plano
  useEffect(() => {
    if (!token) return
    fetch(`/api/approve/${token}`)
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
          if (data.status === 'completed') setDone(true)
        }
        setLoading(false)
      })
      .catch(() => {
        setError('Erro ao carregar o planejamento.')
        setLoading(false)
      })
  }, [token])

  // Atualiza status (otimista)
  const handleStatusChange = useCallback(
    async (contentId: string, status: ApprovalStatus) => {
      setContents((prev) =>
        prev.map((c) => (c.id === contentId ? { ...c, approval_status: status } : c))
      )
      try {
        const res = await fetch(`/api/approve/${token}/content/${contentId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ approval_status: status }),
        })
        if (!res.ok) {
          setContents((prev) =>
            prev.map((c) => (c.id === contentId ? { ...c, approval_status: 'pending' } : c))
          )
        }
      } catch {
        setContents((prev) =>
          prev.map((c) => (c.id === contentId ? { ...c, approval_status: 'pending' } : c))
        )
      }
    },
    [token]
  )

  // Finaliza aprovação
  const handleFinalize = async () => {
    setFinalizing(true)
    try {
      const res = await fetch(`/api/approve/${token}/finalize`, { method: 'POST' })
      if (res.ok) {
        setDone(true)
        setPlan((prev) => (prev ? { ...prev, status: 'completed' } : prev))
      }
    } catch {
      // silencioso
    } finally {
      setFinalizing(false)
    }
  }

  const total      = contents.length
  const reviewed   = contents.filter((c) => c.approval_status !== 'pending').length
  const approved   = contents.filter((c) => c.approval_status === 'approved').length
  const rejected   = contents.filter((c) => c.approval_status === 'rejected').length
  const allReviewed = reviewed === total && total > 0

  // ── Loading ──────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-indigo-300 border-t-indigo-600 rounded-full animate-spin" />
          <p className="text-sm text-gray-400">Carregando...</p>
        </div>
      </div>
    )
  }

  // ── Erro ─────────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-sm text-center">
          <h1 className="text-lg font-bold text-gray-900 mb-2">Link inválido</h1>
          <p className="text-sm text-gray-500">{error}</p>
        </div>
      </div>
    )
  }

  // ── Tela de confirmação final ─────────────────────────────────────────────
  if (done && plan?.status === 'completed') {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white border-b border-gray-100 px-4 py-5">
          <div className="max-w-xl mx-auto">
            <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-0.5">
              {plan.month_reference}
            </p>
            <h1 className="text-lg font-bold text-gray-900">{plan.client_name}</h1>
          </div>
        </div>
        <div className="max-w-xl mx-auto px-4 py-12 flex flex-col items-center gap-6 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
            <svg className="w-7 h-7 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Aprovação finalizada!</h2>
            <p className="text-sm text-gray-500 mt-2">
              Obrigado por revisar o conteúdo. Seu feedback foi registrado.
            </p>
          </div>
          {/* Resumo numérico */}
          <div className="w-full bg-white border border-gray-100 rounded-2xl shadow-sm p-5 flex justify-around">
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">{approved}</p>
              <p className="text-xs text-gray-500 mt-0.5">Aprovados</p>
            </div>
            <div className="w-px bg-gray-100" />
            <div className="text-center">
              <p className="text-2xl font-bold text-red-500">{rejected}</p>
              <p className="text-xs text-gray-500 mt-0.5">Reprovados</p>
            </div>
            <div className="w-px bg-gray-100" />
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-700">{total}</p>
              <p className="text-xs text-gray-500 mt-0.5">Total</p>
            </div>
          </div>
          <p className="text-xs text-gray-400">
            Esta página ficará disponível para consulta, mas não é mais possível alterar as decisões.
          </p>
        </div>
        {/* Cards read-only */}
        <div className="max-w-xl mx-auto px-4 pb-12 flex flex-col gap-4">
          <h3 className="text-sm font-semibold text-gray-500">Resumo dos conteúdos</h3>
          {contents.map((content) => (
            <ApprovalCard
              key={content.id}
              content={content}
              isReadOnly={true}
              onStatusChange={() => {}}
            />
          ))}
        </div>
      </div>
    )
  }

  // ── Página de aprovação ───────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header fixo */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-10 shadow-sm">
        <div className="max-w-xl mx-auto px-4 pt-4 pb-3">
          <div className="flex items-start justify-between gap-2 mb-3">
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide font-medium">
                {plan?.month_reference}
              </p>
              <h1 className="text-lg font-bold text-gray-900 leading-tight">
                {plan?.client_name}
              </h1>
            </div>
            <div className="text-right text-sm shrink-0">
              <span className="font-semibold text-gray-700">{reviewed}</span>
              <span className="text-gray-400"> / {total} revisados</span>
            </div>
          </div>
          {/* Barra de progresso */}
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden flex">
            <div
              className="bg-green-400 transition-all duration-500"
              style={{ width: total > 0 ? `${(approved / total) * 100}%` : '0%' }}
            />
            <div
              className="bg-red-400 transition-all duration-500"
              style={{ width: total > 0 ? `${(rejected / total) * 100}%` : '0%' }}
            />
          </div>
        </div>
      </div>

      {/* Cards */}
      <div className="max-w-xl mx-auto px-4 py-5 flex flex-col gap-4">
        {contents.map((content) => (
          <ApprovalCard
            key={content.id}
            content={content}
            isReadOnly={isReadOnly}
            onStatusChange={handleStatusChange}
          />
        ))}

        {/* Botão finalizar */}
        {!isReadOnly && (
          <div className="pt-2 pb-8 flex flex-col gap-2">
            {!allReviewed && (
              <p className="text-center text-xs text-gray-400">
                {total - reviewed} conteúdo{total - reviewed !== 1 ? 's' : ''} ainda sem revisão
              </p>
            )}
            <button
              onClick={handleFinalize}
              disabled={!allReviewed || finalizing}
              className={`w-full py-4 rounded-2xl text-sm font-bold transition-all ${
                allReviewed
                  ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-md active:scale-95'
                  : 'bg-gray-100 text-gray-300 cursor-not-allowed'
              } ${finalizing ? 'opacity-60 cursor-wait' : ''}`}
            >
              {finalizing ? 'Finalizando...' : 'Finalizar aprovação'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
