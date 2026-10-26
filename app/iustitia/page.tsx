import type { Metadata } from 'next'
import Experience from '@/components/iustitia/Experience'
import './iustitia.css'

// Clash Display (headings) + Satoshi (text): Indian Type Foundry, free for commercial use via Fontshare
export const metadata: Metadata = {
  title: 'Iustitia — Exhibit Nº 001',
  description: 'A marble Lady Justice you can walk around. Sculpted in Blender, rendered live in your browser.',
}

export default function IustitiaPage() {
  return (
    <div
      style={{
        ['--ij-serif' as string]: "'Clash Display', 'Helvetica Neue', Arial, sans-serif",
        ['--ij-sans' as string]: "'Satoshi', 'Helvetica Neue', Arial, sans-serif",
      }}
    >
      <link rel="preconnect" href="https://api.fontshare.com" />
      <link
        rel="stylesheet"
        href="https://api.fontshare.com/v2/css?f[]=clash-display@400,500,600&display=swap"
        precedence="default"
      />
      <link
        rel="stylesheet"
        href="https://api.fontshare.com/v2/css?f[]=satoshi@400,500,700&display=swap"
        precedence="default"
      />
      <Experience />
    </div>
  )
}
