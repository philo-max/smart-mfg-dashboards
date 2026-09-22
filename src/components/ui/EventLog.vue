<script setup lang="ts">
import { computed } from 'vue'
import AkPanel from './AkPanel.vue'
import type { ModuleId } from '@/data/modules'
import type { AlarmStatus, PlantAlarm } from '@/data/sim/types'
import { usePlantStore } from '@/stores/plant'
import { useUiStore } from '@/stores/ui'

/** 本模块事件日志：来自全局告警流，按模块过滤；可就地「处理 → 解决」 */
const props = defineProps<{ module: ModuleId; color: string }>()
const plant = usePlantStore()
const ui = useUiStore()

const STATUS_TEXT: Record<AlarmStatus, string> = { open: '未处理', handling: '处理中', resolved: '已解决' }
const list = computed(() => plant.alarms.filter((a) => a.module === props.module))
const openCount = computed(() => list.value.filter((a) => a.status !== 'resolved').length)

function advance(a: PlantAlarm) {
  plant.setAlarmStatus(a.id, a.status === 'open' ? 'handling' : 'resolved')
}
</script>

<template>
  <AkPanel title="异常事件日志" en="EVENT LOG" :color="color">
    <template #actions>
      <span class="count" :class="{ 'is-open': openCount > 0 }">未处理 <b class="ak-num">{{ openCount }}</b></span>
    </template>
    <ul class="log scroll-y">
      <li v-for="a in list" :key="a.id" class="log__item" :class="[`is-${a.level}`, `st-${a.status}`]">
        <span class="ak-num log__time">{{ a.time }}</span>
        <span class="log__text">{{ a.text }}</span>
        <span class="log__side">
          <em>{{ STATUS_TEXT[a.status] }}</em>
          <span class="log__btns">
            <button type="button" class="log__cause" title="根因溯源" @click="ui.openCause(a.id)">溯源</button>
            <button v-if="a.status !== 'resolved'" type="button" @click="advance(a)">{{ a.status === 'open' ? '处理' : '解决' }}</button>
          </span>
        </span>
      </li>
      <li v-if="list.length === 0" class="log__empty">本模块暂无异常事件</li>
    </ul>
  </AkPanel>
</template>

<style scoped>
.count { font-size: 12px; color: var(--text-muted); }
.count.is-open { color: var(--signal-risk); }
.count b { font-size: 15px; }

.log {
  flex: 1;
  list-style: none;
  margin: 0;
  padding: 0 4px 0 0;
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.log__item {
  display: grid;
  grid-template-columns: 62px 1fr auto;
  gap: 8px;
  align-items: center;
  padding: 6px 8px;
  font-size: 12px;
  background: rgba(160, 205, 255, 0.03);
  border-left: 3px solid var(--signal-warn);
}

.log__item.is-risk { border-left-color: var(--signal-risk); background: rgba(255, 70, 85, 0.07); }
.log__item.st-resolved { opacity: 0.45; }
.log__time { color: var(--text-muted); }
.log__text { line-height: 1.4; color: var(--text-primary); }

.log__side {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 3px;
}

.log__side em { font-style: normal; font-size: 11px; color: var(--text-muted); }
.st-open .log__side em { color: var(--signal-risk); }
.st-handling .log__side em { color: var(--signal-warn); }

.log__btns { display: flex; gap: 3px; }
.log__side .log__cause { color: var(--accent); background: none; border: 1px solid var(--accent-line); font-weight: 400; }
.log__side .log__cause:hover { color: #0a0c0f; background: var(--accent); }

.log__side button {
  font-size: 11px;
  padding: 1px 8px;
  background: var(--text-primary);
  color: #0a0c0f;
  border: 0;
  font-weight: 700;
}

.log__empty { font-size: 13px; color: var(--text-muted); text-align: center; padding: 18px 0; }
</style>
