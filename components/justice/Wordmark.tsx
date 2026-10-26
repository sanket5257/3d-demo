'use client'

import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

/** Closing signature: the wordmark is sized to the full viewport width and its letters rise on scroll. */
export default function Wordmark({ text }: { text: string }) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const word = el.firstElementChild as HTMLElement
    const fit = () => {
      word.style.fontSize = '100px'
      word.style.fontSize = `${(100 * el.clientWidth) / word.scrollWidth}px`
      ScrollTrigger.refresh()
    }
    document.fonts.ready.then(fit)
    window.addEventListener('resize', fit)
    gsap.registerPlugin(ScrollTrigger)
    const ctx = gsap.context(() => {
      if (matchMedia('(prefers-reduced-motion: reduce)').matches) return
      gsap.fromTo(
        el.querySelectorAll('.wm-ch > span'),
        { yPercent: 100 },
        { yPercent: 0, ease: 'expo.out', duration: 1.4, stagger: 0.045, scrollTrigger: { trigger: el, start: 'top 92%', once: true } }
      )
    }, el)
    return () => {
      window.removeEventListener('resize', fit)
      ctx.revert()
    }
  }, [])

  return (
    <div ref={ref} className="w-full" aria-label={text}>
      <span className="inline-flex w-max whitespace-nowrap font-migra leading-[0.9] tracking-[-0.03em]" aria-hidden>
        {[...text].map((c, i) => (
          <span key={i} className="wm-ch inline-block pt-[0.12em] pb-[0.1em] [clip-path:inset(-1em_-1em_0_-1em)]">
            <span className="inline-block">{c === ' ' ? ' ' : c}</span>
          </span>
        ))}
      </span>
    </div>
  )
}
