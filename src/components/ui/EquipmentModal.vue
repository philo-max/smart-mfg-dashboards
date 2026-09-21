<script setup lang="ts">
import { computed } from 'vue'
import AkModal from './AkModal.vue'
import StatTile from './StatTile.vue'
import EChart from '@/components/charts/EChart.vue'
import { gauge } from '@/components/charts/theme'
import { oeeOf } from '@/data/sim/selectors'
import { OEE_WARN } from '@/data/sim/constants'
import type { Equipment } from '@/data/sim/types'

/** 设备 OEE 拆解 + 故障记录（故障码取自 PLC 点位 Alarm_*） */
const props = defineProps<{ equipment: Equipment | null; color?: string }>()
const emit = defineEmits<{ close: [] }>()

const open = computed({
  get: () => props.equipment !== null,
  set: (v) => { if (!v) emit('close') },
})
const oee = computed(() => (props.equipment ? oeeOf(props.equipment) : 0))
const pct = (v: number) => (v * 100).toFixed(1)
</script>

<template>
  <AkModal v-model:open="open" :title="equipment ? `${equipment.name} · 故障记录` : ''" :en="equipment?.id" :width="1000" :height="620" :color="color">
    <template v-if="equipment">
      <div class="eq">
        <div class="eq__gauge"><EChart :option="gauge(oee, '设备 OEE')" /></div>
        <div class="eq__parts">
          <StatTile label="可用率" en="AVAILABILITY" :value="pct(equipment.availability)" unit="%" :level="equipment.availability < 0.85 ? 'warn' : 'normal'" />
          <StatTile label="性能率" en="PERFORMANCE" :value="pct(equipment.performance)" unit="%" />
          <StatTile label="合格率" en="QUALITY" :value="pct(equipment.quality)" unit="%" />
          <StatTile label="OEE" :value="oee" unit="%" :level="oee < OEE_WARN ? 'warn' : 'normal'" hint="OEE = 可用率 × 性能率 × 合格率" />
        </div>
      </div>
      <div class="faults scroll-y">
        <table>
          <thead><tr><th>发生时间</th><th>故障码（点位）</th><th>故障描述</th><th>停机时长</th></tr></thead>
          <tbody>
            <tr v-for="(f, i) in equipment.faults" :key="i" :class="{ 'is-latest': i === 0 }">
              <td class="ak-num">{{ f.time }}</td>
              <td class="mono">{{ f.code }}</td>
              <td>{{ f.desc }}</td>
              <td class="ak-num">{{ f.minutes }} min</td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>
  </AkModal>
</template>

<style scoped>
.eq {
  display: grid;
  grid-template-columns: 320px 1fr;
  gap: 16px;
  height: 250px;
}

.eq__parts {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.faults {
  flex: 1;
}

table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}

th,
td {
  padding: 9px 12px;
  text-align: left;
  border-bottom: 1px solid var(--border);
}

th {
  position: sticky;
  top: 0;
  background: var(--bg-elevated);
  color: var(--text-secondary);
  font-weight: 400;
  font-size: 12px;
}

.mono {
  font-family: var(--font-mono);
  color: var(--signal-warn);
}

tr.is-latest td {
  background: var(--signal-risk-soft);
}
</style>
