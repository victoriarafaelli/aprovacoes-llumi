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

/** Um item de mídia: imagem, vídeo ou slide de carrossel */
export interface MediaItem {
  url:   string
  label: string // ex: "Slide 1", "" para itens únicos
}

/** Formatos que aceitam múltiplos itens de mídia */
export const MULTI_MEDIA_FORMATS: ContentType[] = ['carrossel', 'stories']

/** Formatos de vídeo (link de vídeo) */
export const VIDEO_MEDIA_FORMATS: ContentType[] = ['reels', 'video', 'shorts']

/** Formatos de imagem única */
export const IMAGE_MEDIA_FORMATS: ContentType[] = ['post']

/** Formatos sem mídia */
export const NO_MEDIA_FORMATS: ContentType[] = ['artigo']

export type MediaKind = 'video' | 'image' | 'multi' | 'none'

export function getMediaKind(type: ContentType): MediaKind {
  if (VIDEO_MEDIA_FORMATS.includes(type)) return 'video'
  if (IMAGE_MEDIA_FORMATS.includes(type))  return 'image'
  if (MULTI_MEDIA_FORMATS.includes(type))  return 'multi'
  return 'none'
}

// ─── Entidades do banco ───────────────────────────────────────────────────────

export interface FinalReview {
  id: string
  client_name: string
  month_reference: string
  share_token: string
  status: ReviewStatus
  created_at: string
  items?: FinalReviewItem[]
}

export interface FinalReviewItem {
  id: string
  review_id: string
  title: string
  social_networks: SocialNetwork[]
  type: ContentType
  caption: string | null        // legenda final
  observations: string | null
  publish_date: string | null
  publish_time: string | null
  reference_url: string | null
  media_items: MediaItem[]      // JSONB array no banco
  approval_status: ApprovalStatus
  client_feedback: string | null // comentário do cliente
  order_position: number
  created_at: string
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
  reference_url: string
  media_items: MediaItem[]
}

export const EMPTY_MEDIA_ITEM = (): MediaItem => ({ url: '', label: '' })

export const EMPTY_ITEM = (): FinalReviewItemFormData => ({
  title:           '',
  social_networks: ['instagram'],
  type:            'post',
  caption:         '',
  observations:    '',
  publish_date:    '',
  publish_time:    '',
  reference_url:   '',
  media_items:     [EMPTY_MEDIA_ITEM()],
})

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
  return /\.(mp4|webm|ogg|mov)(\?.*)?$/i.test(url)
}

export function getMediaLabel(kind: MediaKind): { field: string; hint: string } {
  if (kind === 'video')  return { field: 'Link do vídeo', hint: 'YouTube, Vimeo, Drive, Dropbox...' }
  if (kind === 'image')  return { field: 'Link da imagem', hint: 'Drive, Dropbox, URL direta...' }
  if (kind === 'multi')  return { field: 'Link do slide', hint: 'Drive, Dropbox, URL direta...' }
  return { field: '', hint: '' }
}

// Labels para tipos de media no campo
export const MEDIA_FIELD_LABELS: Record<ContentType, string> = {
  post:      'Link da imagem',
  carrossel: 'Link dos slides',
  reels:     'Link do vídeo',
  stories:   'Link das peças',
  video:     'Link do vídeo',
  shorts:    'Link do vídeo',
  artigo:    '',
}

export const NETWORKS_ORDER: SocialNetwork[] = [
  'instagram', 'tiktok', 'linkedin', 'facebook', 'youtube', 'x_threads',
]
