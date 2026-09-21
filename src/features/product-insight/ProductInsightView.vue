<script setup lang="ts">
import StaggerReveal from '@/components/motion/StaggerReveal.vue'
</script>

<template>
  <section class="feature-view">
    <StaggerReveal class="feature-view__stack" :stagger="0.09">
      <header class="feature-view__head panel">
        <span class="feature-view__tag">产品体验</span>
        <h2>口碑 · 体验 · 人群</h2>
        <p>V2 骨架占位 · 业务内容待接入（本阶段不含 KPI 与图表）</p>
      </header>

      <div class="feature-view__grid">
        <div class="skeleton-frame">主视图占位</div>
        <div class="skeleton-frame">指标区占位</div>
        <div class="skeleton-frame">详情区占位</div>
      </div>

      <footer class="feature-view__note">
        <span>主题：石墨冷白 + 克制青</span>
        <span>单屏 1280×960 · 不滚动</span>
      </footer>
    </StaggerReveal>
  </section>
</template>
