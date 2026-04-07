'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  ContentFormData,
  ContentType,
  SocialNetwork,
  NETWORKS_ORDER,
  CONTENT_TYPE_LABELS,
  NETWORK_LABELS,
  NETWORK_FORMATS,
  getCompatibleFormats,
  isNetworkCompatible,
  isVideoFormat,
} from '@/types'

// ─── Estado inicial de um conteúdo ───────────────────────────────────────────
const EMPTY_CONTENT = (): ContentFormData => ({
  title:           '',
  social_networks: ['instagram'],
  type:            'post',
  copy_text:       '',
  video_script:    '',
  observations:    '',
})

// ─── Seletor de redes com multi-select ───────────────────────────────────────
function NetworkSelector({
  selected,
  onToggle,
}: {
  selected: SocialNetwork[]
  onToggle: (network: SocialNetwork) => void
}) {
  return (
    <div className="flex gap-2 flex-wrap">
      {NETWORKS_ORDER.map((network) => {
        const isSelected    = selected.includes(network)
        const isCompatible  = isNetworkCompatible(selected, network)
        const wouldBeAlone  = isSelected && selected.length === 1

        return (
          <button
            key={network}
            type="button"
            disabled={wouldBeAlone || (!isSelected && !isCompatible)}
            onClick={() => onToggle(network)}
            title={
              !isSelected && !isCompatible
                ? 'Incompatível com as redes selecionadas'
                : wouldBeAlone
                ? 'Pelo menos uma rede é obrigatória'
                : undefined
            }
            className={`
              relative px-3 py-1.5 rounded-xl text-xs font-medium border transition-all
              ${isSelected
                ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                : isCompatible
                  ? 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'
                  : 'border-gray-100 bg-gray-50 text-gray-300 cursor-not-allowed'
              }
            `}
          >
            {NETWORK_LABELS[network]}
            {/* Indicador de selecionado */}
            {isSelected && selected.length > 1 && (
              <span className="ml-1.5 text-indigo-400 font-bold text-[10px]">×</span>
            )}
          </button>
        )
      })}
    </div>
  )
}

// ─── Card de conteúdo ─────────────────────────────────────────────────────────
function ContentCard({
  index,
  content,
  onChange,
  onRemove,
}: {
  index: number
  content: ContentFormData
  onChange: (data: ContentFormData) => void
  onRemove: () => void
}) {
  const compatibleFormats = getCompatibleFormats(content.social_networks)
  const isVideo           = isVideoFormat(content.type)

  // Toggle de rede: adiciona/remove, garantindo compatibilidade de formato
  const handleNetworkToggle = (network: SocialNetwork) => {
    const alreadySelected = content.social_networks.includes(network)

    // Não permite remover a única rede
    if (alreadySelected && content.social_networks.length === 1) return

    const newNetworks = alreadySelected
      ? content.social_networks.filter((n) => n !== network)
      : [...content.social_networks, network]

    // Verifica se o formato atual ainda é compatível
    const newCompatible = getCompatibleFormats(newNetworks)
    const newType       = newCompatible.includes(content.type)
      ? content.type
      : newCompatible[0] ?? content.type

    const wasVideo   = isVideoFormat(content.type)
    const willBeVideo = isVideoFormat(newType)

    onChange({
      ...content,
      social_networks: newNetworks,
      type:            newType,
      copy_text:       willBeVideo ? '' : wasVideo ? '' : content.copy_text,
      video_script:    !willBeVideo ? '' : content.video_script,
    })
  }

  // Troca de formato
  const handleTypeChange = (type: ContentType) => {
    const willBeVideo = isVideoFormat(type)
    onChange({
      ...content,
      type,
      copy_text:    willBeVideo ? '' : content.copy_text,
      video_script: !willBeVideo ? '' : content.video_script,
    })
  }

  return (
    <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
      {/* Header do card */}
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
            placeholder='Ex: "Post 01 – Dica de cuidados"'
            value={content.title}
            onChange={(e) => onChange({ ...content, title: e.target.value })}
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-transparent"
          />
        </div>

        {/* Redes sociais — multi-select */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-medium text-gray-500">Rede social</label>
            {content.social_networks.length > 1 && (
              <span className="text-xs text-indigo-500 font-medium">
                {content.social_networks.length} redes selecionadas
              </span>
            )}
          </div>
          <NetworkSelector
            selected={content.social_networks}
            onToggle={handleNetworkToggle}
          />
          {/* Aviso de formatos restritos quando múltiplas redes */}
          {content.social_networks.length > 1 && (
            <p className="mt-2 text-xs text-gray-400">
              Apenas formatos compatíveis com todas as redes aparecem abaixo.
            </p>
          )}
        </div>

        {/* Formato — filtrado pela interseção das redes */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-2">Formato</label>
          {compatibleFormats.length === 0 ? (
            <p className="text-xs text-red-500">
              Nenhum formato compatível com as redes selecionadas.
            </p>
          ) : (
            <div className="flex gap-2 flex-wrap">
              {compatibleFormats.map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => handleTypeChange(type)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${
                    content.type === type
                      ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                      : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'
                  }`}
                >
                  {CONTENT_TYPE_LABELS[type]}
                </button>
              ))}
            </div>
          )}
          {/* Hint para formatos de vídeo */}
          {isVideo && (
            <p className="mt-1.5 text-xs text-purple-500">
              Formato de vídeo — preencha o roteiro abaixo
            </p>
          )}
          {/* Hint de equivalência entre redes quando multi-select ativo */}
          {content.social_networks.length > 1 && isVideo && (
            <p className="mt-0.5 text-xs text-gray-400">
              {buildVideoEquivalenceHint(content.social_networks, content.type)}
            </p>
          )}
        </div>

        {/* Copy — apenas para formatos não-vídeo */}
        {!isVideo && (
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Copy</label>
            <textarea
              placeholder="Escreva o texto da legenda..."
              value={content.copy_text}
              onChange={(e) => onChange({ ...content, copy_text: e.target.value })}
              rows={4}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-transparent resize-none"
            />
          </div>
        )}

        {/* Roteiro — apenas para vídeo */}
        {isVideo && (
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Roteiro</label>
            <textarea
              placeholder="Descreva cenas, falas, chamadas para ação, duração estimada..."
              value={content.video_script}
              onChange={(e) => onChange({ ...content, video_script: e.target.value })}
              rows={5}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-300 focus:border-transparent resize-none"
            />
          </div>
        )}

        {/* Observações — sempre opcional */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">
            Observações{' '}
            <span className="font-normal text-gray-300">(opcional)</span>
          </label>
          <textarea
            placeholder="Referências, diretrizes visuais, datas específicas..."
            value={content.observations}
            onChange={(e) => onChange({ ...content, observations: e.target.value })}
            rows={2}
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-transparent resize-none"
          />
        </div>
      </div>
    </div>
  )
}

// Helper: constrói hint explicando equivalência de nomes entre redes
function buildVideoEquivalenceHint(networks: SocialNetwork[], type: ContentType): string {
  const networkFormatName = (n: SocialNetwork): string => {
    const fmts = NETWORK_FORMATS[n]
    const videoFmt = fmts.find((f) => isVideoFormat(f))
    return videoFmt ? CONTENT_TYPE_LABELS[videoFmt] : ''
  }

  const mappings = networks
    .map((n) => {
      const name = networkFormatName(n)
      return name ? `${NETWORK_LABELS[n]}: ${name}` : null
    })
    .filter(Boolean)

  const unique = [...new Set(mappings)]
  if (unique.length <= 1) return ''
  return `Equivale a: ${unique.join(' · ')}`
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
            content={content}
            onChange={(data) => updateContent(index, data)}
            onRemove={() => removeContent(index)}
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
