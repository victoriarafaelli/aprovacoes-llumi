'use client'

/**
 * FeedGridPreview — grid 3 colunas representando a grade do perfil do
 * Instagram, montado automaticamente a partir das capas dos conteúdos.
 *
 * Puramente visual/informativo — sem aprovar/reprovar/comentar aqui (isso
 * continua item por item, na lista abaixo). Usado tanto no painel
 * administrativo (/final/[id]) quanto no link público (/final/aprovar/[token]).
 *
 * Regras:
 *  - ordem invertida (mais recente primeiro) só na renderização — não mexe
 *    em order_position;
 *  - stories e artigo não entram (não aparecem na grade do Instagram);
 *  - só usa imagens (nunca <video>), pra não pesar o carregamento;
 *  - conteúdo sem capa disponível → placeholder discreto com o título,
 *    não quebra o grid;
 *  - enquadramento (posição/zoom) é puramente visual — respeita
 *    feed_cover_position_x/y/zoom quando presentes, cai pro padrão
 *    (centro, sem zoom) quando null, ver resolveFeedCoverAdjustment.
 *
 * Também usado (mesmo componente, sem duplicar lógica) na tela de criação
 * (/final/criar), direto sobre o estado do formulário — por isso aceita a
 * forma mínima `FeedGridPreviewItem` abaixo, e não só `FinalReviewItem`.
 */

import {
  FinalReviewItem, getMediaKind, isInFeedGrid, resolveFeedCoverUrl, resolveFeedCoverAdjustment,
} from '@/types/final'

/**
 * Forma mínima aceita pelo grid. `FinalReviewItem` (telas já publicadas) e
 * `FinalReviewItemFormData` (formulário de criação, sem `id`/`order_position`
 * ainda) satisfazem essa forma estruturalmente.
 */
export type FeedGridPreviewItem = Pick<
  FinalReviewItem,
  'type' | 'media_items' | 'feed_cover_url' | 'title' |
  'feed_cover_position_x' | 'feed_cover_position_y' | 'feed_cover_zoom'
> & {
  id?: string
  order_position?: number
}

function GridCell({
  item,
  editable,
  onAdjustCover,
}: {
  item: FeedGridPreviewItem
  editable?: boolean
  onAdjustCover?: () => void
}) {
  const kind       = getMediaKind(item.type)
  const coverUrl   = resolveFeedCoverUrl(item)
  const isMulti    = kind === 'multi'
  const isVideo    = kind === 'video'
  const adjustment = resolveFeedCoverAdjustment(item)

  return (
    <div className="group aspect-[4/5] relative overflow-hidden rounded-md sm:rounded-lg bg-gray-100 border border-gray-100">
      {coverUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={coverUrl}
          alt={item.title}
          loading="lazy"
          className="w-full h-full object-cover"
          style={{
            objectPosition: `${adjustment.positionX}% ${adjustment.positionY}%`,
            transform: adjustment.zoom !== 1 ? `scale(${adjustment.zoom})` : undefined,
            transformOrigin: `${adjustment.positionX}% ${adjustment.positionY}%`,
          }}
        />
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center gap-1 p-1.5 text-center">
          <svg className="w-4 h-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14M14 8h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span className="text-[9px] sm:text-[10px] text-gray-400 leading-tight line-clamp-2">
            {item.title || 'Sem capa'}
          </span>
        </div>
      )}

      {/* Indicador de formato — só quando há capa, pra não poluir o placeholder */}
      {coverUrl && (isMulti || isVideo) && (
        <div className="absolute top-1 right-1 w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-black/50 flex items-center justify-center">
          {isMulti ? (
            <svg className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M4 4h12v12H4V4zm2 2v8h8V6H6zm6-4h12v12h-2V4H12V2z" />
            </svg>
          ) : (
            <svg className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          )}
        </div>
      )}

      {/* Ajustar capa — só área administrativa/criação (editable), só quando
          há capa pra ajustar. Sempre visível em telas sem hover (mobile);
          em desktop só aparece ao passar o mouse, pra não poluir o grid. */}
      {coverUrl && editable && onAdjustCover && (
        <button
          type="button"
          onClick={onAdjustCover}
          aria-label="Ajustar capa na prévia"
          className="absolute bottom-1 left-1 w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-black/50 hover:bg-black/70 flex items-center justify-center transition-opacity opacity-80 sm:opacity-0 sm:group-hover:opacity-90"
        >
          <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536M9 15l6.586-6.586a2 2 0 112.828 2.828L11.828 17.828H9V15z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 20h16" />
          </svg>
        </button>
      )}
    </div>
  )
}

export function FeedGridPreview({
  items,
  editable,
  onAdjustCover,
}: {
  items: FeedGridPreviewItem[]
  /** Mostra a ação "Ajustar capa na prévia" nas células com capa. Só
   *  admin (/final/[id]) e criação (/final/criar) — o link público
   *  (/final/aprovar/[token]) nunca passa isso. */
  editable?: boolean
  /** originalIndex é o índice do item no array `items` recebido (antes do
   *  filtro/ordenação) — permite ao chamador localizar o item real (por
   *  posição no array de estado, ou via item.id) sem o grid precisar saber
   *  nada sobre como persistir o ajuste. */
  onAdjustCover?: (item: FeedGridPreviewItem, originalIndex: number) => void
}) {
  // order_position ausente (formulário de criação, ainda não salvo) → a
  // posição no array já É a ordem operacional, então ela serve de fallback.
  const gridItems = items
    .map((item, idx) => ({ item, order: item.order_position ?? idx, key: item.id ?? `idx-${idx}`, originalIndex: idx }))
    .filter(({ item }) => isInFeedGrid(item.type))
    .sort((a, b) => b.order - a.order) // mais recente primeiro

  if (gridItems.length === 0) return null

  return (
    <div className="grid grid-cols-3 gap-1 sm:gap-1.5 w-full max-w-[420px]">
      {gridItems.map(({ item, key, originalIndex }) => (
        <GridCell
          key={key}
          item={item}
          editable={editable}
          onAdjustCover={onAdjustCover ? () => onAdjustCover(item, originalIndex) : undefined}
        />
      ))}
    </div>
  )
}
