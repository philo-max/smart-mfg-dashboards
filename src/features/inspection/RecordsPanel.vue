<script setup lang="ts">
import AkPanel from '@/components/ui/AkPanel.vue'
import AkTabs from '@/components/ui/AkTabs.vue'
import RfidLink from '@/components/ui/RfidLink.vue'
import { INSPECTION_STATIONS } from '@/data/sim/constants'
import type { InspectionRecord } from '@/data/sim/types'

defineProps<{ records: InspectionRecord[]; color: string; defectFilter: string | null; positionFilter: number | null; filtered: boolean }>()
const filter = defineModel<'all' | 'fail'>('filter', { required: true })
defineEmits<{ clear: [] }>()
</script>

<template>
  <AkPanel title="实时检测记录" en="LIVE RECORDS" :color="color">
    <template #actions>
      <span v-if="defectFilter !== null" class="fchip">缺陷：{{ defectFilter }}</span>
      <span v-if="positionFilter !== null" class="fchip">检测位 {{ positionFilter + 1 }} NG</span>
      <button v-if="filtered" type="button" class="fclear" @click="$emit('clear')">清除筛选 ✕</button>
      <AkTabs v-model="filter" :options="[{ value: 'all', label: '全部' }, { value: 'fail', label: '仅 NG' }]" />
    </template>
    <div class="rec">
      <div class="rec__row rec__row--head">
        <span>时间</span><span>工件编号</span><span>RFID</span>
        <span class="rec__pos">
          <i v-for="(s, i) in INSPECTION_STATIONS" :key="s.name" :title="`${s.name} ${s.item}`">{{ i + 1 }}</i>
        </span>
        <span>结果</span><span>判定</span>
      </div>
      <div v-for="r in records" :key="r.id + r.time" class="rec__row">
        <span class="ak-num">{{ r.time }}</span>
        <span class="ak-num">{{ r.id }}</span>
        <RfidLink :rfid="r.rfid" bare />
        <span class="rec__pos">
          <i v-for="(ok, i) in r.positions" :key="i" :class="ok ? 'ok' : 'ng'">{{ ok ? 'OK' : 'NG' }}</i>
        </span>
        <span :class="{ 'tone-risk': !r.pass }">{{ r.result }}</span>
        <span><b class="tag" :class="r.pass ? 'ok' : 'ng'">{{ r.pass ? '合格' : '不合格' }}</b></span>
      </div>
      <p v-if="records.length === 0" class="rec__empty">当前筛选条件下暂无记录</p>
    </div>
  </AkPanel>
</template>

<style scoped>
.fchip { font-size: 12px; padding: 2px 8px; color: #0a0c0f; background: var(--highlight); font-weight: 700; margin-right: 6px; }
.fclear { font-size: 12px; margin-right: 8px; background: none; border: 0; color: var(--highlight); text-decoration: underline; }
.rec { flex: 1; min-height: 0; overflow: hidden; font-size: 13px; }
.rec__row { display: grid; grid-template-columns: 76px 140px 76px 200px 1fr 70px; gap: 8px; align-items: center; height: 27px; border-bottom: 1px solid var(--border); }
.rec__row--head { color: var(--text-muted); font-size: 12px; height: 24px; }
.rec__pos { display: flex; gap: 4px; }
.rec__pos i { flex: 1; font-style: normal; text-align: center; font-size: 10px; padding: 1px 0; background: rgba(127, 200, 255, 0.05); }
.rec__pos i.ok { color: var(--signal-pos); background: rgba(71, 209, 140, 0.1); }
.rec__pos i.ng { color: #fff; background: var(--signal-risk); }
.rec__empty { margin: 14px 0; text-align: center; font-size: 13px; color: var(--text-muted); }
.tag { font-weight: 400; font-size: 11px; padding: 1px 8px; }
.tag.ok { color: var(--signal-pos); border: 1px solid var(--signal-pos); }
.tag.ng { color: var(--signal-risk); border: 1px solid var(--signal-risk); }
</style>
