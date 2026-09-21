<script setup lang="ts">
import { FlaskConical, Pause, Play, RotateCcw, StepForward, X, Zap } from '@lucide/vue'
import { MODULES } from '@/data/modules'
import { SCENARIOS, type ScenarioDef } from '@/data/sim/scenarios'
import { SPEEDS, usePlantStore } from '@/stores/plant'
import { useUiStore } from '@/stores/ui'

/** 演练控制台：主动制造事件，观察连锁反应；同时控制模拟的暂停 / 单步 / 倍速 */
const plant = usePlantStore()
const ui = useUiStore()

function run(s: ScenarioDef) {
  plant.runScenario(s.id)
  if (s.modules.length > 0 && ui.view === 'overview') ui.navigate(s.modules[0])
}
</script>

<template>
  <Transition name="drawer">
    <aside v-if="ui.consoleOpen" class="console" aria-label="演练控制台">
      <header class="console__head">
        <FlaskConical :size="20" />
        <div>
          <h2>演练控制台</h2>
          <span class="ak-en">SCENARIO CONSOLE</span>
        </div>
        <button type="button" class="console__close" aria-label="关闭演练控制台" @click="ui.toggleConsole()"><X :size="20" /></button>
      </header>

      <section class="playback" aria-label="播放控制">
        <button type="button" class="btn" :class="{ 'is-on': plant.paused }" @click="plant.togglePause()">
          <component :is="plant.paused ? Play : Pause" :size="16" />{{ plant.paused ? '继续' : '暂停' }}
        </button>
        <button type="button" class="btn" :disabled="!plant.paused" title="暂停时推进一个 tick" @click="plant.tick()">
          <StepForward :size="16" />单步
        </button>
        <div class="speeds" role="group" aria-label="倍速">
          <button v-for="v in SPEEDS" :key="v" type="button" :class="{ active: plant.speed === v }" @click="plant.setSpeed(v)">{{ v }}×</button>
        </div>
      </section>

      <ul class="scenarios">
        <li v-for="s in SCENARIOS" :key="s.id" :class="{ 'is-recover': s.id === 'recover' }">
          <button type="button" @click="run(s)">
            <span class="scenarios__title">
              <component :is="s.id === 'recover' ? RotateCcw : Zap" :size="15" />{{ s.label }}
            </span>
            <span class="scenarios__effect">{{ s.effect }}</span>
            <span v-if="s.modules.length" class="scenarios__mods">
              <i v-for="m in s.modules" :key="m" :style="{ background: MODULES[m].color }">{{ MODULES[m].name.replace('单元', '') }}</i>
            </span>
          </button>
        </li>
      </ul>

      <section class="log">
        <h3>最近注入</h3>
        <ol v-if="plant.scenarioLog.length">
          <li v-for="(r, i) in plant.scenarioLog" :key="i"><span class="ak-num">{{ r.time }}</span>{{ r.label }}</li>
        </ol>
        <p v-else>尚未注入，点击上方场景开始演示</p>
      </section>

      <footer class="keys">
        <span><kbd>1</kbd>–<kbd>5</kbd> 切换模块</span>
        <span><kbd>0</kbd> 总览</span>
        <span><kbd>空格</kbd> 暂停</span>
        <span><kbd>S</kbd> 本面板</span>
      </footer>
    </aside>
  </Transition>
</template>

<style scoped>
.console {
  position: absolute;
  top: 88px;
  right: 24px;
  z-index: 45;
  width: 440px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 16px 18px 14px;
  background: linear-gradient(180deg, rgba(20, 26, 34, 0.98), rgba(10, 13, 17, 0.98));
  border: 1px solid var(--accent-line);
  border-top: 3px solid var(--highlight);
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.65);
  clip-path: polygon(0 0, 100% 0, 100% calc(100% - 16px), calc(100% - 16px) 100%, 0 100%);
}

.console__head { display: flex; align-items: center; gap: 12px; color: var(--highlight); }
.console__head h2 { font-size: 20px; letter-spacing: 0.08em; color: var(--text-primary); }

.console__close {
  margin-left: auto;
  width: 32px;
  height: 32px;
  display: grid;
  place-items: center;
  background: none;
  border: 1px solid var(--border);
  color: var(--text-secondary);
}

.console__close:hover { color: var(--highlight); border-color: var(--highlight); }

.playback { display: flex; align-items: center; gap: 8px; }

.btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 14px;
  font-size: 13px;
  font-weight: 700;
  color: var(--text-primary);
  background: transparent;
  border: 1px solid var(--border-strong);
}

.btn:hover:not(:disabled) { border-color: var(--accent); background: var(--accent-soft); }
.btn:disabled { opacity: 0.4; cursor: default; }
.btn.is-on { color: #0a0c0f; background: var(--highlight); border-color: var(--highlight); }

.speeds { margin-left: auto; display: flex; }

.speeds button {
  padding: 7px 12px;
  font-size: 13px;
  font-family: var(--font-en);
  color: var(--text-secondary);
  background: transparent;
  border: 1px solid var(--border-strong);
}

.speeds button + button { border-left: 0; }
.speeds button.active { color: #0a0c0f; background: var(--text-primary); font-weight: 700; }

.scenarios { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 8px; }

.scenarios button {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 5px;
  padding: 9px 12px;
  text-align: left;
  background: rgba(255, 210, 60, 0.05);
  border: 1px solid var(--border);
  border-left: 3px solid var(--highlight);
}

.scenarios button:hover { background: rgba(255, 210, 60, 0.14); border-color: var(--highlight); }
.scenarios li.is-recover button { background: rgba(71, 209, 140, 0.06); border-left-color: var(--signal-pos); }
.scenarios li.is-recover button:hover { background: rgba(71, 209, 140, 0.16); border-color: var(--signal-pos); }

.scenarios__title { display: flex; align-items: center; gap: 6px; font-size: 14px; font-weight: 700; }
.scenarios__effect { font-size: 12px; color: var(--text-muted); line-height: 1.5; }
.scenarios__mods { display: flex; gap: 5px; }
.scenarios__mods i { font-style: normal; font-size: 11px; padding: 0 7px; color: #0a0c0f; font-weight: 700; }

.log h3 { font-size: 12px; color: var(--text-muted); font-weight: 400; margin-bottom: 6px; letter-spacing: 0.1em; }
.log ol { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 3px; font-size: 12px; max-height: 84px; overflow: hidden; }
.log li { display: flex; gap: 10px; color: var(--text-secondary); }
.log .ak-num { color: var(--text-muted); }
.log p { margin: 0; font-size: 12px; color: var(--text-muted); }

.keys { display: flex; gap: 14px; flex-wrap: wrap; font-size: 11px; color: var(--text-muted); padding-top: 10px; border-top: 1px solid var(--border); }

kbd {
  font-family: var(--font-en);
  padding: 0 6px;
  color: var(--text-primary);
  background: var(--bg-elevated);
  border: 1px solid var(--border-strong);
}

.drawer-enter-active, .drawer-leave-active { transition: opacity 0.25s var(--ease-standard), transform 0.25s var(--ease-standard); }
.drawer-enter-from, .drawer-leave-to { opacity: 0; transform: translateX(24px); }
</style>
