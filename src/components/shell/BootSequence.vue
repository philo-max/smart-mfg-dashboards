<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { MODULES, MODULE_ORDER } from '@/data/modules'
import { useUiStore } from '@/stores/ui'

const emit = defineEmits<{ open: []; done: [] }>()

const LOAD_MS = 2300
const OPEN_MS = 950
const LINE_START_MS = 450
const LINE_STEP_MS = 290

const ui = useUiStore()
const CHECKS = [
  { code: 'PLC-LINK', label: '点位网关' },
  ...MODULE_ORDER.filter((id) => !ui.solo || id === ui.solo).map((id) => ({ code: MODULES[id].code, label: MODULES[id].name })),
]

const percent = ref(0)
const lines = ref(0)
const opening = ref(false)
const timers: number[] = []
let counter: number | null = null

const pad = computed(() => String(Math.min(100, Math.round(percent.value))).padStart(3, '0'))

function later(fn: () => void, ms: number) {
  timers.push(window.setTimeout(fn, ms))
}

function startOpen() {
  if (opening.value) return
  opening.value = true
  if (counter !== null) window.clearInterval(counter)
  percent.value = 100
  lines.value = CHECKS.length
  emit('open')
  later(() => emit('done'), OPEN_MS)
}

function skip() {
  startOpen()
}

onMounted(() => {
  const started = performance.now()
  counter = window.setInterval(() => {
    const t = (performance.now() - started) / LOAD_MS
    percent.value = 100 * (1 - Math.pow(1 - Math.min(1, t), 2.2))
    lines.value = Math.min(CHECKS.length, Math.max(0, Math.floor((performance.now() - started - LINE_START_MS) / LINE_STEP_MS) + 1))
  }, 40)
  later(startOpen, LOAD_MS)
  window.addEventListener('keydown', skip)
})

onBeforeUnmount(() => {
  if (counter !== null) window.clearInterval(counter)
  timers.splice(0).forEach((t) => window.clearTimeout(t))
  window.removeEventListener('keydown', skip)
})
</script>

<template>
  <div class="boot" :class="{ 'is-opening': opening }" role="presentation" @click="skip">
    <div class="boot__slab boot__slab--accent"></div>
    <div class="boot__slab boot__slab--deep">
      <div class="boot__grid"></div>
      <div class="boot__beam boot__beam--a"></div>
      <div class="boot__beam boot__beam--b"></div>
    </div>

    <div class="boot__content">
      <div class="boot__ring">
        <svg viewBox="0 0 200 200" aria-hidden="true">
          <circle class="ring ring--track" cx="100" cy="100" r="86" />
          <circle class="ring ring--fill" cx="100" cy="100" r="86" :stroke-dashoffset="540 - (540 * percent) / 100" />
          <circle class="ring ring--dash" cx="100" cy="100" r="70" />
          <circle class="ring ring--dash2" cx="100" cy="100" r="96" />
        </svg>
        <div class="boot__pct ak-num">{{ pad }}<small>%</small></div>
      </div>

      <div class="boot__head">
        <div class="boot__kicker ak-en">INTELLIGENT MANUFACTURING</div>
        <div class="boot__mask"><h1 class="boot__title">智能制造</h1></div>
        <div class="boot__mask boot__mask--sub"><div class="boot__sub">数据可视化综合平台 · LENOVO MINI LINE</div></div>
      </div>

      <ul class="boot__checks">
        <li v-for="(c, i) in CHECKS" :key="c.code" :class="{ 'is-shown': i < lines, 'is-ok': i < lines - 1 || opening }">
          <span class="ak-num">{{ c.code }}</span>
          <em>{{ c.label }}</em>
          <b class="ak-en">{{ i < lines - 1 || opening ? 'ONLINE' : 'LINKING' }}</b>
        </li>
      </ul>
    </div>

    <div class="boot__foot ak-en"><span>SYSTEM INITIALIZING</span><span>点击或按任意键跳过</span></div>
  </div>
</template>

<style scoped>
.boot {
  position: absolute;
  inset: 0;
  z-index: 70;
  overflow: hidden;
  cursor: pointer;
  --slant: -14deg;
}

.boot__slab {
  position: absolute;
  top: -10%;
  bottom: -10%;
  left: -18%;
  width: 136%;
  transform: skewX(var(--slant));
}

.boot__slab--accent {
  background:
    repeating-linear-gradient(-45deg, rgba(0, 0, 0, 0.12) 0 8px, transparent 8px 16px),
    linear-gradient(90deg, var(--accent), #0a5a8c);
}

.boot__slab--accent::after {
  content: '';
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  width: 2.4%;
  background: #eafcff;
  box-shadow: 0 0 50px 8px rgba(127, 227, 255, 0.9);
}

.boot__slab--deep {
  overflow: hidden;
  background: radial-gradient(ellipse at 30% 50%, #0c2340 0%, #050a14 65%);
  box-shadow: 0 0 80px rgba(35, 200, 255, 0.35);
}

.boot__grid {
  position: absolute;
  inset: 0;
  background:
    linear-gradient(rgba(35, 200, 255, 0.06) 1px, transparent 1px) 0 0 / 56px 56px,
    linear-gradient(90deg, rgba(35, 200, 255, 0.06) 1px, transparent 1px) 0 0 / 56px 56px;
}

.boot__beam {
  position: absolute;
  top: -20%;
  bottom: -20%;
  width: 180px;
  background: linear-gradient(90deg, transparent, rgba(35, 200, 255, 0.16), transparent);
  animation: beam 3.2s ease-in-out infinite alternate;
}

.boot__beam--a { left: 22%; }
.boot__beam--b { left: 58%; width: 90px; animation-delay: -1.4s; }

@keyframes beam { from { transform: translateX(-80px); } to { transform: translateX(160px); } }

.boot.is-opening .boot__slab--deep { animation: boot-out 0.62s cubic-bezier(0.7, 0, 0.2, 1) 0s both; }
.boot.is-opening .boot__slab--accent { animation: boot-out 0.62s cubic-bezier(0.7, 0, 0.2, 1) 0.14s both; }

@keyframes boot-out {
  from { transform: translateX(0) skewX(var(--slant)); }
  to { transform: translateX(108%) skewX(var(--slant)); }
}

.boot__content {
  position: absolute;
  inset: 0;
  display: grid;
  grid-template-columns: 420px 1fr 440px;
  align-items: center;
  padding: 0 170px 0 190px;
  gap: 60px;
}

.boot.is-opening .boot__content { animation: content-out 0.35s ease-in both; }

@keyframes content-out { to { opacity: 0; transform: translateX(80px); } }

.boot__ring { position: relative; width: 420px; height: 420px; animation: ring-in 0.8s cubic-bezier(0.2, 0.9, 0.2, 1) both; }

@keyframes ring-in { from { opacity: 0; transform: scale(0.7) rotate(-40deg); } to { opacity: 1; transform: none; } }

.boot__ring svg { width: 100%; height: 100%; transform: rotate(-90deg); overflow: visible; }

.ring { fill: none; }
.ring--track { stroke: rgba(35, 200, 255, 0.14); stroke-width: 4; }
.ring--fill { stroke: var(--accent); stroke-width: 6; stroke-dasharray: 540.4; filter: drop-shadow(0 0 8px rgba(35, 200, 255, 0.9)); transition: stroke-dashoffset 0.06s linear; }
.ring--dash { stroke: rgba(127, 227, 255, 0.4); stroke-width: 1.5; stroke-dasharray: 3 9; transform-origin: 100px 100px; animation: spin 9s linear infinite; }
.ring--dash2 { stroke: rgba(255, 210, 60, 0.5); stroke-width: 1.5; stroke-dasharray: 40 24 4 24; transform-origin: 100px 100px; animation: spin 14s linear infinite reverse; }

@keyframes spin { to { transform: rotate(360deg); } }

.boot__pct {
  position: absolute;
  inset: 0;
  display: grid;
  place-content: center;
  text-align: center;
  font-size: 110px;
  font-weight: 700;
  font-style: italic;
  color: #fff;
  text-shadow: 0 0 30px rgba(35, 200, 255, 0.7);
}

.boot__pct small { font-size: 36px; color: var(--accent); margin-left: 6px; }

.boot__kicker { font-size: 24px; letter-spacing: 0.5em; color: var(--accent); animation: fade 0.6s 0.2s both; }

@keyframes fade { from { opacity: 0; } to { opacity: 1; } }

.boot__mask { overflow: hidden; padding: 4px 0; }

.boot__title {
  font-size: 128px;
  font-weight: 800;
  font-style: italic;
  line-height: 1.1;
  letter-spacing: 0.06em;
  color: #fff;
  text-shadow: 6px 6px 0 rgba(35, 200, 255, 0.28), 0 0 50px rgba(35, 200, 255, 0.45);
  animation: title-rise 0.7s cubic-bezier(0.2, 0.9, 0.2, 1) 0.3s both;
}

.boot__sub { font-size: 22px; letter-spacing: 0.16em; line-height: 1.5; color: var(--text-secondary); font-style: italic; animation: title-rise 0.6s cubic-bezier(0.2, 0.9, 0.2, 1) 0.5s both; }

@keyframes title-rise { from { transform: translateY(115%); } to { transform: none; } }

.boot__checks {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.boot__checks li {
  display: grid;
  grid-template-columns: 110px 1fr 100px;
  align-items: center;
  gap: 12px;
  padding: 10px 16px;
  font-size: 22px;
  color: var(--text-muted);
  background: rgba(35, 200, 255, 0.05);
  border-left: 4px solid var(--border-strong);
  clip-path: polygon(0 0, 100% 0, calc(100% - 12px) 100%, 0 100%);
  opacity: 0;
  transform: translateX(-40px);
  transition: opacity 0.3s, transform 0.4s var(--ease-standard);
}

.boot__checks li.is-shown { opacity: 1; transform: none; border-left-color: var(--highlight); }
.boot__checks li.is-ok { border-left-color: var(--signal-pos); color: var(--text-primary); }
.boot__checks li em { font-style: normal; }
.boot__checks li b { text-align: right; font-size: 16px; color: var(--highlight); }
.boot__checks li.is-ok b { color: var(--signal-pos); }

.boot__foot {
  position: absolute;
  left: 190px;
  right: 170px;
  bottom: 48px;
  display: flex;
  justify-content: space-between;
  font-size: 15px;
  letter-spacing: 0.4em;
  color: var(--text-muted);
}
</style>
