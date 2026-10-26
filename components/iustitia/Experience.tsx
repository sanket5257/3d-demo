'use client'

import { useEffect, useRef, useState } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Lenis from 'lenis'
import type { AnchorName, MaterialName, Shot, Stage } from './stage'

const CHAPTERS: { id: string; num: string; title: string; head: string; body: string; anchor: AnchorName; note: string; side: 'left' | 'right' }[] = [
  {
    id: 'blindfold', num: 'I', title: 'The blindfold', anchor: 'blindfold', side: 'left',
    head: 'She does not look. She weighs.',
    body: 'A single band of carved linen, knotted behind the head. Justice is blind so that nothing on the scale can catch her eye.',
    note: 'Linen band · knotted at the nape',
  },
  {
    id: 'scales', num: 'II', title: 'The scales', anchor: 'scales', side: 'right',
    head: 'Two pans. One beam. No favourites.',
    body: 'The only part of her that moves freely. Scroll quickly and watch the pans swing, then settle back to level.',
    note: 'Live physics · reacts to your scroll',
  },
  {
    id: 'sword', num: 'III', title: 'The sword', anchor: 'sword', side: 'left',
    head: 'Held low. Drawn only when needed.',
    body: 'Point down, resting against the drapery. Authority that waits, rather than threatens.',
    note: 'Double-edged · tip resting on the stone',
  },
  {
    id: 'drapery', num: 'IV', title: 'The drapery', anchor: 'drapery', side: 'right',
    head: 'Stone that remembers the wind.',
    body: 'Hundreds of folds, cut deep enough to throw their own shadows. Look closely: the hem still breathes.',
    note: 'Animated cloth · 0.65 cm of travel',
  },
]

const MATERIALS: { key: MaterialName; name: string; sub: string; swatch: string }[] = [
  { key: 'marble', name: 'Carrara marble', sub: 'Veined, translucent', swatch: 'radial-gradient(circle at 35% 30%, #fbf8f2, #cfcac0 70%)' },
  { key: 'bronze', name: 'Dark bronze', sub: 'Brushed, oiled', swatch: 'radial-gradient(circle at 35% 30%, #7a6458, #1c140f 75%)' },
  { key: 'obsidian', name: 'Obsidian', sub: 'Lacquered, mirror-dark', swatch: 'radial-gradient(circle at 35% 30%, #5b5b62, #050506 70%)' },
  { key: 'verdigris', name: 'Verdigris', sub: 'Copper, a century outdoors', swatch: 'radial-gradient(circle at 35% 30%, #a9c6bd, #3d5e56 75%)' },
]

const MANIFESTO =
  'No photograph was harmed in the making of this page. Every fold, every highlight, every shadow you have scrolled past is being computed right now, on your screen, sixty times a second.'

const STATS = [
  { v: '347,164', l: 'Triangles' },
  { v: '1.8 MB', l: 'Entire sculpture' },
  { v: '60', l: 'Frames per second' },
  { v: '0', l: 'Pre-rendered images' },
]

export default function Experience() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  const calloutRef = useRef<HTMLDivElement>(null)
  const countRef = useRef<HTMLSpanElement>(null)
  const barRef = useRef<HTMLSpanElement>(null)
  const beamRef = useRef<SVGGElement>(null)
  const panRefs = useRef<(SVGGElement | null)[]>([])
  const stageRef = useRef<Stage | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [lifted, setLifted] = useState(false)
  const [chapter, setChapter] = useState(0)
  const [material, setMaterial] = useState<MaterialName>('marble')

  useEffect(() => {
    const canvas = canvasRef.current
    const root = rootRef.current
    if (!canvas || !root) return
    gsap.registerPlugin(ScrollTrigger)
    const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches
    let disposed = false
    let ctx: gsap.Context | null = null
    let lenis: Lenis | null = null
    const lenisTick = (t: number) => lenis?.raf(t * 1000)

    // preloader counter eases toward real download progress
    let target = 0
    let shown = 0
    let ready = false
    let raf = 0
    // the loader's balance: the beam is weighed down by what is still loading and swings to level
    let angle = -16
    let angVel = 0
    let settled = 0
    let last = performance.now()
    const tick = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05)
      last = now
      if (!ready) target = Math.max(target, Math.min(0.25, target + 0.0012))
      shown += (target - shown) * 0.06
      if (ready && 1 - shown < 0.004) shown = 1
      if (countRef.current) countRef.current.textContent = String(Math.round(shown * 100)).padStart(3, '0')
      if (barRef.current) barRef.current.style.transform = `scaleX(${shown})`
      // damped spring toward the tilt the remaining weight implies
      const goal = -16 * (1 - shown)
      angVel += ((goal - angle) * 38 - angVel * 4.2) * dt
      angle += angVel * dt
      beamRef.current?.setAttribute('transform', `rotate(${angle.toFixed(3)} 160 70)`)
      const rad = (angle * Math.PI) / 180
      ;[-1, 1].forEach((side, i) => {
        const x = 160 + side * 110 * Math.cos(rad)
        const y = 70 + side * 110 * Math.sin(rad)
        panRefs.current[i]?.setAttribute('transform', `translate(${x.toFixed(2)} ${y.toFixed(2)})`)
      })
      if (shown >= 1 && Math.abs(angle) < 0.15 && Math.abs(angVel) < 1.5) settled += dt
      if (settled > 0.35 || (reduceMotion && shown >= 1)) {
        setLifted(true)
        lenis?.start()
        return
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)

    if (!reduceMotion) {
      lenis = new Lenis({ lerp: 0.085 })
      lenis.on('scroll', ScrollTrigger.update)
      gsap.ticker.add(lenisTick)
      gsap.ticker.lagSmoothing(0)
      lenis.stop()
    }

    import('./stage')
      .then(({ createStage, SHOTS }) =>
        createStage(canvas, { reduceMotion, onProgress: (p) => (target = Math.max(target, Math.min(0.96, p))) }).then((stage) => {
          if (disposed) return stage.dispose()
          stageRef.current = stage
          ready = true
          target = 1
          setLoaded(true)
          ctx = gsap.context(() => buildScroll(stage, SHOTS, reduceMotion), root)
        })
      )
      .catch(() => {
        ready = true
        target = 1
      })

    return () => {
      disposed = true
      cancelAnimationFrame(raf)
      ctx?.revert()
      gsap.ticker.remove(lenisTick)
      lenis?.destroy()
      stageRef.current?.dispose()
      stageRef.current = null
    }
  }, [])

  // Liquid Glass: lens map (edge-weighted displacement) + specular highlight that tracks the pointer
  const lensRef = useRef<SVGFEImageElement>(null)
  useEffect(() => {
    const S = 128
    const c = document.createElement('canvas')
    c.width = c.height = S
    const g = c.getContext('2d')!
    const img = g.createImageData(S, S)
    const band = (d: number) => {
      const t = Math.min(1, d / 0.22) // rim band: strongest at the edge, zero in the middle
      return Math.pow(1 - t, 2.2)
    }
    for (let y = 0; y < S; y++) {
      for (let x = 0; x < S; x++) {
        const u = x / (S - 1)
        const v = y / (S - 1)
        const i = (y * S + x) * 4
        img.data[i] = 128 + 127 * band(Math.min(u, 1 - u)) * (u < 0.5 ? 1 : -1) // R: bend inward horizontally
        img.data[i + 1] = 128 + 127 * band(Math.min(v, 1 - v)) * (v < 0.5 ? 1 : -1) // G: and vertically
        img.data[i + 2] = 128
        img.data[i + 3] = 255
      }
    }
    g.putImageData(img, 0, 0)
    lensRef.current?.setAttribute('href', c.toDataURL())

    const move = (e: PointerEvent) => {
      const el = (e.target as Element | null)?.closest<HTMLElement>('.lg-i')
      if (!el) return
      const r = el.getBoundingClientRect()
      el.style.setProperty('--lg-mx', `${(((e.clientX - r.left) / r.width) * 100).toFixed(1)}%`)
      el.style.setProperty('--lg-my', `${(((e.clientY - r.top) / r.height) * 100).toFixed(1)}%`)
    }
    window.addEventListener('pointermove', move, { passive: true })
    return () => window.removeEventListener('pointermove', move)
  }, [])

  // glass thumbs morph between the active nav item / material
  const navRef = useRef<HTMLElement>(null)
  const navThumbRef = useRef<HTMLSpanElement>(null)
  const matRef = useRef<HTMLDivElement>(null)
  const matThumbRef = useRef<HTMLSpanElement>(null)
  useEffect(() => {
    const place = (box: HTMLElement | null, thumb: HTMLElement | null, sel: string) => {
      if (!box || !thumb) return
      const el = box.querySelector<HTMLElement>(sel)
      if (!el) {
        thumb.style.opacity = '0'
        return
      }
      thumb.style.opacity = '1'
      thumb.style.left = `${el.offsetLeft}px`
      thumb.style.top = `${el.offsetTop}px`
      thumb.style.width = `${el.offsetWidth}px`
      thumb.style.height = `${el.offsetHeight}px`
      thumb.classList.remove('is-moving')
      void thumb.offsetWidth
      thumb.classList.add('is-moving')
    }
    place(navRef.current, navThumbRef.current, '[data-active="true"]')
    place(matRef.current, matThumbRef.current, '[aria-pressed="true"]')
  }, [chapter, material])

  function buildScroll(stage: Stage, SHOTS: Record<string, Shot>, reduceMotion: boolean) {
    const scrub = reduceMotion ? true : 1.1
    const shots: Record<string, Shot> = { ...SHOTS, manifesto: { ...SHOTS.drapery, px: 0, py: -0.3, pz: 5.2, tx: 0, ty: -0.7, tz: 0, turn: 0.9, expo: 0.32, key: 0.9 } }
    const sections = gsap.utils.toArray<HTMLElement>('[data-shot]')
    sections.forEach((sec, i) => {
      if (i === 0) return
      const from = shots[sections[i - 1].dataset.shot!]
      const to = shots[sec.dataset.shot!]
      gsap.fromTo(stage.shot, { ...from }, {
        ...to, ease: 'none', immediateRender: false,
        scrollTrigger: { trigger: sec, start: 'top bottom', end: 'top 15%', scrub },
      })
      ScrollTrigger.create({
        trigger: sec, start: 'top 55%', end: 'bottom 55%',
        onToggle: (s) => s.isActive && setChapter(i),
        onLeaveBack: () => i === 1 && setChapter(0),
      })
    })

    // hero title sits behind the statue and drifts away
    gsap.to('.ij-title', { yPercent: -18, opacity: 0, ease: 'none', scrollTrigger: { trigger: '#hero', start: 'top top', end: 'bottom top', scrub: true } })

    // chapter copy rises in and clears out before the next camera move
    gsap.utils.toArray<HTMLElement>('.ij-chapter-copy').forEach((el) => {
      gsap.fromTo(el.children, { y: 40, opacity: 0 }, {
        y: 0, opacity: 1, stagger: 0.08, ease: 'none',
        scrollTrigger: { trigger: el.parentElement, start: 'top 70%', end: 'top 20%', scrub },
      })
      gsap.to(el, { opacity: 0, ease: 'none', scrollTrigger: { trigger: el.parentElement, start: 'bottom 85%', end: 'bottom 45%', scrub: true } })
    })

    // manifesto: words light up one by one as you scroll
    gsap.fromTo('.ij-word', { opacity: 0.12 }, {
      opacity: 1, stagger: 0.1, ease: 'none',
      scrollTrigger: { trigger: '#manifesto', start: 'top 60%', end: 'bottom 80%', scrub: true },
    })

    // material + turntable chapters
    gsap.fromTo('.ij-material', { opacity: 0, y: 30 }, { opacity: 1, y: 0, ease: 'none', scrollTrigger: { trigger: '#material', start: 'top 60%', end: 'top 15%', scrub } })
    ScrollTrigger.create({
      trigger: '#turntable', start: 'top 40%', end: 'bottom 60%',
      onToggle: (s) => stage.setDrag(s.isActive),
    })

    // colophon stats count in
    gsap.utils.toArray<HTMLElement>('.ij-stat').forEach((el, i) => {
      gsap.from(el, { y: 60, opacity: 0, duration: 1.2, delay: i * 0.08, ease: 'expo.out', scrollTrigger: { trigger: el, start: 'top 90%', once: true } })
    })

    // annotation callout follows its anchor on the live model
    const callout = calloutRef.current!
    const dot = callout.querySelector<HTMLElement>('.ij-dot')!
    const line = callout.querySelector<SVGLineElement>('line')!
    const label = callout.querySelector<HTMLElement>('.ij-label')!
    const chapterEls = CHAPTERS.map((c) => document.getElementById(c.id)!)
    let alpha = 0
    let active = -1
    stage.onFrame(() => {
      const mid = innerHeight * 0.5
      let idx = -1
      chapterEls.forEach((el, i) => {
        const r = el.getBoundingClientRect()
        if (r.top < mid && r.bottom > mid) idx = i
      })
      if (idx !== -1 && idx !== active) {
        active = idx
        label.textContent = CHAPTERS[idx].note
      }
      alpha += ((idx === -1 ? 0 : 1) - alpha) * 0.08
      callout.style.opacity = alpha.toFixed(3)
      if (active === -1) return
      const [x, y, vis] = stage.project(CHAPTERS[active].anchor)
      const dir = CHAPTERS[active].side === 'right' ? -1 : 1 // label points away from the copy column
      const lx = x + dir * Math.min(180, innerWidth * 0.14)
      const ly = y - 70
      dot.style.transform = `translate(${x}px, ${y}px)`
      line.setAttribute('x1', String(x)); line.setAttribute('y1', String(y))
      line.setAttribute('x2', String(lx)); line.setAttribute('y2', String(ly))
      label.style.transform = `translate(${dir > 0 ? lx + 10 : lx - 10}px, ${ly}px) translate(${dir > 0 ? '0' : '-100%'}, -50%)`
      if (!vis) callout.style.opacity = '0'
    })
    requestAnimationFrame(() => ScrollTrigger.refresh())
  }

  const pickMaterial = (m: MaterialName) => {
    setMaterial(m)
    stageRef.current?.setMaterial(m)
  }

  const words = MANIFESTO.split(' ')

  return (
    <div ref={rootRef} className="ij relative bg-[#0a0a0a] text-[#ece8e1] font-[family-name:var(--ij-sans)] antialiased selection:bg-[#aeb7b2] selection:text-black">
      {/* ---------- preloader: the scales weigh the download, then the room opens along the beam ---------- */}
      <div aria-hidden className="fixed inset-0 z-[100]" style={{ pointerEvents: lifted ? 'none' : 'auto' }}>
        {/* two halves of the curtain part from the beam line */}
        <div
          className="absolute inset-x-0 top-0 h-1/2 bg-[#0a0a0a] transition-transform duration-[1300ms] ease-[cubic-bezier(0.76,0,0.24,1)]"
          style={{ transform: lifted ? 'translateY(-100%)' : 'none', transitionDelay: lifted ? '650ms' : '0ms' }}
        />
        <div
          className="absolute inset-x-0 bottom-0 h-1/2 bg-[#0a0a0a] transition-transform duration-[1300ms] ease-[cubic-bezier(0.76,0,0.24,1)]"
          style={{ transform: lifted ? 'translateY(100%)' : 'none', transitionDelay: lifted ? '650ms' : '0ms' }}
        />
        {/* the seam: a hairline that runs out from the beam across the screen, then splits */}
        <span
          className="absolute left-0 right-0 top-1/2 h-px bg-[#ece8e1] origin-center transition-all duration-[700ms] ease-[cubic-bezier(0.65,0,0.35,1)]"
          style={{ transform: lifted ? 'scaleX(1)' : 'scaleX(0)', opacity: lifted ? 0 : 1, transitionDelay: lifted ? '0ms, 900ms' : '0ms' }}
        />

        <div className="absolute inset-0 transition-opacity duration-500" style={{ opacity: lifted ? 0 : 1 }}>
          <div className="absolute inset-x-0 top-0 flex justify-between px-6 md:px-10 py-7 text-[11px] tracking-[0.3em] uppercase text-white/40">
            <span className="font-[family-name:var(--ij-serif)] text-xl normal-case tracking-[-0.02em] text-white/80">Iustitia</span>
            <span>Exhibit Nº 001</span>
          </div>

          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <svg viewBox="0 0 320 220" className="ij-loader w-[min(78vw,420px)] -translate-y-[38%] overflow-visible" fill="none" stroke="#ece8e1" strokeWidth="1" strokeLinecap="round">
              {/* post, finial and foot */}
              <path className="ij-draw" pathLength={1} d="M160 70 L160 200" style={{ animationDelay: '0.1s' }} />
              <path className="ij-draw" pathLength={1} d="M126 200 L194 200" style={{ animationDelay: '0.5s' }} />
              <circle className="ij-draw" pathLength={1} cx="160" cy="58" r="5" style={{ animationDelay: '0.3s' }} />
              {/* beam: rotated live by the loading weight */}
              <g ref={beamRef} transform="rotate(-16 160 70)">
                <path className="ij-draw" pathLength={1} d="M50 70 L270 70" style={{ animationDelay: '0.6s' }} />
                <circle cx="160" cy="70" r="2.5" fill="#ece8e1" stroke="none" />
              </g>
              {/* pans hang plumb from the beam ends */}
              {[0, 1].map((i) => (
                <g key={i} ref={(el) => { panRefs.current[i] = el }} transform={i === 0 ? "translate(54.26 100.32)" : "translate(265.74 39.68)"}>
                  <path className="ij-draw" pathLength={1} d="M0 0 L-26 62 M0 0 L26 62" strokeOpacity="0.6" style={{ animationDelay: `${0.9 + i * 0.1}s` }} />
                  <path className="ij-draw" pathLength={1} d="M-32 62 Q0 82 32 62 Z" style={{ animationDelay: `${1.1 + i * 0.1}s` }} />
                </g>
              ))}
            </svg>
          </div>

          <div className="absolute inset-x-0 bottom-0 flex items-end justify-between px-6 md:px-10 pb-8">
            <p className="max-w-[16rem] text-[11px] leading-relaxed tracking-[0.3em] uppercase text-white/40">Weighing the stone</p>
            <div className="text-right">
              <span ref={countRef} className="block font-[family-name:var(--ij-serif)] text-6xl md:text-7xl leading-none tabular-nums">000</span>
              <span className="mt-3 ml-auto block h-px w-32 bg-white/15">
                <span ref={barRef} className="block h-full w-full origin-left bg-[#ece8e1]" style={{ transform: 'scaleX(0)' }} />
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ---------- fixed layers ---------- */}
      <div className="ij-title pointer-events-none fixed inset-0 z-0 flex items-center justify-center overflow-hidden">
        <h1
          className="font-[family-name:var(--ij-serif)] text-[21vw] leading-none tracking-[-0.05em] text-[#3a3631] transition-all duration-[1600ms] ease-[cubic-bezier(0.16,1,0.3,1)]"
          style={{ transform: lifted ? 'translateY(-4vh)' : 'translateY(14vh)', opacity: lifted ? 1 : 0, transitionDelay: '200ms' }}
        >
          Iustitia
        </h1>
      </div>
      <canvas
        ref={canvasRef}
        aria-label="Real-time 3D marble statue of Lady Justice"
        className="fixed inset-0 z-[1] h-screen w-screen pointer-events-none transition-opacity duration-1000"
        style={{ opacity: loaded ? 1 : 0, touchAction: 'pan-y' }}
      />
      <div className="pointer-events-none fixed inset-0 z-[2] bg-[radial-gradient(120%_90%_at_50%_45%,transparent_40%,rgba(0,0,0,0.6)_80%,rgba(0,0,0,0.92)_100%)]" />

      {/* annotation */}
      <div ref={calloutRef} className="pointer-events-none fixed inset-0 z-[3] opacity-0" aria-hidden>
        <svg className="absolute inset-0 h-full w-full overflow-visible">
          <line stroke="rgba(236,232,225,0.55)" strokeWidth="1" />
        </svg>
        <span className="ij-dot absolute left-0 top-0 -ml-[5px] -mt-[5px] h-[10px] w-[10px] rounded-full border border-[#ece8e1] bg-[#0a0a0a]">
          <span className="absolute inset-[2px] rounded-full bg-[#aeb7b2] animate-pulse" />
        </span>
        <span className="ij-label lg-clear absolute left-0 top-0 whitespace-nowrap px-4 py-2 text-[11px] tracking-[0.18em] uppercase" />
      </div>

      {/* lens for the glass: displacement from an edge map, so the rim bends and the centre stays true */}
      <svg aria-hidden className="pointer-events-none absolute h-0 w-0">
        <filter id="lg-lens" x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
          <feImage ref={lensRef} x="0" y="0" width="100%" height="100%" preserveAspectRatio="none" result="map" />
          <feDisplacementMap in="SourceGraphic" in2="map" scale="46" xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </svg>

      {/* scroll-edge softening under the floating controls */}
      <div aria-hidden className="lg-edge pointer-events-none fixed inset-x-0 top-0 z-40 h-28" />

      {/* controls & navigation: the only things made of glass */}
      <header className="fixed inset-x-0 top-0 z-50 mix-blend-difference flex items-center justify-between gap-4 px-6 md:px-10 pt-6 text-[11px] tracking-[0.24em] uppercase">
        <a href="#hero" className="lg lg-i relative font-[family-name:var(--ij-serif)] text-xl normal-case tracking-normal leading-none">
          Iustitia
        </a>
        <nav ref={navRef} className="relative hidden md:flex items-center gap-8 text-white/55">
          <span ref={navThumbRef} aria-hidden className="lg-thumb opacity-0" />
          {CHAPTERS.map((c, i) => (
            <a
              key={c.id}
              href={`#${c.id}`}
              data-active={chapter === i + 1}
              className={`lg-i relative z-[1] pb-1 transition-colors duration-500 hover:text-white ${chapter === i + 1 ? 'text-white' : ''}`}
            >
              {c.num}. {c.title}
            </a>
          ))}
        </nav>
        <a href="/car" className="lg lg-i relative pb-1 text-white/85 hover:text-white">
          Next exhibit →
        </a>
      </header>
      <div className="pointer-events-none fixed bottom-0 inset-x-0 z-50 flex items-end justify-between px-6 md:px-10 pb-6 text-[11px] tracking-[0.3em] uppercase text-white/45">
        <span>Real-time · WebGL</span>
        <span className="relative font-[family-name:var(--ij-serif)] text-lg tracking-normal normal-case text-white/85 tabular-nums">
          {String(chapter).padStart(2, '0')} <span className="text-white/35">/ 08</span>
        </span>
      </div>

      {/* ---------- story ---------- */}
      <main className="relative z-10">
        <section id="hero" data-shot="hero" className="relative h-[100svh]">
          <div
            className="absolute bottom-16 md:bottom-20 left-6 md:left-10 max-w-sm transition-all duration-1000"
            style={{ opacity: lifted ? 1 : 0, transform: lifted ? 'none' : 'translateY(20px)', transitionDelay: '900ms' }}
          >
            <p className="text-[11px] tracking-[0.3em] uppercase text-[#aeb7b2]">Exhibit Nº 001 — Marble, digital</p>
            <p className="mt-4 font-[family-name:var(--ij-serif)] text-2xl md:text-[1.9rem] leading-[1.15]">
              A sculpture you can walk around. Carved in Blender, lit and rendered live in your browser.
            </p>
          </div>
          <div
            className="absolute bottom-16 md:bottom-20 right-6 md:right-10 hidden md:block text-right text-[11px] tracking-[0.3em] uppercase text-white/45 transition-opacity duration-1000"
            style={{ opacity: lifted ? 1 : 0, transitionDelay: '1100ms' }}
          >
            <p>H 1.82 m · Ø 0.57 m</p>
            <p className="mt-2">Scroll to begin the tour</p>
          </div>
        </section>

        {CHAPTERS.map((c) => (
          <section key={c.id} id={c.id} data-shot={c.id} className="relative h-[170vh]">
            <div className={`ij-chapter-copy sticky top-0 flex h-[100svh] flex-col justify-center px-6 md:px-10 ${c.side === 'right' ? 'items-end text-right' : 'items-start'}`}>
              <p className="text-[11px] tracking-[0.3em] uppercase text-[#aeb7b2]">
                Chapter {c.num} — {c.title}
              </p>
              <h2 className="mt-5 max-w-[13ch] font-[family-name:var(--ij-serif)] text-[2.6rem] md:text-[4.2rem] leading-[1.02] tracking-[-0.02em]">
                {c.head}
              </h2>
              <p className="mt-6 max-w-[30ch] text-[15px] md:text-base leading-relaxed text-white/65">{c.body}</p>
            </div>
          </section>
        ))}

        <section id="manifesto" data-shot="manifesto" className="relative h-[220vh]">
          <div className="sticky top-0 flex h-[100svh] items-center justify-center px-6 md:px-10">
            <p className="max-w-5xl text-center font-[family-name:var(--ij-serif)] text-[2.1rem] md:text-[3.6rem] leading-[1.12] tracking-[-0.015em]">
              {words.map((w, i) => (
                <span key={i} className="ij-word inline-block mr-[0.25em]">
                  {w}
                </span>
              ))}
            </p>
          </div>
        </section>

        <section id="material" data-shot="material" className="relative h-[180vh]">
          <div className="ij-material sticky top-0 flex h-[100svh] flex-col justify-center px-6 md:px-10">
            <p className="text-[11px] tracking-[0.3em] uppercase text-[#aeb7b2]">Chapter V — The material</p>
            <h2 className="mt-5 max-w-[12ch] font-[family-name:var(--ij-serif)] text-[2.6rem] md:text-[4.2rem] leading-[1.02] tracking-[-0.02em]">
              Same form. <em className="text-white/55">Four fates.</em>
            </h2>
            <div ref={matRef} className="relative mt-10 grid max-w-md grid-cols-1 border-t border-white/15" role="group" aria-label="Choose the material">
              <span ref={matThumbRef} aria-hidden className="lg-thumb !rounded-[24px] opacity-0" />
              {MATERIALS.map((m) => (
                <button
                  key={m.key}
                  onClick={() => pickMaterial(m.key)}
                  aria-pressed={material === m.key}
                  className="group lg-i relative z-[1] flex items-center gap-4 border-b border-white/15 py-4 text-left transition-opacity hover:opacity-100 aria-[pressed=false]:opacity-50"
                >
                  <span className="h-9 w-9 shrink-0 rounded-full ring-1 ring-white/20 transition-transform duration-500 group-hover:scale-110" style={{ background: m.swatch }} />
                  <span>
                    <span className="block text-sm">{m.name}</span>
                    <span className="block text-[11px] text-white/45">{m.sub}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        </section>

        <section id="turntable" data-shot="turntable" className="relative h-[170vh]">
          <div className="sticky top-0 flex h-[100svh] flex-col items-center justify-end pb-24 px-6 text-center pointer-events-none">
            <p className="text-[11px] tracking-[0.3em] uppercase text-[#aeb7b2]">Chapter VI — In the round</p>
            <p className="mt-4 font-[family-name:var(--ij-serif)] text-3xl md:text-[2.6rem] leading-tight">
              Drag to turn her. <em className="text-white/55">Let go, she settles.</em>
            </p>
            <span className="relative mt-6 inline-flex items-center gap-4 text-[11px] tracking-[0.3em] uppercase text-white/75">
              <span aria-hidden>⟵</span> Drag <span aria-hidden>⟶</span>
            </span>
          </div>
        </section>

        <section id="colophon" data-shot="finale" className="relative min-h-[150vh]">
          <div className="h-[75vh]" />
          <div className="relative rounded-t-[32px] md:rounded-t-[48px] border-t border-white/10 bg-[#0a0a0a]">
          <div className="mx-auto max-w-[1400px] px-6 md:px-10 pt-20 md:pt-28 pb-16">
            <p className="text-[11px] tracking-[0.3em] uppercase text-[#aeb7b2]">Colophon</p>
            <h2 className="mt-5 max-w-[16ch] font-[family-name:var(--ij-serif)] text-[2.8rem] md:text-[5rem] leading-[1] tracking-[-0.025em]">
              Every surface you saw was computed live.
            </h2>
            <div className="mt-16 grid grid-cols-2 md:grid-cols-4 border-t border-white/15">
              {STATS.map((s) => (
                <div key={s.l} className="ij-stat border-b md:border-b-0 border-white/15 py-8 md:pr-6">
                  <p className="font-[family-name:var(--ij-serif)] text-5xl md:text-6xl tabular-nums">{s.v}</p>
                  <p className="mt-3 text-[11px] tracking-[0.3em] uppercase text-white/45">{s.l}</p>
                </div>
              ))}
            </div>
            <div className="mt-24 flex flex-col md:flex-row md:items-end justify-between gap-10 border-t border-white/15 pt-10">
              <p className="max-w-md text-white/60 leading-relaxed">
                Sculpted, retopologised and rigged in Blender. Marble, bronze, obsidian and verdigris are shaders, not textures. The scales run
                on a spring simulation; the hem on a vertex breeze.
              </p>
              <a
                href="mailto:hello@example.com?subject=A%20real-time%203D%20piece"
                className="group lg-i relative inline-flex items-center gap-4 pb-2 font-[family-name:var(--ij-serif)] text-3xl md:text-5xl text-white"
              >
                Commission a 3D piece
                <span className="inline-block transition-transform duration-500 group-hover:translate-x-1">→</span>
              </a>
            </div>
            <div className="mt-24 flex justify-between text-[11px] tracking-[0.3em] uppercase text-white/35">
              <span>Iustitia — a real-time study</span>
              <a href="/car" className="hover:text-white">Next exhibit: Neunelf →</a>
            </div>
          </div>
          </div>
        </section>
      </main>
    </div>
  )
}
