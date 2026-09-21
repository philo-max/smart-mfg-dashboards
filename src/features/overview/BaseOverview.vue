<script setup lang="ts">
import { computed } from 'vue'
import AkPanel from '@/components/ui/AkPanel.vue'
import StatTile from '@/components/ui/StatTile.vue'
import RoomCard from './RoomCard.vue'
import HubCard from './HubCard.vue'
import AgvCorridor from './AgvCorridor.vue'
import AlarmCenter from './AlarmCenter.vue'
import LinkagePanel from './LinkagePanel.vue'
import { MODULES, type ModuleId } from '@/data/modules'
import { FPY_THRESHOLD, REWORK_THRESHOLD } from '@/data/sim/constants'
import { usePlantStore } from '@/stores/plant'
import { useUiStore } from '@/stores/ui'

const plant = usePlantStore()
const ui = useUiStore()

/** 上层房间：左侧物料入口（仓库、物流），右侧加工（装配、检测），中枢居中 */
const LEFT: ModuleId[] = ['warehouse', 'logistics']
const RIGHT: ModuleId[] = ['assembly', 'inspection']

const alarmCounts = computed(() => {
  const counts: Record<string, number> = {}
  for (const a of plant.alarms) if (a.status !== 'resolved') counts[a.module] = (counts[a.module] ?? 0) + 1
  return counts
})
</script>

<template>
  <div class="overview">
    <section class="base">
      <header class="base__head">
        <span class="base__bar ak-hazard" aria-hidden="true"></span>
        <h2>基建布局</h2>
        <span class="ak-en">BASE LAYOUT · 物料流向 仓库 → 物流 → AGV → 装配 → 检测 → 物流出库</span>
        <span class="base__tip">点击房间进入模块</span>
      </header>
      <div class="base__rooms">
        <RoomCard
          v-for="id in LEFT"
          :key="id"
          :meta="MODULES[id]"
          :summary="plant.rooms[id]"
          :level="plant.levels[id]"
          :alarm-count="alarmCounts[id] ?? 0"
          @enter="ui.navigate(id)"
        />
        <HubCard />
        <RoomCard
          v-for="id in RIGHT"
          :key="id"
          :meta="MODULES[id]"
          :summary="plant.rooms[id]"
          :level="plant.levels[id]"
          :alarm-count="alarmCounts[id] ?? 0"
          @enter="ui.navigate(id)"
        />
      </div>
      <AgvCorridor />
    </section>

    <aside class="side">
      <AkPanel title="中枢指标" en="CORE KPI">
        <div class="kpis">
          <StatTile label="计划达成率" :value="plant.kpis.achievement" unit="%" />
          <StatTile label="产线 OEE" :value="plant.kpis.lineOee" unit="%" :level="plant.kpis.lineOee < 80 ? 'warn' : 'normal'" />
          <StatTile label="一次合格率" :value="plant.kpis.fpy" unit="%" :level="plant.kpis.fpy < FPY_THRESHOLD ? 'warn' : 'normal'" />
          <StatTile label="订单准时率" :value="plant.kpis.onTime" unit="%" :level="plant.kpis.onTime < 95 ? 'warn' : 'normal'" />
          <StatTile label="AGV 完成率" :value="plant.kpis.agvCompletion" unit="%" />
          <StatTile label="装配返工率" :value="plant.kpis.rework" unit="%" :level="plant.kpis.rework > REWORK_THRESHOLD ? 'risk' : 'normal'" />
        </div>
      </AkPanel>
      <LinkagePanel />
      <AlarmCenter />
    </aside>
  </div>
</template>

<style scoped>
.overview {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 470px;
  gap: 18px;
  min-height: 0;
}

.base {
  display: grid;
  grid-template-rows: 40px minmax(0, 1fr) 236px;
  gap: 14px;
  min-height: 0;
}

.base__head {
  display: flex;
  align-items: center;
  gap: 12px;
}

.base__bar {
  width: 36px;
  height: 22px;
}

.base__head h2 {
  font-size: 20px;
  letter-spacing: 0.1em;
}

.base__tip {
  margin-left: auto;
  font-size: 12px;
  color: var(--highlight);
}

.base__rooms {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 14px;
  min-height: 0;
}

.side {
  display: grid;
  grid-template-rows: 262px 176px minmax(0, 1fr);
  gap: 14px;
  min-height: 0;
}

.kpis {
  flex: 1;
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-template-rows: repeat(3, 1fr);
  gap: 8px;
}

.kpis :deep(.stat__value) {
  font-size: 24px;
}
</style>
