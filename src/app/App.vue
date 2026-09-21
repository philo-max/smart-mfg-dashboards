<script setup lang="ts">
import { onBeforeUnmount, onMounted } from 'vue'
import AppShell from '@/components/shell/AppShell.vue'
import { usePlantStore } from '@/stores/plant'
import { useUiStore } from '@/stores/ui'

const ui = useUiStore()
const plant = usePlantStore()
let query: MediaQueryList | null = null

function sync(event: MediaQueryList | MediaQueryListEvent) {
  ui.setReducedMotion(event.matches)
}

onMounted(() => {
  query = window.matchMedia('(prefers-reduced-motion: reduce)')
  sync(query)
  query.addEventListener('change', sync)
  plant.start()
})

onBeforeUnmount(() => {
  query?.removeEventListener('change', sync)
  query = null
  plant.stop()
})
</script>

<template>
  <AppShell />
</template>
