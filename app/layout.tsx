import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: { default: '3D Showcase', template: '%s · 3D Showcase' },
  robots: { index: false, follow: false },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
