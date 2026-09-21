<script setup lang="ts">
import PointsPanel from '@/components/ui/PointsPanel.vue'
import { MODULES } from '@/data/modules'
const meta = MODULES.logistics
</script>

<template>
  <div class="stub"><PointsPanel unit="logistics" :color="meta.color" /></div>
</template>

<style scoped>
.stub { display: grid; grid-template-columns: 420px; }
</style>
