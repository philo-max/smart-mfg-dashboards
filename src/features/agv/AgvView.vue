<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import AkPanel from '@/components/ui/AkPanel.vue'
import AkModal from '@/components/ui/AkModal.vue'
import StatTile from '@/components/ui/StatTile.vue'
import PointsPanel from '@/components/ui/PointsPanel.vue'
import EChart from '@/components/charts/EChart.vue'
import { C, ring } from '@/components/charts/theme'
import AgvMap from './AgvMap.vue'
import { AGV_ROUTES } from '@/data/sim/constants'
import { MODULES } from '@/data/modules'
import { usePlantStore } from '@/stores/plant'
import { useUiStore } from '@/stores/ui'

const STATUS_TEXT = { running: '运行中', idle: '空闲', charging: '充电中', blocked: '阻塞' } as const

const meta = MODULES.agv
const plant = usePlantStore()
const ui = useUiStore()
const fleet = computed(() => plant.state.agv)

const selectedId = ref<string | null>(null)
const selected = computed(() => fleet.value.agvs.find((a) => a.id === selectedId.value) ?? null)
const modalOpen = computed({ get: () => selected.value !== null, set: (v) => { if (!v) selectedId.value = null } })

onMounted(() => {
  if (ui.focus && fleet.value.agvs.some((a) => a.id === ui.focus)) selectedId.value = ui.focus
  ui.clearFocus()
})

const completionRing = computed(() => ring(plant.kpis.agvCompletion, C.room.agv, '任务完成率', 95))

function routeName(id: string) {
  return AGV_ROUTES.find((r) => r.id === id)?.name ?? id
}
</script>

<template>
  <div class="module">
    <div class="col">
      <AkPanel title="任务完成率" en="TASK COMPLETION" :color="meta.color">
        <EChart :option="completionRing" />
        <div class="grid3">
          <StatTile label="已完成" :value="fleet.tasksDone" />
          <StatTile label="任务总数" :value="fleet.tasksTotal" />
          <StatTile label="运行中" :value="fleet.agvs.filter((a) => a.status === 'running').length" />
        </div>
      </AkPanel>
      <AkPanel title="车队列表" en="FLEET · MOMA">
        <ul class="fleet scroll-y">
          <li v-for="a in fleet.agvs" :key="a.id" :class="{ 'is-selected': a.id === selectedId }">
            <button type="button" @click="selectedId = a.id">
              <b class="ak-num">{{ a.id }}</b>
              <span class="fleet__status" :class="`is-${a.status}`">{{ STATUS_TEXT[a.status] }}</span>
              <span class="fleet__batt ak-num" :class="{ 'tone-warn': a.battery < 30 }">{{ Math.round(a.battery) }}%</span>
              <span class="fleet__task">{{ routeName(a.routeId) }}</span>
            </button>
          </li>
        </ul>
      </AkPanel>
    </div>

    <div class="col col--center">
      <AkPanel title="产线地图 · AGV 实时位置" en="LINE MAP · LIVE POSITION" :color="meta.color" flush>
        <AgvMap :agvs="fleet.agvs" :selected="selectedId" @select="selectedId = $event" />
      </AkPanel>
      <AkPanel title="路径数据" en="ROUTE DATA">
        <div class="routes">
          <div v-for="r in AGV_ROUTES" :key="r.id" class="route">
            <b class="ak-num">{{ r.id }}</b>
            <span>{{ r.name }}</span>
            <span class="ak-num">{{ fleet.agvs.filter((a) => a.routeId === r.id).length }} 台在途</span>
          </div>
        </div>
      </AkPanel>
    </div>

    <div class="col">
      <AkPanel title="电量监控" en="BATTERY" :color="meta.color">
        <StatTile
          label="低电量预警"
          en="LOW BATTERY"
          :value="fleet.agvs.filter((a) => a.battery < 20 && a.status !== 'charging').length"
          :level="fleet.agvs.some((a) => a.battery < 20 && a.status !== 'charging') ? 'warn' : 'normal'"
          hint="低于 20% 自动返回充电"
        />
      </AkPanel>
      <PointsPanel unit="agv" :color="meta.color" />
    </div>

    <AkModal v-model:open="modalOpen" :title="selected?.id ?? ''" en="MOMA DETAIL" :width="720" :height="420" :color="meta.color">
      <dl v-if="selected" class="detail">
        <div><dt>状态</dt><dd>{{ STATUS_TEXT[selected.status] }}</dd></div>
        <div><dt>当前任务</dt><dd>{{ selected.task }}</dd></div>
        <div><dt>路径</dt><dd>{{ routeName(selected.routeId) }}</dd></div>
        <div><dt>路段进度</dt><dd class="ak-num">{{ Math.round(selected.progress * 100) }}%</dd></div>
        <div><dt>电量</dt><dd class="ak-num" :class="{ 'tone-warn': selected.battery < 30 }">{{ Math.round(selected.battery) }}%</dd></div>
        <div><dt>Y 轴位置</dt><dd class="ak-num">{{ selected.yAxis }} mm</dd></div>
      </dl>
    </AkModal>
  </div>
</template>

<style scoped>
.fleet {
  flex: 1;
  list-style: none;
  margin: 0;
  padding: 0;
}

.fleet button {
  width: 100%;
  display: grid;
  grid-template-columns: 90px 70px 60px 1fr;
  gap: 8px;
  align-items: center;
  padding: 8px 10px;
  margin-bottom: 6px;
  background: rgba(139, 220, 58, 0.06);
  border: 1px solid var(--border);
  border-left: 3px solid var(--room-agv);
  font-size: 13px;
  text-align: left;
}

.fleet li.is-selected button { border-color: var(--highlight); background: var(--highlight-soft); }

.fleet__status { font-size: 11px; color: var(--signal-pos); }
.fleet__status.is-blocked { color: var(--signal-risk); }
.fleet__status.is-charging { color: var(--signal-warn); }
.fleet__task { color: var(--text-muted); font-size: 12px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

.routes {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.route {
  display: grid;
  grid-template-columns: 40px 1fr 90px;
  gap: 10px;
  padding: 8px 10px;
  background: var(--bg-panel-2);
  border-left: 2px solid var(--room-agv);
  font-size: 13px;
}
</style>
