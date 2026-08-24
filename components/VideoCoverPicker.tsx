'use client'

/**
 * VideoCoverPicker — capa do feed para conteúdos de vídeo (reels/video/shorts).
 *
 * Duas formas de definir a capa:
 *   1. Subir uma imagem específica (upload normal, via MediaUploadSlot).
 *   2. Escolher um frame do próprio vídeo: HTMLVideoElement → Canvas →
 *      canvas.toBlob() → File → mesmo fluxo de upload por URL assinada.
 *      Nunca gera/guarda data URL ou base64 — só a URL final do Storage
 *      chega ao onCoverChange, exatamente como qualquer outra imagem já
 *      enviada no app.
 *
 * O vídeo original nunca é alterado — a captura só lê pixels pra montar
 * uma imagem nova. Se o navegador bloquear a leitura do canvas por CORS
 * (bucket sem cabeçalho permissivo para aquele domínio), captura falha
 * com mensagem clara e "Subir capa" continua funcionando normalmente.
 */

import { useRef, useState } from 'react'
import { MediaUploadSlot } from '@/components/MediaUploadSlot'

export function VideoCoverPicker({
  videoUrl,
  coverUrl,
  onCoverChange,
  folder,
  itemIndex,
}: {
  videoUrl: string
  coverUrl: string | null
  onCoverChange: (url: string | null) => void
  folder: string
  itemIndex: number | string
}) {
  const [capturing, setCapturing]       = useState(false)
  const [captureError, setCaptureError] = useState<string | null>(null)
  const [capturedFile, setCapturedFile] = useState<File | undefined>(undefined)
  const videoRef = useRef<HTMLVideoElement>(null)

  const handleUseFrame = () => {
    const video = videoRef.current
    if (!video) return
    setCaptureError(null)

    try {
      const canvas = document.createElement('canvas')
      canvas.width  = video.videoWidth
      canvas.height = video.videoHeight
      const ctx = canvas.getContext('2d')
      if (!ctx || canvas.width === 0) {
        setCaptureError('Não foi possível capturar o frame agora. Aguarde o vídeo carregar e tente de novo.')
        return
      }
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

      canvas.toBlob((blob) => {
        if (!blob) {
          setCaptureError(
            'Não foi possível gerar a imagem do frame (restrição de segurança do navegador ' +
            'para este vídeo). Use "Subir capa" para enviar uma imagem manualmente.'
          )
          return
        }
        setCapturedFile(new File([blob], `frame-${Date.now()}.jpg`, { type: 'image/jpeg' }))
      }, 'image/jpeg', 0.9)
    } catch {
      setCaptureError(
        'Não foi possível gerar a imagem do frame (restrição de segurança do navegador ' +
        'para este vídeo). Use "Subir capa" para enviar uma imagem manualmente.'
      )
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div>
        <p className="text-xs font-medium text-gray-500 mb-2">
          Capa do feed <span className="font-normal text-gray-300">(opcional)</span>
        </p>
        <MediaUploadSlot
          accept="image/*"
          acceptHint="JPG, PNG, WebP"
          value={coverUrl ?? ''}
          onChange={(url) => onCoverChange(url || null)}
          folder={folder}
          slotKey={`${itemIndex}_cover`}
          label="Capa do feed"
          initialFile={capturedFile}
          onInitialFileHandled={() => setCapturedFile(undefined)}
        />
      </div>

      {videoUrl && (
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={() => { setCapturing((v) => !v); setCaptureError(null) }}
            className="text-xs text-indigo-500 hover:text-indigo-700 font-medium transition-colors self-start"
          >
            {capturing ? 'Fechar seleção de frame' : 'Ou escolher um frame do vídeo'}
          </button>

          {capturing && (
            <div className="border border-gray-200 rounded-xl p-3 flex flex-col gap-2 bg-gray-50">
              {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
              <video
                ref={videoRef}
                src={videoUrl}
                crossOrigin="anonymous"
                controls
                playsInline
                preload="metadata"
                className="w-full max-h-64 rounded-lg bg-black"
              />
              <p className="text-xs text-gray-400">
                Navegue até o momento desejado no player acima e clique no botão abaixo.
              </p>
              <button
                type="button"
                onClick={handleUseFrame}
                className="self-start text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg transition-colors"
              >
                Usar este frame como capa
              </button>
              {captureError && (
                <p className="text-xs text-red-500">{captureError}</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
