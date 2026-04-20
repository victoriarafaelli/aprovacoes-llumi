import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { STORAGE_BUCKET } from '@/lib/supabase-storage'

/**
 * Mapeamento: Content-Type aceito → extensão usada no nome do arquivo.
 *
 * IMPORTANTE: para vídeos nativos de câmera (MOV/QuickTime), o frontend
 * remapeia o Content-Type para video/mp4 antes do PUT ao Supabase Storage
 * (veja getStorageContentType no criar/page.tsx), mas ainda envia o tipo
 * original aqui para que possamos salvar o arquivo com a extensão correta.
 */
const ALLOWED_TYPES: Record<string, string> = {
  // Imagens
  'image/jpeg':               '.jpg',
  'image/jpg':                '.jpg',
  'image/png':                '.png',
  'image/webp':               '.webp',
  'image/gif':                '.gif',
  // Vídeos — tipos que o browser pode reportar
  'video/mp4':                '.mp4',
  'video/x-m4v':              '.mp4',
  'video/webm':               '.webm',
  'video/quicktime':          '.mov',   // iPhone / macOS (Safari, Chrome)
  'video/x-msvideo':          '.avi',
  'video/x-matroska':         '.mkv',
  'video/ogg':                '.ogv',
  'video/mpeg':               '.mpeg',
  // Fallback: Windows/Firefox às vezes reportam octet-stream para MOV
  // Nesses casos o frontend já resolveu via extensão antes de chegar aqui
  'application/octet-stream': '.bin',   // aceito como último recurso
}

/**
 * POST /api/final-reviews/upload-url
 *
 * Gera uma URL assinada para o navegador fazer upload DIRETO ao Supabase Storage
 * sem passar o arquivo pelo servidor Next.js (sem limite de tamanho ou timeout).
 *
 * Body JSON: { folder: string, slot: string, contentType: string }
 * Retorna:   { signedUrl: string, publicUrl: string, path: string }
 */
export async function POST(request: NextRequest) {
  const body = await request.json()
  const { folder, slot, contentType } = body as {
    folder:      string
    slot:        string
    contentType: string
  }

  // ── Validações ──────────────────────────────────────────────────────────────

  if (!folder || !slot) {
    return NextResponse.json(
      { error: 'Parâmetros obrigatórios: folder, slot.' },
      { status: 400 }
    )
  }

  // Tipo pode chegar vazio se o SO não reportou MIME — frontend deve resolver antes
  if (!contentType) {
    return NextResponse.json(
      { error: 'Não foi possível determinar o tipo do arquivo. Verifique se o formato é suportado.' },
      { status: 400 }
    )
  }

  // folder = UUID sem traços (32 hex chars) — previne path traversal
  if (!/^[a-f0-9]{32}$/i.test(folder)) {
    return NextResponse.json({ error: 'Pasta inválida.' }, { status: 400 })
  }

  // slot = alfanumérico + underscore (ex: "0_0", "1_2")
  if (!/^[a-z0-9_]+$/i.test(slot)) {
    return NextResponse.json({ error: 'Slot inválido.' }, { status: 400 })
  }

  const ext = ALLOWED_TYPES[contentType.toLowerCase()]
  if (!ext) {
    // Devolve o tipo recebido para facilitar diagnóstico
    return NextResponse.json(
      {
        error: `Formato não suportado: "${contentType}". Formatos aceitos: MP4, WebM, MOV, JPG, PNG, WebP, GIF.`,
      },
      { status: 400 }
    )
  }

  // ── Gera URL assinada ────────────────────────────────────────────────────────

  // Para arquivos binários genéricos, usamos extensão baseada na detecção anterior
  const path     = `${folder}/${slot}_${Date.now()}${ext}`
  const supabase = createServerClient()

  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .createSignedUploadUrl(path)

  if (error || !data) {
    console.error('[upload-url] Erro Supabase:', error?.message)
    return NextResponse.json(
      { error: error?.message ?? 'Não foi possível gerar o link de upload.' },
      { status: 500 }
    )
  }

  const { data: publicUrlData } = supabase.storage
    .from(STORAGE_BUCKET)
    .getPublicUrl(path)

  return NextResponse.json({
    signedUrl: data.signedUrl,
    path,
    publicUrl: publicUrlData.publicUrl,
  })
}
