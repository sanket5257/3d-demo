'use client'

import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

type Quote = { lead: string; mark: string; name: string; role: string }

/** Desktop: the section pins and the quotes travel sideways with scroll. Mobile: a simple stack. */
export default function Testimonials({ quotes }: { quotes: Quote[] }) {
  const sectionRef = useRef<HTMLElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const section = sectionRef.current
    const track = trackRef.current
    if (!section || !track) return
    gsap.registerPlugin(ScrollTrigger)
    const mm = gsap.matchMedia()
    mm.add('(min-width: 768px) and (prefers-reduced-motion: no-preference)', () => {
      const dist = () => track.scrollWidth - window.innerWidth
      gsap.to(track, {
        x: () => -dist(),
        ease: 'none',
        scrollTrigger: { trigger: section, start: 'top top', end: () => `+=${dist()}`, pin: true, scrub: 0.8, invalidateOnRefresh: true },
      })
    })
    return () => mm.revert()
  }, [])

  return (
    <section ref={sectionRef} className="relative overflow-hidden">
      <div className="flex min-h-[100svh] flex-col justify-center py-24">
        <div ref={trackRef} className="flex flex-col md:flex-row md:w-max gap-16 md:gap-0 px-6 md:px-10">
          <div className="md:w-[38vw] md:pr-16 shrink-0 flex flex-col justify-end">
            <p className="flex items-center gap-3 text-[11px] tracking-[0.28em] uppercase text-black/50">
              <span className="h-px w-8 bg-black/40" />
              Chapter II — In their words
            </p>
            <h2 data-lines className="mt-6 font-migra text-[2.25rem] md:text-[3rem] lg:text-[3.5rem] leading-[1.06]">
              Real lawyers. <em>Real results.</em>
            </h2>
            <p className="mt-6 hidden md:block text-sm text-black/50">Keep scrolling →</p>
          </div>
          {quotes.map((q, i) => (
            <figure key={q.name} className="md:w-[44vw] shrink-0 md:px-12 md:border-l border-black/15 flex flex-col justify-between">
              <span className="font-migra text-[5rem] md:text-[7rem] leading-[0.7] text-[#d4a574]">&ldquo;</span>
              <blockquote className="mt-4 font-migra text-2xl md:text-[2rem] leading-[1.25] max-w-[24ch]">
                {q.lead}
                <span className="underline decoration-[#d4a574] decoration-2 underline-offset-[7px]">{q.mark}</span>
              </blockquote>
              <figcaption className="mt-10 flex items-center justify-between gap-4 border-t border-black/15 pt-5">
                <span>
                  <span className="block text-[15px]">{q.name}</span>
                  <span className="block text-[11px] tracking-[0.22em] uppercase text-black/50">{q.role}</span>
                </span>
                <span className="font-migra text-xl text-black/35 tabular-nums">0{i + 1} / 0{quotes.length}</span>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  )
}
