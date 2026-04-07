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

// Grupos de formatos equivalentes entre redes (tratados como intercambiáveis)
// Ex: "reels" no Instagram = "video" no TikTok = "shorts" no YouTube
export const FORMAT_EQUIVALENCE_GROUPS: ContentType[][] = [
  ['reels', 'video', 'shorts'],
]

// Formatos que são vídeo → mostram roteiro, sem copy
export const VIDEO_FORMATS: ContentType[] = ['reels', 'video', 'shorts']

export function isVideoFormat(type: ContentType): boolean {
  return VIDEO_FORMATS.includes(type)
}

/**
 * Retorna os formatos compatíveis com TODAS as redes selecionadas.
 * Usa os grupos de equivalência para tratar reels/video/shorts como o mesmo.
 * O nome do formato exibido segue a nomenclatura da primeira rede selecionada.
 */
export function getCompatibleFormats(networks: SocialNetwork[]): ContentType[] {
  if (networks.length === 0) return []
  if (networks.length === 1) return NETWORK_FORMATS[networks[0]]

  // Expande um formato para seu grupo de equivalência
  const equivalentGroup = (fmt: ContentType): Set<ContentType> => {
    for (const group of FORMAT_EQUIVALENCE_GROUPS) {
      if (group.includes(fmt)) return new Set(group)
    }
    return new Set([fmt])
  }

  // Usa os formatos da primeira rede como base e filtra o que é compatível com as demais
  const baseFormats = NETWORK_FORMATS[networks[0]]
  const otherNetworks = networks.slice(1)

  return baseFormats.filter((fmt) => {
    const group = equivalentGroup(fmt)
    return otherNetworks.every((network) =>
      NETWORK_FORMATS[network].some((f) => group.has(f))
    )
  })
}

/**
 * Verifica se adicionar uma rede mantém pelo menos um formato compatível.
 * Útil para indicar na UI se a rede é adicionável ou incompatível.
 */
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
export type PlanStatus = 'draft' | 'sent' | 'completed'

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
  social_networks: SocialNetwork[]   // array — múltiplas redes por conteúdo
  type: ContentType
  copy_text: string | null
  video_script: string | null
  observations: string | null
  approval_status: ApprovalStatus
  order_position: number
  created_at: string
}

// ─── Formulário de criação ────────────────────────────────────────────────────
export interface ContentFormData {
  title: string
  social_networks: SocialNetwork[]   // array
  type: ContentType
  copy_text: string
  video_script: string
  observations: string
}

// ─── Helpers de stats ─────────────────────────────────────────────────────────
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
