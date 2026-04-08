// ─── Redes sociais ────────────────────────────────────────────────────────────
export type SocialNetwork =
  | 'instagram'
  | 'tiktok'
  | 'linkedin'
  | 'facebook'
  | 'youtube'
  | 'x_threads'

export const NETWORKS_ORDER: SocialNetwork[] = [
  'instagram',
  'tiktok',
  'linkedin',
  'facebook',
  'youtube',
  'x_threads',
]

export const NETWORK_LABELS: Record<SocialNetwork, string> = {
  instagram: 'Instagram',
  tiktok:    'TikTok',
  linkedin:  'LinkedIn',
  facebook:  'Facebook',
  youtube:   'YouTube',
  x_threads: 'X / Threads',
}

export const NETWORK_COLORS: Record<SocialNetwork, string> = {
  instagram: 'bg-pink-100 text-pink-700',
  tiktok:    'bg-slate-100 text-slate-700',
  linkedin:  'bg-blue-100 text-blue-700',
  facebook:  'bg-indigo-100 text-indigo-700',
  youtube:   'bg-red-100 text-red-700',
  x_threads: 'bg-gray-100 text-gray-700',
}

// ─── Formatos por rede ────────────────────────────────────────────────────────
export type ContentType =
  | 'post'
  | 'carrossel'
  | 'reels'
  | 'stories'
  | 'video'
  | 'shorts'
  | 'artigo'

export const NETWORK_FORMATS: Record<SocialNetwork, ContentType[]> = {
  instagram: ['post', 'carrossel', 'reels', 'stories'],
  tiktok:    ['video'],
  linkedin:  ['post', 'artigo', 'video'],
  facebook:  ['post', 'reels', 'stories'],
  youtube:   ['video', 'shorts'],
  x_threads: ['post', 'video'],
}

// Grupos de formatos equivalentes entre redes
export const FORMAT_EQUIVALENCE_GROUPS: ContentType[][] = [
  ['reels', 'video', 'shorts'],
]

// Formatos que são vídeo
export const VIDEO_FORMATS: ContentType[] = ['reels', 'video', 'shorts']

export function isVideoFormat(type: ContentType): boolean {
  return VIDEO_FORMATS.includes(type)
}

export function getCompatibleFormats(networks: SocialNetwork[]): ContentType[] {
  if (networks.length === 0) return []
  if (networks.length === 1) return NETWORK_FORMATS[networks[0]]

  const equivalentGroup = (fmt: ContentType): Set<ContentType> => {
    for (const group of FORMAT_EQUIVALENCE_GROUPS) {
      if (group.includes(fmt)) return new Set(group)
    }
    return new Set([fmt])
  }

  const baseFormats  = NETWORK_FORMATS[networks[0]]
  const otherNetworks = networks.slice(1)

  return baseFormats.filter((fmt) => {
    const group = equivalentGroup(fmt)
    return otherNetworks.every((network) =>
      NETWORK_FORMATS[network].some((f) => group.has(f))
    )
  })
}

export function isNetworkCompatible(
  selectedNetworks: SocialNetwork[],
  candidate: SocialNetwork
): boolean {
  if (selectedNetworks.includes(candidate)) return true
  return getCompatibleFormats([...selectedNetworks, candidate]).length > 0
}

export const CONTENT_TYPE_LABELS: Record<ContentType, string> = {
  post:      'Post',
  carrossel: 'Carrossel',
  reels:     'Reels',
  stories:   'Stories',
  video:     'Vídeo',
  shorts:    'Shorts',
  artigo:    'Artigo',
}

export const CONTENT_TYPE_COLORS: Record<ContentType, string> = {
  post:      'bg-blue-100 text-blue-700',
  carrossel: 'bg-teal-100 text-teal-700',
  reels:     'bg-purple-100 text-purple-700',
  stories:   'bg-amber-100 text-amber-700',
  video:     'bg-rose-100 text-rose-700',
  shorts:    'bg-orange-100 text-orange-700',
  artigo:    'bg-cyan-100 text-cyan-700',
}

// ─── Status ───────────────────────────────────────────────────────────────────
export type ApprovalStatus = 'pending' | 'approved' | 'rejected'
export type PlanStatus     = 'draft' | 'sent' | 'completed'

// ─── Entidades do banco ───────────────────────────────────────────────────────
export interface Plan {
  id: string
  client_name: string
  month_reference: string
  share_token: string
  status: PlanStatus
  created_at: string
  contents?: Content[]
}

export interface Content {
  id: string
  plan_id: string
  title: string
  social_networks: SocialNetwork[]
  type: ContentType
  copy_text: string | null
  video_script: string | null
  observations: string | null
  // Novos campos
  publish_date: string | null    // formato ISO: "YYYY-MM-DD"
  publish_time: string | null    // formato "HH:MM"
  reference_url: string | null   // URL externa de referência
  approval_status: ApprovalStatus
  order_position: number
  created_at: string
}

// ─── Formulário de criação ────────────────────────────────────────────────────
export interface ContentFormData {
  title: string
  social_networks: SocialNetwork[]
  type: ContentType
  copy_text: string
  video_script: string
  observations: string
  // Novos campos
  publish_date: string
  publish_time: string
  reference_url: string
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
export interface PlanStats {
  total: number
  approved: number
  rejected: number
  pending: number
}

export function getPlanStats(contents: Pick<Content, 'approval_status'>[]): PlanStats {
  return {
    total:    contents.length,
    approved: contents.filter((c) => c.approval_status === 'approved').length,
    rejected: contents.filter((c) => c.approval_status === 'rejected').length,
    pending:  contents.filter((c) => c.approval_status === 'pending').length,
  }
}

/** Formata "YYYY-MM-DD" → "DD/MM/YYYY" para exibição */
export function formatDate(iso: string | null): string {
  if (!iso) return ''
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

/** Garante que uma string de URL tenha protocolo */
export function ensureHttps(url: string): string {
  if (!url) return ''
  return /^https?:\/\//i.test(url) ? url : `https://${url}`
}
