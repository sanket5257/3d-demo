/**
 * IUSTITIA — one fixed WebGL scene behind the whole page.
 * The page tweens `stage.shot` per section (camera, light, exposure); the stage renders it,
 * runs the balance physics, the drapery breeze, the drag-to-turn turntable and reports
 * projected screen positions for the HTML annotations.
 */
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js'

export type Shot = {
  px: number; py: number; pz: number // camera position (glTF space: Y up, statue faces +Z)
  tx: number; ty: number; tz: number // camera target
  fov: number
  turn: number // statue rotation about Y (radians)
  key: number // key-light sweep 0..1
  expo: number // exposure multiplier
  float: number // statue lift (m)
}

export type MaterialName = 'marble' | 'bronze' | 'obsidian' | 'verdigris'

/** Named points on the sculpture (glTF space) for the HTML annotations. */
export const ANCHORS = {
  blindfold: [0.08, 0.07, 0.125],
  scales: [-0.3, -0.47, 0.3],
  sword: [0.32, -0.95, -0.02],
  drapery: [-0.22, -1.12, -0.05],
  belt: [0.033, -0.39, 0.127],
} as const
export type AnchorName = keyof typeof ANCHORS

export const SHOTS: Record<string, Shot> = {
  hero: { px: 0, py: -0.42, pz: 4.4, tx: 0, ty: -0.62, tz: 0, fov: 30, turn: -0.18, key: 0, expo: 1, float: 0 },
  blindfold: { px: 0.62, py: 0.16, pz: 0.86, tx: 0.03, ty: 0.06, tz: 0.04, fov: 28, turn: 0.05, key: 0.3, expo: 1.05, float: 0 },
  scales: { px: -0.85, py: -0.1, pz: 1.35, tx: -0.02, ty: -0.33, tz: 0.24, fov: 30, turn: 0.15, key: 0.45, expo: 1.05, float: 0 },
  sword: { px: 1.05, py: -1.05, pz: 1.15, tx: 0.24, ty: -0.95, tz: 0.04, fov: 30, turn: -0.25, key: 0.6, expo: 1, float: 0 },
  drapery: { px: -0.95, py: -1.05, pz: 1.45, tx: -0.08, ty: -0.98, tz: 0, fov: 30, turn: 0.35, key: 0.75, expo: 1, float: 0 },
  material: { px: 1.15, py: -0.45, pz: 3.6, tx: -0.42, ty: -0.62, tz: 0, fov: 30, turn: -0.4, key: 0.5, expo: 1.05, float: 0 },
  turntable: { px: 0, py: -0.6, pz: 4.6, tx: 0, ty: -0.98, tz: 0, fov: 30, turn: 0, key: 0.4, expo: 1.05, float: 0.04 },
  finale: { px: 0, py: 0.2, pz: 6.4, tx: 0, ty: -1.55, tz: 0, fov: 30, turn: 0.6, key: 1, expo: 0.75, float: 0.12 },
}

const NOISE_GLSL = /* glsl */ `
  vec3 ij_hash3(vec3 p) {
    p = vec3(dot(p, vec3(127.1, 311.7, 74.7)), dot(p, vec3(269.5, 183.3, 246.1)), dot(p, vec3(113.5, 271.9, 124.6)));
    return -1.0 + 2.0 * fract(sin(p) * 43758.5453123);
  }
  float ij_noise(vec3 p) {
    vec3 i = floor(p); vec3 f = fract(p); vec3 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(mix(dot(ij_hash3(i), f), dot(ij_hash3(i + vec3(1,0,0)), f - vec3(1,0,0)), u.x),
                   mix(dot(ij_hash3(i + vec3(0,1,0)), f - vec3(0,1,0)), dot(ij_hash3(i + vec3(1,1,0)), f - vec3(1,1,0)), u.x), u.y),
               mix(mix(dot(ij_hash3(i + vec3(0,0,1)), f - vec3(0,0,1)), dot(ij_hash3(i + vec3(1,0,1)), f - vec3(1,0,1)), u.x),
                   mix(dot(ij_hash3(i + vec3(0,1,1)), f - vec3(0,1,1)), dot(ij_hash3(i + vec3(1,1,1)), f - vec3(1,1,1)), u.x), u.y), u.z);
  }
  float ij_fbm(vec3 p) { float a = 0.5, s = 0.0; for (int i = 0; i < 5; i++) { s += a * ij_noise(p); p = p * 2.03 + 17.0; a *= 0.5; } return s; }
`

const windTime = { value: 0 }

/**
 * Physical stone/metal with the shared extras: object-space veining (marble only), a soft breeze on
 * the skirt (statue only) and baked AO from vertex colours.
 */
function makeMaterial(kind: MaterialName, statue: boolean) {
  const base: THREE.MeshPhysicalMaterialParameters = { vertexColors: statue }
  const params: Record<MaterialName, THREE.MeshPhysicalMaterialParameters> = {
    marble: { color: 0xffffff, roughness: 0.4, metalness: 0, clearcoat: 0.3, clearcoatRoughness: 0.3, sheen: 0.25, sheenRoughness: 0.9, sheenColor: new THREE.Color(0xf3ede2) },
    bronze: { color: 0x3b2b22, roughness: 0.42, metalness: 1, clearcoat: 0.1, clearcoatRoughness: 0.5 },
    obsidian: { color: 0x0d0d0f, roughness: 0.12, metalness: 0.15, clearcoat: 1, clearcoatRoughness: 0.05, specularIntensity: 1 },
    verdigris: { color: 0x5f8a80, roughness: 0.62, metalness: 0.15, clearcoat: 0.05, clearcoatRoughness: 0.6 },
  }
  const m = new THREE.MeshPhysicalMaterial({ ...base, ...params[kind] })
  m.onBeforeCompile = (shader) => {
    shader.uniforms.uWindTime = windTime
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vObj;\nuniform float uWindTime;')
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        vObj = position;
        ${statue ? `{
          float skirt = smoothstep(-0.30, -0.95, position.y) * smoothstep(-1.43, -1.30, position.y);
          skirt *= 1.0 - smoothstep(0.26, 0.31, position.x);
          float w = sin(uWindTime * 1.7 + position.y * 9.0 + position.x * 6.0) * 0.6
                  + sin(uWindTime * 2.6 + position.z * 13.0 + position.y * 4.0) * 0.4;
          transformed += objectNormal * w * 0.0065 * skirt * skirt;
        }` : ''}`
      )
    shader.fragmentShader = shader.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vObj;\n' + NOISE_GLSL)
    if (kind === 'marble') {
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <color_fragment>',
        `#include <color_fragment>
        {
          vec3 p = vObj * 1.35;
          float warp = ij_fbm(p * 1.2 + 3.0);
          float vein = (1.0 - smoothstep(0.0, 0.045, abs(ij_fbm(p + vec3(warp * 1.7))))) * smoothstep(-0.15, 0.25, ij_fbm(p * 0.8 + 5.0));
          float hair = (1.0 - smoothstep(0.0, 0.008, abs(ij_fbm(p * 3.4 + vec3(9.0) + warp)))) * smoothstep(0.1, 0.35, ij_fbm(p * 0.7 - 3.0));
          vec3 stone = vec3(0.965, 0.955, 0.93) * (0.965 + 0.07 * ij_fbm(p * 0.6));
          diffuseColor.rgb *= mix(stone, vec3(0.6, 0.615, 0.64), clamp(vein * 0.55 + hair * 0.32, 0.0, 1.0));
        }`
      )
    } else {
      // metals: fine directional brushing breaks up perfect reflections
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <roughnessmap_fragment>',
        `#include <roughnessmap_fragment>
        roughnessFactor = clamp(roughnessFactor + 0.06 * ij_noise(vObj * vec3(40.0, 400.0, 40.0)), 0.04, 1.0);`
      )
    }
  }
  return m
}

/** Dark studio: a big warm softbox, a cool strip and a faint floor bounce, baked into PMREM. */
function studio(renderer: THREE.WebGLRenderer) {
  const env = new THREE.Scene()
  env.add(new THREE.Mesh(new THREE.BoxGeometry(12, 8, 12), new THREE.MeshBasicMaterial({ color: 0x0a0a0a, side: THREE.BackSide })))
  const panel = (w: number, h: number, k: number, c: number, pos: [number, number, number]) => {
    const p = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(k) }))
    p.position.set(...pos)
    p.lookAt(0, 0, 0)
    env.add(p)
  }
  panel(4.5, 3, 6, 0xfff1df, [-3.5, 3.6, 2.5])
  panel(0.8, 5, 3.5, 0xe9f0ff, [4, 1, -2.5])
  panel(6, 2, 0.6, 0xffffff, [0, -3.9, 0])
  const pmrem = new THREE.PMREMGenerator(renderer)
  const tex = pmrem.fromScene(env, 0.02).texture
  pmrem.dispose()
  return tex
}

export type Stage = {
  shot: Shot
  setMaterial: (m: MaterialName) => void
  setDrag: (on: boolean) => void
  project: (name: AnchorName) => [number, number, boolean]
  onFrame: (fn: () => void) => void
  dispose: () => void
}

export async function createStage(
  canvas: HTMLCanvasElement,
  opts: { reduceMotion: boolean; onProgress?: (p: number) => void }
): Promise<Stage> {
  const isMobile = matchMedia('(max-width: 767px)').matches
  const draco = new DRACOLoader().setDecoderPath('/draco/')
  const gltf = await new GLTFLoader()
    .setDRACOLoader(draco)
    .loadAsync('/models/lady_justice_v2.glb', (e) => e.total && opts.onProgress?.(e.loaded / e.total))
  draco.dispose()

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' })
  renderer.setPixelRatio(Math.min(devicePixelRatio, isMobile ? 1.5 : 2))
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.AgXToneMapping
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap

  const scene = new THREE.Scene()
  const envTex = studio(renderer)
  scene.environment = envTex
  scene.environmentIntensity = 0.55

  const key = new THREE.DirectionalLight(0xfff0dc, 3.2)
  key.castShadow = true
  key.shadow.mapSize.set(isMobile ? 1024 : 2048, isMobile ? 1024 : 2048)
  Object.assign(key.shadow.camera, { left: -1.3, right: 1.3, top: 1.3, bottom: -1.9, near: 0.5, far: 10 })
  key.shadow.bias = -0.0004
  key.shadow.normalBias = 0.012
  key.target.position.set(0, -0.7, 0)
  scene.add(key, key.target)
  const rim = new THREE.DirectionalLight(0xdfe8ff, 2.2)
  rim.position.set(2.6, 1.8, -2.4)
  scene.add(rim)
  scene.add(new THREE.HemisphereLight(0xffffff, 0x1a1a1a, 0.08))

  // soft contact shadow under the plinth
  const shadowTex = (() => {
    const c = document.createElement('canvas')
    c.width = c.height = 256
    const g = c.getContext('2d')!
    const r = g.createRadialGradient(128, 128, 8, 128, 128, 128)
    r.addColorStop(0, 'rgba(0,0,0,0.75)'); r.addColorStop(0.5, 'rgba(0,0,0,0.3)'); r.addColorStop(1, 'rgba(0,0,0,0)')
    g.fillStyle = r; g.fillRect(0, 0, 256, 256)
    return new THREE.CanvasTexture(c)
  })()
  const contact = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.5), new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false }))
  contact.rotation.x = -Math.PI / 2
  contact.position.set(0.077, -1.598, -0.099)
  scene.add(contact)

  const model = gltf.scene
  const root = model.getObjectByName('LJ2_Root') ?? model
  const mats = {
    statue: {} as Record<MaterialName, THREE.MeshPhysicalMaterial>,
    prop: {} as Record<MaterialName, THREE.MeshPhysicalMaterial>,
  }
  for (const k of ['marble', 'bronze', 'obsidian', 'verdigris'] as MaterialName[]) {
    mats.statue[k] = makeMaterial(k, true)
    mats.prop[k] = makeMaterial(k, false)
  }
  const statueMeshes: THREE.Mesh[] = []
  const propMeshes: THREE.Mesh[] = []
  model.traverse((o) => {
    const mesh = o as THREE.Mesh
    if (!mesh.isMesh) return
    ;(mesh.material as THREE.Material).dispose()
    const isStatue = !!mesh.geometry.getAttribute('color')
    mesh.material = isStatue ? mats.statue.marble : mats.prop.marble
    mesh.castShadow = mesh.receiveShadow = true
    ;(isStatue ? statueMeshes : propMeshes).push(mesh)
  })
  const turnRig = new THREE.Group() // rotates around the plinth centre
  turnRig.position.set(0.077, 0, -0.099)
  model.position.set(-0.077, 0, 0.099)
  turnRig.add(model)
  scene.add(turnRig)

  // anchors ride with the statue
  const anchorObjs = {} as Record<AnchorName, THREE.Object3D>
  for (const [n, p] of Object.entries(ANCHORS) as [AnchorName, readonly number[]][]) {
    const o = new THREE.Object3D()
    o.position.set(p[0], p[1], p[2])
    model.add(o)
    anchorObjs[n] = o
  }

  const pans = ['AJ_Pan_Hanger_L', 'AJ_Pan_Hanger_R'].map((n) => model.getObjectByName(n)).filter(Boolean) as THREE.Object3D[]
  const panRest = pans.map((p) => p.quaternion.clone())
  const axisZ = new THREE.Vector3(0, 0, 1)
  const q = new THREE.Quaternion()

  const camera = new THREE.PerspectiveCamera(30, 1, 0.05, 40)
  const shot: Shot = { ...SHOTS.hero }

  // material crossfade: swap at the darkest point of a quick exposure dip
  let swapDip = 0
  let pending: MaterialName | null = null
  const applyMaterial = (k: MaterialName) => {
    statueMeshes.forEach((m) => (m.material = mats.statue[k]))
    propMeshes.forEach((m) => (m.material = mats.prop[k]))
  }

  // drag-to-turn with inertia (turntable chapter only)
  let dragOn = false
  let dragging = false
  let lastX = 0
  let spin = 0
  let spinVel = 0
  const down = (e: PointerEvent) => {
    if (!dragOn) return
    dragging = true
    lastX = e.clientX
  }
  const move = (e: PointerEvent) => {
    if (!dragging) return
    const dx = e.clientX - lastX
    lastX = e.clientX
    spinVel = dx * 0.006
    spin += spinVel
  }
  const up = () => (dragging = false)
  window.addEventListener('pointerdown', down)
  window.addEventListener('pointermove', move)
  window.addEventListener('pointerup', up)

  const pointer = { x: 0, y: 0, sx: 0, sy: 0 }
  const onPointer = (e: PointerEvent) => {
    pointer.x = (e.clientX / innerWidth) * 2 - 1
    pointer.y = (e.clientY / innerHeight) * 2 - 1
  }
  if (!isMobile && !opts.reduceMotion) window.addEventListener('pointermove', onPointer, { passive: true })

  const resize = () => {
    renderer.setSize(innerWidth, innerHeight, false)
    camera.aspect = innerWidth / innerHeight
    camera.updateProjectionMatrix()
  }
  window.addEventListener('resize', resize)
  resize()

  const frameFns: (() => void)[] = []
  const v = new THREE.Vector3()
  const tmpT = new THREE.Vector3()
  const balance = { a: 0, v: 0 }
  let lastScroll = scrollY
  let elapsed = 0
  let raf = 0
  const timer = new THREE.Timer()
  const INTRO = opts.reduceMotion ? 0.01 : 3.4
  const easeOut = (t: number) => 1 - Math.pow(1 - Math.min(1, Math.max(0, t)), 4)

  const frame = () => {
    raf = requestAnimationFrame(frame)
    timer.update()
    const dt = Math.min(timer.getDelta(), 0.05)
    elapsed += dt
    const intro = easeOut(elapsed / INTRO)
    const scrollVel = (scrollY - lastScroll) / Math.max(dt, 1e-3)
    lastScroll = scrollY

    // swap dip
    if (pending) {
      swapDip = Math.min(1, swapDip + dt * 5)
      if (swapDip >= 1) { applyMaterial(pending); pending = null }
    } else swapDip = Math.max(0, swapDip - dt * 3)

    renderer.toneMappingExposure = 1.3 * shot.expo * (0.06 + 0.94 * intro) * (1 - 0.55 * swapDip)

    // statue: story turn + idle sway + drag spin, rising out of the dark on load
    if (!dragging) {
      spinVel *= 0.94
      spin += spinVel
      if (!dragOn) spin *= 0.96 // ease back when leaving the turntable
    }
    const idle = opts.reduceMotion ? 0 : Math.sin(elapsed * 0.32) * 0.07 + Math.sin(elapsed * 0.13) * 0.04
    turnRig.rotation.y = shot.turn + idle + spin + (1 - intro) * -0.6
    turnRig.position.y = (1 - intro) * -0.25 + shot.float + (opts.reduceMotion ? 0 : Math.sin(elapsed * 0.6) * shot.float * 0.25)

    // the balance: damped spring nudged by scroll speed, plus a slow idle sway
    if (!opts.reduceMotion && pans.length) {
      const drive = Math.sin(elapsed * 0.9) * 0.05 + THREE.MathUtils.clamp(scrollVel / 1500, -1.5, 1.5) * 0.1
      balance.v += (-14 * (balance.a + drive) - 1.8 * balance.v) * dt
      balance.a += balance.v * dt
      pans.forEach((p, i) => p.quaternion.copy(panRest[i]).multiply(q.setFromAxisAngle(axisZ, balance.a)))
    }

    // camera + gentle pointer parallax; portrait screens recentre the framing
    pointer.sx += (pointer.x - pointer.sx) * 0.04
    pointer.sy += (pointer.y - pointer.sy) * 0.04
    const portrait = camera.aspect < 0.8
    camera.position.set(shot.px + pointer.sx * 0.06, shot.py - pointer.sy * 0.035, shot.pz * (portrait ? 1.35 : 1) + (1 - intro) * 0.8)
    tmpT.set(portrait ? shot.tx * 0.25 : shot.tx, shot.ty, shot.tz)
    camera.lookAt(tmpT)
    if (camera.fov !== shot.fov) { camera.fov = shot.fov; camera.updateProjectionMatrix() }

    key.position.set(-2.4 + shot.key * 1.6 - (1 - intro) * 4, 3.4 - shot.key * 0.8, 2.6)
    windTime.value = elapsed
    renderer.render(scene, camera)
    frameFns.forEach((fn) => fn())
  }
  frame()

  return {
    shot,
    setMaterial: (k) => { pending = k },
    setDrag: (on) => {
      dragOn = on
      canvas.style.pointerEvents = on ? 'auto' : 'none'
      canvas.style.cursor = on ? 'grab' : ''
    },
    project: (name) => {
      anchorObjs[name].getWorldPosition(v)
      v.project(camera)
      return [((v.x + 1) / 2) * innerWidth, ((1 - v.y) / 2) * innerHeight, v.z < 1]
    },
    onFrame: (fn) => frameFns.push(fn),
    dispose: () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('pointerdown', down)
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointermove', onPointer)
      window.removeEventListener('resize', resize)
      scene.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh) m.geometry.dispose() })
      Object.values(mats.statue).concat(Object.values(mats.prop)).forEach((m) => m.dispose())
      envTex.dispose()
      shadowTex.dispose()
      renderer.dispose()
    },
  }
}
