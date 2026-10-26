/**
 * Three.js stage for the /demo prologue: the Blender-sculpted Lady Justice rendered as polished
 * Carrara marble in a dark gallery, with a scroll-driven camera path (face → scales → sword → figure).
 * Framework-free so the React component only wires scroll progress in and disposes on unmount.
 */
import type * as THREE_NS from 'three'

type V3 = [number, number, number]

/** Camera beats in glTF space (Y up, statue faces +Z). */
const SHOTS: { pos: V3; target: V3; fov: number }[] = [
  { pos: [1.2, -0.62, 1.55], target: [-0.4, -0.34, 0.08], fov: 31 }, // low three-quarter: blindfold, raised arm
  { pos: [-1.15, -0.05, 1.3], target: [-0.3, -0.33, 0.26], fov: 32 }, // the scales
  { pos: [1.0, -1.15, 1.2], target: [0.26, -0.95, 0.05], fov: 30 }, // sword + drapery, low
  { pos: [0.05, -0.5, 4.7], target: [-0.55, -0.72, 0.0], fov: 30 }, // the whole figure
]

const NOISE_GLSL = /* glsl */ `
  vec3 mj_hash3(vec3 p) {
    p = vec3(dot(p, vec3(127.1, 311.7, 74.7)), dot(p, vec3(269.5, 183.3, 246.1)), dot(p, vec3(113.5, 271.9, 124.6)));
    return -1.0 + 2.0 * fract(sin(p) * 43758.5453123);
  }
  float mj_noise(vec3 p) {
    vec3 i = floor(p);
    vec3 f = fract(p);
    vec3 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(mix(dot(mj_hash3(i + vec3(0, 0, 0)), f - vec3(0, 0, 0)), dot(mj_hash3(i + vec3(1, 0, 0)), f - vec3(1, 0, 0)), u.x),
                   mix(dot(mj_hash3(i + vec3(0, 1, 0)), f - vec3(0, 1, 0)), dot(mj_hash3(i + vec3(1, 1, 0)), f - vec3(1, 1, 0)), u.x), u.y),
               mix(mix(dot(mj_hash3(i + vec3(0, 0, 1)), f - vec3(0, 0, 1)), dot(mj_hash3(i + vec3(1, 0, 1)), f - vec3(1, 0, 1)), u.x),
                   mix(dot(mj_hash3(i + vec3(0, 1, 1)), f - vec3(0, 1, 1)), dot(mj_hash3(i + vec3(1, 1, 1)), f - vec3(1, 1, 1)), u.x), u.y), u.z);
  }
  float mj_fbm(vec3 p) {
    float a = 0.5, s = 0.0;
    for (int i = 0; i < 5; i++) { s += a * mj_noise(p); p = p * 2.03 + 17.0; a *= 0.5; }
    return s;
  }
  vec3 mj_bump(vec3 surfPos, vec3 n, vec2 dHdxy, float faceDir) {
    vec3 sx = normalize(dFdx(surfPos));
    vec3 sy = normalize(dFdy(surfPos));
    vec3 r1 = cross(sy, n);
    vec3 r2 = cross(n, sx);
    float det = dot(sx, r1) * faceDir;
    vec3 grad = sign(det) * (dHdxy.x * r1 + dHdxy.y * r2);
    return normalize(abs(det) * n - grad);
  }
`

/** Shared clock for the drapery wind (vertex shader). */
const windTime = { value: 0 }

/**
 * Carrara marble: per-pixel veins in object space, stone grain bump, polished clear-coat.
 * With `wind`, the drapery ripples like cloth caught in a breeze — strongest at the hem, zero on the
 * head, torso, plinth and sword — so the statue reads as alive without breaking the stone illusion.
 */
function marbleMaterial(THREE: typeof THREE_NS, vertexColors: boolean, wind = false) {
  const m = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    roughness: 0.4,
    metalness: 0,
    clearcoat: 0.3,
    clearcoatRoughness: 0.32,
    sheen: 0.25,
    sheenRoughness: 0.9,
    sheenColor: new THREE.Color(0xf3ede2),
    specularIntensity: 0.55,
    vertexColors,
  })
  m.onBeforeCompile = (shader) => {
    shader.uniforms.uWindTime = windTime
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vMjObj;\nuniform float uWindTime;')
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        vMjObj = position;
        ${
          wind
            ? `{
          float skirt = smoothstep(-0.30, -0.95, position.y) * smoothstep(-1.43, -1.30, position.y);
          skirt *= 1.0 - smoothstep(0.26, 0.31, position.x);
          float w = sin(uWindTime * 1.7 + position.y * 9.0 + position.x * 6.0) * 0.6
                  + sin(uWindTime * 2.6 + position.z * 13.0 + position.y * 4.0) * 0.4;
          transformed += objectNormal * w * 0.0065 * skirt * skirt;
        }`
            : ''
        }`
      )
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vMjObj;\nfloat mjVein;\n' + NOISE_GLSL)
      .replace(
        '#include <color_fragment>',
        /* glsl */ `#include <color_fragment>
        {
          vec3 p = vMjObj * 1.35;
          float warp = mj_fbm(p * 1.2 + 3.0);
          float main = abs(mj_fbm(p + vec3(warp * 1.7)));
          float fine = abs(mj_fbm(p * 3.4 + vec3(9.0) + warp));
          mjVein = (1.0 - smoothstep(0.0, 0.045, main)) * smoothstep(-0.15, 0.25, mj_fbm(p * 0.8 + 5.0));
          float hair = (1.0 - smoothstep(0.0, 0.008, fine)) * smoothstep(0.1, 0.35, mj_fbm(p * 0.7 - 3.0));
          vec3 stone = vec3(0.965, 0.955, 0.93) * (0.965 + 0.07 * mj_fbm(p * 0.6));
          vec3 vein = vec3(0.6, 0.615, 0.64);
          diffuseColor.rgb *= mix(stone, vein, clamp(mjVein * 0.55 + hair * 0.32, 0.0, 1.0));
        }`
      )
      .replace(
        '#include <roughnessmap_fragment>',
        `#include <roughnessmap_fragment>
        roughnessFactor = clamp(roughnessFactor - 0.08 * mjVein + 0.05 * mj_noise(vMjObj * 90.0), 0.18, 0.9);`
      )
      .replace(
        '#include <normal_fragment_maps>',
        `#include <normal_fragment_maps>
        {
          float h = mj_noise(vMjObj * 180.0);
          normal = mj_bump(-vViewPosition, normal, vec2(dFdx(h), dFdy(h)) * 0.045, faceDirection);
        }`
      )
  }
  return m
}

/** Dark studio with two softboxes, baked into a PMREM environment for gallery reflections. */
function studioEnvironment(THREE: typeof THREE_NS, renderer: THREE_NS.WebGLRenderer) {
  const env = new THREE.Scene()
  const room = new THREE.Mesh(
    new THREE.BoxGeometry(12, 8, 12),
    new THREE.MeshBasicMaterial({ color: 0x0b0b0b, side: THREE.BackSide })
  )
  env.add(room)
  const panel = (w: number, h: number, intensity: number, color: number, pos: V3, look: V3) => {
    const mat = new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(intensity) })
    const p = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat)
    p.position.set(...pos)
    p.lookAt(...look)
    env.add(p)
  }
  panel(4.5, 3, 5.5, 0xfff3e4, [-3.5, 3.6, 2.5], [0, 0, 0]) // key softbox, top-left
  panel(0.8, 5, 3.2, 0xeef3ff, [4, 1, -2.5], [0, 0, 0]) // strip light, back-right
  panel(6, 2, 0.6, 0xffffff, [0, -3.9, 0], [0, 0, 0]) // faint floor bounce
  const pmrem = new THREE.PMREMGenerator(renderer)
  const tex = pmrem.fromScene(env, 0.02).texture
  pmrem.dispose()
  env.traverse((o) => {
    const mesh = o as THREE_NS.Mesh
    if (mesh.isMesh) {
      mesh.geometry.dispose()
      ;(mesh.material as THREE_NS.Material).dispose()
    }
  })
  return tex
}

export type StatueStage = {
  setProgress: (p: number) => void
  dispose: () => void
}

export async function createStatueStage(
  mount: HTMLElement,
  opts: { reduceMotion: boolean; onReady?: () => void; onProgress?: (p: number) => void }
): Promise<StatueStage | null> {
  const THREE = await import('three')
  const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js')
  const { DRACOLoader } = await import('three/examples/jsm/loaders/DRACOLoader.js')

  const isMobile = window.matchMedia('(max-width: 767px)').matches
  const draco = new DRACOLoader().setDecoderPath('/draco/')
  const gltf = await new GLTFLoader()
    .setDRACOLoader(draco)
    .loadAsync('/models/lady_justice_v2.glb', (e) => e.total && opts.onProgress?.(e.loaded / e.total))
  draco.dispose()
  if (!mount.isConnected) return null

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1.5 : 2))
  renderer.setSize(mount.clientWidth, mount.clientHeight)
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.AgXToneMapping
  renderer.toneMappingExposure = 1.3
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap
  renderer.domElement.setAttribute('aria-hidden', 'true')
  renderer.domElement.style.display = 'block'
  mount.appendChild(renderer.domElement)

  const scene = new THREE.Scene()
  const envTex = studioEnvironment(THREE, renderer)
  scene.environment = envTex
  scene.environmentIntensity = 0.55

  // chiaroscuro: one dominant warm key with soft shadows, a cool rim to cut the silhouette from the dark
  const key = new THREE.DirectionalLight(0xfff0dc, 3.2)
  key.position.set(-2.2, 3.4, 2.6)
  key.castShadow = true
  key.shadow.mapSize.set(isMobile ? 1024 : 2048, isMobile ? 1024 : 2048)
  key.shadow.camera.left = -1.2
  key.shadow.camera.right = 1.2
  key.shadow.camera.top = 1.2
  key.shadow.camera.bottom = -1.6
  key.shadow.camera.near = 0.5
  key.shadow.camera.far = 9
  key.shadow.bias = -0.0004
  key.shadow.normalBias = 0.012
  key.target.position.set(-0.05, -0.6, 0)
  scene.add(key, key.target)
  const rim = new THREE.DirectionalLight(0xdfe8ff, 2.1)
  rim.position.set(2.6, 1.8, -2.4)
  scene.add(rim)
  scene.add(new THREE.HemisphereLight(0xffffff, 0x1a1a1a, 0.08))

  const model = gltf.scene
  const statueMat = marbleMaterial(THREE, true, !opts.reduceMotion)
  const propMat = marbleMaterial(THREE, false)
  model.traverse((o) => {
    const mesh = o as THREE_NS.Mesh
    if (!mesh.isMesh) return
    const old = mesh.material as THREE_NS.MeshStandardMaterial
    mesh.material = mesh.geometry.getAttribute('color') ? statueMat : propMat
    old.dispose()
    mesh.castShadow = true
    mesh.receiveShadow = true
  })
  scene.add(model)

  // motion is driven here (not by the baked clips): the figure turns with the story and the scales
  // behave like a real balance — scroll speed tips the beam, the pans swing on their chains and settle
  const root = model.getObjectByName('LJ2_Root') ?? model.getObjectByName('LJ_Root') ?? model
  const beam = model.getObjectByName('LJ_Beam_Pivot')
  const pans = ['AJ_Pan_Hanger_L', 'AJ_Pan_Hanger_R', 'LJ_Pan_Hanger_L', 'LJ_Pan_Hanger_R'].map((n) => model.getObjectByName(n)).filter(Boolean) as THREE_NS.Object3D[]
  const rest = new Map<THREE_NS.Object3D, THREE_NS.Quaternion>()
  ;[root, beam, ...pans].forEach((o) => o && rest.set(o, o.quaternion.clone()))
  const rootRestY = root.position.y
  const axisZ = new THREE.Vector3(0, 0, 1)
  const axisY = new THREE.Vector3(0, 1, 0)
  const qTmp = new THREE.Quaternion()
  const balance = { a: 0, v: 0, pan: 0, panV: 0 }

  const camera = new THREE.PerspectiveCamera(SHOTS[0].fov, mount.clientWidth / mount.clientHeight, 0.05, 30)
  const curvePos = new THREE.CatmullRomCurve3(SHOTS.map((s) => new THREE.Vector3(...s.pos)), false, 'centripetal')
  const curveTgt = new THREE.CatmullRomCurve3(SHOTS.map((s) => new THREE.Vector3(...s.target)), false, 'centripetal')
  const tmpTarget = new THREE.Vector3()

  let target = 0
  let current = 0
  const pointer = { x: 0, y: 0, sx: 0, sy: 0 }
  const onPointer = (e: PointerEvent) => {
    pointer.x = (e.clientX / window.innerWidth - 0.5) * 2
    pointer.y = (e.clientY / window.innerHeight - 0.5) * 2
  }
  if (!isMobile && !opts.reduceMotion) window.addEventListener('pointermove', onPointer, { passive: true })

  const resize = () => {
    const w = mount.clientWidth
    const h = mount.clientHeight
    renderer.setSize(w, h)
    camera.aspect = w / Math.max(1, h)
    camera.updateProjectionMatrix()
  }
  const ro = new ResizeObserver(resize)
  ro.observe(mount)

  let visible = true
  const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting))
  io.observe(mount)

  const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)
  const easeOut = (t: number) => 1 - Math.pow(1 - Math.min(1, Math.max(0, t)), 4)
  const timer = new THREE.Timer()
  let raf = 0
  let elapsed = 0
  let prevCurrent = 0
  const INTRO = opts.reduceMotion ? 0.01 : 3.2
  const frame = () => {
    raf = requestAnimationFrame(frame)
    timer.update()
    const dt = Math.min(timer.getDelta(), 0.05)
    if (!visible) return
    elapsed += dt
    current += (target - current) * (opts.reduceMotion ? 1 : Math.min(1, dt * 4.5))
    const scrollVel = (current - prevCurrent) / Math.max(dt, 1e-3)
    prevCurrent = current

    // intro: she rises out of the dark while the key light sweeps in and the exposure opens up
    const intro = easeOut(elapsed / INTRO)
    renderer.toneMappingExposure = 1.3 * (0.08 + 0.92 * intro)
    root.position.y = rootRestY - 0.22 * (1 - intro)

    // the figure turns slowly with the story, plus a breath of idle motion
    const turn = (1 - intro) * -0.55 + (current - 0.5) * 0.5 + (opts.reduceMotion ? 0 : Math.sin(elapsed * 0.32) * 0.09 + Math.sin(elapsed * 0.13) * 0.05)
    root.quaternion.copy(rest.get(root)!).multiply(qTmp.setFromAxisAngle(axisY, turn))

    // the balance: damped spring driven by scroll speed + a slow idle sway; pans hang plumb with lag
    if (pans.length && !opts.reduceMotion) {
      const drive = Math.sin(elapsed * 0.9) * 0.06 + Math.sin(elapsed * 0.37) * 0.03 + THREE.MathUtils.clamp(scrollVel, -2, 2) * 0.09
      balance.v += (-18 * balance.a - 3.2 * balance.v + drive * 18) * dt
      balance.a += balance.v * dt
      balance.panV += (-14 * (balance.pan + balance.a) - 1.6 * balance.panV) * dt
      balance.pan += balance.panV * dt
      if (beam) beam.quaternion.copy(rest.get(beam)!).multiply(qTmp.setFromAxisAngle(axisZ, balance.a))
      pans.forEach((p) => p.quaternion.copy(rest.get(p)!).multiply(qTmp.setFromAxisAngle(axisZ, balance.pan)))
    }
    // hold on each shot a little, glide between them
    const seg = current * (SHOTS.length - 1)
    const i = Math.min(Math.floor(seg), SHOTS.length - 2)
    const local = ease(Math.min(1, Math.max(0, (seg - i - 0.18) / 0.64)))
    const u = (i + local) / (SHOTS.length - 1)
    curvePos.getPointAt(u, camera.position)
    curveTgt.getPointAt(u, tmpTarget)
    // portrait screens: the desktop shots leave room for text beside the statue — recentre her instead
    if (camera.aspect < 0.8) {
      tmpTarget.x += 0.45 * u
      camera.position.x += 0.45 * u
    }
    camera.fov = SHOTS[i].fov + (SHOTS[i + 1].fov - SHOTS[i].fov) * local
    pointer.sx += (pointer.x - pointer.sx) * 0.04
    pointer.sy += (pointer.y - pointer.sy) * 0.04
    // handheld-free "dolly" drift so the frame is never perfectly still
    const drift = opts.reduceMotion ? 0 : 1
    camera.position.x += pointer.sx * 0.05 + Math.sin(elapsed * 0.21) * 0.025 * drift
    camera.position.y -= pointer.sy * 0.03 - Math.sin(elapsed * 0.17 + 1.3) * 0.012 * drift
    camera.position.z += (1 - intro) * 0.6
    camera.lookAt(tmpTarget)
    camera.updateProjectionMatrix()
    // the key light sweeps in on load, then rakes across the drapery as the story moves
    key.position.set(-2.2 + current * 1.2 - (1 - intro) * 4, 3.4 - current * 0.6, 2.6)
    windTime.value = elapsed
    renderer.render(scene, camera)
  }
  resize()
  frame()
  opts.onReady?.()

  return {
    setProgress: (p: number) => {
      target = Math.min(1, Math.max(0, p))
    },
    dispose: () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('pointermove', onPointer)
      ro.disconnect()
      io.disconnect()
      model.traverse((o) => {
        const mesh = o as THREE_NS.Mesh
        if (mesh.isMesh) mesh.geometry.dispose()
      })
      statueMat.dispose()
      propMat.dispose()
      envTex.dispose()
      renderer.dispose()
      renderer.domElement.remove()
    },
  }
}
