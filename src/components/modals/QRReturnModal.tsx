'use client'

import { useEffect, useRef } from 'react'
import QRCode from 'qrcode.react'
import { useAppStore } from '@/contexts/store'

interface QRReturnModalProps {
  open: boolean
  onClose: () => void
}

export function QRReturnModal({ open, onClose }: QRReturnModalProps) {
  const profile = useAppStore(s => s.profile)
  const equipment = useAppStore(s => s.equipment)

  const borrowed = equipment.filter(
    e => e.borrower_username === profile?.username && e.status === 'Borrowed'
  )

  if (!open) return null

  return (
    <div
      className="fixed inset-0 bg-black/70 flex flex-col justify-center items-center z-[2000]"
      onClick={onClose}
    >
      <div
        className="flex flex-col items-center"
        onClick={e => e.stopPropagation()}
      >
        <h2 className="text-white text-2xl font-mono font-bold mb-4 drop-shadow-lg">
          RETURN PASS
        </h2>
        <div className="bg-white p-4 rounded-xl mb-4 shadow-2xl">
          <QRCode
            value={`BATCH|${profile?.username}`}
            size={180}
            level="M"
          />
        </div>
        <p className="text-white text-sm font-mono mb-5">
          Student: {profile?.full_name} ({borrowed.length} Items)
        </p>
        <button
          onClick={onClose}
          className="px-4 py-2 text-sm font-bold font-mono bg-white text-danger border border-danger rounded hover:bg-red-50 transition-colors"
        >
          CLOSE
        </button>
      </div>
    </div>
  )
}
