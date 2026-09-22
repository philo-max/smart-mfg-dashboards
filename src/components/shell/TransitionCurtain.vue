<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { HUB_META, MODULES, MODULE_ORDER } from '@/data/modules'
import { useUiStore } from '@/stores/ui'

const COMMIT_AFTER_MS = 640
const FINISH_AFTER_MS = 620

const ui = useUiStore()
const timers: number[] = []
const shownTo = ref(ui.view)

const meta = computed(() => {
  if (shownTo.value === 'overview') {
    return { name: HUB_META.name, en: HUB_META.en, code: HUB_META.code, color: HUB_META.color, sub: 'BASE OVERVIEW' }
  }
  const m = MODULES[shownTo.value]
  return { name: m.name, en: m.en, code: m.code, color: m.color, sub: m.desc }
})

const dir = computed(() => (shownTo.value === 'overview' ? -1 : 1))

const roomIndex = computed(() => {
  const i = shownTo.value === 'overview' ? 0 : MODULE_ORDER.indexOf(shownTo.value) + 1
  return String(i).padStart(2, '0')
})

function later(fn: () => void, ms: number) {
  timers.push(window.setTimeout(fn, ms))
}

function clearTimers() {
  timers.splice(0).forEach((t) => window.clearTimeout(t))
}

watch(
  () => ui.phase,
  (phase) => {
    clearTimers()
    if (phase === 'cover' && ui.target) {
      shownTo.value = ui.target.to
      later(() => ui.commit(), COMMIT_AFTER_MS)
    } else if (phase === 'reveal') {
      later(() => ui.finish(), FINISH_AFTER_MS)
    }
  },
)

onMounted(() => ui.setCurtainReady(true))

onBeforeUnmount(() => {
  clearTimers()
  ui.setCurtainReady(false)
})
</script>

<template>
  <div
    v-if="ui.phase !== 'idle'"
    class="curtain"
    :class="`is-${ui.phase}`"
    :style="{ '--room': meta.color, '--dir': dir }"
    aria-hidden="true"
  >
    <div class="slab slab--room"></div>
    <div class="slab slab--deep">
      <div class="deep__grid"></div>
    </div>
    <div class="shard shard--a"></div>
    <div class="shard shard--b"></div>
    <div class="index ak-num"><small>ROOM</small><b>{{ roomIndex }}</b></div>
    <div class="title">
      <span class="title__code ak-num"><b></b>{{ meta.code }}</span>
      <div class="title__ghost ak-num">{{ meta.en }}</div>
      <div class="title__mask"><h2 class="title__name">{{ meta.name }}</h2></div>
      <div class="title__mask title__mask--en"><span class="title__en ak-en">{{ meta.en }} · {{ meta.sub }}</span></div>
      <div class="title__bar"><i></i></div>
    </div>
  </div>
</template>

<style scoped>
.curtain {
  position: absolute;
  inset: 0;
  z-index: 60;
  overflow: hidden;
  pointer-events: auto;
  --slant: -14deg;
  --sweep: 0.5s;
}

.slab {
  position: absolute;
  top: -10%;
  bottom: -10%;
  left: -18%;
  width: 136%;
  transform-origin: 50% 50%;
}

.slab--room {
  background:
    repeating-linear-gradient(-45deg, rgba(0, 0, 0, 0.12) 0 8px, transparent 8px 16px),
    linear-gradient(90deg, var(--room), color-mix(in srgb, var(--room) 60%, #000));
}

.slab--room::before,
.slab--room::after {
  content: '';
  position: absolute;
  top: 0;
  bottom: 0;
  width: 2.4%;
}

.slab--room::before { left: 0; background: var(--accent); box-shadow: 0 0 40px rgba(35, 200, 255, 0.9); }
.slab--room::after { right: 0; background: #eafcff; box-shadow: 0 0 50px 8px rgba(127, 227, 255, 0.9); }

.slab--deep {
  background: linear-gradient(115deg, #050a14 30%, #0a1a30 70%, #061021);
  box-shadow: 0 0 80px rgba(35, 200, 255, 0.35);
  overflow: hidden;
}

.deep__grid {
  position: absolute;
  inset: 0;
  background:
    linear-gradient(rgba(35, 200, 255, 0.07) 1px, transparent 1px) 0 0 / 48px 48px,
    linear-gradient(90deg, rgba(35, 200, 255, 0.07) 1px, transparent 1px) 0 0 / 48px 48px;
}

.is-cover .slab--room { animation: sweep-in var(--sweep) cubic-bezier(0.7, 0, 0.2, 1) 0.12s both; }
.is-cover .slab--deep { animation: sweep-in var(--sweep) cubic-bezier(0.7, 0, 0.2, 1) 0.2s both; }

.is-reveal .slab--room { animation: sweep-out 0.56s cubic-bezier(0.7, 0, 0.2, 1) 0.14s both; transform: translateX(0) skewX(var(--slant)); }
.is-reveal .slab--deep { animation: sweep-out 0.56s cubic-bezier(0.7, 0, 0.2, 1) 0s both; transform: translateX(0) skewX(var(--slant)); }

@keyframes sweep-in {
  from { transform: translateX(calc(-105% * var(--dir))) skewX(var(--slant)); }
  to { transform: translateX(0) skewX(var(--slant)); }
}

@keyframes sweep-out {
  from { transform: translateX(0) skewX(var(--slant)); }
  to { transform: translateX(calc(105% * var(--dir))) skewX(var(--slant)); }
}

.shard {
  position: absolute;
  top: -10%;
  bottom: -10%;
  transform: skewX(var(--slant));
  background: linear-gradient(180deg, transparent, color-mix(in srgb, var(--room) 55%, transparent), transparent);
  opacity: 0;
}

.shard--a { left: 62%; width: 10px; }
.shard--b { left: 66%; width: 42px; }

.is-cover .shard { animation: shard-in 0.6s ease-out 0.5s both; }

@keyframes shard-in { from { opacity: 0; transform: translateX(calc(-200px * var(--dir))) skewX(var(--slant)); } to { opacity: 1; transform: skewX(var(--slant)); } }

.index {
  position: absolute;
  right: 130px;
  top: 50%;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  transform: translateY(-50%);
  font-style: italic;
  line-height: 0.9;
}

.index small { font-size: 34px; letter-spacing: 0.6em; color: var(--accent-strong); margin-right: -0.6em; }

.index b {
  font-size: 440px;
  font-weight: 800;
  background: linear-gradient(180deg, #fff 0%, var(--room) 55%, transparent 100%);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  filter: drop-shadow(0 0 40px color-mix(in srgb, var(--room) 50%, transparent));
}

.is-cover .index { animation: index-in 0.7s cubic-bezier(0.2, 0.9, 0.2, 1) 0.46s both; }
.is-reveal .index { animation: title-out 0.32s ease-in 0s both; }

@keyframes index-in { from { opacity: 0; transform: translateY(-50%) translateX(calc(140px * var(--dir))); } to { opacity: 1; transform: translateY(-50%); } }

.title {
  position: absolute;
  left: 150px;
  top: 50%;
  width: 1500px;
  transform: translateY(-50%);
  color: #fff;
}

.is-cover .title { animation: title-in 0.3s linear 0.42s both; }
.is-reveal .title { animation: title-out 0.32s ease-in 0s both; }

@keyframes title-in { from { opacity: 0; } to { opacity: 1; } }
@keyframes title-out { from { opacity: 1; } to { opacity: 0; transform: translateY(-50%) translateX(calc(60px * var(--dir))); } }

.title__code {
  display: flex;
  align-items: center;
  gap: 14px;
  font-size: 28px;
  letter-spacing: 0.4em;
  color: var(--room);
}

.title__code b {
  width: 64px;
  height: 4px;
  background: var(--room);
  box-shadow: 0 0 12px var(--room);
}

.title__ghost {
  position: absolute;
  left: -20px;
  top: -70px;
  font-size: 300px;
  font-style: italic;
  font-weight: 700;
  line-height: 1;
  letter-spacing: -0.02em;
  white-space: nowrap;
  color: transparent;
  -webkit-text-stroke: 2px rgba(127, 227, 255, 0.24);
  z-index: -1;
}

.is-cover .title__ghost { animation: ghost-in 0.7s cubic-bezier(0.2, 0.8, 0.2, 1) 0.42s both; }

@keyframes ghost-in { from { transform: translateX(calc(-120px * var(--dir))); opacity: 0; } to { transform: none; opacity: 1; } }

.title__mask {
  overflow: hidden;
  padding: 6px 0;
}

.title__name {
  font-size: 150px;
  font-weight: 800;
  line-height: 1.1;
  letter-spacing: 0.06em;
  font-style: italic;
  text-shadow: 6px 6px 0 rgba(0, 0, 0, 0.35), 0 0 40px color-mix(in srgb, var(--room) 60%, transparent);
  transform: skewX(-8deg);
}

.is-cover .title__name { animation: rise 0.5s cubic-bezier(0.2, 0.9, 0.2, 1) 0.46s both; }
.is-cover .title__en { animation: rise 0.5s cubic-bezier(0.2, 0.9, 0.2, 1) 0.58s both; }

@keyframes rise { from { transform: translateY(115%) skewX(-8deg); } to { transform: translateY(0) skewX(-8deg); } }

.title__mask--en { margin-top: 4px; }

.title__en {
  display: inline-block;
  font-size: 30px;
  letter-spacing: 0.34em;
  color: var(--accent-strong);
  transform: skewX(-8deg);
}

.title__bar {
  margin-top: 30px;
  width: 620px;
  height: 6px;
  background: rgba(255, 255, 255, 0.12);
  clip-path: polygon(0 0, 100% 0, calc(100% - 6px) 100%, 0 100%);
}

.title__bar i {
  display: block;
  height: 100%;
  background: linear-gradient(90deg, var(--room), #fff);
  box-shadow: 0 0 16px var(--room);
  transform-origin: left center;
}

.is-cover .title__bar i { animation: fill 0.6s cubic-bezier(0.5, 0, 0.2, 1) 0.5s both; }
.is-reveal .title__bar i { transform: scaleX(1); }

@keyframes fill { from { transform: scaleX(0); } to { transform: scaleX(1); } }
</style>
