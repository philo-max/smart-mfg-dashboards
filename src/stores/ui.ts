import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { MODULES, type ModuleId } from '@/data/modules'

export type ViewId = 'overview' | ModuleId
export type TransitPhase = 'idle' | 'cover' | 'reveal'

interface PendingNav {
  to: ViewId
  focus: string | null
}

/**
 * 视图导航唯一状态源：基建总览 ↔ 模块房间。
 * focus 为下钻时携带的焦点对象（AGV 编号、库位、设备编号等），由目标模块读取并高亮。
 * consoleOpen 控制演练控制台；traceRfid 非空时全局打开工件追溯弹窗。
 * 切换视图走过场：navigate 只登记目标，幕布铺满后由 commit 真正换视图，reveal 结束后 finish 收尾。
 */
export const useUiStore = defineStore('ui', () => {
  const view = ref<ViewId>('overview')
  const focus = ref<string | null>(null)
  const reducedMotion = ref(false)
  const phase = ref<TransitPhase>('idle')
  const target = ref<PendingNav | null>(null)
  const curtainReady = ref(false)
  const booting = ref(true)
  let queued: PendingNav | null = null
  const consoleOpen = ref(false)
  const traceRfid = ref<string | null>(null)
  const causeAlarmId = ref<number | null>(null)
  const tour = ref(false)

  const activeModule = computed(() => (view.value === 'overview' ? null : MODULES[view.value]))

  function swap(next: ViewId, nextFocus: string | null) {
    focus.value = nextFocus
    view.value = next
  }

  function navigate(next: ViewId, nextFocus: string | null = null) {
    if (phase.value !== 'idle' || booting.value) {
      queued = { to: next, focus: nextFocus }
      return
    }
    if (next === view.value || reducedMotion.value || !curtainReady.value) {
      swap(next, nextFocus)
      return
    }
    target.value = { to: next, focus: nextFocus }
    phase.value = 'cover'
  }

  function commit() {
    if (phase.value !== 'cover' || !target.value) return
    swap(target.value.to, target.value.focus)
    phase.value = 'reveal'
  }

  function finish() {
    phase.value = 'idle'
    target.value = null
    flushQueued()
  }

  function flushQueued() {
    const next = queued
    queued = null
    if (next) navigate(next.to, next.focus)
  }

  function endBoot() {
    booting.value = false
    flushQueued()
  }

  function setCurtainReady(value: boolean) {
    curtainReady.value = value
  }

  function back() {
    navigate('overview')
  }

  function clearFocus() {
    focus.value = null
  }

  function setReducedMotion(value: boolean) {
    reducedMotion.value = value
  }

  function toggleConsole() {
    consoleOpen.value = !consoleOpen.value
  }

  function openTrace(rfid: string) {
    traceRfid.value = rfid
  }

  function closeTrace() {
    traceRfid.value = null
  }

  function toggleTour() {
    tour.value = !tour.value
  }

  function openCause(alarmId: number) {
    causeAlarmId.value = alarmId
  }

  function closeCause() {
    causeAlarmId.value = null
  }

  return {
    view, focus, reducedMotion, consoleOpen, traceRfid, causeAlarmId, tour, activeModule, phase, target, booting,
    navigate, commit, finish, endBoot, setCurtainReady, back, clearFocus, setReducedMotion, toggleConsole, toggleTour,
    openTrace, closeTrace, openCause, closeCause,
  }
})
