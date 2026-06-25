import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { STORAGE_BUCKET } from '@/lib/supabase-storage'

/**
 * POST /api/final-reviews/delete-media
 *
 * Remove arquivos antigos do Supabase Storage quando a mídia de um item
 * é substituída na edição pós-link.
 *
 * Body JSON: { urls: string[] }   ← URLs públicas dos arquivos a deletar
 * Retorna:   { deleted: number }
 *
 * Segurança:
 * - Só deleta caminhos dentro do bucket "final-reviews"
 * - Ignora silenciosamente URLs que não são do nosso Storage
 * - Não falha a requisição se a deleção não funcionar (a mídia nova já foi salva)
 * - Compatível com links antigos: só remove os arquivos que foram substituídos
 */
export async function POST(request: NextRequest) {
  let urls: string[]
  try {
    const body = await request.json()
    urls = Array.isArray(body?.urls) ? body.urls : []
  } catch {
    return NextResponse.json({ deleted: 0 })
  }

  if (urls.length === 0) return NextResponse.json({ deleted: 0 })

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
      return path
    })
    .filter((p): p is string => p !== null)

  if (paths.length === 0) return NextResponse.json({ deleted: 0 })

  const supabase = createServerClient()
  const { error } = await supabase.storage.from(STORAGE_BUCKET).remove(paths)

  if (error) {
    // Não falha — a substituição da mídia já foi salva no banco.
    // Arquivos órfãos podem ser limpos manualmente pelo painel do Supabase.
    console.error('[delete-media] Erro ao remover arquivos antigos:', error.message)
    return NextResponse.json({ deleted: 0, warning: error.message })
  }

  return NextResponse.json({ deleted: paths.length })
}
