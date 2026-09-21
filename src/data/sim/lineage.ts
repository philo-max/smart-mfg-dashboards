import type { ModuleId } from '../modules'
import { clockText, createRng, pad2, round } from './rng'
import { WORKPIECE_NAMES } from './constants'
import type {
  LineageEvent, LineageStage, LineageState, PlantState, TraceStageView, TraceView, WarehouseCell, WorkpieceRef,
} from './types'

/** 工件履历：RFID 贯穿 仓库 → AGV 配送 → 装配 → 检测 → 回库；只保留最近若干件，超出按先进先出淘汰 */
export const LINEAGE_MAX = 300

const STAGES: { key: TraceStageView['key']; label: string; module: ModuleId }[] = [
  { key: 'warehouse', label: '仓库出库', module: 'warehouse' },
  { key: 'agv', label: 'AGV 配送', module: 'agv' },
  { key: 'assembly', label: '装配', module: 'assembly' },
  { key: 'inspection', label: '检测', module: 'inspection' },
  { key: 'return', label: '合格回库', module: 'logistics' },
]

export function emptyLineage(): LineageState {
  return { released: [], delivered: [], assembled: [], finished: [], events: {}, order: [], meta: {} }
}

export function rememberWorkpiece(state: PlantState, wp: WorkpieceRef): void {
  state.lineage.meta[wp.rfid] = { name: wp.name, batch: wp.batch }
}

export function logEvent(
  state: PlantState, rfid: string, stage: LineageStage, module: ModuleId, text: string,
  level: LineageEvent['level'], time: string,
): void {
  const ln = state.lineage
  if (!ln.events[rfid]) {
    ln.events[rfid] = []
    ln.order.push(rfid)
    if (ln.order.length > LINEAGE_MAX) {
      const oldest = ln.order.shift()
      if (oldest) {
        delete ln.events[oldest]
        delete ln.meta[oldest]
      }
    }
  }
  ln.events[rfid].push({ time, stage, module, text, level })
}

/** 初始在库工件：各自带一条「入库」事件 */
export function initLineage(cells: WarehouseCell[]): LineageState {
  const ln = emptyLineage()
  for (const c of cells) {
    if (!c.item) continue
    ln.meta[c.item.rfid] = { name: c.item.name, batch: c.item.batch }
    ln.events[c.item.rfid] = [{ time: c.item.inAt, stage: 0, module: 'warehouse', text: `入库 ${c.id}工位（${c.material} 料）`, level: 'info' }]
    ln.order.push(c.item.rfid)
  }
  return ln
}

function toSeconds(t: string): number {
  const [h, m, s] = t.split(':').map(Number)
  return (h || 0) * 3600 + (m || 0) * 60 + (s || 0)
}

function fromSeconds(sec: number): string {
  const s = ((Math.round(sec) % 86400) + 86400) % 86400
  return `${pad2(Math.floor(s / 3600))}:${pad2(Math.floor((s % 3600) / 60))}:${pad2(s % 60)}`
}

interface Location {
  module: ModuleId
  text: string
  focus?: string
  time?: string
  stage: LineageStage
  level: LineageEvent['level']
}

/** 从当前状态里找这个 RFID 现在在哪 / 出现在哪条记录里 */
function locate(state: PlantState, rfid: string): Location | null {
  const cell = state.warehouse.cells.find((c) => c.item?.rfid === rfid)
  if (cell) return { module: 'warehouse', text: `在库 ${cell.id}工位，已停留 ${cell.dwellMin} 分钟`, focus: cell.id, stage: 0, level: 'info', time: cell.item?.inAt }
  if (state.assembly.currentRfid === rfid) return { module: 'assembly', text: '装配工位加工中', stage: 2, level: 'info' }
  const rec = state.inspection.records.find((r) => r.rfid === rfid) ?? state.inspection.ngHistory.find((r) => r.rfid === rfid)
  if (rec) {
    return {
      module: 'inspection', stage: 3, time: rec.time, level: rec.pass ? 'ok' : 'risk', focus: 'ng',
      text: rec.pass ? '检测合格（5 个检测位全部 OK）' : `检测不合格：${rec.defect}（检测位 ${rec.positions.indexOf(false) + 1} NG）`,
    }
  }
  const tr = state.logistics.trace.find((t) => t.rfid === rfid)
  if (tr) return { module: 'logistics', stage: tr.to === '物流工位' ? 4 : 1, time: tr.time, level: tr.status === '延误' ? 'warn' : 'ok', text: `${tr.from} → ${tr.to}（${tr.status}）` }
  return null
}

/** 补齐上游历史：最早的真实事件之前的阶段，用 RFID 派生的确定性数据合成，标记为「历史归档」 */
function backfill(rfid: string, real: LineageEvent[], anchor: string): LineageEvent[] {
  const earliest = real.length ? Math.min(...real.map((e) => e.stage)) : 5
  if (earliest === 0) return []
  const rng = createRng(Number(rfid.replace(/\D/g, '')) || 1)
  const t = toSeconds(anchor)
  const total = rng.int(25, 70) * 60
  const at = (frac: number) => fromSeconds(t - total * (1 - frac))
  const out: LineageEvent[] = []
  const mk = (stage: LineageStage, module: ModuleId, text: string, level: LineageEvent['level'], frac: number) =>
    out.push({ time: at(frac), stage, module, text, level, synthetic: true })
  const slot = rng.int(1, 12)
  const agv = `MOMA-0${rng.int(1, 4)}`
  mk(0, 'warehouse', `入库 ${slot}号工位（${rng.pick(['A', 'B', 'C'])} 料）`, 'info', 0)
  if (earliest > 1) {
    mk(0, 'warehouse', `出库 ${slot}号工位，停留 ${rng.int(8, 90)} 分钟`, 'info', 0.55)
    mk(1, 'agv', `${agv} 配送 物流工位 → 装配工位，耗时 ${rng.int(22, 34)}s`, 'ok', 0.75)
  }
  if (earliest > 2) mk(2, 'assembly', `装配完成，节拍 ${rng.int(17, 21)}s，扭矩峰值 ${round(rng.gaussian(1.0, 0.05), 2)} N·m`, 'ok', 0.92)
  return out
}

export function buildTrace(state: PlantState, rfid: string): TraceView {
  const key = rfid.trim().toUpperCase()
  const known = state.lineage.events[key]
  const loc = locate(state, key)
  const meta = state.lineage.meta[key]
  const cell = state.warehouse.cells.find((c) => c.item?.rfid === key)
  const name = meta?.name ?? cell?.item?.name ?? WORKPIECE_NAMES[Number(key.replace(/\D/g, '')) % WORKPIECE_NAMES.length]
  const batch = meta?.batch ?? cell?.item?.batch ?? '—'
  if (!known && !loc) {
    return { rfid: key, found: false, name, batch, events: [], stages: STAGES.map((s) => ({ ...s, status: 'pending' as const })), location: '未找到该 RFID', result: 'wip', focus: null }
  }

  let real = known ? [...known] : []
  if (loc && !real.some((e) => e.stage === loc.stage)) {
    real = [...real, { time: loc.time ?? clockText(new Date()), stage: loc.stage, module: loc.module, text: loc.text, level: loc.level }]
  }
  const anchor = real.length ? real.reduce((a, e) => (toSeconds(e.time) < toSeconds(a) ? e.time : a), real[0].time) : clockText(new Date())
  const events = [...backfill(key, real, anchor), ...real]

  const furthest = Math.max(...events.map((e) => e.stage)) as LineageStage
  const lastInspection = [...events].reverse().find((e) => e.stage === 3)
  const ng = lastInspection?.level === 'risk' && furthest < 4
  const stages: TraceStageView[] = STAGES.map((s, i) => ({
    ...s,
    status: i < furthest ? 'done' : i === furthest ? (furthest === 4 ? 'done' : ng && i === 3 ? 'fail' : 'current') : 'pending',
  }))
  const last = events[events.length - 1]
  return {
    rfid: key, found: true, name, batch, events, stages,
    location: loc?.text ?? last.text,
    result: ng ? 'ng' : furthest >= 4 || (furthest === 3 && last.level === 'ok') ? 'pass' : 'wip',
    focus: loc ? { module: loc.module, focus: loc.focus ?? null } : null,
  }
}
