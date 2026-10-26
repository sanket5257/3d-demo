import type { Metadata } from 'next'
import SmoothScrolling from '@/components/justice/SmoothScrolling'
import DemoExperience from '@/components/justice/DemoExperience'
import './justice.css'

export const metadata: Metadata = {
  title: 'Lady Justice',
  description: 'A private demo page with a real-time marble Lady Justice.',
}

const CARRY = ['name', 'email', 'ph', 'lt', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'] as const
const QUESTIONS_URL = 'https://murphys-law-online-demo-19-min.netlify.app/questions'

type Search = Promise<{ [key: string]: string | string[] | undefined }>

export default async function LadyJusticePage({ searchParams }: { searchParams: Search }) {
  const params = await searchParams
  const get = (k: string) => {
    const v = params[k]
    return (Array.isArray(v) ? v[0] : v || '').trim()
  }
  const first = get('name').split(/\s+/)[0] || ''
  const name = first ? first.charAt(0).toUpperCase() + first.slice(1) : ''

  // carry identity + lead token (+ UTMs) onto every qualify link, like the original landing page
  const carry = new URLSearchParams()
  CARRY.forEach((k) => {
    const v = k === 'ph' ? get('ph') || get('phone') : get(k)
    if (v) carry.set(k, v)
  })
  const qs = carry.toString()

  return (
    <SmoothScrolling>
      <DemoExperience name={name} qualifyUrl={QUESTIONS_URL + (qs ? `?${qs}` : '')} />
    </SmoothScrolling>
  )
}
