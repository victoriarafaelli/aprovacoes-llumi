'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'
import {
  FinalReviewItemFormData,
  MediaItem,
  ContentType,
  SocialNetwork,
  NETWORKS_ORDER,
  CONTENT_TYPE_LABELS,
  NETWORK_LABELS,
  getCompatibleFormats,
  isNetworkCompatible,
  getMediaKind,
  EMPTY_ITEM,
  EMPTY_MEDIA_ITEM,
  MediaKind,
  MEDIA_ACCEPT,
  MEDIA_ACCEPT_HINT,
  isDirectImageUrl,
} from '@/types/final'

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
function resolveContentType(file: File): string {
  if (file.type && file.type.length > 0) return file.type
  const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
  return EXT_TO_MIME[ext] ?? ''
}

/**
 * Retorna o Content-Type que o Supabase Storage realmente aceita no PUT.
 *
 * Problema: Supabase Storage rejeita video/quicktime (MOV) com status 400.
 * Solução: enviamos o arquivo com Content-Type video/mp4, que é aceito.
 * O arquivo .mov ainda é salvo com a extensão correta no nome.
 */
const STORAGE_COMPAT: Record<string, string> = {
  'video/quicktime':  'video/mp4',  // MOV → enviado como MP4 para o Storage
  'video/x-msvideo':  'video/mp4',  // AVI → enviado como MP4
  'video/x-matroska': 'video/webm', // MKV → enviado como WebM
  'video/mpeg':       'video/mp4',  // MPEG → enviado como MP4
}

function getStorageContentType(mimeType: string): string {
  return STORAGE_COMPAT[mimeType] ?? mimeType
}

// ─── Upload de um arquivo único ───────────────────────────────────────────────
// O arquivo vai DIRETO do navegador para o Supabase Storage via URL assinada.
// O servidor Next.js só gera o token — nunca toca no conteúdo do arquivo.
// Isso elimina limites de tamanho e timeout do Vercel/Next.js para vídeos.
function FileUploadSlot({
  accept,
  acceptHint,
  value,
  onChange,
  folder,
  slotKey,
  label,
}: {
  accept: 'image/*' | 'video/*' | ''
  acceptHint: string
  value: string          // URL pública no Storage ('' se ainda não enviado)
  onChange: (url: string) => void
  folder: string         // upload session ID (32 hex chars)
  slotKey: string        // identificador único: "itemIdx_slotIdx"
  label?: string         // ex: "Slide 1"
}) {
  const [progress,     setProgress]     = useState<number | null>(null) // 0-100 ou null
  const [uploadError,  setUploadError]  = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const xhrRef   = useRef<XMLHttpRequest | null>(null)

  const handleFile = async (file: File) => {
    setProgress(0)
    setUploadError(null)

    // Resolve o tipo MIME (corrige file.type vazio em Windows/Firefox com .mov)
    const contentType = resolveContentType(file)
    if (!contentType) {
      setUploadError(`Formato não reconhecido: "${file.name}". Use MP4, WebM, MOV, JPG ou PNG.`)
      setProgress(null)
      return
    }

    // Tipo usado no PUT ao Supabase (video/quicktime → video/mp4, etc.)
    const storageContentType = getStorageContentType(contentType)

    // ── Passo 1: pedir URL assinada ao servidor (requisição JSON minúscula) ──
    let signedUrl: string
    let publicUrl: string
    try {
      const res = await fetch('/api/final-reviews/upload-url', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        // Envia o tipo real para que o backend escolha a extensão certa no nome
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

    // ── Passo 2: PUT direto para o Supabase Storage via XHR ──────────────────
    // Usa storageContentType (video/mp4) mesmo para arquivos .mov,
    // porque o Supabase Storage rejeita video/quicktime com status 400.
    await new Promise<void>((resolve) => {
      const xhr = new XMLHttpRequest()
      xhrRef.current = xhr

      // Progresso real de upload (funciona com XHR, não com fetch)
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
          // Lê a mensagem real do Supabase para exibir um erro útil
          let storageError = ''
          try {
            const parsed = JSON.parse(xhr.responseText)
            storageError = parsed.error ?? parsed.message ?? parsed.statusCode ?? ''
          } catch { /* responseText não é JSON */ }

          if (storageError) {
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
      xhr.setRequestHeader('x-upsert', 'true') // permite sobrescrever se o slot já existir
      xhr.send(file)
    })

    xhrRef.current = null
  }

  const handleRemove = () => {
    // Cancela upload em andamento se houver
    if (xhrRef.current) { xhrRef.current.abort(); xhrRef.current = null }
    onChange('')
    setProgress(null)
    setUploadError(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  const uploading = progress !== null
  const isImage   = value && isDirectImageUrl(value)

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
        /* Estado: enviando — barra de progresso real */
        <div className="border border-indigo-200 bg-indigo-50 rounded-xl px-4 py-4 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-indigo-600 font-medium">
              {label ? `${label} — ` : ''}Enviando...
            </span>
            <span className="text-xs text-indigo-400 font-semibold tabular-nums">
              {progress}%
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
        /* Estado: arquivo enviado */
        <div className="border border-gray-200 rounded-xl overflow-hidden bg-gray-50">
          {isImage ? (
            /* Preview de imagem */
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={value}
              alt={label ?? 'Mídia'}
              className="w-full max-h-52 object-contain bg-gray-100"
            />
          ) : (
            /* Vídeo: sem preview, mostra ícone + indicação */
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

          {/* Barra de ações */}
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
        /* Estado: vazio — clique para selecionar */
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
              : accept === 'video/*' ? 'Selecionar vídeo' : 'Selecionar imagem'
            }
          </span>
          <span className="text-xs text-gray-300">{acceptHint}</span>
        </button>
      )}

      {uploadError && (
        <p className="text-xs text-red-500 mt-0.5">{uploadError}</p>
      )}
    </div>
  )
}

// ─── Campos de upload por formato ─────────────────────────────────────────────
function MediaUploadFields({
  kind,
  mediaItems,
  onChange,
  folder,
  itemIndex,
}: {
  kind: MediaKind
  mediaItems: MediaItem[]
  onChange: (items: MediaItem[]) => void
  folder: string
  itemIndex: number
}) {
  if (kind === 'none') return null

  const accept     = MEDIA_ACCEPT[kind]
  const acceptHint = MEDIA_ACCEPT_HINT[kind]

  // Vídeo ou imagem única
  if (kind === 'video' || kind === 'image') {
    const item = mediaItems[0] ?? EMPTY_MEDIA_ITEM()
    return (
      <FileUploadSlot
        accept={accept}
        acceptHint={acceptHint}
        value={item.url}
        onChange={(url) => onChange([{ url, label: '' }])}
        folder={folder}
        slotKey={`${itemIndex}_0`}
      />
    )
  }

  // Multi (carrossel / stories) — vários slides em sequência
  return (
    <div className="flex flex-col gap-3">
      {mediaItems.map((item, slotIdx) => (
        <div key={slotIdx}>
          <FileUploadSlot
            accept={accept}
            acceptHint={acceptHint}
            value={item.url}
            onChange={(url) => {
              onChange(mediaItems.map((m, i) => i === slotIdx ? { ...m, url } : m))
            }}
            folder={folder}
            slotKey={`${itemIndex}_${slotIdx}`}
            label={`Slide ${slotIdx + 1}`}
          />
          {mediaItems.length > 1 && (
            <button
              type="button"
              onClick={() => onChange(mediaItems.filter((_, i) => i !== slotIdx))}
              className="text-xs text-red-400 hover:text-red-600 transition-colors mt-1 pl-1"
            >
              Remover slide
            </button>
          )}
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange([...mediaItems, EMPTY_MEDIA_ITEM()])}
        className="text-xs text-indigo-500 hover:text-indigo-700 font-medium transition-colors self-start pt-1"
      >
        + Adicionar slide
      </button>
    </div>
  )
}

// ─── Seletor de redes ─────────────────────────────────────────────────────────
function NetworkSelector({
  selected,
  onToggle,
}: {
  selected: SocialNetwork[]
  onToggle: (n: SocialNetwork) => void
}) {
  return (
    <div className="flex gap-2 flex-wrap">
      {NETWORKS_ORDER.map((n) => {
        const isSel   = selected.includes(n)
        const isComp  = isNetworkCompatible(selected, n)
        const isAlone = isSel && selected.length === 1
        return (
          <button
            key={n}
            type="button"
            disabled={isAlone || (!isSel && !isComp)}
            onClick={() => onToggle(n)}
            title={
              !isSel && !isComp ? 'Incompatível com as redes selecionadas'
              : isAlone ? 'Pelo menos uma rede é obrigatória'
              : undefined
            }
            className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${
              isSel
                ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                : isComp
                  ? 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'
                  : 'border-gray-100 bg-gray-50 text-gray-300 cursor-not-allowed'
            }`}
          >
            {NETWORK_LABELS[n]}
            {isSel && selected.length > 1 && (
              <span className="ml-1.5 text-indigo-400 font-bold text-[10px]">×</span>
            )}
          </button>
        )
      })}
    </div>
  )
}

// ─── Card de item ─────────────────────────────────────────────────────────────
function ItemCard({
  index,
  item,
  folder,
  onChange,
  onRemove,
}: {
  index: number
  item: FinalReviewItemFormData
  folder: string
  onChange: (data: FinalReviewItemFormData) => void
  onRemove: () => void
}) {
  const compatibleFormats = getCompatibleFormats(item.social_networks)
  const kind              = getMediaKind(item.type)

  const handleNetworkToggle = (network: SocialNetwork) => {
    const already = item.social_networks.includes(network)
    if (already && item.social_networks.length === 1) return

    const newNetworks = already
      ? item.social_networks.filter((n) => n !== network)
      : [...item.social_networks, network]

    const newCompatible = getCompatibleFormats(newNetworks)
    const newType       = newCompatible.includes(item.type) ? item.type : newCompatible[0] ?? item.type
    const newKind       = getMediaKind(newType)
    const newMedia      = newKind === 'none' ? [] : [EMPTY_MEDIA_ITEM()]

    onChange({ ...item, social_networks: newNetworks, type: newType, media_items: newMedia })
  }

  const handleTypeChange = (type: ContentType) => {
    const newKind  = getMediaKind(type)
    const newMedia = newKind === 'none' ? [] : [EMPTY_MEDIA_ITEM()]
    onChange({ ...item, type, media_items: newMedia })
  }

  return (
    <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
      {/* Header do card */}
      <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-gray-50">
        <span className="text-xs font-semibold text-gray-400 tracking-wide uppercase">
          Conteúdo {index + 1}
        </span>
        <button
          onClick={onRemove}
          className="text-gray-300 hover:text-red-400 transition-colors text-xl leading-none w-6 h-6 flex items-center justify-center"
          aria-label="Remover"
        >
          ×
        </button>
      </div>

      <div className="px-5 py-4 flex flex-col gap-4">
        {/* Título */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Título</label>
          <input
            type="text"
            placeholder='Ex: "Reels 01 – Dica de produto"'
            value={item.title}
            onChange={(e) => onChange({ ...item, title: e.target.value })}
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-transparent"
          />
        </div>

        {/* Redes sociais */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-medium text-gray-500">Rede social</label>
            {item.social_networks.length > 1 && (
              <span className="text-xs text-indigo-500 font-medium">
                {item.social_networks.length} redes selecionadas
              </span>
            )}
          </div>
          <NetworkSelector selected={item.social_networks} onToggle={handleNetworkToggle} />
        </div>

        {/* Formato */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-2">Formato</label>
          {compatibleFormats.length === 0 ? (
            <p className="text-xs text-red-500">Nenhum formato compatível com as redes selecionadas.</p>
          ) : (
            <div className="flex gap-2 flex-wrap">
              {compatibleFormats.map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => handleTypeChange(type)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${
                    item.type === type
                      ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                      : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'
                  }`}
                >
                  {CONTENT_TYPE_LABELS[type]}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Upload de mídia */}
        {kind !== 'none' && (
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-2">
              {kind === 'video'
                ? 'Vídeo final'
                : kind === 'image'
                  ? 'Imagem final'
                  : 'Slides'
              }
            </label>
            <MediaUploadFields
              kind={kind}
              mediaItems={item.media_items}
              onChange={(items) => onChange({ ...item, media_items: items })}
              folder={folder}
              itemIndex={index}
            />
          </div>
        )}

        {/* Legenda final */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">
            Legenda final <span className="font-normal text-gray-300">(opcional)</span>
          </label>
          <textarea
            placeholder="Texto que será publicado junto ao conteúdo..."
            value={item.caption}
            onChange={(e) => onChange({ ...item, caption: e.target.value })}
            rows={3}
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-transparent resize-none"
          />
        </div>

        {/* Data e horário */}
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Data de publicação <span className="font-normal text-gray-300">(opcional)</span>
            </label>
            <input
              type="date"
              value={item.publish_date}
              onChange={(e) => onChange({ ...item, publish_date: e.target.value })}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-transparent"
            />
          </div>
          <div className="w-36">
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Horário <span className="font-normal text-gray-300">(opcional)</span>
            </label>
            <input
              type="time"
              value={item.publish_time}
              onChange={(e) => onChange({ ...item, publish_time: e.target.value })}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-transparent"
            />
          </div>
        </div>

        {/* Observações */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">
            Observações <span className="font-normal text-gray-300">(opcional)</span>
          </label>
          <textarea
            placeholder="Diretrizes, contexto, instruções para o cliente..."
            value={item.observations}
            onChange={(e) => onChange({ ...item, observations: e.target.value })}
            rows={2}
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-transparent resize-none"
          />
        </div>
      </div>
    </div>
  )
}

// ─── Página principal ─────────────────────────────────────────────────────────
export default function FinalCriarPage() {
  // Gerado uma vez por sessão de criação — identifica a pasta no Storage
  const [uploadSession] = useState<string>(() =>
    typeof crypto !== 'undefined'
      ? crypto.randomUUID().replace(/-/g, '')
      : Math.random().toString(36).slice(2).padEnd(32, '0')
  )

  const [clientName,   setClientName]   = useState('')
  const [monthRef,     setMonthRef]     = useState('')
  const [items,        setItems]        = useState<FinalReviewItemFormData[]>([EMPTY_ITEM()])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [shareLink,    setShareLink]    = useState<string | null>(null)
  const [copied,       setCopied]       = useState(false)
  const [error,        setError]        = useState<string | null>(null)

  const addItem    = () => setItems((prev) => [...prev, EMPTY_ITEM()])
  const updateItem = (i: number, data: FinalReviewItemFormData) =>
    setItems((prev) => prev.map((it, idx) => (idx === i ? data : it)))
  const removeItem = (i: number) => {
    if (items.length === 1) return
    setItems((prev) => prev.filter((_, idx) => idx !== i))
  }

  const handleSubmit = async () => {
    setError(null)
    if (!clientName.trim()) return setError('Informe o nome do cliente.')
    if (!monthRef.trim())   return setError('Informe o mês de referência.')

    for (let i = 0; i < items.length; i++) {
      const it   = items[i]
      const kind = getMediaKind(it.type)
      if (!it.title.trim())
        return setError(`Preencha o título do conteúdo ${i + 1}.`)
      if (it.social_networks.length === 0)
        return setError(`Selecione ao menos uma rede para o conteúdo ${i + 1}.`)
      if (kind !== 'none' && !it.media_items.some((m) => m.url.trim()))
        return setError(`Envie ao menos um arquivo de mídia para o conteúdo ${i + 1}.`)
    }

    setIsSubmitting(true)
    try {
      const res = await fetch('/api/final-reviews', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          client_name:     clientName.trim(),
          month_reference: monthRef.trim(),
          storage_folder:  uploadSession,
          items,
        }),
      })
      const data = await res.json()
      if (!res.ok) return setError(data.error || 'Erro ao criar aprovação.')
      setShareLink(`${window.location.origin}/final/aprovar/${data.share_token}`)
    } catch {
      setError('Erro de conexão. Tente novamente.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCopy = () => {
    if (!shareLink) return
    navigator.clipboard.writeText(shareLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // ── Tela de sucesso ───────────────────────────────────────────────────────
  if (shareLink) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center flex flex-col items-center gap-5">
          <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center">
            <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Link gerado!</h2>
            <p className="text-sm text-gray-500 mt-1">
              Copie o link abaixo e envie para o cliente pelo WhatsApp.
            </p>
          </div>
          <div className="w-full flex flex-col gap-2">
            <div className="bg-gray-50 border border-gray-100 rounded-xl px-3 py-2.5">
              <span className="text-xs text-gray-400 break-all">{shareLink}</span>
            </div>
            <button
              onClick={handleCopy}
              className={`w-full py-3 rounded-xl text-sm font-semibold transition-all ${
                copied ? 'bg-green-500 text-white' : 'bg-indigo-600 hover:bg-indigo-700 text-white'
              }`}
            >
              {copied ? 'Copiado!' : 'Copiar link'}
            </button>
          </div>
          <Link href="/final" className="text-sm text-gray-400 hover:text-gray-600 transition-colors">
            Voltar para aprovações finais
          </Link>
        </div>
      </main>
    )
  }

  // ── Formulário ────────────────────────────────────────────────────────────
  return (
    <main className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
          <Link href="/final" className="text-gray-400 hover:text-gray-600 transition-colors text-lg">←</Link>
          <h1 className="text-lg font-bold text-gray-900">Nova aprovação final</h1>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 flex flex-col gap-5">
        {/* Dados do cliente */}
        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm flex flex-col gap-4">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Informações</h2>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Nome do cliente</label>
            <input
              type="text"
              placeholder='Ex: "Clínica Bella Vita"'
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Mês de referência</label>
            <input
              type="text"
              placeholder='Ex: "Maio 2026"'
              value={monthRef}
              onChange={(e) => setMonthRef(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-transparent"
            />
          </div>
        </div>

        {/* Conteúdos */}
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-700">
            Conteúdos <span className="text-gray-400 font-normal">({items.length})</span>
          </h2>
        </div>

        {items.map((item, index) => (
          <ItemCard
            key={index}
            index={index}
            item={item}
            folder={uploadSession}
            onChange={(data) => updateItem(index, data)}
            onRemove={() => removeItem(index)}
          />
        ))}

        <button
          onClick={addItem}
          className="flex items-center justify-center gap-2 border-2 border-dashed border-gray-200 rounded-2xl py-4 text-sm text-gray-400 hover:border-indigo-300 hover:text-indigo-500 transition-colors"
        >
          + Adicionar conteúdo
        </button>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-4 py-3">
            {error}
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-semibold py-3.5 rounded-xl text-sm transition-colors"
        >
          {isSubmitting ? 'Criando aprovação...' : 'Gerar link de aprovação final'}
        </button>

        <div className="h-6" />
      </div>
    </main>
  )
}
