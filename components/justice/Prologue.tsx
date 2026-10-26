'use client'

import { useEffect, useRef, useState } from 'react'
import type { StatueStage } from './statueStage'

/** [fade-in start, fade-in end, fade-out start, fade-out end] in prologue progress (0..1). */
const BEATS: [number, number, number, number][] = [
  [-1, 0, 0.15, 0.22],
  [0.25, 0.31, 0.45, 0.51],
  [0.55, 0.61, 0.73, 0.79],
  [0.86, 0.92, 2, 3],
]
const CHAPTERS = ['The blindfold', 'The scales', 'The sword', 'Begin']

const clamp = (v: number) => Math.min(1, Math.max(0, v))

export default function Prologue({ name }: { name: string }) {
  const sectionRef = useRef<HTMLElement>(null)
  const mountRef = useRef<HTMLDivElement>(null)
  const beatRefs = useRef<(HTMLDivElement | null)[]>([])
  const chapterRefs = useRef<(HTMLLIElement | null)[]>([])
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const section = sectionRef.current
    const mount = mountRef.current
    if (!section || !mount) return
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let stage: StatueStage | null = null
    let disposed = false
    let raf = 0

    // the preloader listens for these: real download progress, then the reveal
    const emit = (type: string, detail?: number) => window.dispatchEvent(new CustomEvent(type, { detail }))
    const done = () => {
      setReady(true)
      emit('lj:ready')
    }
    import('./statueStage')
      .then(({ createStatueStage }) =>
        createStatueStage(mount, { reduceMotion, onReady: done, onProgress: (p) => emit('lj:progress', p) })
      )
      .then((s) => {
        if (disposed) s?.dispose()
        else stage = s
      })
      .catch(done) // no WebGL / model: still lift the curtain on the copy

    const loop = () => {
      raf = requestAnimationFrame(loop)
      const rect = section.getBoundingClientRect()
      const span = rect.height - window.innerHeight
      const p = clamp(-rect.top / Math.max(1, span))
      stage?.setProgress(p)
      BEATS.forEach(([a, b, c, d], i) => {
        const el = beatRefs.current[i]
        if (!el) return
        const vin = b <= a ? 1 : clamp((p - a) / (b - a))
        const vout = 1 - clamp((p - c) / (d - c))
        const o = Math.min(vin, vout)
        el.style.opacity = o.toFixed(3)
        el.style.transform = `translate3d(0, ${((1 - vin) * 30 - (1 - vout) * 30).toFixed(1)}px, 0)`
        el.style.visibility = o < 0.01 ? 'hidden' : 'visible'
      })
      const active = Math.min(3, Math.floor(p * 3.999))
      chapterRefs.current.forEach((li, i) => li?.setAttribute('data-active', String(i === active)))
    }
    loop()

    return () => {
      disposed = true
      cancelAnimationFrame(raf)
      stage?.dispose()
    }
  }, [])

  const toFilms = () => {
    const el = document.getElementById('films')
    if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY, behavior: 'smooth' })
  }

  const beat = (i: number) => (el: HTMLDivElement | null) => {
    beatRefs.current[i] = el
  }

  return (
    <section id="top" ref={sectionRef} className="relative h-[460vh] bg-[#0b0b0b]">
      <div className="sticky top-0 h-[100svh] w-full overflow-hidden demo-grain">
        {/* the statue fades up out of the dark once loaded (no poster swap) */}
        <div ref={mountRef} className={`absolute inset-0 transition-opacity duration-700 ${ready ? 'opacity-100' : 'opacity-0'}`} />
        <div className="demo-vignette pointer-events-none absolute inset-0" />

        {/* beat I — greeting */}
        <div ref={beat(0)} className="absolute bottom-0 left-0 px-6 md:px-12 pb-14 md:pb-16 max-w-2xl">
          <p className="flex items-center gap-3 text-[11px] tracking-[0.28em] uppercase text-white/50">
            <span className="h-px w-8 bg-white/40" />
            Your private demo
          </p>
          {/* lines rise out of their masks as the curtain lifts */}
          <h1 className="mt-5 font-migra text-white text-[2.4rem] md:text-[3.25rem] leading-[1.05] tracking-tight">
            {[
              <>You&rsquo;re in{name ? `, ${name}` : ''}.</>,
              <>
                Here&rsquo;s Murphy&rsquo;s Law <em>in action.</em>
              </>,
            ].map((line, i) => (
              <span key={i} className="block overflow-hidden pb-[0.12em] -mb-[0.12em]">
                <span
                  className="block transition-transform duration-[1400ms] ease-[cubic-bezier(0.16,1,0.3,1)]"
                  style={{ transform: ready ? 'none' : 'translateY(110%)', transitionDelay: `${700 + i * 120}ms` }}
                >
                  {line}
                </span>
              </span>
            ))}
          </h1>
          <p
            className="mt-5 text-[15px] text-white/60 transition-opacity duration-1000"
            style={{ opacity: ready ? 1 : 0, transitionDelay: '1200ms' }}
          >
            Two short videos, about 19 minutes total.
          </p>
        </div>

        {/* beat II — the scales */}
        <div ref={beat(1)} className="absolute bottom-0 left-0 px-6 md:px-12 pb-14 md:pb-16">
          <p className="flex items-center gap-3 text-[11px] tracking-[0.28em] uppercase text-white/50">
            <span className="h-px w-8 bg-white/40" />
            Weighed by the profession
          </p>
          <div className="mt-6 flex gap-12">
            <div>
              <p className="font-migra text-5xl md:text-[3.5rem] text-white leading-none">157</p>
              <p className="mt-3 text-[11px] tracking-[0.28em] uppercase text-white/45">SA law firms</p>
            </div>
            <div>
              <p className="font-migra text-5xl md:text-[3.5rem] text-white leading-none">3,200</p>
              <p className="mt-3 text-[11px] tracking-[0.28em] uppercase text-white/45">Daily users</p>
            </div>
          </div>
        </div>

        {/* beat III — the sword */}
        <div ref={beat(2)} className="absolute left-0 top-1/2 -translate-y-1/2 px-6 md:px-12 max-w-lg">
          <p className="flex items-center gap-3 text-[11px] tracking-[0.28em] uppercase text-white/50">
            <span className="h-px w-8 bg-white/40" />
            The promise
          </p>
          <p className="mt-5 font-migra text-white text-[2rem] md:text-[2.75rem] leading-[1.08]">
            One billable hour saved, per lawyer, per day.
          </p>
          <p className="mt-3 font-migra text-xl text-white/55">Most save two.</p>
        </div>

        {/* beat IV — begin */}
        <div ref={beat(3)} className="absolute inset-x-0 bottom-0 px-6 md:px-12 pb-14 md:pb-16">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
            <p className="font-migra text-white text-[2rem] md:text-[2.75rem] leading-[1.08]">
              Two short films.
              <br />
              <em>About nineteen minutes.</em>
            </p>
            <button
              type="button"
              onClick={toFilms}
              className="self-start md:self-auto inline-flex items-center gap-3 rounded-full bg-white px-7 py-3.5 text-sm text-black transition-colors duration-300 hover:bg-white/85"
            >
              Start watching <span aria-hidden>↓</span>
            </button>
          </div>
        </div>

        {/* chapter index: four quiet ticks, the active one extends */}
        <ol className="pointer-events-none absolute right-6 md:right-12 top-1/2 -translate-y-1/2 hidden md:flex flex-col items-end gap-4">
          {CHAPTERS.map((c, i) => (
            <li
              key={c}
              ref={(el) => {
                chapterRefs.current[i] = el
              }}
              data-active="false"
              className="group flex items-center gap-3 text-[11px] tracking-[0.28em] uppercase text-white/0 transition-colors duration-500 data-[active=true]:text-white/70"
            >
              {c}
              <span className="h-px w-3 bg-white/25 transition-all duration-500 group-data-[active=true]:w-8 group-data-[active=true]:bg-white" />
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
