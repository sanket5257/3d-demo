import type { Metadata } from 'next'
import CarExperience from '@/components/car/CarExperience'
import './car.css'

export const metadata: Metadata = {
  title: 'Neunelf — a two-door concept study',
  description: 'Neunelf, a rear-engined two-door concept study. Walk around it as you scroll.',
}

export default function CarPage() {
  return (
    <>
      <link rel="preconnect" href="https://api.fontshare.com" />
      <link
        rel="stylesheet"
        href="https://api.fontshare.com/v2/css?f[]=panchang@700,800&f[]=satoshi@400,500,700&display=swap"
        precedence="default"
      />
      <CarExperience />
    </>
  )
}
