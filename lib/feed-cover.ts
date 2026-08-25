import { STORAGE_BUCKET } from '@/lib/supabase-storage'
import { ContentType, MediaItem, getMediaKind } from '@/types/final'

/** Origin do projeto Supabase do ambiente atual — nunca hardcoded, lida de
 *  NEXT_PUBLIC_SUPABASE_URL, então funciona igual em produção e em
 *  preview/teste (cada ambiente aponta pro seu próprio projeto). */
function getSupabaseOrigin(): string {
  return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!).origin
}

/**
 * Confirma que uma URL é um objeto do NOSSO projeto Supabase, do NOSSO
 * bucket, e dentro da pasta (storage_folder) da própria review — não
 * qualquer URL pública que só "parece" certa por conter o nome do bucket.
 *
 *   - origin exata: comparada com a origin de NEXT_PUBLIC_SUPABASE_URL do
 *     ambiente atual — bloqueia outro domínio E outro projeto Supabase
 *     (mesmo que esse outro projeto também tenha um bucket "final-reviews").
 *   - bucket + pasta: pathname precisa começar exatamente por
 *     "/storage/v1/object/public/{BUCKET}/{storageFolder}/" — uma mídia de
 *     OUTRA review (outra pasta) ou de outro bucket é rejeitada mesmo
 *     estando no mesmo projeto Supabase.
 *   - URL malformada: capturada pelo try/catch do `new URL()`.
 */
export function isOwnStorageUrl(url: string, storageFolder: string | null): boolean {
  if (typeof url !== 'string' || !storageFolder) return false

  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return false
  }

  if (parsed.origin !== getSupabaseOrigin()) return false

  const expectedPrefix = `/storage/v1/object/public/${STORAGE_BUCKET}/${storageFolder}/`
  return parsed.pathname.startsWith(expectedPrefix)
}

/**
 * Pasta efetiva de uma review: usa o storage_folder já salvo no banco, ou
 * o mesmo fallback determinístico (id sem hífens) que o cliente já usa
 * quando a review ainda não tem storage_folder gravado — nunca um valor
 * vindo do corpo da requisição.
 */
export function resolveStorageFolder(reviewId: string, storageFolder: string | null): string {
  return storageFolder || reviewId.replace(/-/g, '')
}

/**
 * Sanitiza feed_cover_url ANTES de gravar no banco — mesma regra em toda
 * rota que grava esse campo (criação, adicionar depois do link, edição).
 * Nunca lança erro: normaliza pra null (fallback automático) em vez de
 * rejeitar a requisição, mantendo o mesmo espírito "corrige sozinho" já
 * usado no resto do app (ex: filtra media_items com URL vazia).
 *
 *   - carrossel: só aceita se for exatamente uma URL presente em
 *     media_items daquele item — nunca um índice, pra sobreviver a
 *     remoção/reordenação de slides sem apontar pro lugar errado. Regra
 *     mais restritiva que a de vídeo — não precisa checar origem/pasta
 *     separadamente, porque só aceita URLs que já estão em media_items,
 *     que por sua vez só chegam lá através do mesmo fluxo de upload.
 *   - vídeo: só aceita se for um objeto do NOSSO projeto Supabase, NOSSO
 *     bucket, e da pasta desta review especificamente — nunca URL externa,
 *     nunca de outro projeto/bucket, nunca de outra review.
 *   - post/stories/artigo: feed_cover_url nunca é usado nesses formatos.
 */
export function sanitizeFeedCoverUrl(
  type: ContentType,
  mediaItems: Pick<MediaItem, 'url'>[],
  feedCoverUrl: string | null | undefined,
  storageFolder: string | null
): string | null {
  if (!feedCoverUrl) return null

  const kind = getMediaKind(type)

  if (kind === 'multi') {
    const urls = (mediaItems ?? []).map((m) => m.url)
    return urls.includes(feedCoverUrl) ? feedCoverUrl : null
  }

  if (kind === 'video') {
    return isOwnStorageUrl(feedCoverUrl, storageFolder) ? feedCoverUrl : null
  }

  return null
}

/**
 * Sanitiza um valor de ajuste de enquadramento (posição X/Y ou zoom) da
 * Prévia de Feed antes de gravar no banco. Como esses valores vêm direto do
 * navegador (arrastar/zoom no cliente), nunca confiamos neles crus:
 *
 *   - só aceita `number` finito — string, CSS, HTML ou qualquer outro tipo
 *     vira null (mesmo espírito "corrige sozinho" de sanitizeFeedCoverUrl,
 *     nunca lança erro/rejeita a requisição inteira);
 *   - valores numéricos fora do intervalo são normalizados (clamp) pro
 *     limite mais próximo, em vez de rejeitados — um 200 vira 100, não vira
 *     null, porque é claramente uma tentativa válida de "máximo".
 */
export function sanitizeFeedCoverAdjustmentValue(
  value: unknown,
  min: number,
  max: number
): number | null {
  if (value === null || value === undefined) return null
  if (typeof value !== 'number' || !Number.isFinite(value)) return null
  return Math.min(max, Math.max(min, value))
}
