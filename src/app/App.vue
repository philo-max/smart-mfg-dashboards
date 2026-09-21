<script setup lang="ts">
import { onBeforeUnmount, onMounted } from 'vue'
import AppShell from '@/components/shell/AppShell.vue'
import { useUiStore } from '@/stores/ui'

const ui = useUiStore()
let query: MediaQueryList | null = null

function sync(event: MediaQueryList | MediaQueryListEvent) {
  ui.setReducedMotion(event.matches)
}

onMounted(() => {
  query = window.matchMedia('(prefers-reduced-motion: reduce)')
  sync(query)
  query.addEventListener('change', sync)
})

onBeforeUnmount(() => {
  query?.removeEventListener('change', sync)
  query = null
})
</script>

<template>
  <AppShell />
</template>
