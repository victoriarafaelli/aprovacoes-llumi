'use client'

/**
 * ItemFormFields — campos de um item do fluxo "aprovação final" (título,
 * redes, formato, mídia, legenda, data/hora, observações). Extraído de
 * app/final/criar/page.tsx para ser reutilizado tanto na criação inicial
 * quanto no modal de "adicionar conteúdo" pós-link.
 *
 * Controlado: recebe `item`/`onChange` e não tem chrome de card (índice,
 * mover, remover) — isso fica a cargo de quem usa este componente.
 */

import {
  FinalReviewItemFormData,
  ContentType,
  SocialNetwork,
  CONTENT_TYPE_LABELS,
  getCompatibleFormats,
  getMediaKind,
  EMPTY_MEDIA_ITEM,
} from '@/types/final'
import { NetworkSelector } from '@/components/ContentFormFields'
import { MediaUploadFields } from '@/components/MediaUploadFields'
import { MarkdownField } from '@/components/MarkdownField'

export function ItemFormFields({
  item,
  folder,
  itemKey,
  onChange,
}: {
  item: FinalReviewItemFormData
  folder: string
  itemKey: number | string
  onChange: (data: FinalReviewItemFormData) => void
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
    const newMedia      = newKind === 'none' ? [] : [EMPTY_MEDIA_ITEM()]

    onChange({ ...item, social_networks: newNetworks, type: newType, media_items: newMedia })
  }

  const handleTypeChange = (type: ContentType) => {
    const newKind  = getMediaKind(type)
    const newMedia = newKind === 'none' ? [] : [EMPTY_MEDIA_ITEM()]
    onChange({ ...item, type, media_items: newMedia })
  }

  return (
    <>
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

      {/* Redes sociais */}
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

      {/* Upload de mídia */}
      {kind !== 'none' && (
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-2">
            {kind === 'video'
              ? 'Vídeo final'
              : kind === 'image'
                ? 'Imagem final'
                : kind === 'stories'
                  ? 'Stories (imagem ou vídeo)'
                  : 'Slides'
            }
          </label>
          <MediaUploadFields
            kind={kind}
            mediaItems={item.media_items}
            onChange={(items) => onChange({ ...item, media_items: items })}
            folder={folder}
            itemIndex={itemKey}
          />
        </div>
      )}

      {/* Legenda final */}
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">
          Legenda final <span className="font-normal text-gray-300">(opcional)</span>
        </label>
        <MarkdownField
          placeholder="Texto que será publicado junto ao conteúdo..."
          value={item.caption}
          onChange={(v) => onChange({ ...item, caption: v })}
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

      {/* Observações */}
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">
          Observações <span className="font-normal text-gray-300">(opcional)</span>
        </label>
        <MarkdownField
          placeholder="Diretrizes, contexto, instruções para o cliente..."
          value={item.observations}
          onChange={(v) => onChange({ ...item, observations: v })}
          rows={2}
          className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-transparent resize-none"
        />
      </div>
    </>
  )
}
