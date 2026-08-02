'use client'

/**
 * MediaUploadFields — campos de upload de mídia por formato (Aprovação
 * Final). Extraído de app/final/criar/page.tsx para ser reutilizado tanto
 * na criação inicial quanto no modal de "adicionar conteúdo" pós-link.
 *
 * Usa o componente compartilhado MediaUploadSlot (upload via URL assinada)
 * — não duplica a lógica de upload.
 */

import { useRef, useState } from 'react'
import {
  MediaItem,
  EMPTY_MEDIA_ITEM,
  MediaKind,
  MEDIA_ACCEPT,
  MEDIA_ACCEPT_HINT,
} from '@/types/final'
import { MediaUploadSlot } from '@/components/MediaUploadSlot'

// ─── Slides múltiplos (carrossel/stories) — seleção em lote + reordenação ─────
// Exportado à parte para reuso em telas com layout de mídia mais específico
// (ex: EditItemModal em app/final/[id]/page.tsx, que tem lógica extra de
// retrocompatibilidade só para o slot único).
export function MultiSlideFields({
  accept,
  acceptHint,
  mediaItems,
  onChange,
  folder,
  itemIndex,
  hintText,
}: {
  accept: string
  acceptHint: string
  mediaItems: MediaItem[]
  onChange: (items: MediaItem[]) => void
  folder: string
  itemIndex: number | string
  hintText?: string
}) {
  // Fila de upload em lote: slots aguardando envio, na ordem selecionada.
  // Só o item na cabeça da fila (queue[0]) recebe initialFile — upload
  // sequencial, um arquivo por vez, para não disputar banda e manter o
  // progresso de cada arquivo legível.
  const [queue, setQueue] = useState<{ slotIdx: number; file: File }[]>([])
  const multiInputRef = useRef<HTMLInputElement>(null)

  const handleMultiSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    e.target.value = '' // permite selecionar os mesmos arquivos de novo depois
    if (files.length === 0) return

    const startIdx = mediaItems.length
    onChange([...mediaItems, ...files.map(() => EMPTY_MEDIA_ITEM())])
    setQueue((prev) => [...prev, ...files.map((file, i) => ({ slotIdx: startIdx + i, file }))])
  }

  const moveSlide = (from: number, to: number) => {
    if (to < 0 || to >= mediaItems.length) return
    const next = [...mediaItems]
    const [moved] = next.splice(from, 1)
    next.splice(to, 0, moved)
    onChange(next)
  }

  return (
    <div className="flex flex-col gap-3">
      {hintText && (
        <p className="text-xs text-gray-400 -mb-1">{hintText}</p>
      )}
      {mediaItems.map((item, slotIdx) => (
        <div key={slotIdx} className="flex items-start gap-1.5">
          <div className="flex-1 min-w-0">
            <MediaUploadSlot
              accept={accept}
              acceptHint={acceptHint}
              value={item.url}
              onChange={(url) => {
                onChange(mediaItems.map((m, i) => i === slotIdx ? { ...m, url } : m))
              }}
              folder={folder}
              slotKey={`${itemIndex}_${slotIdx}`}
              label={`Slide ${slotIdx + 1}`}
              initialFile={queue[0]?.slotIdx === slotIdx ? queue[0].file : undefined}
              onInitialFileHandled={() => setQueue((prev) => prev.slice(1))}
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
          {mediaItems.length > 1 && (
            <div className="flex flex-col shrink-0 pt-1">
              <button
                type="button"
                onClick={() => moveSlide(slotIdx, slotIdx - 1)}
                disabled={slotIdx === 0}
                className="text-gray-300 hover:text-indigo-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors w-6 h-6 flex items-center justify-center"
                aria-label="Mover slide para cima"
              >
                ↑
              </button>
              <button
                type="button"
                onClick={() => moveSlide(slotIdx, slotIdx + 1)}
                disabled={slotIdx === mediaItems.length - 1}
                className="text-gray-300 hover:text-indigo-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors w-6 h-6 flex items-center justify-center"
                aria-label="Mover slide para baixo"
              >
                ↓
              </button>
            </div>
          )}
        </div>
      ))}

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => onChange([...mediaItems, EMPTY_MEDIA_ITEM()])}
          className="text-xs text-indigo-500 hover:text-indigo-700 font-medium transition-colors"
        >
          + Adicionar slide
        </button>
        <span className="text-gray-300">·</span>
        <button
          type="button"
          onClick={() => multiInputRef.current?.click()}
          className="text-xs text-indigo-500 hover:text-indigo-700 font-medium transition-colors"
        >
          Selecionar vários arquivos
        </button>
        <input
          ref={multiInputRef}
          type="file"
          accept={accept}
          multiple
          className="hidden"
          onChange={handleMultiSelect}
        />
      </div>
      {queue.length > 0 && (
        <p className="text-xs text-indigo-400">
          {queue.length} arquivo{queue.length !== 1 ? 's' : ''} na fila de envio...
        </p>
      )}
    </div>
  )
}

export function MediaUploadFields({
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
  itemIndex: number | string
}) {
  if (kind === 'none') return null

  const accept     = MEDIA_ACCEPT[kind]
  const acceptHint = MEDIA_ACCEPT_HINT[kind]

  // Vídeo ou imagem única
  if (kind === 'video' || kind === 'image') {
    const item = mediaItems[0] ?? EMPTY_MEDIA_ITEM()
    return (
      <MediaUploadSlot
        accept={accept}
        acceptHint={acceptHint}
        value={item.url}
        onChange={(url) => onChange([{ url, label: '' }])}
        folder={folder}
        slotKey={`${itemIndex}_0`}
      />
    )
  }

  // Stories — sequência mista: cada slide pode ser imagem OU vídeo livremente
  if (kind === 'stories') {
    return (
      <MultiSlideFields
        accept="image/*,video/*"
        acceptHint="JPG, PNG, WebP, GIF · ou MP4/MOV (máx. 59 s)"
        mediaItems={mediaItems}
        onChange={onChange}
        folder={folder}
        itemIndex={itemIndex}
        hintText="Cada slide pode ser imagem ou vídeo. Misture os dois tipos à vontade."
      />
    )
  }

  // Multi (carrossel) — vários slides em sequência
  return (
    <MultiSlideFields
      accept={accept}
      acceptHint={acceptHint}
      mediaItems={mediaItems}
      onChange={onChange}
      folder={folder}
      itemIndex={itemIndex}
    />
  )
}
