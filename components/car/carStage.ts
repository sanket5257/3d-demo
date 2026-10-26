/**
 * Neunelf scroll experience (ported from the standalone site): a Blender-built two-door shown in a
 * wind-tunnel studio, with scroll-driven camera shots, live dimension lines, airflow streamlines,
 * a night scene, the rendered film and a live paint picker. Returns a dispose function.
 */
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Lenis from 'lenis'

type Shot = {
  fov: number; dims: number; flow: number; tail: number; head: number; env: number; alpha: number
  bg: string; ink: string; carX: number; carRot: number
  px: number; py: number; pz: number; tx: number; ty: number; tz: number
  r: number; el: number; az: number
}

export function initCar(): () => void {
  gsap.registerPlugin(ScrollTrigger)
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches
  document.body.classList.add('is-loading')
  const listeners: [EventTarget, string, EventListener][] = []
  const on = (t: EventTarget, ev: string, fn: EventListener) => {
    t.addEventListener(ev, fn)
    listeners.push([t, ev, fn])
  }
  const ctx = gsap.context(() => {})
  let disposed = false

  /* ------------------------------------------------------------------ *
   * Camera shots. Model coordinates: +X is the nose, Y is up, +Z is the
   * car's right-hand side. Every scroll section blends to one of these.
   * ------------------------------------------------------------------ */
  const TUNNEL = 'rgb(213, 215, 214)'
  const NIGHT = 'rgb(21, 23, 26)'
  const GRAPHITE = 'rgb(28, 31, 33)'
  const CHALK = 'rgb(237, 238, 236)'

  const base = { fov: 30, dims: 0, flow: 0, tail: 0.15, head: 0.1, env: 1, alpha: 1, bg: TUNNEL, ink: GRAPHITE, carX: 0, carRot: 0, r: 0, el: 0, az: 0 }
  const SHOTS: Record<string, Shot> = {
    hero: { ...base, px: 6.3, py: 1.3, pz: 7.1, tx: 0.15, ty: 0.32, tz: 0 },
    profile: { ...base, px: -1.0, py: 0.85, pz: 11, tx: -1.0, ty: 0.15, tz: 0, dims: 1, flow: 1 },
    rear: { ...base, px: -7.0, py: 1.5, pz: 5.4, tx: 0.2, ty: 0.3, tz: 0.7, tail: 1 },
    wheel: { ...base, px: 2.8, py: 0.6, pz: -3.4, tx: 1.75, ty: 0.42, tz: -0.5, fov: 32 },
    night: { ...base, px: 6.2, py: 0.5, pz: -5.0, tx: -0.1, ty: 0.5, tz: 0.5, tail: 1, head: 1, env: 0.22, bg: NIGHT, ink: CHALK },
    film: { ...base, px: 6.2, py: 0.5, pz: -5.0, tx: -0.1, ty: 0.5, tz: 0.5, tail: 1, head: 1, env: 0.22, bg: NIGHT, ink: CHALK, alpha: 0 },
    colour: { ...base, px: 5.4, py: 2.1, pz: 6.6, tx: -0.35, ty: 0.75, tz: 0.2, carRot: 0.55 },
    away: { ...base, px: 0, py: 0.9, pz: 13.5, tx: 0, ty: -0.75, tz: 0, tail: 1 },
  }
  // Store each camera as an orbit around its target (distance, azimuth, elevation)
  // so transitions swing around the car instead of cutting straight through it.
  const ORDER = ['hero', 'profile', 'rear', 'wheel', 'night', 'film', 'colour', 'away']
  let prevAz: number | null = null
  for (const key of ORDER) {
    const s = SHOTS[key]
    const dx = s.px - s.tx, dy = s.py - s.ty, dz = s.pz - s.tz
    s.r = Math.hypot(dx, dy, dz)
    s.el = Math.asin(dy / s.r)
    let az = Math.atan2(dz, dx)
    if (prevAz !== null) while (az - prevAz > Math.PI) az -= 2 * Math.PI
    if (prevAz !== null) while (az - prevAz < -Math.PI) az += 2 * Math.PI
    s.az = prevAz = az
  }
  const shot: Shot = { ...SHOTS.hero }

  /* ------------------------------ renderer ------------------------------ */
  const canvas = document.querySelector<HTMLCanvasElement>('.stage')!
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true })
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
  renderer.setClearColor(0x000000, 0)
  renderer.toneMapping = THREE.NeutralToneMapping
  renderer.toneMappingExposure = 1.0

  const scene = new THREE.Scene()
  const pmrem = new THREE.PMREMGenerator(renderer)
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture

  const camera = new THREE.PerspectiveCamera(30, innerWidth / innerHeight, 0.1, 100)
  const target = new THREE.Vector3()

  // soft contact shadow drawn once into a canvas
  const shadowTex = (() => {
    const c = document.createElement('canvas'); c.width = 256; c.height = 128
    const g = c.getContext('2d')!
    g.scale(1, 0.5) // elliptical falloff that fades out before the canvas edge
    const r = g.createRadialGradient(128, 128, 4, 128, 128, 124)
    r.addColorStop(0, 'rgba(0,0,0,0.7)'); r.addColorStop(0.5, 'rgba(0,0,0,0.32)'); r.addColorStop(1, 'rgba(0,0,0,0)')
    g.fillStyle = r; g.fillRect(0, 0, 256, 256)
    return new THREE.CanvasTexture(c)
  })()
  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(5.6, 2.5),
    new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false })
  )
  shadow.rotation.x = -Math.PI / 2; shadow.position.y = 0.002

  const carRig = new THREE.Group() // drives & turns as one
  carRig.add(shadow)
  scene.add(carRig)

  // headlamp halos, only visible when the lamps are on
  const glowTex = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 128
    const g = c.getContext('2d')!
    const r = g.createRadialGradient(64, 64, 0, 64, 64, 64)
    r.addColorStop(0, 'rgba(225,235,255,1)'); r.addColorStop(0.2, 'rgba(190,210,255,0.45)'); r.addColorStop(1, 'rgba(190,210,255,0)')
    g.fillStyle = r; g.fillRect(0, 0, 128, 128)
    return new THREE.CanvasTexture(c)
  })()
  const halos = [-0.639, 0.639].map((z) => {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0 }))
    s.position.set(2.1, 0.66, z); s.scale.setScalar(0.6)
    carRig.add(s); return s
  })

  // headlamp beams thrown onto the floor
  const beamTex = (() => {
    const c = document.createElement('canvas'); c.width = 512; c.height = 256
    const g = c.getContext('2d')!
    g.filter = 'blur(10px)'
    const lg = g.createLinearGradient(0, 0, 512, 0)
    lg.addColorStop(0, 'rgba(215,228,255,0.9)'); lg.addColorStop(0.45, 'rgba(200,215,255,0.35)'); lg.addColorStop(1, 'rgba(200,215,255,0)')
    g.fillStyle = lg
    g.beginPath(); g.moveTo(14, 118); g.lineTo(500, 30); g.lineTo(500, 226); g.lineTo(14, 138); g.closePath(); g.fill()
    return new THREE.CanvasTexture(c)
  })()
  const beams = [-0.58, 0.58].map((z) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 2.6),
      new THREE.MeshBasicMaterial({ map: beamTex, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, opacity: 0 }))
    m.rotation.x = -Math.PI / 2; m.position.set(2.0 + 2.3, 0.004, z)
    carRig.add(m); return m
  })

  let mixer: THREE.AnimationMixer | null = null
  let wheelClip: THREE.AnimationClip | undefined
  const mats: Record<string, THREE.MeshStandardMaterial> = {}
  let wheelTurns = 0
  const TURNS_PER_CLIP = 10, TYRE_R = 0.345

  function resize() {
    renderer.setSize(innerWidth, innerHeight, false)
    camera.aspect = innerWidth / innerHeight
    camera.updateProjectionMatrix()
  }
  on(window, 'resize', resize); resize()

  /* ------------------------------ hero wordmark ------------------------------ */
  const word = document.querySelector<HTMLSpanElement>('.hero-word > span')!
  word.innerHTML = [...(word.textContent || '')].map((c) => `<span class="ch"><i>${c}</i></span>`).join('')
  function fitWord() {
    word.style.fontSize = '100px'
    word.style.fontSize = `${(100 * (innerWidth * 0.93)) / word.scrollWidth}px`
  }
  document.fonts.load('800 100px Panchang').then(fitWord)
  document.fonts.ready.then(fitWord)
  on(window, 'resize', fitWord)

  /* ------------------------------ load model ------------------------------ */
  const countEl = document.querySelector<HTMLElement>('.loader-count')!
  const barEl = document.querySelector<HTMLElement>('.loader-bar i')!
  const progress = { v: 0 }
  function showProgress(p: number) {
    gsap.to(progress, { v: p, duration: 0.4, overwrite: true, onUpdate() {
      countEl.textContent = String(Math.round(progress.v))
      barEl.style.transform = `scaleX(${progress.v / 100})`
    } })
  }

  const draco = new DRACOLoader().setDecoderPath('/draco/')
  new GLTFLoader().setDRACOLoader(draco).load('/car/porsche911_style.glb', (gltf) => {
    if (disposed) return
    const car = gltf.scene
    car.traverse((o) => {
      const mesh = o as THREE.Mesh
      if (!mesh.isMesh) return
      const m = mesh.material as THREE.MeshStandardMaterial
      mats[m.name] = m
      m.envMapIntensity = 1.0
    })
    if (mats.Paint_GuardsRed) { mats.Paint_GuardsRed.color.set('#b3121c'); mats.Paint_GuardsRed.envMapIntensity = 1.25 }
    if (mats.Glass_Tinted) { mats.Glass_Tinted.envMapIntensity = 1.6; mats.Glass_Tinted.roughness = 0.04 }
    carRig.add(car)
    buildStreamlines(car)

    mixer = new THREE.AnimationMixer(car)
    wheelClip = gltf.animations[0]
    if (wheelClip) mixer.clipAction(wheelClip).play()

    showProgress(100)
    setTimeout(() => !disposed && intro(), 450)
  }, (e) => { if (e.total) showProgress((e.loaded / e.total) * 96) },
  (err) => { countEl.textContent = '!'; console.error('Model failed to load', err) })

  /* ------------------------------ smooth scroll ------------------------------ */
  let lenis: Lenis | null = null
  let scrollVel = 0
  const lenisTick = (t: number) => lenis?.raf(t * 1000)
  if (!reduceMotion) {
    lenis = new Lenis({ lerp: 0.085 })
    lenis.on('scroll', (e: Lenis) => { scrollVel = e.velocity; ScrollTrigger.update() })
    gsap.ticker.add(lenisTick)
    gsap.ticker.lagSmoothing(0)
    lenis.stop()
  }

  /* ------------------------------ intro: the one orchestrated moment ------------------------------ */
  function intro() {
    ctx.add(() => {
      const tl = gsap.timeline({ onComplete() { document.body.classList.remove('is-loading'); lenis?.start() } })
      tl.to('.loader', { yPercent: -100, duration: reduceMotion ? 0.01 : 1.1, ease: 'expo.inOut' })
        .from('.hero-word .ch > i', { yPercent: 105, duration: 1.2, ease: 'expo.out', stagger: 0.06 }, '-=0.45')
        .from(shot, { r: shot.r * 1.6, az: shot.az + 0.5, el: shot.el + 0.12, duration: 2.0, ease: 'expo.out' }, '<')
        .from(carRig.position, { x: -2.2, duration: 2.0, ease: 'expo.out' }, '<')
        .from('.nav, .hero-sub, .hero-hint', { opacity: 0, duration: 0.8 }, '-=1.0')
      if (reduceMotion) tl.progress(1)
      buildScroll()
    })
  }

  /* ------------------------------ scroll choreography ------------------------------ */
  function buildScroll() {
    const sections = [...document.querySelectorAll<HTMLElement>('[data-shot]')]
    sections.forEach((sec, i) => {
      if (i === 0) return
      const from = SHOTS[sections[i - 1].dataset.shot!]
      const to = SHOTS[sec.dataset.shot!]
      gsap.fromTo(shot, { ...from }, {
        ...to, ease: 'none', immediateRender: false,
        scrollTrigger: {
          trigger: sec, start: sec.dataset.start || 'top bottom', end: sec.dataset.end || 'top 15%',
          scrub: reduceMotion ? true : 1.2,
        },
      })
    })

    // each block of copy clears out before the next camera move reaches it
    document.querySelectorAll<HTMLElement>('.panel > .copy').forEach((copy) => {
      gsap.fromTo(copy, { opacity: 1 }, {
        opacity: 0, ease: 'none', immediateRender: false,
        scrollTrigger: { trigger: copy.parentElement, start: 'bottom 98%', end: 'bottom 62%', scrub: true },
      })
    })

    // the tail strip keeps brightening while the rear section is on screen
    gsap.fromTo(shot, { tail: 0.15 }, {
      tail: 1, ease: 'none', immediateRender: false,
      scrollTrigger: { trigger: '.rear', start: 'top 60%', end: 'bottom 60%', scrub: true },
    })

    // film: frame opens to full bleed, then the canvas comes back
    const video = document.querySelector<HTMLVideoElement>('.film video')!
    gsap.fromTo('.film-frame', { clipPath: 'inset(32% 30% 32% 30% round 6px)' }, {
      clipPath: 'inset(0% 0% 0% 0% round 0px)', ease: 'none',
      scrollTrigger: { trigger: '.film', start: 'top top', end: '45% top', scrub: true },
    })
    ScrollTrigger.create({
      trigger: '.film', start: 'top bottom', end: 'bottom top',
      onToggle: (s) => (s.isActive ? video.play().catch(() => {}) : video.pause()),
    })

    // paint controls leave before the car drives off
    gsap.fromTo('.colour-sticky', { opacity: 1 }, {
      opacity: 0, ease: 'none', immediateRender: false,
      scrollTrigger: { trigger: '.colour', start: 'bottom 102%', end: 'bottom 78%', scrub: true },
    })

    // closing headline rises out of its line masks while the camera settles
    gsap.fromTo('.reserve-title .line > span', { yPercent: 105 }, {
      yPercent: 0, ease: 'none', stagger: 0.15,
      scrollTrigger: { trigger: '.reserve', start: 'top 70%', end: 'top 5%', scrub: reduceMotion ? true : 0.8 },
    })

    // then the car pulls away behind it, gently at first
    gsap.fromTo(shot, { carX: 0 }, {
      carX: 15, ease: 'power2.in', immediateRender: false,
      scrollTrigger: { trigger: '.reserve', start: 'top top', end: 'bottom bottom', scrub: reduceMotion ? true : 1 },
    })

    // walk-around index: highlight the current view, jump on click
    const links = [...document.querySelectorAll<HTMLAnchorElement>('.views a')]
    links.forEach((link) => {
      const sec = document.querySelector<HTMLElement>(link.getAttribute('href')!)!
      ScrollTrigger.create({
        trigger: sec, start: 'top 55%', end: 'bottom 55%',
        onToggle: (s) => {
          if (s.isActive) links.forEach((a) => a.setAttribute('aria-current', String(a === link)))
          else if (link.getAttribute('aria-current') === 'true') link.setAttribute('aria-current', 'false')
        },
      })
      on(link, 'click', ((e: Event) => {
        if (!lenis) return
        e.preventDefault()
        lenis.scrollTo(sec, { duration: 2.2, easing: (t: number) => 1 - Math.pow(1 - t, 4) })
      }) as EventListener)
    })

    // hero wordmark drifts up slower than the page
    gsap.to('.hero-word > span', {
      yPercent: -40, opacity: 0, ease: 'none',
      scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true },
    })
  }

  /* ------------------------------ paint ------------------------------ */
  const swatches = [...document.querySelectorAll<HTMLButtonElement>('.swatch')]
  swatches.forEach((btn) => on(btn, 'click', () => {
    swatches.forEach((b) => b.setAttribute('aria-pressed', String(b === btn)))
    const paint = mats.Paint_GuardsRed; if (!paint) return
    const c = new THREE.Color(btn.dataset.color)
    const d = reduceMotion ? 0 : 1.1
    gsap.to(paint.color, { r: c.r, g: c.g, b: c.b, duration: d, ease: 'power2.inOut' })
    gsap.to(paint, { metalness: +btn.dataset.metal!, roughness: +btn.dataset.rough!, duration: d })
    wheelTurns += 0.5 // a small nudge so the car reacts
  }))

  /* ------------------------------ dimension overlay ------------------------------ */
  const dims = {
    length: document.querySelector<HTMLElement>('.dim-length')!,
    wheelbase: document.querySelector<HTMLElement>('.dim-wheelbase')!,
    height: document.querySelector<HTMLElement>('.dim-height')!,
  }
  const v = new THREE.Vector3()
  function toScreen(x: number, y: number, z: number): [number, number] {
    v.set(x, y, z).project(camera)
    return [((v.x + 1) / 2) * innerWidth, ((1 - v.y) / 2) * innerHeight]
  }
  function placeH(el: HTMLElement, a: [number, number], b: [number, number], k: number) {
    el.style.opacity = String(k)
    el.style.transform = `translate(${a[0]}px, ${a[1]}px)`
    ;(el.firstElementChild as HTMLElement).style.width = `${(b[0] - a[0]) * k}px`
    el.style.width = `${b[0] - a[0]}px`
  }
  function updateDims() {
    const k = Math.max(0, Math.min(1, (shot.dims - 0.55) / 0.45))
    if (k <= 0) { for (const el of Object.values(dims)) el.style.opacity = '0'; return }
    placeH(dims.length, toScreen(-2.26, -0.22, 0), toScreen(2.26, -0.22, 0), k)
    placeH(dims.wheelbase, toScreen(-1.2105, -0.5, 0), toScreen(1.2395, -0.5, 0), k)
    const top = toScreen(2.6, 1.29, 0), bot = toScreen(2.6, 0, 0)
    dims.height.style.opacity = String(k)
    dims.height.style.transform = `translate(${top[0]}px, ${top[1]}px)`
    ;(dims.height.firstElementChild as HTMLElement).style.height = `${(bot[1] - top[1]) * k}px`
    dims.height.style.height = `${bot[1] - top[1]}px`
  }

  /* ------------------------------ wind-tunnel airflow ------------------------------ *
   * Streamlines are traced from the real model: a ray is cast down the centre line
   * every 4 cm to find the roofline, and each line rides over it at its own height.  */
  const flowCanvas = document.querySelector<HTMLCanvasElement>('.flow')!
  const fctx = flowCanvas.getContext('2d')!
  const DPR = Math.min(devicePixelRatio, 2)
  let streamlines: [number, number][][] = []
  function buildStreamlines(car: THREE.Object3D) {
    car.updateMatrixWorld(true)
    const ray = new THREE.Raycaster(), down = new THREE.Vector3(0, -1, 0), o = new THREE.Vector3()
    const xs: number[] = []
    for (let x = -6.5; x <= 6.5001; x += 0.04) xs.push(x)
    const surf = xs.map((x) => {
      o.set(x, 5, 0); ray.set(o, down)
      const hit = ray.intersectObject(car, true)[0]
      return hit ? hit.point.y : 0
    })
    const smooth = (arr: number[], rad: number) => arr.map((_, i) => {
      let s = 0, n = 0
      for (let j = Math.max(0, i - rad); j <= Math.min(arr.length - 1, i + rad); j++) { s += arr[j]; n++ }
      return s / n
    })
    streamlines = []
    for (let i = 0; i < 12; i++) {
      const h = 0.34 + i * 0.105, gap = 0.045 + i * 0.03, rad = 5 + i * 2
      const ys = smooth(smooth(surf.map((s) => Math.max(h, s + gap)), rad), rad)
      streamlines.push(ys.map((y, k) => [xs[k], y]))
    }
  }
  function resizeFlow() { flowCanvas.width = innerWidth * DPR; flowCanvas.height = innerHeight * DPR }
  on(window, 'resize', resizeFlow); resizeFlow()

  let flowPhase = 0
  function drawFlow(dt: number) {
    fctx.clearRect(0, 0, flowCanvas.width, flowCanvas.height)
    const k = Math.max(0, Math.min(1, (shot.flow - 0.45) / 0.55))
    if (k <= 0 || !streamlines.length) return
    flowPhase += dt * 150 * DPR
    const ox = carRig.position.x
    const left = toScreen(ox - 6.5, 0.5, 0)[0] * DPR, right = toScreen(ox + 6.5, 0.5, 0)[0] * DPR
    const fade = fctx.createLinearGradient(left, 0, right, 0)
    fade.addColorStop(0, 'rgba(28,31,33,0)'); fade.addColorStop(0.28, 'rgba(28,31,33,0)')
    fade.addColorStop(0.4, 'rgba(28,31,33,0.55)')
    fade.addColorStop(0.75, 'rgba(28,31,33,0.55)'); fade.addColorStop(1, 'rgba(28,31,33,0)')
    fctx.strokeStyle = fade
    fctx.lineWidth = DPR
    streamlines.forEach((pts, i) => {
      // reveal from the nose side, where the air arrives
      const from = Math.floor(pts.length * (1 - k))
      fctx.globalAlpha = 1 - i * 0.05
      fctx.setLineDash([(44 + i * 6) * DPR, (16 + i * 3) * DPR])
      fctx.lineDashOffset = flowPhase * (1 + i * 0.04)
      fctx.beginPath()
      for (let j = pts.length - 1; j >= from; j--) {
        const p = toScreen(pts[j][0] + ox, pts[j][1], 0)
        if (j === pts.length - 1) fctx.moveTo(p[0] * DPR, p[1] * DPR)
        else fctx.lineTo(p[0] * DPR, p[1] * DPR)
      }
      fctx.stroke()
    })
    fctx.globalAlpha = 1
  }

  /* ------------------------------ pointer parallax ------------------------------ */
  const pointer = { x: 0, y: 0, sx: 0, sy: 0 }
  if (!reduceMotion && matchMedia('(pointer: fine)').matches) {
    on(window, 'pointermove', ((e: PointerEvent) => {
      pointer.x = (e.clientX / innerWidth) * 2 - 1
      pointer.y = (e.clientY / innerHeight) * 2 - 1
    }) as EventListener)
  }

  /* ------------------------------ frame loop ------------------------------ */
  const timer = new THREE.Timer()
  const root = document.documentElement.style
  let lastCarX = 0
  let raf = 0
  function frame() {
    raf = requestAnimationFrame(frame)
    timer.update()
    const dt = Math.min(timer.getDelta(), 0.05)

    // camera; pull back on narrow screens so the car stays in frame
    pointer.sx += (pointer.x - pointer.sx) * Math.min(1, dt * 2.5)
    pointer.sy += (pointer.y - pointer.sy) * Math.min(1, dt * 2.5)
    const pull = Math.max(1, Math.min(2.4, 1.45 / camera.aspect))
    const az = shot.az - pointer.sx * 0.07, el = Math.max(0.02, shot.el + pointer.sy * 0.035)
    const r = shot.r * pull, flat = Math.cos(el) * r
    target.set(shot.tx, shot.ty, shot.tz)
    camera.position.set(shot.tx + Math.cos(az) * flat, shot.ty + Math.sin(el) * r, shot.tz + Math.sin(az) * flat)
    camera.lookAt(target)
    if (camera.fov !== shot.fov) { camera.fov = shot.fov; camera.updateProjectionMatrix() }

    // car motion: wheels roll with distance travelled, scroll speed and a slow idle
    carRig.position.x = shot.carX
    carRig.rotation.y = shot.carRot
    const travelled = shot.carX - lastCarX; lastCarX = shot.carX
    wheelTurns += travelled / (2 * Math.PI * TYRE_R) + dt * 0.12 + Math.abs(scrollVel) * 0.0016
    if (mixer && wheelClip) mixer.setTime(((wheelTurns / TURNS_PER_CLIP) % 1) * wheelClip.duration)

    if (mats.Taillight_LED) mats.Taillight_LED.emissiveIntensity = 0.25 + shot.tail * 1.35
    if (mats.Headlight_LED) mats.Headlight_LED.emissiveIntensity = 0.25 + shot.head * 6
    if (mats.Headlight_DRL) mats.Headlight_DRL.emissiveIntensity = 0.6 + shot.head * 5

    scene.environmentIntensity = shot.env
    const glow = Math.max(0, (shot.head - 0.3) / 0.7)
    halos.forEach((h) => { h.material.opacity = glow })
    beams.forEach((b) => { b.material.opacity = glow * 0.45 })
    canvas.style.opacity = String(shot.alpha)
    document.body.style.backgroundColor = shot.bg
    root.setProperty('--ink', shot.ink)
    root.setProperty('--page', shot.bg)

    camera.updateMatrixWorld()
    updateDims()
    drawFlow(dt)
    renderer.render(scene, camera)
  }
  raf = requestAnimationFrame(frame)

  return () => {
    disposed = true
    cancelAnimationFrame(raf)
    listeners.forEach(([t, ev, fn]) => t.removeEventListener(ev, fn))
    ctx.revert()
    ScrollTrigger.getAll().forEach((t) => t.kill())
    gsap.ticker.remove(lenisTick)
    lenis?.destroy()
    draco.dispose()
    pmrem.dispose()
    scene.traverse((o) => {
      const mesh = o as THREE.Mesh
      if (mesh.isMesh) mesh.geometry.dispose()
    })
    renderer.dispose()
    document.body.classList.remove('is-loading')
    document.body.style.backgroundColor = ''
  }
}
