import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
	title: 'AISAT COLLEGE DASMA — QR Monitoring System',
	description: 'QR Code Based Tools Monitoring System',
}

export default function RootLayout({
	children,
}: {
	children: React.ReactNode
}) {
	return (
		<html lang="en">
			<body>{children}</body>
		</html>
	)
}
