'use client'

import { useEffect, useRef } from 'react'

/** Pulls its child gently toward a nearby pointer and springs back on leave (fine pointers only). */
export default function Magnetic({ children, strength = 0.35 }: { children: React.ReactNode; strength?: number }) {
  const ref = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el || !matchMedia('(pointer: fine)').matches || matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const move = (e: PointerEvent) => {
      const r = el.getBoundingClientRect()
      const x = e.clientX - (r.left + r.width / 2)
      const y = e.clientY - (r.top + r.height / 2)
      el.style.transition = 'transform 0.2s ease-out'
      el.style.transform = `translate3d(${x * strength}px, ${y * strength}px, 0)`
    }
    const leave = () => {
      el.style.transition = 'transform 0.9s cubic-bezier(0.16, 1, 0.3, 1)'
      el.style.transform = 'translate3d(0, 0, 0)'
    }
    el.addEventListener('pointermove', move)
    el.addEventListener('pointerleave', leave)
    return () => {
      el.removeEventListener('pointermove', move)
      el.removeEventListener('pointerleave', leave)
    }
  }, [strength])

  return (
    <span ref={ref} className="inline-block will-change-transform">
      {children}
    </span>
  )
}
