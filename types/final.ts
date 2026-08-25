import {
  SocialNetwork,
  ContentType,
  NETWORK_LABELS,
  NETWORK_COLORS,
  CONTENT_TYPE_LABELS,
  CONTENT_TYPE_COLORS,
  NETWORK_FORMATS,
  FORMAT_EQUIVALENCE_GROUPS,
  VIDEO_FORMATS,
  isVideoFormat,
  getCompatibleFormats,
  isNetworkCompatible,
  formatDate,
  ensureHttps,
} from './index'

// Re-exporta tudo que as páginas de final review precisam
export {
  NETWORK_LABELS, NETWORK_COLORS, CONTENT_TYPE_LABELS, CONTENT_TYPE_COLORS,
  NETWORK_FORMATS, FORMAT_EQUIVALENCE_GROUPS, VIDEO_FORMATS,
  isVideoFormat, getCompatibleFormats, isNetworkCompatible, formatDate, ensureHttps,
}
export type { SocialNetwork, ContentType }

// ─── Tipos exclusivos do sistema de Aprovação Final ───────────────────────────

export type ApprovalStatus = 'pending' | 'approved' | 'rejected'
export type ReviewStatus   = 'draft' | 'sent' | 'completed'

/** Um item de mídia armazenado no Supabase Storage */
export interface MediaItem {
  url:   string  // URL pública do Supabase Storage
  label: string  // ex: "Slide 1", "" para itens únicos
}

/** Formatos que aceitam múltiplos itens de mídia (carrossel de imagens) */
export const MULTI_MEDIA_FORMATS: ContentType[] = ['carrossel']

/** Formatos de vídeo */
export const VIDEO_MEDIA_FORMATS: ContentType[] = ['reels', 'video', 'shorts']

/** Formatos de imagem única */
export const IMAGE_MEDIA_FORMATS: ContentType[] = ['post']

/** Stories: aceita imagens (múltiplas) OU um vídeo (≤ 59 s) */
export const STORIES_FORMAT: ContentType[] = ['stories']

/** Formatos sem mídia */
export const NO_MEDIA_FORMATS: ContentType[] = ['artigo']

export type MediaKind = 'video' | 'image' | 'multi' | 'stories' | 'none'

export function getMediaKind(type: ContentType): MediaKind {
  if (VIDEO_MEDIA_FORMATS.includes(type)) return 'video'
  if (IMAGE_MEDIA_FORMATS.includes(type))  return 'image'
  if (MULTI_MEDIA_FORMATS.includes(type))  return 'multi'
  if (STORIES_FORMAT.includes(type))       return 'stories'
  return 'none'
}

/** Tipo de input de arquivo aceito por formato */
export const MEDIA_ACCEPT: Record<MediaKind, string> = {
  video:   'video/*',
  image:   'image/*',
  multi:   'image/*',
  stories: 'image/*,video/*',
  none:    '',
}

/** Dica de formato exibida no input de upload */
export const MEDIA_ACCEPT_HINT: Record<MediaKind, string> = {
  video:   'MP4 ou WebM recomendados · MOV aceito',
  image:   'JPG, PNG, WebP, GIF',
  multi:   'JPG, PNG, WebP, GIF',
  stories: 'JPG, PNG, WebP, GIF · ou MP4/MOV (máx. 59 s)',
  none:    '',
}

// ─── Entidades do banco ───────────────────────────────────────────────────────

export interface FinalReview {
  id: string
  client_name: string
  month_reference: string
  share_token: string
  storage_folder: string | null      // pasta no Supabase Storage para limpeza
  status: ReviewStatus
  created_at: string
  // ── Prévia do feed (opcional) ───────────────────────────────────────────────
  feed_preview_url: string | null    // URL pública da imagem no Storage
  feed_preview_status: ApprovalStatus
  feed_preview_feedback: string | null
  items?: FinalReviewItem[]
}

export interface FinalReviewItem {
  id: string
  review_id: string
  title: string
  social_networks: SocialNetwork[]
  type: ContentType
  caption: string | null         // legenda final
  observations: string | null
  publish_date: string | null
  publish_time: string | null
  media_items: MediaItem[]       // JSONB array no banco
  approval_status: ApprovalStatus
  client_feedback: string | null // comentário do cliente
  order_position: number
  created_at: string
  // ── Preview automático do feed ──────────────────────────────────────────────
  // Capa manual opcional: carrossel → aponta pro slide escolhido (null = 1º
  // slide); vídeo/reels/shorts → capa enviada ou frame capturado (null =
  // sem capa, mostra placeholder). Post usa sempre a própria imagem — este
  // campo fica null e não é usado nesse caso.
  feed_cover_url: string | null
  // ── Ajuste manual de enquadramento na Prévia de Feed ────────────────────────
  // Puramente visual — nunca recorta o arquivo original. null em qualquer um
  // dos três = enquadramento padrão (centro, sem zoom), idêntico ao
  // comportamento anterior a esta funcionalidade. Ver resolveFeedCoverAdjustment.
  feed_cover_position_x: number | null // 0–100 (equivalente a object-position X%)
  feed_cover_position_y: number | null // 0–100 (equivalente a object-position Y%)
  feed_cover_zoom: number | null       // 1–1.75 (1 = padrão atual, sem zoom extra)
}

// ─── Formulário de criação ────────────────────────────────────────────────────

export interface FinalReviewItemFormData {
  title: string
  social_networks: SocialNetwork[]
  type: ContentType
  caption: string
  observations: string
  publish_date: string
  publish_time: string
  media_items: MediaItem[]
  feed_cover_url: string | null
  feed_cover_position_x: number | null
  feed_cover_position_y: number | null
  feed_cover_zoom: number | null
}

export const EMPTY_MEDIA_ITEM = (): MediaItem => ({ url: '', label: '' })

export const EMPTY_ITEM = (): FinalReviewItemFormData => ({
  title:                  '',
  social_networks:        ['instagram'],
  type:                   'post',
  caption:                '',
  observations:           '',
  publish_date:           '',
  publish_time:           '',
  media_items:            [EMPTY_MEDIA_ITEM()],
  feed_cover_url:         null,
  feed_cover_position_x:  null,
  feed_cover_position_y:  null,
  feed_cover_zoom:        null,
})

/** Grid do feed inclui só formatos que aparecem na grade do perfil do
 *  Instagram — stories e artigo (LinkedIn) ficam de fora. */
export const FEED_GRID_FORMATS: ContentType[] = ['post', 'carrossel', 'reels', 'video', 'shorts']

export function isInFeedGrid(type: ContentType): boolean {
  return FEED_GRID_FORMATS.includes(type)
}

/**
 * Resolve a URL de capa de um item para o grid do feed, com fallback
 * automático se a capa escolhida não existir mais entre media_items
 * (carrossel) — nunca retorna uma URL órfã.
 */
export function resolveFeedCoverUrl(item: Pick<FinalReviewItem, 'type' | 'media_items' | 'feed_cover_url'>): string | null {
  const kind = getMediaKind(item.type)
  const urls = (item.media_items ?? []).map((m) => m.url).filter(Boolean)

  if (kind === 'image') {
    return urls[0] ?? null
  }
  if (kind === 'multi') {
    if (item.feed_cover_url && urls.includes(item.feed_cover_url)) return item.feed_cover_url
    return urls[0] ?? null
  }
  if (kind === 'video') {
    return item.feed_cover_url ?? null
  }
  return null
}

// ─── Ajuste manual de enquadramento (Prévia de Feed) ──────────────────────────

export const FEED_COVER_POSITION_MIN = 0
export const FEED_COVER_POSITION_MAX = 100
export const FEED_COVER_ZOOM_MIN = 1
export const FEED_COVER_ZOOM_MAX = 1.75

export interface FeedCoverAdjustment {
  positionX: number
  positionY: number
  zoom: number
}

/** Enquadramento padrão — centro, sem zoom extra. Idêntico ao
 *  comportamento de antes desta funcionalidade existir. */
export const DEFAULT_FEED_COVER_ADJUSTMENT: FeedCoverAdjustment = { positionX: 50, positionY: 50, zoom: 1 }

/** Resolve o enquadramento efetivo de um item — null em qualquer campo cai
 *  pro padrão, então aprovações antigas (sem essas colunas) renderizam
 *  exatamente como sempre renderizaram. */
export function resolveFeedCoverAdjustment(
  item: Pick<FinalReviewItem, 'feed_cover_position_x' | 'feed_cover_position_y' | 'feed_cover_zoom'>
): FeedCoverAdjustment {
  return {
    positionX: item.feed_cover_position_x ?? DEFAULT_FEED_COVER_ADJUSTMENT.positionX,
    positionY: item.feed_cover_position_y ?? DEFAULT_FEED_COVER_ADJUSTMENT.positionY,
    zoom:      item.feed_cover_zoom       ?? DEFAULT_FEED_COVER_ADJUSTMENT.zoom,
  }
}

// ─── Helpers de stats ─────────────────────────────────────────────────────────

export interface ReviewStats {
  total: number
  approved: number
  rejected: number
  pending: number
}

export function getReviewStats(items: Pick<FinalReviewItem, 'approval_status'>[]): ReviewStats {
  return {
    total:    items.length,
    approved: items.filter((i) => i.approval_status === 'approved').length,
    rejected: items.filter((i) => i.approval_status === 'rejected').length,
    pending:  items.filter((i) => i.approval_status === 'pending').length,
  }
}

// ─── Helpers de mídia ─────────────────────────────────────────────────────────

export function getYouTubeEmbedUrl(url: string): string | null {
  const patterns = [
    /youtube\.com\/watch\?v=([^&\s]+)/,
    /youtube\.com\/embed\/([^?\s]+)/,
    /youtu\.be\/([^?\s]+)/,
    /youtube\.com\/shorts\/([^?\s]+)/,
  ]
  for (const p of patterns) {
    const m = url.match(p)
    if (m) return `https://www.youtube.com/embed/${m[1]}`
  }
  return null
}

export function getVimeoEmbedUrl(url: string): string | null {
  const m = url.match(/vimeo\.com\/(?:.*\/)?(\d+)/)
  return m ? `https://player.vimeo.com/video/${m[1]}` : null
}

export function isDirectImageUrl(url: string): boolean {
  return /\.(jpg|jpeg|png|gif|webp|avif|svg)(\?.*)?$/i.test(url)
}

export function isDirectVideoUrl(url: string): boolean {
  return /\.(mp4|webm|ogg|mov|avi)(\?.*)?$/i.test(url)
}

export const NETWORKS_ORDER: SocialNetwork[] = [
  'instagram', 'tiktok', 'linkedin', 'facebook', 'youtube', 'x_threads',
]
