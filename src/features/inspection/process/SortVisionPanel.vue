<script setup lang="ts">
import { computed } from 'vue'
import AkPanel from '@/components/ui/AkPanel.vue'
import { MODULES } from '@/data/modules'
import type { ProcessSnapshot } from '../processSim'

const props = defineProps<{ snap: ProcessSnapshot }>()
const meta = MODULES.inspection

const ARM_FLOW = ['夹取', '移动', '放置'] as const
const vision = computed(() => [
  { k: '拍照帧率', v: props.snap.vision.fps, u: 'fps' },
  { k: '图像上传耗时', v: props.snap.vision.uploadMs, u: 'ms' },
  { k: '比对耗时', v: props.snap.vision.compareMs, u: 'ms' },
  { k: '比对置信度', v: props.snap.vision.confidence, u: '%', warn: props.snap.vision.confidence < 95 },
  { k: '图像采集成功率', v: props.snap.vision.captureRate, u: '%' },
])
</script>

<template>
  <AkPanel title="机械臂分拣工位" en="SORTING ARM · STEP 5" :color="meta.color">
    <template #actions><span class="tag ak-num">检测位 6</span></template>
    <div class="arm">
      <ol class="arm__flow">
        <li v-for="a in ARM_FLOW" :key="a" :class="{ 'is-on': snap.sort.action === a }">{{ a }}</li>
      </ol>
      <div class="arm__grid">
        <div><small>目标位置</small><b class="ak-num" :class="snap.sort.target === 'B 区' ? 'is-ng' : ''">{{ snap.sort.target }}</b></div>
        <div><small>单次耗时</small><b class="ak-num">{{ snap.sort.costSec }} s</b></div>
        <div><small>累计 OK → A 区</small><b class="ak-num is-ok">{{ snap.sort.okCount }}</b></div>
        <div><small>累计 NG → B 区</small><b class="ak-num is-ng">{{ snap.sort.ngCount }}</b></div>
      </div>
    </div>
  </AkPanel>
  <AkPanel title="视觉检测链路" en="VISION CHAIN · STEP 3-4" :color="meta.color">
    <ul class="vis">
      <li v-for="v in vision" :key="v.k">
        <span>{{ v.k }}</span><b class="ak-num" :class="{ 'is-ng': v.warn }">{{ v.v }}<small>{{ v.u }}</small></b>
      </li>
    </ul>
  </AkPanel>
</template>

<style scoped>
.tag { font-size: 12px; color: var(--room-inspection); }
.arm { flex: 1; display: flex; flex-direction: column; gap: 8px; min-height: 0; }
.arm__flow { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; margin: 0; padding: 0; list-style: none; }
.arm__flow li { padding: 6px; text-align: center; font-size: 14px; color: var(--text-muted); background: var(--bg-panel-2); border-bottom: 2px solid transparent; }
.arm__flow li.is-on { color: #0a0c0f; font-weight: 700; background: var(--room-inspection); }
.arm__grid { flex: 1; display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
.arm__grid div { display: flex; flex-direction: column; justify-content: center; padding: 6px 10px; background: var(--bg-panel-2); }
.arm__grid small { font-size: 11px; color: var(--text-muted); }
.arm__grid b { font-size: 20px; color: var(--text-primary); }
.is-ok { color: var(--signal-pos) !important; }
.is-ng { color: var(--signal-risk) !important; }

.vis { flex: 1; margin: 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: 6px; }
.vis li { flex: 1; display: flex; justify-content: space-between; align-items: center; padding: 0 12px; font-size: 14px; color: var(--text-secondary); background: var(--bg-panel-2); }
.vis b { font-size: 18px; color: var(--text-primary); }
.vis small { margin-left: 3px; font-size: 11px; color: var(--text-muted); }
</style>
