'use client'

import { useEffect, useRef, useState } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { SplitText } from 'gsap/SplitText'
import Prologue from './Prologue'
import Film from './Film'
import Calculator from './Calculator'
import CountUp from './CountUp'
import Preloader from './Preloader'
import Cursor from './Cursor'
import Magnetic from './Magnetic'
import Marquee from './Marquee'
import Testimonials from './Testimonials'
import Wordmark from './Wordmark'

const FILMS = [
  {
    id: 'film-1',
    index: '01',
    length: 'In under 8 minutes',
    title: ['Everything you need to know', 'before using legal AI'],
    src: 'https://assets.cdn.filesafe.space/LkHaWgaA6rwOqWZtbQ9W/media/69f003e424d066ec62b849ba.mp4',
  },
  {
    id: 'film-2',
    index: '02',
    length: 'A 10-minute walkthrough with Tim, Head of Legal',
    title: ['See how 8 tools can save you', '2 hours a day'],
    src: 'https://assets.cdn.filesafe.space/LkHaWgaA6rwOqWZtbQ9W/media/69f003e48acd760bf8ea987b.mp4',
  },
]

const QUOTES = [
  {
    lead: "I'll be honest — I was the one in the office saying AI would never replace proper legal work. Six months later ",
    mark: "I'm the one telling everyone else they need to get on it.",
    name: 'Diane K., 54',
    role: 'Senior Partner, Pretoria',
  },
  {
    lead: "I went from dreading Sunday nights to actually having a weekend. Murphy's does ",
    mark: 'in 20 minutes what used to take me all of Monday morning.',
    name: 'Lara V., 26',
    role: 'Associate, Sandton',
  },
  {
    lead: "I was the junior everyone came to for research. Now I use Murphy's and ",
    mark: "I look like I've been practising for 20 years.",
    name: 'Ruan O., 28',
    role: 'Junior Associate, Cape Town',
  },
]

const WA_NUMBER = '27644771234'

function Arrow({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" className={`h-3.5 w-3.5 ${className}`} fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
      <path d="M4 12 12 4M5.5 4H12v6.5" />
    </svg>
  )
}

function Label({ children, dark = false }: { children: React.ReactNode; dark?: boolean }) {
  return (
    <p className={`font-montreal text-[11px] md:text-xs tracking-[0.28em] uppercase ${dark ? 'text-white/55' : 'text-black/55'}`}>
      {children}
    </p>
  )
}

export default function DemoExperience({ name, qualifyUrl }: { name: string; qualifyUrl: string }) {
  const rootRef = useRef<HTMLDivElement>(null)
  const progressRef = useRef<HTMLDivElement>(null)
  const [monthly, setMonthly] = useState<string | null>(null)
  const [stickyOn, setStickyOn] = useState(false)

  const waHref =
    'https://wa.me/' +
    WA_NUMBER +
    '?text=' +
    encodeURIComponent(
      `Hi Keegan${name ? `, it's ${name}` : ''} — I'd like to book a demo for my team. Could you tell me the procedure, please?\n✍️ [ anything you'd like me to know ] 👉\n\n(sent from the Company Demo button)`
    )

  // heading line reveals + scroll progress hairline
  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger, SplitText)
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const ctx = gsap.context(() => {
      if (!reduce) {
        // autoSplit re-measures lines when the web font arrives / on resize, so masks never clip glyphs
        gsap.utils.toArray<HTMLElement>('[data-lines]').forEach((el) => {
          SplitText.create(el, {
            type: 'lines',
            mask: 'lines',
            linesClass: 'demo-line',
            autoSplit: true,
            onSplit: (self) =>
              gsap.from(self.lines, {
                yPercent: 110,
                duration: 1.1,
                ease: 'expo.out',
                stagger: 0.09,
                scrollTrigger: { trigger: el, start: 'top 88%', once: true },
              }),
          })
        })
        gsap.utils.toArray<HTMLElement>('[data-fade]').forEach((el) => {
          gsap.from(el, {
            opacity: 0,
            y: 24,
            duration: 1,
            ease: 'power3.out',
            scrollTrigger: { trigger: el, start: 'top 90%' },
          })
        })
      }
      ScrollTrigger.create({
        start: 0,
        end: 'max',
        onUpdate: (self) => {
          if (progressRef.current) progressRef.current.style.transform = `scaleX(${self.progress.toFixed(4)})`
        },
      })
    }, rootRef)
    // trigger positions depend on web-font metrics and the pinned prologue: re-measure once both settle
    const refresh = () => ScrollTrigger.refresh()
    document.fonts?.ready.then(refresh)
    window.addEventListener('load', refresh)
    const late = setTimeout(refresh, 2500)
    return () => {
      ctx.revert()
      window.removeEventListener('load', refresh)
      clearTimeout(late)
    }
  }, [])

  // sticky CTA: after the prologue, hidden whenever a full-size qualify button is on screen
  useEffect(() => {
    const prologue = document.getElementById('top')
    const ctas = document.querySelectorAll('[data-qualify-cta]')
    let pastPrologue = false
    let visibleCtas = 0
    const update = () => setStickyOn(pastPrologue && visibleCtas <= 0)
    const io1 = new IntersectionObserver(([e]) => {
      pastPrologue = !e.isIntersecting && e.boundingClientRect.top < 0
      update()
    })
    if (prologue) io1.observe(prologue)
    const seen = new WeakSet<Element>()
    const io2 = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting && !seen.has(e.target)) {
            seen.add(e.target)
            visibleCtas++
          } else if (!e.isIntersecting && seen.has(e.target)) {
            seen.delete(e.target)
            visibleCtas--
          }
        })
        update()
      },
      { threshold: 0.25 }
    )
    ctas.forEach((c) => io2.observe(c))
    return () => {
      io1.disconnect()
      io2.disconnect()
    }
  }, [])


  const contacts = [
    { k: 'Quick chat', t: 'Talk to our team', d: '15-minute call. Ask anything, get clear answers.', c: 'Book now', h: 'https://calendly.com/keegan-hepburn/new-meeting' },
    { k: 'Data & security', t: 'Security briefing', d: 'Meet our Head of Security. See how your data is protected.', c: 'Book briefing', h: 'https://calendly.com/keegan-hepburn/security-briefing-with-brandon' },
    { k: 'For your firm', t: 'Company demo', d: 'Message Keegan directly to set up a demo for your firm.', c: 'Message Keegan', h: waHref },
  ]

  return (
    <div ref={rootRef} className="demo-root font-montreal antialiased">
      <Preloader />
      <Cursor />

      {/* top bar */}
      <div ref={progressRef} className="fixed inset-x-0 top-0 z-[51] h-px origin-left bg-[#d4a574]" style={{ transform: 'scaleX(0)' }} />
      <div className="fixed inset-x-0 top-0 z-50 pointer-events-none mix-blend-difference">
        <div className="flex items-center justify-between px-6 md:px-12 py-5 text-white">
          <a href="#top" className="pointer-events-auto font-migra text-xl md:text-2xl tracking-tight">
            Murphy&rsquo;s Law
          </a>
          <p className="font-montreal text-[11px] tracking-[0.28em] uppercase">
            Private demo{name ? ` · ${name}` : ''}
          </p>
        </div>
      </div>

      <Prologue name={name} />

      {/* CHAPTER I — FILMS (the dark gallery continues from the prologue) */}
      <section id="films" className="relative bg-[#0b0b0b] text-white">
        <div className="mx-auto max-w-[1440px] px-6 md:px-10 pt-28 md:pt-40 pb-6">
          <div className="grid grid-cols-12 gap-6 items-end">
            <div className="col-span-12 md:col-span-8">
              <Label dark>Chapter I — The films</Label>
              <h2 data-lines className="font-migra text-[2.25rem] md:text-[3rem] lg:text-[3.5rem] leading-[1.06] mt-6">
                Two short films. <em>Nineteen minutes.</em>
              </h2>
            </div>
            <p data-fade className="col-span-12 md:col-span-3 md:col-start-10 text-base text-white/55 leading-relaxed">
              Press play on the first one. Sound on, if you can.
            </p>
          </div>
        </div>
        {FILMS.map((f) => (
          <Film key={f.id} {...f} />
        ))}

        <Marquee
          className="mt-16 md:mt-24 border-y border-white/10 py-6 md:py-8 font-migra text-[2.5rem] md:text-[5vw] leading-none text-white/90"
          items={['157 South African law firms', '3,200 daily users', 'One billable hour saved, per lawyer, per day', 'Most save two']}
        />
        <div className="h-24 md:h-40" />
      </section>

      {/* stone sheet slides over the dark gallery */}
      <div className="relative z-10 -mt-10 rounded-t-[28px] md:rounded-t-[44px] bg-[#f4f2ee] text-black">
        {/* QUALIFY */}
        <section id="qualify" className="mx-auto max-w-[1440px] px-6 md:px-10 pt-24 md:pt-36 pb-10">
          <div className="grid grid-cols-12 gap-y-14 gap-x-6 items-end">
            <div className="col-span-12 md:col-span-6">
              <Label>An offer, for you</Label>
              <h2 data-lines className="mt-6 font-migra text-[2.25rem] md:text-[3rem] lg:text-[3.5rem] leading-[1.06]">
                Try Murphy&rsquo;s <em>free</em> for one month.
              </h2>
              <div className="mt-10 flex flex-wrap items-center gap-6" data-fade>
                <Magnetic>
                  <a
                    href={qualifyUrl}
                    data-qualify-cta
                    className="inline-flex items-center gap-3 rounded-full bg-black px-8 py-4 text-sm text-white transition-colors duration-300 hover:bg-[#d4a574] hover:text-black"
                  >
                    See if I qualify <Arrow />
                  </a>
                </Magnetic>
                <span className="text-sm text-black/55">Takes less than 30 seconds.</span>
              </div>
            </div>
            <div className="col-span-6 md:col-span-3 md:col-start-8 border-t border-black/15 pt-5">
              <p className="font-migra text-5xl md:text-[4.5rem] leading-none">
                <CountUp to={157} />
              </p>
              <p className="mt-4 text-[11px] tracking-[0.28em] uppercase text-black/55">SA law firms</p>
            </div>
            <div className="col-span-6 md:col-span-2 border-t border-black/15 pt-5">
              <p className="font-migra text-5xl md:text-[4.5rem] leading-none">
                <CountUp to={3200} />
              </p>
              <p className="mt-4 text-[11px] tracking-[0.28em] uppercase text-black/55">Daily users</p>
            </div>
          </div>
        </section>

        <Testimonials quotes={QUOTES} />
      </div>

      <Calculator onReveal={setMonthly} />

      {/* FINAL CTA + CONTACT on a second stone sheet */}
      <div className="relative z-10 -mt-10 rounded-t-[28px] md:rounded-t-[44px] bg-[#f4f2ee] text-black">
        <section className="mx-auto max-w-[1440px] px-6 md:px-10 pt-28 md:pt-44 pb-24 md:pb-36 text-center">
          <Label>Your move</Label>
          <h2 data-lines className="mx-auto mt-6 max-w-4xl font-migra text-[2.5rem] md:text-[3.5rem] lg:text-[4.25rem] leading-[1.04]">
            Try Murphy&rsquo;s out for yourself — <em>a month, free.</em>
          </h2>
          <p data-fade className="mx-auto mt-6 max-w-md text-base text-black/60">
            See if you qualify. Five quick questions, no card needed.
          </p>
          <div data-fade className="mt-12 flex flex-col items-center gap-5">
            <Magnetic>
              <a
                href={qualifyUrl}
                data-qualify-cta
                className="inline-flex items-center gap-3 rounded-full bg-black px-10 py-5 text-sm text-white transition-colors duration-300 hover:bg-[#d4a574] hover:text-black"
              >
                Start my free month <Arrow />
              </a>
            </Magnetic>
            <span className="text-[11px] tracking-[0.28em] uppercase text-black/45">It only takes 30 seconds</span>
            <span className="mt-6 inline-flex items-center gap-3 text-sm text-black/70">
              <span className="relative flex h-2 w-2">
                <span className="absolute inset-0 animate-ping rounded-full bg-[#d4a574] opacity-60" />
                <span className="relative h-2 w-2 rounded-full bg-[#d4a574]" />
              </span>
              Only 7 licenses available this month.
            </span>
          </div>
        </section>

        <section className="mx-auto max-w-[1440px] px-6 md:px-10 pb-28 md:pb-40">
          <div className="grid grid-cols-12 gap-6">
            <div className="col-span-12 md:col-span-5">
              <Label>Still have questions?</Label>
              <h2 data-lines className="font-migra text-[2.25rem] md:text-[3rem] lg:text-[3.5rem] leading-[1.06] mt-6">
                Talk to a <em>real human.</em>
              </h2>
            </div>
            <div className="col-span-12 md:col-span-7 mt-10 md:mt-0">
              {contacts.map((r, i) => (
                <a
                  key={r.t}
                  href={r.h}
                  target="_blank"
                  rel="noopener noreferrer"
                  data-fade
                  data-cursor="Open"
                  className="group relative grid grid-cols-12 items-baseline gap-4 overflow-hidden border-t border-black/15 py-8 last:border-b"
                >
                  {/* ink fill wipes up on hover */}
                  <span className="absolute inset-0 origin-bottom scale-y-0 bg-black transition-transform duration-500 ease-[cubic-bezier(0.76,0,0.24,1)] group-hover:scale-y-100" />
                  <span className="relative col-span-2 md:col-span-1 font-migra text-lg text-black/35 transition-colors duration-500 group-hover:text-white/40 md:pl-4">
                    0{i + 1}
                  </span>
                  <span className="relative col-span-10 md:col-span-6">
                    <span className="block font-migra text-2xl md:text-[1.9rem] transition-colors duration-500 group-hover:text-white">{r.t}</span>
                    <span className="mt-2 block text-sm text-black/55 transition-colors duration-500 group-hover:text-white/60">{r.d}</span>
                  </span>
                  <span className="relative col-span-12 md:col-span-5 inline-flex items-center gap-2 md:justify-end whitespace-nowrap text-sm transition-colors duration-500 group-hover:text-white md:pr-4">
                    <span className="mr-auto md:mr-4 text-[11px] tracking-[0.28em] uppercase text-black/45 group-hover:text-white/50">{r.k}</span>
                    {r.c} <Arrow className="transition-transform duration-500 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                  </span>
                </a>
              ))}
              <div className="mt-12" data-fade>
                <Magnetic>
                  <a
                    href={qualifyUrl}
                    data-qualify-cta
                    className="inline-flex items-center gap-3 rounded-full border border-black/25 px-8 py-4 text-sm transition-colors duration-300 hover:bg-black hover:text-white"
                  >
                    I&rsquo;d like to see more <Arrow />
                  </a>
                </Magnetic>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* signature footer */}
      <footer className="relative -mt-10 overflow-hidden bg-[#0b0b0b] px-6 md:px-10 pt-24 md:pt-32 pb-8 text-white">
        <div className="mx-auto max-w-[1600px]">
          <div className="flex flex-col md:flex-row justify-between gap-6 pb-12 md:pb-20 text-sm text-white/55">
            <p className="max-w-sm leading-relaxed">Legal intelligence for South African law firms. Made for {name || 'you'}.</p>
            <a href="#top" className="text-[11px] tracking-[0.28em] uppercase hover:text-white">
              Back to the statue ↑
            </a>
          </div>
          <Wordmark text="Murphy’s Law" />
          <div className="mt-6 flex justify-between text-xs text-white/40">
            <span>&copy; {new Date().getFullYear()} Murphy&rsquo;s Law AI</span>
            <span>Concept demo</span>
          </div>
        </div>
      </footer>

      {/* sticky CTA */}
      <div
        className={`fixed bottom-5 left-1/2 z-40 -translate-x-1/2 transition-all duration-500 ${
          stickyOn ? 'opacity-100 translate-y-0' : 'pointer-events-none opacity-0 translate-y-4'
        }`}
      >
        <a
          href={qualifyUrl}
          className="flex items-center gap-4 rounded-full bg-black/85 py-2 pl-6 pr-2 text-sm text-white shadow-[0_10px_40px_rgba(0,0,0,0.25)] ring-1 ring-white/10 backdrop-blur-md"
        >
          <span className="whitespace-nowrap">{monthly ? `Losing ${monthly} a month?` : 'One month, free.'}</span>
          <span className="inline-flex items-center gap-2 whitespace-nowrap rounded-full bg-white px-5 py-2.5 text-black">
            See if you qualify <Arrow />
          </span>
        </a>
      </div>
    </div>
  )
}
