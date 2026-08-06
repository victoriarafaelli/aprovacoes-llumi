'use client'

/**
 * MediaUploadSlot — componente compartilhado de upload de arquivo único.
 *
 * Implementa o fluxo de URL assinada:
 *   1. Solicita signed upload URL ao servidor (POST /api/final-reviews/upload-url)
 *   2. Faz PUT direto do navegador → Supabase Storage via XHR (sem passar pelo Next.js)
 *
 * Usado em:
 *   - app/final/criar/page.tsx   (criação de nova aprovação final)
 *   - app/final/[id]/page.tsx    (edição de item após link gerado)
 */

import { useState, useRef } from 'react'
import { isDirectImageUrl } from '@/types/final'

// ─── Helpers de tipo MIME ─────────────────────────────────────────────────────

/** Mapeamento extensão → MIME para quando file.type está vazio (comum no Windows/Firefox com .mov) */
const EXT_TO_MIME: Record<string, string> = {
  mp4:  'video/mp4',
  m4v:  'video/mp4',
  webm: 'video/webm',
  mov:  'video/quicktime',
  avi:  'video/x-msvideo',
  mkv:  'video/x-matroska',
  jpg:  'image/jpeg',
  jpeg: 'image/jpeg',
  png:  'image/png',
  webp: 'image/webp',
  gif:  'image/gif',
}

/**
 * Resolve o tipo MIME real do arquivo.
 * Se file.type estiver vazio (acontece com .mov no Windows/Firefox),
 * usa a extensão do nome do arquivo como fallback.
 */
export function resolveContentType(file: File): string {
  if (file.type && file.type.length > 0) return file.type
  const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
  return EXT_TO_MIME[ext] ?? ''
}

/**
 * Retorna o Content-Type que o Supabase Storage realmente aceita no PUT.
 *
 * Problema: Supabase Storage rejeita video/quicktime (MOV) com status 400.
 * Solução: enviamos o arquivo com Content-Type video/mp4, que é aceito.
 */
const STORAGE_COMPAT: Record<string, string> = {
  'video/quicktime':  'video/mp4',
  'video/x-msvideo':  'video/mp4',
  'video/x-matroska': 'video/webm',
  'video/mpeg':       'video/mp4',
}

export function getStorageContentType(mimeType: string): string {
  return STORAGE_COMPAT[mimeType] ?? mimeType
}

// ─── Componente ───────────────────────────────────────────────────────────────

/**
 * Slot de upload de um arquivo único — imagem ou vídeo.
 *
 * Props:
 *   accept      — string para o atributo accept do <input> (ex: "image/*,video/*")
 *   acceptHint  — texto de dica exibido no estado vazio
 *   value       — URL pública do arquivo já enviado ('' se ainda não enviado)
 *   onChange    — chamado com a nova URL pública após upload bem-sucedido,
 *                 ou com '' quando o arquivo é removido
 *   folder      — pasta no bucket (32 hex chars: storage_folder da review)
 *   slotKey     — identificador único do slot (ex: "0_0", "edit_abc123_1")
 *   label       — texto opcional exibido no estado vazio e no rodapé (ex: "Slide 1")
 */
export function MediaUploadSlot({
  accept,
  acceptHint,
  value,
  onChange,
  folder,
  slotKey,
  label,
}: {
  accept:     string
  acceptHint: string
  value:      string
  onChange:   (url: string) => void
  folder:     string
  slotKey:    string
  label?:     string
}) {
  const [progress,    setProgress]    = useState<number | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [currentFile, setCurrentFile] = useState<{ name: string; size: number } | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const xhrRef   = useRef<XMLHttpRequest | null>(null)

  const handleFile = async (file: File) => {
    setProgress(0)
    setUploadError(null)
    setCurrentFile({ name: file.name, size: file.size })

    const contentType = resolveContentType(file)
    if (!contentType) {
      setUploadError(`Formato não reconhecido: "${file.name}". Use MP4, WebM, MOV, JPG ou PNG.`)
      setProgress(null)
      return
    }

    const storageContentType = getStorageContentType(contentType)

    // Passo 1: pedir URL assinada ao servidor
    let signedUrl: string
    let publicUrl: string
    try {
      const res = await fetch('/api/final-reviews/upload-url', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ folder, slot: slotKey, contentType }),
      })
      const data = await res.json()
      if (!res.ok) {
        setUploadError(data.error ?? 'Erro ao iniciar upload.')
        setProgress(null)
        return
      }
      signedUrl = data.signedUrl
      publicUrl = data.publicUrl
    } catch {
      setUploadError('Erro de conexão ao iniciar upload.')
      setProgress(null)
      return
    }

    // Passo 2: PUT direto para o Supabase Storage via XHR
    await new Promise<void>((resolve) => {
      const xhr = new XMLHttpRequest()
      xhrRef.current = xhr

      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          setProgress(Math.round((e.loaded / e.total) * 100))
        }
      })

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          onChange(publicUrl)
          setProgress(null)
        } else {
          let storageError = ''
          try {
            const parsed = JSON.parse(xhr.responseText)
            storageError = parsed.error ?? parsed.message ?? parsed.statusCode ?? ''
          } catch { /* responseText não é JSON */ }

          const isPayloadTooLarge =
            xhr.status === 413 ||
            storageError.toLowerCase().includes('payload too large') ||
            storageError.toLowerCase().includes('entity too large') ||
            storageError.toLowerCase().includes('file size')

          if (isPayloadTooLarge) {
            const mb = (file.size / 1024 / 1024).toFixed(1)
            setUploadError(
              `Arquivo muito grande (${mb} MB). O limite do bucket no Supabase precisa ser aumentado. ` +
              `Execute o SQL indicado na documentação ou converta o vídeo para MP4.`
            )
          } else if (storageError) {
            setUploadError(`Upload falhou: ${storageError}`)
          } else if (xhr.status === 400) {
            setUploadError(`Upload rejeitado (400). Formato "${file.name.split('.').pop()?.toUpperCase()}" pode não ser suportado. Tente converter para MP4.`)
          } else {
            setUploadError(`Erro ${xhr.status} no upload. Tente novamente.`)
          }
          setProgress(null)
        }
        resolve()
      })

      xhr.addEventListener('error', () => {
        setUploadError('Erro de conexão durante o upload. Verifique sua internet e tente novamente.')
        setProgress(null)
        resolve()
      })

      xhr.addEventListener('abort', () => {
        setProgress(null)
        resolve()
      })

      xhr.open('PUT', signedUrl)
      xhr.setRequestHeader('Content-Type', storageContentType)
      xhr.setRequestHeader('x-upsert', 'true')
      xhr.send(file)
    })

    xhrRef.current = null
  }

  const handleRemove = () => {
    if (xhrRef.current) { xhrRef.current.abort(); xhrRef.current = null }
    onChange('')
    setProgress(null)
    setUploadError(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  const uploading = progress !== null
  const isImage   = value && isDirectImageUrl(value)

  const fmtSize = (bytes: number) =>
    bytes < 1024 * 1024
      ? `${(bytes / 1024).toFixed(0)} KB`
      : `${(bytes / 1024 / 1024).toFixed(1)} MB`

  return (
    <div className="flex flex-col gap-1">
      {/* Input oculto */}
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
      />

      {uploading ? (
        <div className="border border-indigo-200 bg-indigo-50 rounded-xl px-4 py-4 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-indigo-600 font-medium truncate max-w-[70%]">
              {label ? `${label} — ` : ''}
              {currentFile ? currentFile.name : 'Enviando...'}
            </span>
            <span className="text-xs text-indigo-400 font-semibold tabular-nums shrink-0">
              {currentFile ? fmtSize(currentFile.size) : ''} · {progress}%
            </span>
          </div>
          <div className="h-1.5 bg-indigo-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-indigo-500 rounded-full transition-all duration-150"
              style={{ width: `${progress}%` }}
            />
          </div>
          <button
            type="button"
            onClick={handleRemove}
            className="text-xs text-indigo-400 hover:text-red-500 self-end transition-colors"
          >
            Cancelar
          </button>
        </div>
      ) : value ? (
        <div className="border border-gray-200 rounded-xl overflow-hidden bg-gray-50">
          {isImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={value}
              alt={label ?? 'Mídia'}
              className="w-full max-h-52 object-contain bg-gray-100"
            />
          ) : (
            <div className="flex items-center gap-3 px-4 py-4">
              <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center shrink-0">
                <svg className="w-5 h-5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round"
                    d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9A2.25 2.25 0 0013.5 5.25h-9A2.25 2.25 0 002.25 7.5v9A2.25 2.25 0 004.5 18.75z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700">Vídeo enviado</p>
                <p className="text-xs text-gray-400">Será exibido embutido no link de aprovação</p>
              </div>
            </div>
          )}
          <div className="flex items-center justify-between px-3 py-2 bg-white border-t border-gray-100">
            {label
              ? <span className="text-xs text-gray-400 font-medium">{label}</span>
              : <span className="text-xs text-green-600 font-medium">Enviado</span>
            }
            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleRemove}
                className="text-xs text-red-400 hover:text-red-600 transition-colors"
              >
                Remover
              </button>
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="text-xs text-indigo-500 hover:text-indigo-700 transition-colors font-medium"
              >
                Trocar
              </button>
            </div>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="w-full border-2 border-dashed border-gray-200 rounded-xl py-7 flex flex-col items-center gap-2 text-gray-400 hover:border-indigo-300 hover:text-indigo-500 transition-colors"
        >
          <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
          </svg>
          <span className="text-sm font-medium">
            {label
              ? `${label} — Selecionar arquivo`
              : accept.startsWith('video') ? 'Selecionar vídeo'
              : accept.includes('video') ? 'Selecionar imagem ou vídeo'
              : 'Selecionar imagem'
            }
          </span>
          <span className="text-xs text-gray-400">{acceptHint}</span>
        </button>
      )}

      {uploadError && (
        <p className="text-xs text-red-500 mt-0.5">{uploadError}</p>
      )}
    </div>
  )
}
