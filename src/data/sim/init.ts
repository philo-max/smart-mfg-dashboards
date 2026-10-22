import { type Rng, clockText, pad2, round } from './rng'
import {
  AGV_ROUTES, ASSEMBLY_WORKERS, DEFECT_TYPES, EQUIPMENT, FAULT_CATALOG, INSPECTION_STATIONS,
  HISTORY_LEN, MATERIAL_TYPES, NG_HISTORY_SEED, NOMINAL, RECENT_WINDOW, TAKE_TIME_S, TAKT_TARGET, TOLERANCE_SD,
  WAREHOUSE_COLS, WAREHOUSE_ROWS, WORKPIECE_NAMES,
} from './constants'
import { torqueCurve } from './torque'
import { makeInspectionRecord } from './record'
import { initLineage } from './lineage'
import { initOps, seedOee } from './ops'
import type {
  AgvState, AssemblyState, Equipment, HourBucket, InspectionState, LogisticsState, OrderBucket,
  PlantState, TraceRecord, WarehouseCell, WarehouseState, WorkpieceRef,
} from './types'

const HOURS = 24
const DAYS = 7
const AGV_COUNT = 4

let rfidSerial = 1000
export function nextRfid(): string {
  rfidSerial += 1
  return `RF${String(rfidSerial).padStart(5, '0')}`
}

export function makeWorkpiece(rng: Rng, now: Date, ageSeconds = 0): WorkpieceRef {
  return {
    rfid: nextRfid(),
    name: rng.pick(WORKPIECE_NAMES),
    batch: `LB${now.getMonth() + 1}${pad2(now.getDate())}-${pad2(rng.int(1, 12))}`,
    inAt: clockText(new Date(now.getTime() - ageSeconds * 1000)),
  }
}

function initWarehouse(rng: Rng, now: Date): WarehouseState {
  const cells: WarehouseCell[] = []
  for (let i = 0; i < WAREHOUSE_ROWS * WAREHOUSE_COLS; i++) {
    const filled = rng.chance(0.75)
    const dwellMin = filled ? (rng.chance(0.15) ? rng.int(125, 240) : rng.int(3, 100)) : 0
    cells.push({
      id: `${i + 1}号`,
      index: i + 1,
      row: Math.floor(i / WAREHOUSE_COLS),
      col: i % WAREHOUSE_COLS,
      material: filled ? rng.pick(MATERIAL_TYPES) : null,
      item: filled ? makeWorkpiece(rng, now, dwellMin * 60) : null,
      dwellMin,
    })
  }
  return {
    cells, accuracy: 99.4,
    inboundToday: rng.int(140, 170), outboundToday: rng.int(130, 160),
    autoStore: rng.int(1200, 1300), autoPick: rng.int(1150, 1250), manualStore: rng.int(20, 40),
    robot: { x: 120, y: 80, z: 30 }, upperBelt: true, lowerBelt: true,
    flow: Array.from({ length: HISTORY_LEN }, () => ({ in: rng.int(0, 1), out: rng.int(0, 1) })),
  }
}

export function taskName(routeId: string, rng: Rng): string {
  const route = AGV_ROUTES.find((r) => r.id === routeId) ?? AGV_ROUTES[0]
  return `T${rng.int(1000, 9999)} ${route.name}`
}

function initAgv(rng: Rng): AgvState {
  const agvs = Array.from({ length: AGV_COUNT }, (_, i) => {
    const routeId = AGV_ROUTES[i % 3].id
    return {
      id: `MOMA-${pad2(i + 1)}`,
      status: 'running' as const,
      routeId,
      progress: rng.next(),
      speed: 0.07 + rng.next() * 0.03,
      battery: rng.int(40, 96),
      yAxis: round(rng.next() * 300, 1),
      task: taskName(routeId, rng),
      blockedTicks: 0,
      legTicks: 0,
    }
  })
  const history = Array.from({ length: HISTORY_LEN }, () => ({ done: rng.int(0, 2), blocked: 0 }))
  return { agvs, tasksDone: rng.int(180, 200), tasksTotal: 208, history }
}

function initAssembly(rng: Rng): AssemblyState {
  const produced = rng.int(1650, 1750)
  const rework = Math.round(produced * 0.006)
  return {
    produced,
    qualified: produced - rework,
    rework,
    planToday: 2400,
    taktElapsed: rng.int(0, 8) * 2,
    taktTarget: TAKT_TARGET,
    lastTakt: 18,
    taktHistory: Array.from({ length: 20 }, () => round(rng.gaussian(18, 0.9), 1)),
    workers: ASSEMBLY_WORKERS.map((name) => ({ name, output: rng.int(250, 310) })),
    driftTicks: 0,
    nextCycle: 18,
    recent: Array.from({ length: RECENT_WINDOW }, () => (rng.chance(0.006) ? 1 : 0)),
    currentRfid: nextRfid(),
    torque: torqueCurve(rng, false),
    reworkHistory: Array.from({ length: HISTORY_LEN }, () => Math.max(0, round(rng.gaussian(0.6, 0.15), 2))),
  }
}

function buildBuckets(rng: Rng, now: Date, count: number, stepMs: number, daily: boolean): HourBucket[] {
  const list: HourBucket[] = []
  for (let i = count - 1; i >= 0; i--) {
    const t = new Date(now.getTime() - i * stepMs)
    const total = daily ? rng.int(2200, 2500) : rng.int(90, 110)
    const spike = !daily && (i === 5 || i === 4)
    const failRate = spike ? 0.03 + rng.next() * 0.015 : 0.004 + rng.next() * 0.008
    const fail = Math.round(total * failRate)
    list.push({
      label: daily ? `${pad2(t.getMonth() + 1)}-${pad2(t.getDate())}` : `${pad2(t.getHours())}:00`,
      pass: total - fail, fail,
      power: round(spike ? 7.8 + rng.next() * 1.2 : 5.2 + rng.next() * 1, 1),
    })
  }
  return list
}

function initInspection(rng: Rng, now: Date): InspectionState {
  const hourly = buildBuckets(rng, now, HOURS, 3600e3, false)
  const totalFail = hourly.reduce((a, h) => a + h.fail, 0)
  const weights = [0.3, 0.2, 0.2, 0.12, 0.08, 0.1]
  return {
    hourly,
    daily: buildBuckets(rng, now, DAYS, 86400e3, true),
    tolerance: Array.from({ length: 600 }, () => round(rng.gaussian(NOMINAL + 0.002, TOLERANCE_SD), 4)),
    defects: DEFECT_TYPES.map((name, i) => ({ name, value: Math.max(1, Math.round(totalFail * weights[i])) })),
    stations: INSPECTION_STATIONS.map((s) => {
      const total = rng.int(1650, 1750)
      return { name: s.name, total, fail: Math.round(total * (0.002 + rng.next() * 0.006)) }
    }),
    records: [],
    ngHistory: Array.from({ length: NG_HISTORY_SEED }, (_, i) =>
      makeInspectionRecord(rng, {
        now: new Date(now.getTime() - (i + 1) * rng.int(120, 900) * 1000),
        failRate: 1, forceFail: true, serial: 900000 + i, rfid: nextRfid(),
      }),
    ),
    mttr: [
      { time: '03:12', station: '检测位2', desc: 'Alarm_GongWei 连续 3 件孔径超差', respondMin: 3, minutes: 18 },
      { time: '07:45', station: '检测位3', desc: '视觉光源亮度衰减误判', respondMin: 6, minutes: 26 },
      { time: '11:20', station: '检测位5', desc: 'Alarm_RFID 标签读取失败', respondMin: 2, minutes: 9 },
      { time: '14:05', station: '检测机器人', desc: 'Alarm_Pressure 气压不足', respondMin: 4, minutes: 21 },
    ],
    takeTime: TAKE_TIME_S,
    ops: initOps(hourly),
  }
}

function initLogistics(rng: Rng, now: Date): LogisticsState {
  const equipment: Equipment[] = EQUIPMENT.map((e) => ({
    ...e,
    availability: round(0.88 + rng.next() * 0.07, 3),
    performance: round(0.86 + rng.next() * 0.1, 3),
    quality: round(0.975 + rng.next() * 0.02, 3),
    faults: Array.from({ length: rng.int(1, 3) }, () => {
      const f = rng.pick(FAULT_CATALOG[e.id])
      return { time: clockText(new Date(now.getTime() - rng.int(600, 30000) * 1000)), code: f.code, desc: f.desc, minutes: rng.int(5, 40) }
    }).sort((a, b) => b.time.localeCompare(a.time)),
  }))
  const ordersTotal = rng.int(180, 200)
  const orderHourly: OrderBucket[] = Array.from({ length: HOURS }, (_, i) => {
    const total = rng.int(7, 9)
    return {
      label: `${pad2(new Date(now.getTime() - (HOURS - 1 - i) * 3600e3).getHours())}:00`,
      total,
      onTime: total - (rng.chance(0.25) ? 1 : 0),
    }
  })
  const trace: TraceRecord[] = Array.from({ length: 8 }, (_, i) => {
    const route = AGV_ROUTES[i % 3]
    return {
      time: clockText(new Date(now.getTime() - (i + 1) * 20e3)),
      rfid: nextRfid(),
      name: rng.pick(WORKPIECE_NAMES),
      from: route.from,
      to: route.to,
      status: '完成' as const,
    }
  })
  return {
    ordersTotal,
    ordersOnTime: Math.round(ordersTotal * 0.965),
    rfidWrites: rng.int(1600, 1700),
    transport: Array.from({ length: 30 }, (_, i) => ({
      label: clockText(new Date(now.getTime() - (29 - i) * 10 * 60e3)).slice(0, 5),
      seconds: Math.round(rng.gaussian(25, 3)),
    })),
    equipment,
    trace,
    orderHourly,
  }
}

export function createPlant(rng: Rng, now: Date = new Date()): PlantState {
  const warehouse = initWarehouse(rng, now)
  const state: PlantState = {
    tick: 0,
    warehouse,
    lineage: initLineage(warehouse.cells),
    agv: initAgv(rng),
    assembly: initAssembly(rng),
    inspection: initInspection(rng, now),
    logistics: initLogistics(rng, now),
    cooldowns: {},
    faultTally: {},
  }
  seedOee(state)
  return state
}
