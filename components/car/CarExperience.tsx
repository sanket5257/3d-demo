'use client'

import { useEffect } from 'react'

const SWATCHES = [
  { c: '#b3121c', m: 0.35, r: 0.32, name: 'Guards Red' },
  { c: '#a7abad', m: 0.9, r: 0.28, name: 'GT Silver' },
  { c: '#d6d4cc', m: 0.05, r: 0.3, name: 'Chalk' },
  { c: '#101112', m: 0.6, r: 0.25, name: 'Jet Black' },
  { c: '#f0c419', m: 0.1, r: 0.3, name: 'Racing Yellow' },
  { c: '#1d2f5e', m: 0.75, r: 0.28, name: 'Gentian Blue' },
  { c: '#2c4a2e', m: 0.7, r: 0.3, name: 'Python Green' },
]

export default function CarExperience() {
  useEffect(() => {
    let dispose: (() => void) | undefined
    let cancelled = false
    import('./carStage').then(({ initCar }) => {
      if (!cancelled) dispose = initCar()
    })
    return () => {
      cancelled = true
      dispose?.()
    }
  }, [])

  return (
    <>
      <div className="loader" aria-hidden="true">
        <span className="loader-count">0</span>
        <span className="loader-bar">
          <i />
        </span>
      </div>

      <header className="nav">
        <a className="brand" href="#top">
          Neunelf
        </a>
        <nav className="views" aria-label="Walk around the car">
          <a href="#front">Front</a>
          <a href="#profile">Profile</a>
          <a href="#rear">Rear</a>
          <a href="#wheel">Wheel</a>
          <a href="#night">Night</a>
          <a href="#film">Film</a>
          <a href="#paint">Paint</a>
        </nav>
        <a className="nav-cta" href="#reserve">
          Reserve a build
        </a>
      </header>

      {/* giant wordmark sits behind the car */}
      <div className="hero-word" aria-hidden="true">
        <span>NEUNELF</span>
      </div>

      <canvas className="stage" aria-label="3D model of the Neunelf concept car" />
      <canvas className="flow" aria-hidden="true" />

      {/* dimension overlay, positioned from the live 3D model */}
      <div className="dims" aria-hidden="true">
        <div className="dim dim-length">
          <b />
          <span>4 519 mm</span>
        </div>
        <div className="dim dim-wheelbase">
          <b />
          <span>2 450 mm wheelbase</span>
        </div>
        <div className="dim dim-height">
          <b />
          <span>1 298 mm</span>
        </div>
      </div>

      <main id="top">
        <section className="panel hero" id="front" data-shot="hero">
          <p className="hero-sub">A rear-engined two-door, drawn in one line from windscreen to tail.</p>
          <p className="hero-hint">Scroll to walk around it</p>
        </section>

        <section className="panel profile" id="profile" data-shot="profile">
          <div className="copy">
            <h2>One line, front to back</h2>
            <p>
              The roof falls without a break from the top of the windscreen to the tail. The air follows the same line and
              leaves the car cleanly at the ducktail.
            </p>
          </div>
        </section>

        <section className="panel rear" id="rear" data-shot="rear">
          <div className="copy">
            <h2>A light that runs the full width</h2>
            <p>One LED strip spans the tail, set into a black band under the ducktail. Keep scrolling and it comes up to full brightness.</p>
          </div>
        </section>

        <section className="panel wheel" id="wheel" data-shot="wheel">
          <div className="copy">
            <h2>Staggered wheels, five twin spokes</h2>
            <p>Red calipers sit behind them. The wheel turns as you scroll.</p>
            <dl className="spec">
              <div>
                <dt>Front rim</dt>
                <dd>20 in</dd>
              </div>
              <div>
                <dt>Rear rim</dt>
                <dd>21 in</dd>
              </div>
              <div>
                <dt>Front tyre</dt>
                <dd>245/35</dd>
              </div>
              <div>
                <dt>Rear tyre</dt>
                <dd>305/30</dd>
              </div>
            </dl>
          </div>
        </section>

        <section className="panel night" id="night" data-shot="night">
          <div className="copy">
            <h2>After dark</h2>
            <p>Two round headlamps throw their light down the road. One strip glows at the back. Nothing else needs to light up.</p>
          </div>
        </section>

        <section className="film" id="film" data-shot="film">
          <div className="film-sticky">
            <div className="film-frame">
              <video
                src="/car/porsche911_style_0001-0240.mp4"
                muted
                loop
                playsInline
                preload="metadata"
                aria-label="Eight-second orbit around the car"
              />
            </div>
            <p className="film-caption">Eight seconds, one full turn. Rendered in Blender.</p>
          </div>
        </section>

        <section className="colour" id="paint" data-shot="colour">
          <div className="colour-sticky">
            <div className="copy">
              <h2>Choose the paint</h2>
              <p>Seven colours from the classic palette. Pick one and the car repaints.</p>
            </div>
            <div className="swatches" role="group" aria-label="Paint colour">
              {SWATCHES.map((s, i) => (
                <button
                  key={s.name}
                  className="swatch"
                  data-color={s.c}
                  data-metal={s.m}
                  data-rough={s.r}
                  aria-pressed={i === 0}
                >
                  <i style={{ ['--c' as string]: s.c }} />
                  <span>{s.name}</span>
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="reserve" id="reserve" data-shot="away">
          <div className="reserve-sticky">
            <h2 className="reserve-title">
              <span className="line">
                <span>Yours, in</span>
              </span>
              <span className="line">
                <span>any colour</span>
              </span>
            </h2>
            <a className="reserve-cta" href="mailto:hello@example.com?subject=Neunelf%20build">
              Reserve a build
            </a>
            <footer className="foot">
              <p>Neunelf is a concept study. It is not affiliated with or endorsed by Porsche AG.</p>
            </footer>
          </div>
        </section>
      </main>
    </>
  )
}
