import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { STORAGE_BUCKET } from '@/lib/supabase-storage'

// Content-Type aceitos → extensão de arquivo
const ALLOWED_TYPES: Record<string, string> = {
  'image/jpeg':      '.jpg',
  'image/jpg':       '.jpg',
  'image/png':       '.png',
  'image/webp':      '.webp',
  'image/gif':       '.gif',
  'video/mp4':       '.mp4',
  'video/webm':      '.webm',
  'video/quicktime': '.mov',   // iPhone / macOS
  'video/x-msvideo': '.avi',
  'video/ogg':       '.ogv',
  'video/x-matroska':'.mkv',
}

/**
 * POST /api/final-reviews/upload-url
 *
 * Gera uma URL assinada para o navegador fazer upload direto ao Supabase Storage
 * sem passar o arquivo pelo servidor Next.js (evita limites de tamanho e timeout).
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

  // ── Validações ──────────────────────────────────────────────────────────
  if (!folder || !slot || !contentType) {
    return NextResponse.json(
      { error: 'Parâmetros obrigatórios: folder, slot, contentType.' },
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

  const ext = ALLOWED_TYPES[contentType]
  if (!ext) {
    return NextResponse.json(
      { error: 'Tipo de arquivo não suportado. Use JPG, PNG, WebP, GIF, MP4, WebM, MOV ou AVI.' },
      { status: 400 }
    )
  }

  // ── Gera URL assinada ───────────────────────────────────────────────────
  const path    = `${folder}/${slot}_${Date.now()}${ext}`
  const supabase = createServerClient()

  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .createSignedUploadUrl(path)

  if (error || !data) {
    console.error('Erro ao gerar signed URL:', error?.message)
    return NextResponse.json(
      { error: error?.message ?? 'Não foi possível gerar o link de upload.' },
      { status: 500 }
    )
  }

  // URL pública permanente — usada após o upload concluir
  const { data: publicUrlData } = supabase.storage
    .from(STORAGE_BUCKET)
    .getPublicUrl(path)

  return NextResponse.json({
    signedUrl: data.signedUrl,
    path,
    publicUrl: publicUrlData.publicUrl,
  })
}
