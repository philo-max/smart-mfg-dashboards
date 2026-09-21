import { computed, reactive, ref } from 'vue'
import { defineStore } from 'pinia'
import { createRng, clockText } from '@/data/sim/rng'
import { createPlant } from '@/data/sim/init'
import { stepPlant } from '@/data/sim/step'
import { MAX_ALARMS, TICK_MS } from '@/data/sim/constants'
import { moduleLevels, plantKpis, roomSummaries } from '@/data/sim/selectors'
import type { AlarmDraft, AlarmStatus, PlantAlarm, PlantState } from '@/data/sim/types'

const SEED = 20260921
/** 预热 tick 数：让检测记录、告警等在首屏就有内容 */
const WARMUP_TICKS = 40

/**
 * 产线唯一数据源：五个单元共用同一份模拟状态，按物料流向逐 tick 联动推进。
 * 接入 leapiot 实时数据时，替换 tick() 内的 stepPlant 即可，视图层不变。
 */
export const usePlantStore = defineStore('plant', () => {
  const rng = createRng(SEED)
  const state = reactive(createPlant(rng)) as PlantState
  const alarms = ref<PlantAlarm[]>([])
  const latestAlarm = ref<PlantAlarm | null>(null)
  let seq = 0
  let timer: number | null = null

  function pushAlarms(drafts: AlarmDraft[], now: Date) {
    if (drafts.length === 0) return
    const created = drafts.map((d) => ({ ...d, id: ++seq, time: clockText(now), status: 'open' as AlarmStatus }))
    alarms.value = [...created.reverse(), ...alarms.value].slice(0, MAX_ALARMS)
    latestAlarm.value = created.find((a) => a.level === 'risk') ?? created[0]
  }

  function tick() {
    const now = new Date()
    pushAlarms(stepPlant(state, rng, now), now)
  }

  for (let i = 0; i < WARMUP_TICKS; i++) {
    const now = new Date(Date.now() - (WARMUP_TICKS - i) * TICK_MS)
    pushAlarms(stepPlant(state, rng, now), now)
  }
  latestAlarm.value = null

  function start() {
    if (timer !== null) return
    timer = window.setInterval(tick, TICK_MS)
  }

  function stop() {
    if (timer !== null) window.clearInterval(timer)
    timer = null
  }

  function setAlarmStatus(id: number, status: AlarmStatus) {
    alarms.value = alarms.value.map((a) => (a.id === id ? { ...a, status } : a))
  }

  const kpis = computed(() => plantKpis(state))
  const levels = computed(() => moduleLevels(state))
  const rooms = computed(() => roomSummaries(state))
  const unresolved = computed(() => {
    const open = alarms.value.filter((a) => a.status !== 'resolved')
    return { total: open.length, risk: open.filter((a) => a.level === 'risk').length, warn: open.filter((a) => a.level === 'warn').length }
  })

  return { state, alarms, latestAlarm, kpis, levels, rooms, unresolved, start, stop, tick, setAlarmStatus }
})
