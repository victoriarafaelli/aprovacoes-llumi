'use client'

/**
 * FeedCoverAdjustModal — ajusta COMO a capa aparece na Prévia de Feed
 * (posição + zoom leve), sem tocar no arquivo original.
 *
 * Puramente de enquadramento visual: nunca recorta, faz upload ou substitui
 * mídia — só grava três números (posição X/Y 0–100, zoom 1–1.75) que o
 * grid usa depois via CSS (object-position + transform: scale). A pré-
 * visualização aqui dentro usa exatamente a mesma fórmula CSS que
 * FeedGridPreview usa pra renderizar — o que se vê aqui é o que aparece lá.
 *
 * Arrastar (mouse ou touch, via Pointer Events unificado) move a imagem
 * dentro do quadro 4:5; o zoom nunca cria espaço vazio nas bordas porque a
 * imagem já cobre o quadro inteiro antes do zoom (object-fit: cover) — um
 * scale >= 1 a partir de qualquer ponto dentro do quadro só empurra as
 * bordas pra fora, nunca pra dentro.
 *
 * Componente "burro": não sabe nada sobre API/persistência — quem chama
 * decide se `onSave` grava local (criação) ou dispara um PATCH (admin).
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  FeedCoverAdjustment,
  DEFAULT_FEED_COVER_ADJUSTMENT,
  FEED_COVER_POSITION_MIN,
  FEED_COVER_POSITION_MAX,
  FEED_COVER_ZOOM_MIN,
  FEED_COVER_ZOOM_MAX,
} from '@/types/final'

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

export function FeedCoverAdjustModal({
  imageUrl,
  initial,
  onSave,
  onClose,
  saving = false,
  error = null,
}: {
  imageUrl: string
  initial: FeedCoverAdjustment
  onSave: (adjustment: FeedCoverAdjustment) => void
  onClose: () => void
  /** Estado de salvamento assíncrono (admin, via PATCH). A criação salva
   *  local/síncrono e não precisa passar isso. */
  saving?: boolean
  error?: string | null
}) {
  const [pos, setPos]   = useState({ x: initial.positionX, y: initial.positionY })
  const [zoom, setZoom] = useState(initial.zoom)
  const [naturalSize, setNaturalSize] = useState<{ w: number; h: number } | null>(null)

  const frameRef  = useRef<HTMLDivElement>(null)
  const dragState = useRef<{ startX: number; startY: number; startPos: { x: number; y: number } } | null>(null)

  // Trava o scroll do body enquanto o modal está aberto — evita rolar a
  // página por trás durante o arrastar (especialmente relevante em touch).
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])

  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    dragState.current = { startX: e.clientX, startY: e.clientY, startPos: pos }
  }, [pos])

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragState.current || !naturalSize || !frameRef.current) return
    const frame = frameRef.current.getBoundingClientRect()

    // Mesma matemática do object-fit: cover — escala mínima que cobre o
    // quadro inteiro, multiplicada pelo zoom extra do slider.
    const baseScale   = Math.max(frame.width / naturalSize.w, frame.height / naturalSize.h)
    const renderScale = baseScale * zoom
    const renderedW   = naturalSize.w * renderScale
    const renderedH   = naturalSize.h * renderScale

    // Quanto a imagem renderizada excede o quadro em cada eixo — é essa
    // sobra que os 0–100% de object-position percorrem.
    const overflowX = Math.max(renderedW - frame.width, 0)
    const overflowY = Math.max(renderedH - frame.height, 0)

    const dx = e.clientX - dragState.current.startX
    const dy = e.clientY - dragState.current.startY

    // Arrastar a imagem pra direita/baixo (efeito "puxar o papel") revela
    // mais do lado esquerdo/topo da imagem → object-position diminui.
    const nextX = overflowX > 0
      ? clamp(dragState.current.startPos.x - (dx / overflowX) * 100, FEED_COVER_POSITION_MIN, FEED_COVER_POSITION_MAX)
      : 50
    const nextY = overflowY > 0
      ? clamp(dragState.current.startPos.y - (dy / overflowY) * 100, FEED_COVER_POSITION_MIN, FEED_COVER_POSITION_MAX)
      : 50

    setPos({ x: nextX, y: nextY })
  }, [naturalSize, zoom])

  const handlePointerUp = useCallback(() => { dragState.current = null }, [])

  const handleReset = () => {
    setPos({ x: DEFAULT_FEED_COVER_ADJUSTMENT.positionX, y: DEFAULT_FEED_COVER_ADJUSTMENT.positionY })
    setZoom(DEFAULT_FEED_COVER_ADJUSTMENT.zoom)
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-5 flex flex-col gap-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Ajustar capa na prévia</h3>
            <p className="text-xs text-gray-400 mt-0.5">
              Arraste a imagem e ajuste o zoom. Não altera o arquivo original.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors text-xl leading-none shrink-0"
            aria-label="Fechar"
          >
            ×
          </button>
        </div>

        <div
          ref={frameRef}
          className="relative mx-auto w-full max-w-[240px] aspect-[4/5] overflow-hidden rounded-xl bg-gray-100 border border-gray-200 touch-none cursor-grab active:cursor-grabbing select-none"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageUrl}
            alt=""
            draggable={false}
            onLoad={(e) => setNaturalSize({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })}
            className="w-full h-full object-cover pointer-events-none"
            style={{
              objectPosition: `${pos.x}% ${pos.y}%`,
              transform: `scale(${zoom})`,
              transformOrigin: `${pos.x}% ${pos.y}%`,
            }}
          />
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-400 w-9 shrink-0">Zoom</span>
          <input
            type="range"
            min={FEED_COVER_ZOOM_MIN}
            max={FEED_COVER_ZOOM_MAX}
            step={0.01}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="flex-1 accent-indigo-600"
          />
        </div>

        {error && <p className="text-xs text-red-500">{error}</p>}

        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={handleReset}
            className="text-xs text-gray-400 hover:text-gray-600 font-medium transition-colors px-1"
          >
            Redefinir
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="text-xs text-gray-500 hover:text-gray-700 font-medium px-3 py-2 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => onSave({ positionX: pos.x, positionY: pos.y, zoom })}
              className="text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white px-4 py-2 rounded-lg transition-colors"
            >
              {saving ? 'Salvando...' : 'Salvar ajuste'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
