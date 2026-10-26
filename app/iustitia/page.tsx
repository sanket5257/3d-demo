import type { Metadata } from 'next'
import localFont from 'next/font/local'
import Experience from '@/components/iustitia/Experience'
import './iustitia.css'

// PP Neue Montreal (Pangram Pangram) for text; Boska (Indian Type Foundry, via Fontshare) for display
const montreal = localFont({ src: '../../public/fonts/PPNeueMontreal-Regular.woff2', variable: '--ij-sans-local', display: 'swap' })

export const metadata: Metadata = {
  title: 'Iustitia — Exhibit Nº 001',
  description: 'A marble Lady Justice you can walk around. Sculpted in Blender, rendered live in your browser.',
}

export default function IustitiaPage() {
  return (
    <div
      className={montreal.variable}
      style={{ ['--ij-serif' as string]: "'Boska', Georgia, serif", ['--ij-sans' as string]: "var(--ij-sans-local), 'Helvetica Neue', Arial, sans-serif" }}
    >
      <link rel="preconnect" href="https://api.fontshare.com" />
      <link rel="stylesheet" href="https://api.fontshare.com/v2/css?f[]=boska@400,500,401,501&display=swap" precedence="default" />
      <Experience />
    </div>
  )
}
