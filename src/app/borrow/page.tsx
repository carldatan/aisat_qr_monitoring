'use client'

import { useState } from 'react'
import { QrCode, ScanSearch } from 'lucide-react'
import { QRScanner } from '@/components/scanner/QRScanner'
import { Panel } from '@/components/ui/Panel'
import { useRouter } from 'next/navigation'

export default function BorrowPage() {
	const router = useRouter()
	const [lastScan, setLastScan] = useState('')

	const handleScanSuccess = (decodedText: string) => {
		setLastScan(decodedText)
	}

	return (
		<Panel>
			<div className="flex flex-wrap items-start justify-between gap-3">
				<div>
					<h3 className="mb-2 flex items-center gap-2 font-bold font-mono text-lg">
						<QrCode className="h-5 w-5 text-primary" />
						QR Scanner
					</h3>
					<p className="text-base font-mono text-muted">
						Use the camera to scan a return QR code or any encoded AISAT QR payload.
					</p>
				</div>
				<button
					type="button"
					onClick={() => router.push('/dashboard')}
					className="inline-flex items-center gap-2 rounded border border-primary px-4 py-2 text-sm font-bold font-mono text-primary hover:bg-blue-50 transition-colors"
				>
					<ScanSearch className="h-4 w-4" />
					BACK TO DASHBOARD
				</button>
			</div>

			<div className="mt-5">
				<QRScanner onScanSuccess={handleScanSuccess} />
			</div>

			{lastScan && (
				<div className="mt-5 rounded-xl border border-border bg-surface/50 p-4">
					<p className="text-sm font-bold font-mono text-primary">
						Last Scan
					</p>
					<p className="mt-2 break-all text-base font-mono text-muted">
						{lastScan}
					</p>
				</div>
			)}
		</Panel>
	)
}
