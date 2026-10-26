'use client'

import { useEffect, useRef, useState } from 'react'

/**
 * Ink curtain with a counter driven by the real model download ('lj:progress'), lifted on 'lj:ready'.
 * The count eases toward the true value so it never jumps, and always finishes at 100 before lifting.
 */
export default function Preloader() {
  const countRef = useRef<HTMLSpanElement>(null)
  const barRef = useRef<HTMLSpanElement>(null)
  const [lifted, setLifted] = useState(false)
  const [gone, setGone] = useState(false)

  useEffect(() => {
    let target = 0
    let shown = 0
    let ready = false
    let raf = 0
    document.documentElement.style.overflow = 'hidden'
    const onProgress = (e: Event) => {
      target = Math.max(target, Math.min(0.96, (e as CustomEvent<number>).detail))
    }
    const onReady = () => {
      ready = true
      target = 1
    }
    window.addEventListener('lj:progress', onProgress)
    window.addEventListener('lj:ready', onReady)
    const tick = () => {
      // creep forward even before the first progress event so it never looks stuck
      if (!ready) target = Math.max(target, Math.min(0.3, target + 0.0015))
      shown += (target - shown) * 0.08
      if (ready && 1 - shown < 0.004) shown = 1
      const n = Math.round(shown * 100)
      if (countRef.current) countRef.current.textContent = String(n).padStart(3, '0')
      if (barRef.current) barRef.current.style.transform = `scaleX(${shown})`
      if (shown >= 1) {
        setLifted(true)
        document.documentElement.style.overflow = ''
        setTimeout(() => setGone(true), 1500)
        return
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('lj:progress', onProgress)
      window.removeEventListener('lj:ready', onReady)
      document.documentElement.style.overflow = ''
    }
  }, [])

  if (gone) return null
  return (
    <div
      aria-hidden
      className="fixed inset-0 z-[100] bg-[#0b0b0b] text-white transition-[clip-path] duration-[1300ms] ease-[cubic-bezier(0.76,0,0.24,1)]"
      style={{ clipPath: lifted ? 'inset(0 0 100% 0)' : 'inset(0 0 0% 0)' }}
    >
      <div className="absolute inset-x-0 top-0 flex items-center justify-between px-6 md:px-12 py-6">
        <span className="font-migra text-xl md:text-2xl">Murphy&rsquo;s Law</span>
        <span className="text-[11px] tracking-[0.28em] uppercase text-white/45">Preparing your demo</span>
      </div>
      <div className="absolute inset-x-0 bottom-0 px-6 md:px-12 pb-10 md:pb-12">
        <div className="flex items-end justify-between gap-8">
          <p className="max-w-xs text-sm text-white/45 leading-relaxed">
            Justice, carved in marble.
            <br />
            Rendered live in your browser.
          </p>
          <span ref={countRef} className="font-migra text-[22vw] md:text-[12vw] leading-[0.8] tabular-nums tracking-tight">
            000
          </span>
        </div>
        <span className="mt-6 block h-px w-full bg-white/15">
          <span ref={barRef} className="block h-full w-full origin-left bg-[#d4a574]" style={{ transform: 'scaleX(0)' }} />
        </span>
      </div>
    </div>
  )
}
