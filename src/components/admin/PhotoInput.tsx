'use client'

import { ChangeEvent, useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Camera, Upload, X } from 'lucide-react'

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

export function PhotoInput({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (value: string) => void
}) {
  const uploadInputRef = useRef<HTMLInputElement | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [cameraOpen, setCameraOpen] = useState(false)
  const [cameraError, setCameraError] = useState('')

  const handleChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    onChange(await fileToDataUrl(file))
    event.target.value = ''
  }

  useEffect(() => {
    if (!cameraOpen) {
      streamRef.current?.getTracks().forEach(track => track.stop())
      streamRef.current = null
      return
    }

    let cancelled = false

    const startCamera = async () => {
      setCameraError('')

      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraError('Camera access is not supported in this browser.')
        return
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
          audio: false,
        })

        if (cancelled) {
          stream.getTracks().forEach(track => track.stop())
          return
        }

        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          await videoRef.current.play()
        }
      } catch (error) {
        console.error(error)
        setCameraError('Could not open the device camera.')
      }
    }

    startCamera()

    return () => {
      cancelled = true
    }
  }, [cameraOpen])

  const closeCamera = () => {
    streamRef.current?.getTracks().forEach(track => track.stop())
    streamRef.current = null
    setCameraOpen(false)
    setCameraError('')
  }

  const captureCameraPhoto = () => {
    const video = videoRef.current
    if (!video) return

    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth || 1280
    canvas.height = video.videoHeight || 720
    const context = canvas.getContext('2d')
    if (!context) return

    context.drawImage(video, 0, 0, canvas.width, canvas.height)
    onChange(canvas.toDataURL('image/png'))
    closeCamera()
  }

  return (
    <div className="flex flex-col gap-2">
      <label className="text-xs font-bold font-mono text-gray-500">
        {label}
      </label>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setCameraOpen(true)}
        >
          <Camera className="mr-2 h-4 w-4" />
          TAKE PHOTO
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => uploadInputRef.current?.click()}
        >
          <Upload className="mr-2 h-4 w-4" />
          UPLOAD
        </Button>
        {value && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onChange('')}
          >
            <X className="mr-2 h-4 w-4" />
            CLEAR
          </Button>
        )}
      </div>
      <input
        ref={uploadInputRef}
        type="file"
        accept="image/*"
        onChange={handleChange}
        className="hidden"
      />
      {cameraOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-xl rounded-xl bg-white p-4 shadow-xl">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <p className="font-mono text-sm font-bold">{label}</p>
                <p className="text-xs text-muted font-mono">Use the device camera or cancel to close.</p>
              </div>
              <Button type="button" variant="ghost" size="sm" onClick={closeCamera}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            {cameraError ? (
              <p className="mb-3 rounded border border-danger bg-red-50 p-3 text-sm font-mono text-danger">
                {cameraError}
              </p>
            ) : (
              <>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full rounded-lg border border-border bg-black"
                />
                <div className="mt-3 flex gap-2">
                  <Button type="button" variant="success" fullWidth onClick={captureCameraPhoto}>
                    CAPTURE
                  </Button>
                  <Button type="button" variant="outline" fullWidth onClick={closeCamera}>
                    CANCEL
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
      {value && (
        <img
          src={value}
          alt={label}
          className="h-24 w-24 rounded border border-border object-cover"
        />
      )}
    </div>
  )
}
