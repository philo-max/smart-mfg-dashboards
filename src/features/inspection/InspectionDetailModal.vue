<script setup lang="ts">
import { computed } from 'vue'
import AkModal from '@/components/ui/AkModal.vue'
import EChart from '@/components/charts/EChart.vue'
import { detailOption } from './inspectionCharts'
import { FPY_THRESHOLD } from '@/data/sim/constants'
import type { HourBucket } from '@/data/sim/types'

/** 点击合格/不合格计数器：近 24 小时逐时明细 */
const props = defineProps<{ focus: 'pass' | 'fail' | null; hourly: HourBucket[]; highlight?: string | null }>()
const emit = defineEmits<{ close: [] }>()

const open = computed({ get: () => props.focus !== null, set: (v) => { if (!v) emit('close') } })
const option = computed(() => detailOption(props.hourly, props.focus ?? 'pass'))
const rows = computed(() =>
  props.hourly
    .slice()
    .reverse()
    .map((h) => {
      const total = h.pass + h.fail
      const failRate = total ? (h.fail / total) * 100 : 0
      return { ...h, total, failRate, over: 100 - failRate < FPY_THRESHOLD }
    }),
)
</script>

<template>
  <AkModal
    v-model:open="open"
    :title="`近 24 小时${focus === 'fail' ? '不合格' : '合格'}明细`"
    en="24H DETAIL"
    color="var(--room-inspection)"
  >
    <div class="chart"><EChart :option="option" /></div>
    <div class="table scroll-y">
      <table>
        <thead><tr><th>时段</th><th>检测总数</th><th>合格</th><th>不合格</th><th>不合格率</th><th>状态</th></tr></thead>
        <tbody>
          <tr v-for="r in rows" :key="r.label" :class="{ 'is-hl': r.label === highlight }">
            <td class="ak-num">{{ r.label }}</td>
            <td class="ak-num">{{ r.total }}</td>
            <td class="ak-num tone-pos">{{ r.pass }}</td>
            <td class="ak-num tone-risk">{{ r.fail }}</td>
            <td class="ak-num" :class="{ 'tone-risk': r.over }">{{ r.failRate.toFixed(2) }}%</td>
            <td :class="r.over ? 'tone-risk' : 'tone-pos'">{{ r.over ? '超标' : '正常' }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </AkModal>
</template>

<style scoped>
.chart { height: 290px; flex-shrink: 0; }
.table { flex: 1; }

tr.is-hl td { background: var(--highlight-soft); color: var(--highlight); }

table { width: 100%; border-collapse: collapse; font-size: 13px; }
th, td { padding: 7px 10px; text-align: center; border-bottom: 1px solid var(--border); }
th { position: sticky; top: 0; background: var(--bg-elevated); color: var(--text-secondary); font-weight: 400; font-size: 12px; }
</style>
