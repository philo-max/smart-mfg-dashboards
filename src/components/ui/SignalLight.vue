<script setup lang="ts">
import type { Light } from '@/data/sim/types'

/** 三色灯：对应点位 Green_Light / Yellow_Light / Red_Light */
defineProps<{ light: Light }>()
const LAMPS: Light[] = ['red', 'yellow', 'green']
const LABEL: Record<Light, string> = { red: '故障', yellow: '预警', green: '运行' }
</script>

<template>
  <span class="signal" role="img" :aria-label="`三色灯：${LABEL[light]}`">
    <i v-for="lamp in LAMPS" :key="lamp" class="signal__lamp" :class="[`is-${lamp}`, { 'is-on': lamp === light }]"></i>
  </span>
</template>

<style scoped>
.signal {
  display: inline-flex;
  gap: 3px;
  padding: 3px 4px;
  background: #07090c;
  border: 1px solid var(--border);
}

.signal__lamp {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  opacity: 0.18;
}

.signal__lamp.is-red { background: var(--signal-risk); }
.signal__lamp.is-yellow { background: var(--signal-warn); }
.signal__lamp.is-green { background: var(--signal-pos); }

.signal__lamp.is-on {
  opacity: 1;
  box-shadow: 0 0 8px currentColor;
}

.signal__lamp.is-red.is-on {
  color: var(--signal-risk);
  animation: ak-blink 1s steps(2) infinite;
}

.signal__lamp.is-yellow.is-on { color: var(--signal-warn); }
.signal__lamp.is-green.is-on { color: var(--signal-pos); }
</style>
