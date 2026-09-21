<script setup lang="ts">
import { computed } from 'vue'
import AkPanel from './AkPanel.vue'
import { pointSnapshot, type PointValue } from '@/data/points'
import type { ModuleId } from '@/data/modules'
import { usePlantStore } from '@/stores/plant'

const props = defineProps<{ unit: ModuleId; color: string }>()
const plant = usePlantStore()
const points = computed(() => pointSnapshot(plant.state, props.unit))

function display(p: PointValue): string {
  if (typeof p.value === 'boolean') return p.value ? 'TRUE' : 'FALSE'
  return String(p.value)
}

function tone(p: PointValue): string {
  if (p.name.startsWith('Alarm_') || p.name === 'Red_Light') return p.value === 1 || p.value === true ? 'tone-risk' : 'tone-pos'
  if (typeof p.value === 'boolean') return p.value ? 'tone-accent' : ''
  return ''
}
</script>

<template>
  <AkPanel title="PLC 点位监视" en="TAG MONITOR" :color="color">
    <template #actions><span class="ak-en">leapiot · 模拟源</span></template>
    <div class="points scroll-y">
      <div class="points__row points__row--head">
        <span>点位</span><span>别名</span><span>地址</span><span>值</span>
      </div>
      <div v-for="p in points" :key="p.name" class="points__row">
        <span class="points__name">{{ p.name }}</span>
        <span>{{ p.alias }}</span>
        <span class="points__addr">{{ p.address }}</span>
        <span class="ak-num points__val" :class="tone(p)">{{ display(p) }}</span>
      </div>
    </div>
  </AkPanel>
</template>

<style scoped>
.points {
  flex: 1;
  font-size: 12px;
}

.points__row {
  display: grid;
  grid-template-columns: 1.5fr 1.1fr 0.9fr 0.9fr;
  gap: 6px;
  align-items: center;
  height: 27px;
  border-bottom: 1px dashed var(--border);
}

.points__row--head {
  color: var(--text-muted);
  font-size: 11px;
  height: 22px;
}

.points__name {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.points__addr {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--text-muted);
}

.points__val {
  text-align: right;
  font-size: 13px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
