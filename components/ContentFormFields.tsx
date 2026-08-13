'use client'

/**
 * ContentFormFields — campos de um conteúdo do fluxo "primeira aprovação"
 * (título, redes, formato, copy/roteiro, data/hora, link de referência,
 * observações). Extraído de app/criar/page.tsx para ser reutilizado tanto
 * na criação inicial quanto no modal de "adicionar conteúdo" pós-link.
 *
 * Controlado: recebe `content`/`onChange` e não tem chrome de card (índice,
 * mover, remover) — isso fica a cargo de quem usa este componente.
 */

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
import { MarkdownField } from '@/components/MarkdownField'

// ─── Estado inicial de um conteúdo ───────────────────────────────────────────
export const EMPTY_CONTENT = (): ContentFormData => ({
  title:           '',
  social_networks: ['instagram'],
  type:            'post',
  copy_text:       '',
  video_script:    '',
  observations:    '',
  publish_date:    '',
  publish_time:    '',
  reference_url:   '',
})

// ─── Seletor de redes com multi-select ───────────────────────────────────────
export function NetworkSelector({
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

export function ContentFormFields({
  content,
  onChange,
}: {
  content: ContentFormData
  onChange: (data: ContentFormData) => void
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
    <>
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
          <MarkdownField
            placeholder="Escreva o texto da legenda..."
            value={content.copy_text}
            onChange={(v) => onChange({ ...content, copy_text: v })}
            rows={4}
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-transparent resize-none"
          />
        </div>
      )}

      {/* Roteiro — apenas para vídeo */}
      {isVideo && (
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Roteiro</label>
          <MarkdownField
            placeholder="Descreva cenas, falas, chamadas para ação, duração estimada..."
            value={content.video_script}
            onChange={(v) => onChange({ ...content, video_script: v })}
            rows={5}
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-300 focus:border-transparent resize-none"
          />
        </div>
      )}

      {/* Data e horário de publicação */}
      <div className="flex gap-3">
        <div className="flex-1">
          <label className="block text-xs font-medium text-gray-500 mb-1">
            Data de publicação{' '}
            <span className="font-normal text-gray-300">(opcional)</span>
          </label>
          <input
            type="date"
            value={content.publish_date}
            onChange={(e) => onChange({ ...content, publish_date: e.target.value })}
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-transparent"
          />
        </div>
        <div className="w-36">
          <label className="block text-xs font-medium text-gray-500 mb-1">
            Horário{' '}
            <span className="font-normal text-gray-300">(opcional)</span>
          </label>
          <input
            type="time"
            value={content.publish_time}
            onChange={(e) => onChange({ ...content, publish_time: e.target.value })}
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-transparent"
          />
        </div>
      </div>

      {/* Link de referência */}
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">
          Link de referência{' '}
          <span className="font-normal text-gray-300">(opcional)</span>
        </label>
        <input
          type="url"
          placeholder="https://www.tiktok.com/..."
          value={content.reference_url}
          onChange={(e) => onChange({ ...content, reference_url: e.target.value })}
          className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-transparent"
        />
      </div>

      {/* Observações — sempre opcional */}
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">
          Observações{' '}
          <span className="font-normal text-gray-300">(opcional)</span>
        </label>
        <MarkdownField
          placeholder="Diretrizes visuais, contexto, instruções para o cliente..."
          value={content.observations}
          onChange={(v) => onChange({ ...content, observations: v })}
          rows={2}
          className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-transparent resize-none"
        />
      </div>
    </>
  )
}
