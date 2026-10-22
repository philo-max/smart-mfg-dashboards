import { computed, reactive, ref } from 'vue'
import { defineStore } from 'pinia'
import { createRng, clockText } from '@/data/sim/rng'
import { createPlant } from '@/data/sim/init'
import { stepPlant } from '@/data/sim/step'
import { SCENARIOS, injectScenario, type ScenarioId } from '@/data/sim/scenarios'
import { AUTO_RESOLVE_RISK_TICKS, AUTO_RESOLVE_WARN_TICKS, MAX_ALARMS, TICK_MS } from '@/data/sim/constants'
import { moduleLevels, plantKpis, roomSummaries } from '@/data/sim/selectors'
import type { AlarmDraft, AlarmStatus, PlantAlarm, PlantState } from '@/data/sim/types'

const SEED = 20260921
/** 预热 tick 数：让检测记录、告警等在首屏就有内容 */
const WARMUP_TICKS = 150
const WARMUP_OPEN_ALARMS = 4
const SCENARIO_LOG_MAX = 8
export const SPEEDS = [1, 2, 4] as const
export type Speed = (typeof SPEEDS)[number]

export interface ScenarioRecord {
  id: ScenarioId
  label: string
  time: string
}

/**
 * 产线唯一数据源：五个单元共用同一份模拟状态，按物料流向逐 tick 联动推进。
 * 接入 leapiot 实时数据时，替换 tick() 内的 stepPlant 即可，视图层不变。
 */
export const usePlantStore = defineStore('plant', () => {
  const rng = createRng(SEED)
  const state = reactive(createPlant(rng)) as PlantState
  const alarms = ref<PlantAlarm[]>([])
  const latestAlarm = ref<PlantAlarm | null>(null)
  const paused = ref(false)
  const speed = ref<Speed>(1)
  const scenarioLog = ref<ScenarioRecord[]>([])
  let seq = 0
  let timer: number | null = null
  let started = false

  function pushAlarms(drafts: AlarmDraft[], now: Date) {
    if (drafts.length === 0) return
    const created = drafts.map((d) => ({ ...d, id: ++seq, time: clockText(now), tick: state.tick, status: 'open' as AlarmStatus }))
    alarms.value = [...created.reverse(), ...alarms.value].slice(0, MAX_ALARMS)
    latestAlarm.value = created.find((a) => a.level === 'risk') ?? created[0]
  }

  function autoResolve() {
    const stale = (a: PlantAlarm) =>
      a.status !== 'resolved' && state.tick - a.tick > (a.level === 'risk' ? AUTO_RESOLVE_RISK_TICKS : AUTO_RESOLVE_WARN_TICKS)
    if (!alarms.value.some(stale)) return
    alarms.value = alarms.value.map((a) => (stale(a) ? { ...a, status: 'resolved' as AlarmStatus } : a))
  }

  function tick() {
    const now = new Date()
    pushAlarms(stepPlant(state, rng, now), now)
    autoResolve()
  }

  for (let i = 0; i < WARMUP_TICKS; i++) {
    const now = new Date(Date.now() - (WARMUP_TICKS - i) * TICK_MS)
    pushAlarms(stepPlant(state, rng, now), now)
  }
  latestAlarm.value = null
  /** 预热期间产生的是「历史告警」：只保留最近几条为未处理，其余视为已解决 */
  alarms.value = alarms.value.map((a, i) => (i < WARMUP_OPEN_ALARMS ? a : { ...a, status: 'resolved' as AlarmStatus }))

  function schedule() {
    if (timer !== null) window.clearInterval(timer)
    timer = started && !paused.value ? window.setInterval(tick, TICK_MS / speed.value) : null
  }

  function start() {
    started = true
    schedule()
  }

  function stop() {
    started = false
    schedule()
  }

  function togglePause() {
    paused.value = !paused.value
    schedule()
  }

  function setSpeed(next: Speed) {
    speed.value = next
    schedule()
  }

  /** 注入演练场景：状态变化立即生效，连锁反应由后续 tick 传导；「一键恢复」同时清空未处理告警 */
  function runScenario(id: ScenarioId) {
    const now = new Date()
    const drafts = injectScenario(state, rng, id, now)
    if (id === 'recover') {
      alarms.value = alarms.value.map((a) => (a.status === 'resolved' ? a : { ...a, status: 'resolved' as AlarmStatus }))
      latestAlarm.value = null
    } else {
      pushAlarms(drafts, now)
    }
    const label = SCENARIOS.find((s) => s.id === id)?.label ?? id
    scenarioLog.value = [{ id, label, time: clockText(now) }, ...scenarioLog.value].slice(0, SCENARIO_LOG_MAX)
  }

  function setAlarmStatus(id: number, status: AlarmStatus) {
    alarms.value = alarms.value.map((a) => {
      if (a.id !== id) return a
      const ackTick = a.ackTick ?? (status === 'open' ? undefined : state.tick)
      const doneTick = status === 'resolved' ? state.tick : a.doneTick
      return { ...a, status, ackTick, doneTick }
    })
  }

  const kpis = computed(() => plantKpis(state))
  const levels = computed(() => moduleLevels(state))
  const rooms = computed(() => roomSummaries(state))
  const unresolved = computed(() => {
    const open = alarms.value.filter((a) => a.status !== 'resolved')
    return { total: open.length, risk: open.filter((a) => a.level === 'risk').length, warn: open.filter((a) => a.level === 'warn').length }
  })

  return {
    state, alarms, latestAlarm, kpis, levels, rooms, unresolved, paused, speed, scenarioLog,
    start, stop, tick, togglePause, setSpeed, runScenario, setAlarmStatus,
  }
})
