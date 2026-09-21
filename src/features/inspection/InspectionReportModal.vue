<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Download, Printer } from '@lucide/vue'
import AkModal from '@/components/ui/AkModal.vue'
import { buildReport } from './buildReport'
import { downloadCsv, printReport, type InspectionReport } from './reportExport'
import { usePlantStore } from '@/stores/plant'

/** 质量检测日报：打开时对当前状态拍快照，弹窗、CSV、打印三者内容一致 */
const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{ 'update:open': [value: boolean] }>()

const plant = usePlantStore()
const report = ref<InspectionReport | null>(null)
const blocked = ref(false)

const model = computed({ get: () => props.open, set: (v) => emit('update:open', v) })

watch(
  () => props.open,
  (open) => {
    if (!open) return
    report.value = buildReport(plant.state)
    blocked.value = false
  },
)

function exportCsv() {
  if (report.value) downloadCsv(report.value)
}

function print() {
  if (report.value) blocked.value = !printReport(report.value)
}
</script>

<template>
  <AkModal v-model:open="model" title="质量检测日报" en="INSPECTION DAILY REPORT" color="var(--room-inspection)" :height="720">
    <template #actions>
      <button type="button" class="act" @click="exportCsv"><Download :size="15" />导出 Excel</button>
      <button type="button" class="act" @click="print"><Printer :size="15" />打印 / PDF</button>
    </template>
    <p v-if="blocked" class="blocked">浏览器拦截了打印窗口，请允许本页弹窗后重试。</p>
    <div v-if="report" class="report scroll-y">
      <section v-for="sec in report.sections" :key="sec.title" class="sec">
        <h4>{{ sec.title }}</h4>
        <table>
          <thead><tr><th v-for="h in sec.head" :key="h">{{ h }}</th></tr></thead>
          <tbody><tr v-for="(row, i) in sec.rows" :key="i"><td v-for="(c, j) in row" :key="j">{{ c }}</td></tr></tbody>
        </table>
      </section>
      <section class="sec sec--wide">
        <h4>结论</h4>
        <!-- 结论由 buildReport 基于内部模拟数据生成，仅含 <b> 标签 -->
        <p class="conclusion" v-html="report.conclusion"></p>
      </section>
    </div>
  </AkModal>
</template>

<style scoped>
.act {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 14px;
  font-size: 13px;
  font-weight: 700;
  color: #0a0c0f;
  background: var(--text-primary);
  border: 0;
}

.act:hover { background: var(--highlight); }

.blocked {
  font-size: 13px;
  color: var(--signal-warn);
}

.report {
  flex: 1;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  align-content: start;
}

.sec h4 {
  font-size: 14px;
  margin: 0 0 8px;
  padding-left: 8px;
  border-left: 3px solid var(--room-inspection);
}

.sec--wide { grid-column: 1 / -1; }

table { width: 100%; border-collapse: collapse; font-size: 13px; }
th, td { padding: 6px 10px; text-align: center; border-bottom: 1px solid var(--border); }
th { background: var(--bg-elevated); color: var(--text-secondary); font-weight: 400; font-size: 12px; }

.conclusion {
  font-size: 14px;
  line-height: 1.9;
  color: var(--text-primary);
}

.conclusion :deep(b) { color: var(--highlight); }
</style>
