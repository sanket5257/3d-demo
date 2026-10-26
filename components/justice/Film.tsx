'use client'

import { useEffect, useRef, useState } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

type Props = { id: string; index: string; length: string; title: string[]; src: string }

/**
 * Film block. Same behaviour as the original landing page: a silent preview from 0:05 once the
 * film is half in view (skipped on data-saver / 2G), and tapping the cover restarts it with sound.
 */
export default function Film({ id, index, length, title, src }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const frameRef = useRef<HTMLDivElement>(null)
  const [activated, setActivated] = useState(false)

  // scroll reveal: window opens to full bleed while the picture settles from a slight zoom
  useEffect(() => {
    const frame = frameRef.current
    const v = videoRef.current
    if (!frame || !v || matchMedia('(prefers-reduced-motion: reduce)').matches) return
    gsap.registerPlugin(ScrollTrigger)
    const ctx = gsap.context(() => {
      const st = { trigger: frame, start: 'top 95%', end: 'top 25%', scrub: 0.6 }
      gsap.fromTo(frame, { clipPath: 'inset(10% 14% 10% 14% round 28px)' }, { clipPath: 'inset(0% 0% 0% 0% round 4px)', ease: 'none', scrollTrigger: st })
      gsap.fromTo(v, { scale: 1.18 }, { scale: 1, ease: 'none', scrollTrigger: st })
    })
    return () => ctx.revert()
  }, [])

  useEffect(() => {
    const v = videoRef.current
    if (!v) return
    let timer: ReturnType<typeof setTimeout> | null = null
    const conn = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection
    const frugal = !!conn && (conn.saveData || /(^|-)2g/.test(conn.effectiveType || ''))
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting && e.intersectionRatio >= 0.5) {
          if (activated || timer || frugal) return
          timer = setTimeout(() => {
            timer = null
            if (activated) return
            v.muted = true
            try {
              v.currentTime = 5
            } catch {}
            v.play().catch(() => {})
          }, 1000)
        } else {
          if (timer) clearTimeout(timer)
          timer = null
          if (document.fullscreenElement !== v) v.pause()
        }
      },
      { threshold: [0, 0.5, 1] }
    )
    io.observe(v)
    return () => {
      io.disconnect()
      if (timer) clearTimeout(timer)
    }
  }, [activated])

  const play = () => {
    const v = videoRef.current
    if (!v) return
    setActivated(true)
    v.muted = false
    v.volume = 1
    try {
      v.currentTime = 0
    } catch {}
    v.play().catch(() => {})
  }

  return (
    <article id={id} className="px-4 md:px-10 py-12 md:py-20">
      <div className="mx-auto max-w-[1440px] grid grid-cols-12 items-baseline gap-4 border-t border-white/15 pt-6 pb-8">
        <p className="col-span-2 font-migra text-2xl md:text-3xl text-white/40 tabular-nums">{index}</p>
        <h3 className="col-span-10 md:col-span-7 font-migra text-2xl md:text-[2rem] leading-[1.15] text-white">
          {title[0]} <em>{title[1]}</em>
        </h3>
        <p className="col-span-12 md:col-span-3 md:text-right text-[11px] tracking-[0.28em] uppercase text-white/45">{length}</p>
      </div>
      {/* the frame opens from a small window to full width as it scrolls into view */}
      <div ref={frameRef} className="relative mx-auto aspect-video max-w-[1600px] overflow-hidden bg-black will-change-[clip-path]">
        <video
          ref={videoRef}
          src={src}
          preload="metadata"
          playsInline
          controls={activated}
          className="absolute inset-0 h-full w-full object-cover will-change-transform"
        />
        {!activated && (
          <button
            type="button"
            onClick={play}
            data-cursor="Play"
            className="group absolute inset-0 flex items-end justify-between bg-gradient-to-t from-black/70 via-black/10 to-transparent p-5 md:p-10 text-left text-white"
            aria-label={`Play film ${index} with sound`}
          >
            <span className="text-[11px] tracking-[0.28em] uppercase text-white/80">Play with sound</span>
            <span className="demo-play flex h-14 w-14 md:h-20 md:w-20 items-center justify-center rounded-full bg-white text-black transition-transform duration-500 group-hover:scale-105">
              <svg viewBox="0 0 24 24" className="ml-1 h-5 w-5 md:h-6 md:w-6" fill="currentColor" aria-hidden>
                <path d="M7 4.5v15l13-7.5z" />
              </svg>
            </span>
          </button>
        )}
      </div>
    </article>
  )
}
