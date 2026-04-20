import { NextRequest, NextResponse } from 'next/server'
import { uploadFile } from '@/lib/supabase-storage'

// Tipos aceitos → extensão correspondente
const ALLOWED_TYPES: Record<string, string> = {
  'image/jpeg':      '.jpg',
  'image/jpg':       '.jpg',
  'image/png':       '.png',
  'image/webp':      '.webp',
  'image/gif':       '.gif',
  'video/mp4':       '.mp4',
  'video/webm':      '.webm',
  'video/quicktime': '.mov',
  'video/x-msvideo': '.avi',
}

/**
 * POST /api/final-reviews/upload
 * Recebe multipart/form-data com:
 *   - file   : File — o arquivo a enviar
 *   - folder : string — upload_session_id (32 hex chars)
 *   - slot   : string — identificador único do slot (ex: "0_0", "1_2")
 *
 * Retorna: { url: string } — URL pública permanente no Supabase Storage
 */
export async function POST(request: NextRequest) {
  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json({ error: 'Requisição inválida.' }, { status: 400 })
  }

  const file   = formData.get('file')   as File   | null
  const folder = formData.get('folder') as string | null
  const slot   = formData.get('slot')   as string | null

  if (!file || !folder || slot === null) {
    return NextResponse.json(
      { error: 'Parâmetros obrigatórios: file, folder, slot.' },
      { status: 400 }
    )
  }

  // Valida que folder é um UUID sem traços (32 chars hex) — evita path traversal
  if (!/^[a-f0-9]{32}$/i.test(folder)) {
    return NextResponse.json({ error: 'Pasta inválida.' }, { status: 400 })
  }

  // Valida que slot é alfanumérico (ex: "0_0", "1_2")
  if (!/^[a-z0-9_]+$/i.test(slot)) {
    return NextResponse.json({ error: 'Slot inválido.' }, { status: 400 })
  }

  const ext = ALLOWED_TYPES[file.type]
  if (!ext) {
    return NextResponse.json(
      { error: 'Tipo de arquivo não suportado. Use JPG, PNG, WebP, GIF, MP4, WebM ou MOV.' },
      { status: 400 }
    )
  }

  // Caminho dentro do bucket: {folder}/{slot}_{timestamp}{ext}
  // Estrutura plana dentro da pasta — simples de listar e excluir
  const path = `${folder}/${slot}_${Date.now()}${ext}`
  const buffer = Buffer.from(await file.arrayBuffer())

  try {
    const url = await uploadFile(buffer, path, file.type)
    return NextResponse.json({ url, path })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro no upload.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
