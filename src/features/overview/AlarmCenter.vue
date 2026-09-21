<script setup lang="ts">
import { computed, ref } from 'vue'
import AkPanel from '@/components/ui/AkPanel.vue'
import AkTabs from '@/components/ui/AkTabs.vue'
import { MODULES } from '@/data/modules'
import type { AlarmCategory, AlarmStatus, PlantAlarm } from '@/data/sim/types'
import { usePlantStore } from '@/stores/plant'
import { useUiStore } from '@/stores/ui'

type Filter = 'all' | AlarmCategory
const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all', label: '全部' },
  { value: '设备故障', label: '设备' },
  { value: '质量异常', label: '质量' },
  { value: '生产超差', label: '超差' },
  { value: '物流异常', label: '物流' },
]
const STATUS_TEXT: Record<AlarmStatus, string> = { open: '未处理', handling: '处理中', resolved: '已解决' }
const STATUS_ORDER: Record<AlarmStatus, number> = { open: 0, handling: 1, resolved: 2 }

const plant = usePlantStore()
const ui = useUiStore()
const filter = ref<Filter>('all')

const list = computed(() =>
  plant.alarms
    .filter((a) => filter.value === 'all' || a.category === filter.value)
    .slice()
    .sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status] || b.id - a.id),
)

function advance(alarm: PlantAlarm) {
  plant.setAlarmStatus(alarm.id, alarm.status === 'open' ? 'handling' : 'resolved')
}
</script>

<template>
  <AkPanel title="告警中心" en="ALARM CENTER" color="var(--signal-risk)">
    <div class="counts">
      <div><span>未处理</span><b class="ak-num">{{ plant.unresolved.total }}</b></div>
      <div class="is-risk"><span>紧急</span><b class="ak-num">{{ plant.unresolved.risk }}</b></div>
      <div class="is-warn"><span>重要</span><b class="ak-num">{{ plant.unresolved.warn }}</b></div>
    </div>
    <AkTabs v-model="filter" :options="FILTERS" class="filters" />
    <ul class="alarms scroll-y">
      <li v-for="a in list" :key="a.id" class="alarm" :class="[`is-${a.level}`, `st-${a.status}`]">
        <button type="button" class="alarm__main" @click="ui.navigate(a.module, a.focus ?? null)">
          <span class="alarm__meta">
            <span class="ak-num">{{ a.time }}</span>
            <span class="alarm__chip" :style="{ background: MODULES[a.module].color }">{{ MODULES[a.module].name }}</span>
            <span class="alarm__cat">{{ a.category }}</span>
          </span>
          <span class="alarm__text">{{ a.text }}</span>
        </button>
        <div class="alarm__side">
          <span class="alarm__status">{{ STATUS_TEXT[a.status] }}</span>
          <button v-if="a.status !== 'resolved'" type="button" class="alarm__act" @click="advance(a)">
            {{ a.status === 'open' ? '处理' : '解决' }}
          </button>
        </div>
      </li>
      <li v-if="list.length === 0" class="alarms__empty">暂无告警</li>
    </ul>
  </AkPanel>
</template>

<style scoped>
.counts {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  margin-bottom: 10px;
}

.counts div {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  padding: 6px 10px;
  background: var(--bg-panel-2);
  border-left: 3px solid var(--text-secondary);
  font-size: 12px;
  color: var(--text-secondary);
}

.counts b { font-size: 22px; color: var(--text-primary); }
.counts .is-risk { border-left-color: var(--signal-risk); }
.counts .is-risk b { color: var(--signal-risk); }
.counts .is-warn { border-left-color: var(--signal-warn); }
.counts .is-warn b { color: var(--signal-warn); }

.filters {
  margin-bottom: 10px;
}

.filters :deep(.ak-tabs__btn) {
  flex: 1;
}

.alarms {
  flex: 1;
  list-style: none;
  margin: 0;
  padding: 0 4px 0 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.alarm {
  display: flex;
  gap: 8px;
  padding: 8px 8px 8px 10px;
  background: rgba(233, 237, 241, 0.03);
  border-left: 3px solid var(--signal-warn);
}

.alarm.is-risk { border-left-color: var(--signal-risk); background: rgba(255, 70, 85, 0.07); }
.alarm.st-resolved { opacity: 0.45; }

.alarm__main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
  text-align: left;
  background: none;
  border: 0;
  padding: 0;
}

.alarm__main:hover .alarm__text { color: var(--highlight); }

.alarm__meta {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  color: var(--text-muted);
}

.alarm__chip {
  padding: 0 6px;
  color: #0a0c0f;
  font-weight: 700;
}

.alarm__text {
  font-size: 13px;
  line-height: 1.4;
  color: var(--text-primary);
}

.alarm__side {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  justify-content: space-between;
  gap: 4px;
  font-size: 11px;
}

.alarm__status { color: var(--text-muted); white-space: nowrap; }
.st-open .alarm__status { color: var(--signal-risk); }
.st-handling .alarm__status { color: var(--signal-warn); }

.alarm__act {
  font-size: 12px;
  padding: 2px 10px;
  background: var(--text-primary);
  color: #0a0c0f;
  border: 0;
  font-weight: 700;
}

.alarms__empty {
  color: var(--text-muted);
  font-size: 13px;
  text-align: center;
  padding: 20px 0;
}
</style>
