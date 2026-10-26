<script setup lang="ts">
import { computed } from 'vue'
import AkPanel from '@/components/ui/AkPanel.vue'
import { MODULES } from '@/data/modules'
import type { ProcessSnapshot, ReadyLamp } from '../processSim'

const props = defineProps<{ snap: ProcessSnapshot }>()
const meta = MODULES.inspection

const LAMPS: { id: ReadyLamp; label: string; desc: string }[] = [
  { id: 'idle', label: '空载', desc: '工位无工件' },
  { id: 'ready', label: '到位待拍', desc: '触发拍照' },
  { id: 'busy', label: '检测中', desc: '采集 / 核对 / 分拣' },
  { id: 'timeout', label: '到位超时', desc: '定位失败停线' },
]
const rows = computed(() => [
  { k: '压力传感器', v: `${props.snap.locate.pressure} kPa`, ok: true },
  { k: '红外传感器', v: props.snap.locate.infrared ? '检测到目标' : '未检测到目标', ok: props.snap.locate.infrared },
  { k: '定位偏差', v: `${props.snap.locate.offset.toFixed(2)} mm`, ok: props.snap.locate.offset < 0.1 },
])
</script>

<template>
  <AkPanel title="前置定位状态" en="LOCATE · STEP 1" :color="meta.color">
    <template #actions>
      <span class="state ak-num" :class="snap.locate.ok ? 'is-ok' : 'is-bad'">{{ snap.locate.ok ? '定位成功' : '定位失败' }}</span>
    </template>
    <ul class="rows">
      <li v-for="r in rows" :key="r.k">
        <span>{{ r.k }}</span><b class="ak-num" :class="r.ok ? 'is-ok' : 'is-bad'">{{ r.v }}</b>
      </li>
    </ul>
  </AkPanel>
  <AkPanel title="到位触发指示" en="STATION READY · STEP 2" :color="meta.color">
    <div class="lamps">
      <div v-for="l in LAMPS" :key="l.id" class="lamp" :class="[`lamp--${l.id}`, { 'is-on': snap.ready === l.id }]">
        <i></i><b>{{ l.label }}</b><small>{{ l.desc }}</small>
      </div>
    </div>
  </AkPanel>
</template>

<style scoped>
.rows { margin: 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: 8px; }
.rows li { display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; font-size: 14px; color: var(--text-secondary); background: var(--bg-panel-2); }
.rows b { font-size: 16px; }
.is-ok { color: var(--signal-pos); }
.is-bad { color: var(--signal-risk); }
.state { font-size: 13px; }

.lamps { flex: 1; display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
.lamp { --c: var(--text-muted); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; padding: 8px 4px; text-align: center; background: var(--bg-panel-2); border: 1px solid transparent; opacity: 0.55; }
.lamp i { width: 16px; height: 16px; border-radius: 50%; background: var(--c); opacity: 0.45; }
.lamp b { font-size: 14px; color: var(--text-primary); }
.lamp small { font-size: 11px; color: var(--text-muted); }
.lamp--ready { --c: #ffb020; }
.lamp--busy { --c: var(--signal-pos); }
.lamp--timeout { --c: var(--signal-risk); }
.lamp.is-on { opacity: 1; border-color: var(--c); }
.lamp.is-on i { opacity: 1; box-shadow: 0 0 12px var(--c); }
</style>
