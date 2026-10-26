<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js'
import { useUiStore } from '@/stores/ui'

const props = defineProps<{ tone: 'idle' | 'ok' | 'ng' | 'halt'; action: string }>()

const TONE_COLOR = { idle: 0x23c8ff, ok: 0x2ee6a6, ng: 0xffb020, halt: 0xff4d4f } as const
const MODEL_URL = `${import.meta.env.BASE_URL}models/robot_arm.glb`
const MODEL_HEIGHT = 2.2
const AUTO_ROTATE_SPEED = 0.8
const PIXEL_RATIO_CAP = 1.5

const host = ref<HTMLDivElement | null>(null)
const status = ref<'loading' | 'ready' | 'error'>('loading')
const progress = ref(0)
const ui = useUiStore()

let renderer: THREE.WebGLRenderer | null = null
let scene: THREE.Scene | null = null
let camera: THREE.PerspectiveCamera | null = null
let controls: OrbitControls | null = null
let ring: THREE.Mesh | null = null
let pulse: THREE.Mesh | null = null
let raf = 0
let observer: ResizeObserver | null = null
const clock = new THREE.Clock()

function applyTone() {
  const color = TONE_COLOR[props.tone]
  for (const m of [ring, pulse]) if (m) (m.material as THREE.MeshBasicMaterial).color.setHex(color)
}

function resize() {
  if (!host.value || !renderer || !camera) return
  const { clientWidth: w, clientHeight: h } = host.value
  if (w === 0 || h === 0) return
  renderer.setSize(w, h, false)
  camera.aspect = w / h
  camera.updateProjectionMatrix()
}

function loop() {
  raf = requestAnimationFrame(loop)
  if (!renderer || !scene || !camera || !controls) return
  const t = clock.getElapsedTime()
  if (pulse) {
    const k = (t * 0.6) % 1
    pulse.scale.setScalar(1 + k * 0.55)
    ;(pulse.material as THREE.MeshBasicMaterial).opacity = 0.5 * (1 - k)
  }
  controls.update()
  renderer.render(scene, camera)
}

function buildScene(el: HTMLDivElement) {
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, PIXEL_RATIO_CAP))
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.15
  el.appendChild(renderer.domElement)
  renderer.domElement.className = 'scene__canvas'

  scene = new THREE.Scene()
  camera = new THREE.PerspectiveCamera(36, 1, 0.1, 50)
  camera.position.set(3.4, 1.9, 4.2)

  scene.add(new THREE.HemisphereLight(0xcfe9ff, 0x0a1220, 1.4))
  const key = new THREE.DirectionalLight(0xffffff, 2.2)
  key.position.set(4, 6, 3)
  scene.add(key)
  const rim = new THREE.DirectionalLight(0x23c8ff, 1.6)
  rim.position.set(-4, 2, -3)
  scene.add(rim)

  const grid = new THREE.GridHelper(8, 32, 0x23c8ff, 0x16405a)
  ;(grid.material as THREE.Material).transparent = true
  ;(grid.material as THREE.Material).opacity = 0.35
  grid.position.y = -MODEL_HEIGHT / 2
  scene.add(grid)

  const ringGeo = new THREE.RingGeometry(1.15, 1.22, 96)
  ring = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: TONE_COLOR[props.tone], side: THREE.DoubleSide, transparent: true, opacity: 0.9 }))
  ring.rotation.x = -Math.PI / 2
  ring.position.y = -MODEL_HEIGHT / 2 + 0.01
  scene.add(ring)
  pulse = new THREE.Mesh(
    new THREE.RingGeometry(1.15, 1.2, 96),
    new THREE.MeshBasicMaterial({ color: TONE_COLOR[props.tone], side: THREE.DoubleSide, transparent: true, opacity: 0.4, depthWrite: false }),
  )
  pulse.rotation.x = -Math.PI / 2
  pulse.position.y = -MODEL_HEIGHT / 2 + 0.01
  scene.add(pulse)

  controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true
  controls.enablePan = false
  controls.minDistance = 3
  controls.maxDistance = 8
  controls.maxPolarAngle = Math.PI * 0.52
  controls.autoRotate = !ui.reducedMotion
  controls.autoRotateSpeed = AUTO_ROTATE_SPEED
  controls.target.set(0, 0, 0)

  resize()
  observer = new ResizeObserver(resize)
  observer.observe(el)
}

function loadModel() {
  const loader = new GLTFLoader()
  loader.setMeshoptDecoder(MeshoptDecoder)
  loader.load(
    MODEL_URL,
    (gltf) => {
      if (!scene) return
      const model = gltf.scene
      const box = new THREE.Box3().setFromObject(model)
      const size = box.getSize(new THREE.Vector3())
      const scale = MODEL_HEIGHT / size.y
      model.scale.setScalar(scale)
      const center = box.getCenter(new THREE.Vector3()).multiplyScalar(scale)
      model.position.set(-center.x, -MODEL_HEIGHT / 2 - box.min.y * scale, -center.z)
      scene.add(model)
      status.value = 'ready'
    },
    (e) => {
      if (e.lengthComputable) progress.value = Math.round((e.loaded / e.total) * 100)
    },
    () => {
      status.value = 'error'
    },
  )
}

onMounted(() => {
  if (!host.value) return
  try {
    buildScene(host.value)
  } catch {
    status.value = 'error'
    return
  }
  loadModel()
  loop()
})

watch(() => props.tone, applyTone)

onBeforeUnmount(() => {
  cancelAnimationFrame(raf)
  observer?.disconnect()
  controls?.dispose()
  scene?.traverse((o) => {
    const mesh = o as THREE.Mesh
    mesh.geometry?.dispose()
    const mat = mesh.material as THREE.Material | THREE.Material[] | undefined
    if (Array.isArray(mat)) mat.forEach((m) => m.dispose())
    else mat?.dispose()
  })
  renderer?.dispose()
  renderer?.domElement.remove()
})
</script>

<template>
  <div class="scene">
    <div ref="host" class="scene__host"></div>
    <div class="scene__tag" :class="`is-${tone}`"><i></i>机械臂分拣工位 · {{ action }}</div>
    <p v-if="status === 'loading'" class="scene__msg">3D 模型加载中… {{ progress }}%</p>
    <p v-else-if="status === 'error'" class="scene__msg">3D 模型加载失败，请检查网络或浏览器 WebGL 支持</p>
    <p class="scene__hint">拖拽旋转 · 滚轮缩放</p>
  </div>
</template>

<style scoped>
.scene { position: relative; flex: 1; min-height: 0; overflow: hidden; background: radial-gradient(ellipse at 50% 60%, rgba(35, 200, 255, 0.14), transparent 65%); }
.scene__host { position: absolute; inset: 0; }
.scene__host :deep(.scene__canvas) { display: block; width: 100%; height: 100%; cursor: grab; }
.scene__tag { position: absolute; left: 14px; top: 12px; display: inline-flex; align-items: center; gap: 8px; padding: 4px 12px; font-size: 13px; color: var(--text-primary); background: rgba(8, 14, 24, 0.72); border-left: 3px solid var(--accent); }
.scene__tag i { width: 8px; height: 8px; border-radius: 50%; background: var(--accent); box-shadow: 0 0 8px var(--accent); }
.scene__tag.is-ok { border-left-color: var(--signal-pos); }
.scene__tag.is-ok i { background: var(--signal-pos); box-shadow: 0 0 8px var(--signal-pos); }
.scene__tag.is-ng { border-left-color: #ffb020; }
.scene__tag.is-ng i { background: #ffb020; box-shadow: 0 0 8px #ffb020; }
.scene__tag.is-halt { border-left-color: var(--signal-risk); }
.scene__tag.is-halt i { background: var(--signal-risk); box-shadow: 0 0 8px var(--signal-risk); }
.scene__msg { position: absolute; inset: 0; display: grid; place-items: center; margin: 0; font-size: 14px; color: var(--text-muted); pointer-events: none; }
.scene__hint { position: absolute; right: 14px; bottom: 8px; margin: 0; font-size: 11px; color: var(--text-muted); }
</style>
