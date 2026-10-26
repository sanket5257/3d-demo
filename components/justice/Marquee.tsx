'use client'

import { useEffect, useRef } from 'react'

/** Endless band whose speed and direction follow the visitor's scroll velocity. */
export default function Marquee({ items, className = '' }: { items: string[]; className?: string }) {
  const trackRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const track = trackRef.current
    if (!track) return
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches
    let x = 0
    let lastY = scrollY
    let vel = 0
    let dir = 1
    let raf = 0
    const tick = () => {
      raf = requestAnimationFrame(tick)
      const dy = scrollY - lastY
      lastY = scrollY
      if (dy !== 0) dir = dy > 0 ? 1 : -1
      vel += (Math.min(Math.abs(dy), 80) - vel) * 0.1
      if (!reduce) x -= dir * (0.6 + vel * 0.25)
      const half = track.scrollWidth / 2
      if (half > 0) x = ((x % half) - half) % half
      track.style.transform = `translate3d(${x}px, 0, 0)`
    }
    tick()
    return () => cancelAnimationFrame(raf)
  }, [])

  const row = (
    <>
      {items.map((t, i) => (
        <span key={i} className="flex items-center gap-10 md:gap-16 pr-10 md:pr-16">
          <span>{t}</span>
          <span className="h-2 w-2 shrink-0 rounded-full bg-[#d4a574]" />
        </span>
      ))}
    </>
  )

  return (
    <div className={`overflow-hidden ${className}`} aria-hidden>
      <div ref={trackRef} className="flex w-max whitespace-nowrap will-change-transform">
        {row}
        {row}
      </div>
    </div>
  )
}
