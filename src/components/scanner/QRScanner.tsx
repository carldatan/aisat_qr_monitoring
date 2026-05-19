'use client'

import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/Button'

interface QRScannerProps {
  onScanSuccess: (decodedText: string) => void
}

export function QRScanner({ onScanSuccess }: QRScannerProps) {
  const [scanning, setScanning] = useState(false)
  const scannerRef = useRef<unknown>(null)

  const startScanner = async () => {
    if (scanning) return
    try {
      // Dynamically import to avoid SSR issues
      const { Html5QrcodeScanner } = await import('html5-qrcode')
      const scanner = new Html5QrcodeScanner(
        'qr-reader',
        { fps: 10, qrbox: { width: 250, height: 250 } },
        false
      )
      scanner.render(
        (text: string) => {
          onScanSuccess(text)
          stopScanner(scanner)
        },
        () => { /* silent failure */ }
      )
      scannerRef.current = scanner
      setScanning(true)
    } catch (err) {
      console.error('Scanner init error:', err)
    }
  }

  const stopScanner = async (scanner?: unknown) => {
    const s = (scanner ?? scannerRef.current) as { clear: () => Promise<void> } | null
    if (!s) return
    try {
      await s.clear()
    } catch { /* ignore */ }
    scannerRef.current = null
    setScanning(false)
  }

  useEffect(() => {
    return () => { stopScanner() }
  }, [])

  return (
    <div>
      <div
        id="qr-reader"
        className="w-full max-w-sm mx-auto border border-border bg-black min-h-[250px] rounded-lg"
      />
      <div className="mt-3 flex gap-2">
        {!scanning ? (
          <Button onClick={startScanner} fullWidth>
            START CAMERA
          </Button>
        ) : (
          <Button variant="danger" onClick={() => stopScanner()} fullWidth>
            STOP CAMERA
          </Button>
        )}
      </div>
    </div>
  )
}
