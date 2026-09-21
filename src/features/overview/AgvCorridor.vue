<script setup lang="ts">
import { computed } from 'vue'
import { BatteryCharging, ChevronRight } from '@lucide/vue'
import SignalLight from '@/components/ui/SignalLight.vue'
import { MODULES } from '@/data/modules'
import { lightOf } from '@/data/sim/selectors'
import type { Agv } from '@/data/sim/types'
import { usePlantStore } from '@/stores/plant'
import { useUiStore } from '@/stores/ui'

/** 停靠点横向位置（%），与上方五列房间中心对齐：物流 / 充电(中枢下方) / 装配 / 检测 */
const STOP_X = { logistics: 30, charge: 50, assembly: 70, inspection: 90 } as const
const ROUTE_SPAN: Record<string, [number, number, 'out' | 'back']> = {
  R1: [STOP_X.logistics, STOP_X.assembly, 'out'],
  R2: [STOP_X.assembly, STOP_X.inspection, 'out'],
  R3: [STOP_X.inspection, STOP_X.logistics, 'back'],
  R4: [STOP_X.logistics, STOP_X.charge, 'out'],
  R5: [STOP_X.charge, STOP_X.logistics, 'back'],
}
const STOPS = [
  { name: '物流工位', x: STOP_X.logistics },
  { name: '充电工位', x: STOP_X.charge },
  { name: '装配工位', x: STOP_X.assembly },
  { name: '检测工位', x: STOP_X.inspection },
]

const plant = usePlantStore()
const ui = useUiStore()
const meta = MODULES.agv
const room = computed(() => plant.rooms.agv)

function place(agv: Agv) {
  if (agv.status === 'charging') return { left: `${STOP_X.charge}%`, lane: 'charge' }
  const [from, to, lane] = ROUTE_SPAN[agv.routeId] ?? ROUTE_SPAN.R1
  const p = Math.min(1, agv.progress)
  return { left: `${from + (to - from) * p}%`, lane }
}

const markers = computed(() => plant.state.agv.agvs.map((a) => ({ agv: a, ...place(a) })))
</script>

<template>
  <section class="corridor" :style="{ '--room': meta.color }">
    <button type="button" class="corridor__info" :aria-label="`进入${meta.name}`" @click="ui.navigate('agv')">
      <header>
        <span class="corridor__type">{{ meta.room }}</span>
        <span class="ak-num corridor__code">{{ meta.code }}</span>
        <SignalLight :light="lightOf(plant.levels.agv)" />
      </header>
      <h2>{{ meta.name }}</h2>
      <span class="ak-en">{{ meta.en }} · MOMA</span>
      <b class="ak-num">{{ room.headline.value }}<small>%</small></b>
      <span class="corridor__sub">{{ room.headline.label }} · 运行 {{ room.secondary[0].value }} · 阻塞 {{ room.secondary[1].value }}</span>
      <span class="corridor__enter">进入 <ChevronRight :size="14" /></span>
    </button>

    <div class="track" aria-label="AGV 运输走廊">
      <div class="track__lane track__lane--out"><span class="ak-en">OUTBOUND · 送料</span></div>
      <div class="track__lane track__lane--back"><span class="ak-en">RETURN · 回程</span></div>
      <div v-for="s in STOPS" :key="s.name" class="track__stop" :style="{ left: `${s.x}%` }">
        <span>{{ s.name }}</span>
      </div>
      <div class="track__bay" :style="{ left: `${STOP_X.charge}%` }"><BatteryCharging :size="16" /></div>
      <button
        v-for="m in markers"
        :key="m.agv.id"
        type="button"
        class="agv"
        :class="[`is-${m.agv.status}`, `lane-${m.lane}`]"
        :style="{ left: m.left }"
        :title="`${m.agv.id} · ${m.agv.task} · 电量 ${Math.round(m.agv.battery)}%`"
        @click="ui.navigate('agv', m.agv.id)"
      >
        <span class="ak-num">{{ m.agv.id.slice(-2) }}</span>
      </button>
    </div>
  </section>
</template>

<style scoped>
.corridor {
  display: grid;
  grid-template-columns: 250px 1fr;
  min-height: 0;
  background: linear-gradient(180deg, rgba(20, 26, 32, 0.95), rgba(10, 13, 17, 0.95));
  border: 1px solid var(--border-strong);
  border-top: 4px solid var(--room);
}

.corridor__info {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 0 16px 12px;
  text-align: left;
  background: rgba(0, 0, 0, 0.3);
  border: 0;
  border-right: 1px solid var(--border);
}

.corridor__info:hover { background: color-mix(in srgb, var(--room) 10%, transparent); }

.corridor__info header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 -16px 6px;
  padding: 8px 16px;
  background: rgba(0, 0, 0, 0.35);
}

.corridor__type {
  font-size: 12px;
  font-weight: 700;
  padding: 2px 8px;
  color: #0a0c0f;
  background: var(--room);
}

.corridor__code { font-size: 13px; color: var(--text-secondary); margin-right: auto; }
.corridor__info h2 { font-size: 22px; letter-spacing: 0.08em; }

.corridor__info b {
  margin-top: 6px;
  font-size: 38px;
  line-height: 1;
  color: var(--room);
}

.corridor__info b small { font-size: 16px; }
.corridor__sub { font-size: 12px; color: var(--text-secondary); }

.corridor__enter {
  margin-top: auto;
  display: inline-flex;
  align-items: center;
  font-size: 12px;
  font-weight: 700;
  color: var(--room);
}

.track {
  position: relative;
  margin: 0 20px;
}

.track__lane {
  position: absolute;
  left: 0;
  right: 0;
  height: 30px;
  border-top: 1px dashed var(--border-strong);
  border-bottom: 1px dashed var(--border-strong);
  background: repeating-linear-gradient(90deg, rgba(139, 220, 58, 0.06) 0 24px, transparent 24px 48px);
  animation: lane-flow 1.6s linear infinite;
}

.track__lane span {
  position: absolute;
  left: 6px;
  top: 8px;
  font-size: 10px;
}

.track__lane--out { top: 42px; }
.track__lane--back { top: 102px; animation-direction: reverse; }

@keyframes lane-flow {
  to { background-position: 48px 0; }
}

.track__stop {
  position: absolute;
  top: 14px;
  bottom: 30px;
  width: 0;
  border-left: 2px solid var(--room);
  opacity: 0.8;
}

.track__stop span {
  position: absolute;
  bottom: -26px;
  left: 50%;
  transform: translateX(-50%);
  white-space: nowrap;
  font-size: 12px;
  color: var(--text-secondary);
  padding: 2px 8px;
  background: var(--bg-elevated);
}

.track__bay {
  position: absolute;
  top: 150px;
  transform: translateX(-50%);
  color: var(--signal-warn);
}

.agv {
  position: absolute;
  transform: translate(-50%, 0);
  width: 44px;
  height: 24px;
  display: grid;
  place-items: center;
  font-size: 12px;
  font-weight: 700;
  color: #0a0c0f;
  background: var(--room);
  border: 0;
  clip-path: polygon(0 0, 78% 0, 100% 50%, 78% 100%, 0 100%);
  transition: left 1.9s linear;
  box-shadow: 0 0 10px var(--room);
}

.agv.lane-out { top: 45px; }
.agv.lane-back { top: 105px; clip-path: polygon(22% 0, 100% 0, 100% 100%, 22% 100%, 0 50%); }
.agv.lane-charge { top: 170px; background: var(--signal-warn); clip-path: none; }
.agv.is-blocked { background: var(--signal-risk); animation: ak-blink 0.8s steps(2) infinite; }
.agv:hover { outline: 2px solid var(--highlight); }
</style>
