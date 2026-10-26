import type { InspectionRecord } from '@/data/sim/types'

export type StepId = 'locate' | 'arrive' | 'capture' | 'verify' | 'sort'
export type StepState = 'done' | 'active' | 'wait' | 'fail'
export type ReadyLamp = 'idle' | 'ready' | 'busy' | 'timeout'
export type ArmAction = '待命' | '夹取' | '移动' | '放置'

export const PROCESS_STEPS: { id: StepId; name: string; device: string }[] = [
  { id: 'locate', name: '前置定位', device: '压力 + 红外传感器' },
  { id: 'arrive', name: '到位确认', device: '光栅 / 限位开关' },
  { id: 'capture', name: '拍照采集', device: '机器视觉相机' },
  { id: 'verify', name: '数据核对', device: '数据库 AI / 阈值比对' },
  { id: 'sort', name: '分拣执行', device: '机械臂' },
]

export const CYCLE_TICKS = 10
const TICKS_PER_STEP = CYCLE_TICKS / PROCESS_STEPS.length
const LOCATE_FAIL_EVERY = 17
const ARM_ACTIONS: ArmAction[] = ['夹取', '移动', '放置']

function noise(cycle: number, salt: number): number {
  const x = Math.sin(cycle * 12.9898 + salt * 78.233) * 43758.5453
  return x - Math.floor(x)
}

function pick(cycle: number, salt: number, lo: number, hi: number, digits = 0): number {
  return Number((lo + noise(cycle, salt) * (hi - lo)).toFixed(digits))
}

export interface ProcessSnapshot {
  cycle: number
  stepIndex: number
  steps: { id: StepId; name: string; device: string; state: StepState }[]
  locate: { pressure: number; infrared: boolean; offset: number; ok: boolean }
  ready: ReadyLamp
  vision: { fps: number; uploadMs: number; compareMs: number; confidence: number; captureRate: number }
  sort: { action: ArmAction; target: 'A 区' | 'B 区' | '--'; costSec: number; okCount: number; ngCount: number }
  verdict: boolean | null
  halted: boolean
}

export function processSnapshot(tick: number, latest: InspectionRecord | null, okTotal: number, ngTotal: number): ProcessSnapshot {
  const cycle = Math.floor(tick / CYCLE_TICKS)
  const stepIndex = Math.floor((tick % CYCLE_TICKS) / TICKS_PER_STEP)
  const locateFailed = cycle % LOCATE_FAIL_EVERY === LOCATE_FAIL_EVERY - 1
  const verdict = latest ? latest.pass : true
  const halted = locateFailed && stepIndex >= 1

  const steps = PROCESS_STEPS.map((s, i) => {
    let state: StepState = 'wait'
    if (halted) state = i === 0 ? 'fail' : 'wait'
    else if (i < stepIndex) state = 'done'
    else if (i === stepIndex) state = 'active'
    if (i === 3 && !verdict && state === 'done') state = 'fail'
    return { ...s, state }
  })

  let ready: ReadyLamp = 'idle'
  if (halted) ready = 'timeout'
  else if (stepIndex === 1) ready = 'ready'
  else if (stepIndex >= 2) ready = 'busy'

  const sortActive = !halted && stepIndex === 4
  const armPhase = Math.floor(((tick % CYCLE_TICKS) - 4 * TICKS_PER_STEP) / (TICKS_PER_STEP / 3 + 0.001))
  const action: ArmAction = sortActive ? ARM_ACTIONS[Math.min(Math.max(armPhase, 0), 2)] : '待命'

  return {
    cycle,
    stepIndex,
    steps,
    locate: {
      pressure: pick(cycle, 1, 238, 252),
      infrared: !locateFailed,
      offset: locateFailed ? pick(cycle, 2, 0.35, 0.6, 2) : pick(cycle, 2, 0.01, 0.06, 2),
      ok: !locateFailed,
    },
    ready,
    vision: {
      fps: pick(cycle, 3, 28, 31),
      uploadMs: pick(cycle, 4, 9, 16),
      compareMs: pick(cycle, 5, 38, 56),
      confidence: verdict ? pick(cycle, 6, 98.4, 99.8, 1) : pick(cycle, 6, 71, 88, 1),
      captureRate: pick(cycle, 7, 99.1, 100, 1),
    },
    sort: {
      action,
      target: sortActive || stepIndex === 4 ? (verdict ? 'A 区' : 'B 区') : '--',
      costSec: pick(cycle, 8, 2.1, 2.6, 1),
      okCount: okTotal,
      ngCount: ngTotal,
    },
    verdict: halted ? null : verdict,
    halted,
  }
}
