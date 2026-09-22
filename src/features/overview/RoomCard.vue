<script setup lang="ts">
import { computed } from 'vue'
import { Bell, ChevronRight } from '@lucide/vue'
import SignalLight from '@/components/ui/SignalLight.vue'
import { useCountUp } from '@/components/motion/useCountUp'
import Sparkline from '@/components/ui/Sparkline.vue'
import type { ModuleMeta } from '@/data/modules'
import type { RoomSummary } from '@/data/sim/selectors'
import { lightOf } from '@/data/sim/selectors'
import type { Level } from '@/data/sim/types'

const props = defineProps<{ meta: ModuleMeta; summary: RoomSummary; level: Level; alarmCount: number }>()
const emit = defineEmits<{ enter: [] }>()

const light = computed(() => lightOf(props.level))
const headline = useCountUp(() => props.summary.headline.value)
const effTone = computed(() => (props.summary.efficiency < 75 ? 'is-warn' : ''))
</script>

<template>
  <button
    type="button"
    class="room"
    :class="`is-${level}`"
    :style="{ '--room': meta.color }"
    :aria-label="`进入${meta.name}`"
    @click="emit('enter')"
  >
    <component :is="meta.icon" class="room__watermark" :size="170" aria-hidden="true" />

    <header class="room__head">
      <span class="room__type">{{ meta.room }}</span>
      <span class="room__code ak-num">{{ meta.code }}</span>
      <span class="room__lv ak-num">Lv.{{ meta.level }}</span>
      <SignalLight :light="light" class="room__light" />
    </header>

    <div class="room__names">
      <h2>{{ meta.name }}</h2>
      <span class="ak-en">{{ meta.en }}</span>
    </div>

    <div class="room__headline">
      <span class="room__hl-label">{{ summary.headline.label }}</span>
      <b class="ak-num">{{ headline }}<small>{{ summary.headline.unit }}</small></b>
    </div>

    <dl class="room__secondary">
      <div v-for="s in summary.secondary" :key="s.label">
        <dt>{{ s.label }}</dt>
        <dd class="ak-num">{{ s.value }}</dd>
      </div>
    </dl>

    <div class="room__eff" :class="effTone">
      <span>设备效率 OEE</span>
      <b class="ak-num">{{ summary.efficiency }}%</b>
      <i><em :style="{ width: `${summary.efficiency}%` }"></em></i>
    </div>

    <Sparkline :spark="summary.spark" :color="meta.color" />

    <ul class="room__slots" aria-label="工位与设备">
      <li v-for="slot in summary.slots" :key="slot.id" :class="`is-${slot.level}`" :title="slot.id">
        <span class="ak-num">{{ slot.label }}</span>
      </li>
    </ul>

    <footer class="room__foot">
      <span>{{ meta.desc }}</span>
      <span class="room__enter">进入 <ChevronRight :size="14" /></span>
    </footer>

    <span v-if="alarmCount > 0" class="room__alarm" :class="`is-${level}`">
      <Bell :size="14" /><b class="ak-num">{{ alarmCount }}</b>
    </span>
  </button>
</template>

<style scoped>
.room {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 0 18px 16px;
  text-align: left;
  overflow: hidden;
  background:
    repeating-linear-gradient(-45deg, rgba(255, 255, 255, 0.015) 0 10px, transparent 10px 20px),
    linear-gradient(180deg, rgba(20, 34, 56, 0.95), rgba(9, 15, 26, 0.95));
  border: 1px solid var(--border-strong);
  border-top: 4px solid var(--room);
  clip-path: polygon(0 0, 100% 0, 100% calc(100% - 20px), calc(100% - 20px) 100%, 0 100%);
  transition: transform var(--motion-fast) var(--ease-standard), box-shadow var(--motion-fast), border-color var(--motion-fast);
}

.room:hover,
.room:focus-visible {
  transform: translateY(-3px);
  border-color: var(--room);
  box-shadow: inset 0 0 40px color-mix(in srgb, var(--room) 18%, transparent);
}

.room::after {
  content: '';
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  width: 34%;
  background: linear-gradient(100deg, transparent, rgba(255, 255, 255, 0.13), transparent);
  transform: translateX(-160%) skewX(-14deg);
  pointer-events: none;
}

.room:hover::after,
.room:focus-visible::after { animation: room-sheen 0.9s ease-out; }

@keyframes room-sheen { to { transform: translateX(420%) skewX(-14deg); } }

.room.is-risk { border-color: var(--signal-risk); animation: ak-alarm-pulse 1.4s ease-in-out infinite; }

.room__watermark {
  position: absolute;
  right: -24px;
  bottom: 40px;
  color: var(--room);
  opacity: 0.06;
  pointer-events: none;
}

.room__head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 -18px;
  padding: 8px 18px;
  background: rgba(0, 0, 0, 0.35);
}

.room__type {
  font-size: 12px;
  font-weight: 700;
  padding: 2px 8px;
  color: #0a0c0f;
  background: var(--room);
}

.room__code,
.room__lv { font-size: 13px; color: var(--text-secondary); }
.room__lv { color: var(--highlight); }
.room__light { margin-left: auto; }

.room__names h2 {
  font-size: 26px;
  letter-spacing: 0.08em;
}

.room__headline {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.room__hl-label { font-size: 13px; color: var(--text-secondary); }

.room__headline b {
  font-size: 46px;
  line-height: 1;
  color: var(--room);
  text-shadow: 0 0 18px color-mix(in srgb, var(--room) 45%, transparent);
}

.room__headline small { font-size: 18px; margin-left: 2px; }

.room__secondary {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin: 0;
}

.room__secondary div {
  padding: 6px 10px;
  background: rgba(0, 0, 0, 0.3);
  border-left: 2px solid var(--border-strong);
}

.room__secondary dt { font-size: 11px; color: var(--text-muted); }
.room__secondary dd { margin: 0; font-size: 20px; }

.room__eff {
  display: grid;
  grid-template-columns: 1fr auto;
  row-gap: 6px;
  font-size: 12px;
  color: var(--text-secondary);
}

.room__eff b { font-size: 15px; color: var(--text-primary); }

.room__eff i {
  grid-column: 1 / -1;
  height: 6px;
  background: rgba(127, 200, 255, 0.06);
}

.room__eff em {
  display: block;
  height: 100%;
  background: var(--room);
  transition: width 0.6s var(--ease-standard);
}

.room__eff.is-warn b { color: var(--signal-warn); }
.room__eff.is-warn em { background: var(--signal-warn); }

.room__slots {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.room__slots li {
  width: 38px;
  height: 38px;
  display: grid;
  place-items: center;
  font-size: 13px;
  background: rgba(160, 205, 255, 0.07);
  border: 1px solid var(--border-strong);
  border-bottom: 3px solid var(--signal-pos);
}

.room__slots li.is-warn { border-bottom-color: var(--signal-warn); }
.room__slots li.is-risk { border-bottom-color: var(--signal-risk); background: var(--signal-risk-soft); }

.room__foot {
  margin-top: auto;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
  color: var(--text-muted);
}

.room__enter {
  display: inline-flex;
  align-items: center;
  color: var(--room);
  font-weight: 700;
}

.room__alarm {
  position: absolute;
  top: 44px;
  right: 14px;
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 3px 8px;
  font-size: 13px;
  color: #0a0c0f;
  background: var(--signal-warn);
}

.room__alarm.is-risk {
  background: var(--signal-risk);
  color: #fff;
  animation: ak-blink 1s steps(2) infinite;
}
</style>
