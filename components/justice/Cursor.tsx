'use client'

import { useEffect, useRef } from 'react'

/**
 * Fine-pointer cursor: a dot that trails the pointer, growing into a labelled disc over anything
 * marked `data-cursor="Label"` (films, links). Hidden on touch devices and with reduced motion.
 */
export default function Cursor() {
  const ref = useRef<HTMLDivElement>(null)
  const labelRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (!matchMedia('(pointer: fine)').matches || matchMedia('(prefers-reduced-motion: reduce)').matches) return
    document.documentElement.classList.add('has-cursor')
    const pos = { x: innerWidth / 2, y: innerHeight / 2, tx: innerWidth / 2, ty: innerHeight / 2 }
    let scale = 1
    let targetScale = 1
    let raf = 0
    const move = (e: PointerEvent) => {
      pos.tx = e.clientX
      pos.ty = e.clientY
      el.style.opacity = '1'
      const hit = (e.target as Element | null)?.closest<HTMLElement>('[data-cursor], a, button, input')
      const label = hit?.dataset.cursor ?? ''
      targetScale = hit ? (label ? 9 : 3.2) : 1
      if (labelRef.current) labelRef.current.textContent = label
      el.dataset.label = label ? 'true' : 'false'
    }
    const leave = () => (el.style.opacity = '0')
    const tick = () => {
      raf = requestAnimationFrame(tick)
      pos.x += (pos.tx - pos.x) * 0.2
      pos.y += (pos.ty - pos.y) * 0.2
      scale += (targetScale - scale) * 0.16
      el.style.transform = `translate3d(${pos.x}px, ${pos.y}px, 0)`
      ;(el.firstElementChild as HTMLElement).style.transform = `translate(-50%, -50%) scale(${scale})`
    }
    window.addEventListener('pointermove', move, { passive: true })
    document.addEventListener('pointerleave', leave)
    tick()
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('pointermove', move)
      document.removeEventListener('pointerleave', leave)
      document.documentElement.classList.remove('has-cursor')
    }
  }, [])

  return (
    <div ref={ref} aria-hidden className="pointer-events-none fixed left-0 top-0 z-[90] opacity-0 transition-opacity duration-300 mix-blend-difference">
      <div className="absolute h-3 w-3 rounded-full bg-white" />
      <span
        ref={labelRef}
        className="absolute -translate-x-1/2 -translate-y-1/2 whitespace-nowrap text-[11px] tracking-[0.2em] uppercase text-black"
      />
    </div>
  )
}
