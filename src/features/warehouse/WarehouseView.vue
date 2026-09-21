<script setup lang="ts">
import PointsPanel from '@/components/ui/PointsPanel.vue'
import { MODULES } from '@/data/modules'
const meta = MODULES.warehouse
</script>

<template>
  <div class="stub"><PointsPanel unit="warehouse" :color="meta.color" /></div>
</template>

<style scoped>
.stub { display: grid; grid-template-columns: 420px; }
</style>
