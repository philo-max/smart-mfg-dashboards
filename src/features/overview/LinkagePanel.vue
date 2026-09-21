<script setup lang="ts">
import { computed } from 'vue'
import AkPanel from '@/components/ui/AkPanel.vue'
import type { ModuleId } from '@/data/modules'
import { DWELL_HOT_MIN, FPY_THRESHOLD, REWORK_THRESHOLD, TAKT_TARGET, TRANSPORT_LATE_S } from '@/data/sim/constants'
import { equipmentOf, inspectionTotals } from '@/data/sim/selectors'
import { usePlantStore } from '@/stores/plant'
import { useUiStore } from '@/stores/ui'

interface Step {
  label: string
  module: ModuleId
  active: boolean
}

const plant = usePlantStore()
const ui = useUiStore()

const chains = computed<{ name: string; steps: Step[] }[]>(() => {
  const s = plant.state
  const lastTransport = s.logistics.transport[s.logistics.transport.length - 1]
  return [
    {
      name: '物流链',
      steps: [
        { label: 'AGV 阻塞', module: 'agv', active: s.agv.agvs.some((a) => a.status === 'blocked') },
        { label: '装配缺料', module: 'assembly', active: s.assembly.taktElapsed > TAKT_TARGET },
        { label: '运输超时', module: 'logistics', active: lastTransport.seconds > TRANSPORT_LATE_S },
        { label: '准时率↓', module: 'logistics', active: plant.kpis.onTime < 95 },
      ],
    },
    {
      name: '质量链',
      steps: [
        { label: '机器人故障', module: 'assembly', active: equipmentOf(s, 'assembly').availability < 0.85 || s.assembly.driftTicks > 0 },
        { label: '检测 NG↑', module: 'inspection', active: inspectionTotals(s).lastHourFpy < FPY_THRESHOLD },
        { label: '返工超标', module: 'assembly', active: plant.kpis.rework > REWORK_THRESHOLD },
      ],
    },
    {
      name: '库存链',
      steps: [
        { label: '入库堆积', module: 'warehouse', active: plant.kpis.inventory >= 11 },
        { label: '工位呆滞', module: 'warehouse', active: s.warehouse.cells.some((c) => c.dwellMin >= DWELL_HOT_MIN) },
      ],
    },
  ]
})
</script>

<template>
  <AkPanel title="联动态势" en="LINKAGE">
    <div class="chains">
      <div v-for="c in chains" :key="c.name" class="chain">
        <span class="chain__name">{{ c.name }}</span>
        <template v-for="(step, i) in c.steps" :key="step.label">
          <span v-if="i > 0" class="chain__arrow" :class="{ 'is-hot': step.active && c.steps[i - 1].active }" aria-hidden="true">›</span>
          <button type="button" class="chain__step" :class="{ 'is-active': step.active }" @click="ui.navigate(step.module)">
            {{ step.label }}
          </button>
        </template>
      </div>
    </div>
  </AkPanel>
</template>

<style scoped>
.chains {
  display: flex;
  flex-direction: column;
  justify-content: space-around;
  flex: 1;
  gap: 8px;
}

.chain {
  display: flex;
  align-items: center;
  gap: 5px;
}

.chain__name {
  width: 48px;
  flex-shrink: 0;
  font-size: 12px;
  color: var(--text-muted);
}

.chain__step {
  flex: 1;
  padding: 5px 0;
  font-size: 12px;
  background: rgba(233, 237, 241, 0.04);
  border: 1px solid var(--border);
  color: var(--text-secondary);
  white-space: nowrap;
}

.chain__step.is-active {
  color: #fff;
  border-color: var(--signal-risk);
  background: var(--signal-risk-soft);
  box-shadow: 0 0 10px rgba(255, 70, 85, 0.35);
}

.chain__arrow {
  color: var(--text-muted);
  font-size: 16px;
}

.chain__arrow.is-hot {
  color: var(--signal-risk);
  animation: ak-blink 0.9s steps(2) infinite;
}
</style>
