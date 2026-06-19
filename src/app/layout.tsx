import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
	title: 'AISAT COLLEGE DASMA — QR Monitoring System',
	description: 'QR Code Based Tools Monitoring System',
	verification: {
        google: "L55751j2n-og3ctcfvS5jE4L5j8gmMuwKrILeUCK_1M"
	}
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
