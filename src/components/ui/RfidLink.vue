<script setup lang="ts">
import { ScanLine } from '@lucide/vue'
import { useUiStore } from '@/stores/ui'

/** 可点击的 RFID：点击后在任意页面打开该工件的全链路追溯 */
defineProps<{ rfid: string; bare?: boolean }>()
const ui = useUiStore()
</script>

<template>
  <button type="button" class="rfid ak-num" :class="{ 'is-bare': bare }" :title="`追溯 ${rfid} 的全链路履历`" @click.stop="ui.openTrace(rfid)">
    <ScanLine v-if="!bare" :size="12" aria-hidden="true" />{{ rfid }}
  </button>
</template>

<style scoped>
.rfid {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 0 2px;
  font-size: inherit;
  color: var(--accent);
  background: none;
  border: 0;
  border-bottom: 1px dashed var(--accent-line);
  cursor: pointer;
}

.rfid:hover { color: var(--highlight); border-bottom-color: var(--highlight); }
.rfid.is-bare { border-bottom: 0; }
</style>
