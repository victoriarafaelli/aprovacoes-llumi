import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { STORAGE_BUCKET } from '@/lib/supabase-storage'

/**
 * POST /api/final-reviews/delete-media
 *
 * Remove arquivos antigos do Supabase Storage quando a mídia de um item
 * é substituída na edição pós-link (slide trocado/removido, capa de vídeo
 * trocada).
 *
 * Body JSON: { review_id: string, urls: string[] }   ← URLs públicas a deletar
 * Retorna:   { deleted: number }
 *
 * Segurança:
 * - review_id é obrigatório: busca o storage_folder real dessa review no
 *   banco (nunca confia em um "folder" vindo do corpo da requisição) e só
 *   deleta caminhos que comecem exatamente por "{storage_folder}/" —
 *   uma URL de OUTRA review (ou qualquer objeto fora dessa pasta) nunca é
 *   removida, mesmo que esteja no mesmo bucket.
 * - Só deleta caminhos dentro do bucket "final-reviews".
 * - Ignora silenciosamente URLs que não são do nosso Storage ou que não
 *   pertencem à pasta da review informada — não falha a requisição por
 *   causa disso.
 * - Não falha a requisição se a deleção não funcionar (a mídia nova já foi salva)
 */
export async function POST(request: NextRequest) {
  let reviewId: string
  let urls: string[]
  try {
    const body = await request.json()
    reviewId = typeof body?.review_id === 'string' ? body.review_id : ''
    urls = Array.isArray(body?.urls) ? body.urls : []
  } catch {
    return NextResponse.json({ deleted: 0 })
  }

  if (!reviewId || urls.length === 0) return NextResponse.json({ deleted: 0 })

  const supabase = createServerClient()

  // Busca a pasta REAL dessa review no banco — nunca aceita um folder vindo
  // do corpo da requisição, senão qualquer chamador poderia apagar arquivos
  // de outra review só informando a pasta dela.
  const { data: review, error: reviewError } = await supabase
    .from('final_reviews')
    .select('storage_folder')
    .eq('id', reviewId)
    .single()

  if (reviewError || !review?.storage_folder) return NextResponse.json({ deleted: 0 })

  const folderPrefix = `${review.storage_folder}/`

  // Extrai o caminho relativo ao bucket a partir da URL pública do Supabase.
  // Formato: https://xxx.supabase.co/storage/v1/object/public/final-reviews/FOLDER/FILE
  // Caminho extraído: FOLDER/FILE
  const marker = `/storage/v1/object/public/${STORAGE_BUCKET}/`

  const paths = urls
    .map((url) => {
      if (typeof url !== 'string') return null
      const idx = url.indexOf(marker)
      if (idx === -1) return null
      const path = url.slice(idx + marker.length)
      // Validação básica: deve parecer com "folder/file", sem travessias de path
      if (!path || path.includes('..') || path.startsWith('/')) return null
      // Só remove objetos dentro da pasta desta review — nunca de outra
      if (!path.startsWith(folderPrefix)) return null
      return path
    })
    .filter((p): p is string => p !== null)

  if (paths.length === 0) return NextResponse.json({ deleted: 0 })

  const { error } = await supabase.storage.from(STORAGE_BUCKET).remove(paths)

  if (error) {
    // Não falha — a substituição da mídia já foi salva no banco.
    // Arquivos órfãos podem ser limpos manualmente pelo painel do Supabase.
    console.error('[delete-media] Erro ao remover arquivos antigos:', error.message)
    return NextResponse.json({ deleted: 0, warning: error.message })
  }

  return NextResponse.json({ deleted: paths.length })
}
