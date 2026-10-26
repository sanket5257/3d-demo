'use client'

import { useRef, useState } from 'react'

const WORKING_DAYS = 21
const CHING = 'https://assets.cdn.filesafe.space/u0PZTzhV1PimF3tEteQI/media/69eddcfd9fe87a999413d965.wav'

const rand = (n: number) => 'R ' + Math.round(n).toLocaleString('en-ZA')

function playChing() {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    if (!Ctx) return
    const ctx = new Ctx()
    fetch(CHING)
      .then((r) => r.arrayBuffer())
      .then((b) => ctx.decodeAudioData(b))
      .then((buf) => {
        const s = ctx.createBufferSource()
        s.buffer = buf
        s.connect(ctx.destination)
        s.start(0)
        s.stop(ctx.currentTime + 1.5)
      })
      .catch(() => {})
  } catch {}
}

export default function Calculator({ onReveal }: { onReveal: (monthly: string) => void }) {
  const [open, setOpen] = useState(false)
  const [lawyers, setLawyers] = useState(1)
  const [rate, setRate] = useState(2000)
  const [revealed, setRevealed] = useState(false)
  const yearRef = useRef<HTMLParagraphElement>(null)
  const resultRef = useRef<HTMLDivElement>(null)

  const monthly = lawyers * WORKING_DAYS * rate
  const yearly = monthly * 12
  const pct = (v: number, min: number, max: number) => `${(((v - min) / (max - min)) * 100).toFixed(1)}%`

  const reveal = () => {
    setRevealed(true)
    playChing()
    onReveal(rand(monthly))
    const el = yearRef.current
    if (el) {
      const start = performance.now()
      const tick = (now: number) => {
        const p = Math.min((now - start) / 1200, 1)
        el.textContent = rand(yearly * (p === 1 ? 1 : 1 - Math.pow(2, -10 * p)))
        if (p < 1) requestAnimationFrame(tick)
      }
      requestAnimationFrame(tick)
    }
    setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 80)
  }

  return (
    <section id="calculator" className="relative bg-[#0b0b0b] text-white demo-grain overflow-hidden">
      <div className="relative mx-auto max-w-[1440px] px-6 md:px-10 py-28 md:py-40">
        <p className="font-montreal text-[11px] md:text-xs tracking-[0.28em] uppercase text-white/55">Chapter III — Cost calculator</p>
        <h2 data-lines className="mt-6 max-w-4xl font-migra text-[2.25rem] md:text-[3rem] lg:text-[3.5rem] leading-[1.06]">
          One billable hour saved, per lawyer, per day — <em>see what that&rsquo;s worth to your firm.</em>
        </h2>
        <p data-fade className="mt-6 text-base text-white/60">
          Most people save <em className="font-migra">two hours a day</em> using Murphy&rsquo;s.
        </p>

        {!open && (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="mt-12 inline-flex items-center gap-3 rounded-full border border-white/25 px-7 py-3.5 text-sm transition-colors duration-300 hover:bg-white hover:text-black"
          >
            Run the numbers →
          </button>
        )}

        <div
          className={`grid transition-[grid-template-rows,opacity] duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] ${
            open ? 'grid-rows-[1fr] opacity-100 mt-16' : 'grid-rows-[0fr] opacity-0'
          }`}
        >
          <div className="overflow-hidden">
            <div className="grid grid-cols-12 gap-x-6 gap-y-14 border-t border-white/15 pt-12">
              <div className="col-span-12 md:col-span-4">
                <p className="font-migra text-6xl md:text-7xl leading-none">1</p>
                <p className="mt-4 text-lg">Hour saved per lawyer, per day</p>
                <p className="mt-1 text-sm text-white/50">Guaranteed minimum — most save two</p>
              </div>
              <div className="col-span-12 md:col-span-7 md:col-start-6 space-y-12">
                <label className="block">
                  <span className="flex items-baseline justify-between gap-4">
                    <span className="text-sm text-white/70">How many lawyers in your firm?</span>
                    <span className="font-migra text-2xl tabular-nums">{lawyers === 40 ? '40+' : lawyers}</span>
                  </span>
                  <input
                    type="range"
                    min={1}
                    max={40}
                    step={1}
                    value={lawyers}
                    onChange={(e) => setLawyers(Number(e.target.value))}
                    className="demo-range mt-5"
                    style={{ ['--pct' as string]: pct(lawyers, 1, 40) }}
                  />
                  <span className="mt-3 flex justify-between text-[11px] tracking-[0.2em] text-white/40">
                    <span>1</span><span>20</span><span>40+</span>
                  </span>
                </label>
                <label className="block">
                  <span className="flex items-baseline justify-between gap-4">
                    <span className="text-sm text-white/70">What is your firm&rsquo;s hourly rate?</span>
                    <span className="font-migra text-2xl tabular-nums">{rand(rate)}</span>
                  </span>
                  <input
                    type="range"
                    min={500}
                    max={10000}
                    step={100}
                    value={rate}
                    onChange={(e) => setRate(Number(e.target.value))}
                    className="demo-range mt-5"
                    style={{ ['--pct' as string]: pct(rate, 500, 10000) }}
                  />
                  <span className="mt-3 flex justify-between text-[11px] tracking-[0.2em] text-white/40">
                    <span>R 500</span><span>R 5,000</span><span>R 10,000</span>
                  </span>
                </label>
                <button
                  type="button"
                  onClick={reveal}
                  className="inline-flex items-center gap-3 rounded-full bg-white px-7 py-3.5 text-sm text-black transition-colors duration-300 hover:bg-white/85"
                >
                  Show me what we&rsquo;re losing →
                </button>
              </div>
            </div>

            <div
              ref={resultRef}
              className={`mt-16 border-t border-white/15 pt-12 transition-all duration-700 ${revealed ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6 pointer-events-none h-0 overflow-hidden mt-0 pt-0 border-0'}`}
              aria-live="polite"
            >
              <p ref={yearRef} className="font-migra text-[2.75rem] md:text-6xl leading-none tabular-nums">
                {rand(yearly)}
              </p>
              <div className="mt-6 flex flex-wrap items-baseline gap-x-10 gap-y-2">
                <span className="text-[11px] tracking-[0.28em] uppercase text-[#d4a574]">Lost every year</span>
                <span className="text-lg text-white/80">That&rsquo;s {rand(monthly)} a month</span>
              </div>
              <p className="mt-4 font-migra text-xl text-white/70">That&rsquo;s what staying still is costing you.</p>
            </div>
          </div>
        </div>

        <p data-fade className="mt-24 max-w-xl font-migra text-lg md:text-xl text-white/45">
          &ldquo;AI can reduce first-draft contract review time from hours to minutes.&rdquo;
        </p>
      </div>
    </section>
  )
}
