import { FPY_THRESHOLD, NOMINAL, TOLERANCE } from '@/data/sim/constants'
import { inspectionTotals } from '@/data/sim/selectors'
import type { PlantState } from '@/data/sim/types'
import type { InspectionReport } from './reportExport'

export function processCapability(samples: number[]) {
  const n = samples.length
  const mean = samples.reduce((a, v) => a + v, 0) / n
  const sd = Math.sqrt(samples.reduce((a, v) => a + (v - mean) ** 2, 0) / (n - 1))
  const cpk = Math.min(NOMINAL + TOLERANCE - mean, mean - (NOMINAL - TOLERANCE)) / (3 * sd)
  return { mean, sd, cpk }
}

export function mttrOf(state: PlantState): number {
  const list = state.inspection.mttr
  return list.length ? Math.round((list.reduce((a, x) => a + x.minutes, 0) / list.length) * 10) / 10 : 0
}

export function buildReport(state: PlantState, now: Date = new Date()): InspectionReport {
  const ins = state.inspection
  const k = inspectionTotals(state)
  const cap = processCapability(ins.tolerance)
  const mttr = mttrOf(state)
  const defects = ins.defects.slice().sort((a, b) => b.value - a.value)
  const defectSum = defects.reduce((a, d) => a + d.value, 0) || 1
  const stations = ins.stations.map((s) => ({ ...s, rate: s.total ? ((s.total - s.fail) / s.total) * 100 : 100 }))
  const worst = stations.slice().sort((a, b) => a.rate - b.rate)[0]
  const peak = ins.hourly.slice().sort((a, b) => b.fail / (b.pass + b.fail || 1) - a.fail / (a.pass + a.fail || 1))[0]
  const top = defects[0]

  const conclusion =
    `近 24 小时共检测 <b>${k.total.toLocaleString()}</b> 件，一次合格率 <b>${k.fpy}%</b>` +
    (k.fpy < FPY_THRESHOLD ? `，低于 ${FPY_THRESHOLD}% 阈值` : '，达到阈值要求') +
    `。首要缺陷为「<b>${top.name}</b>」，占比 ${((top.value / defectSum) * 100).toFixed(1)}%；` +
    `合格率最低的检测位为 <b>${worst.name}</b>（${worst.rate.toFixed(2)}%）。<b>${peak.label}</b> 时段不合格率最高，` +
    `同期检测设备功率 ${peak.power} kW，建议联动排查装配机器人与检测机器人状态。平均异常闭环耗时 <b>${mttr}</b> 分钟。`

  return {
    generatedAt: now,
    conclusion,
    sections: [
      {
        title: '汇总指标',
        head: ['指标', '数值'],
        rows: [
          ['检测总数', k.total], ['合格数', k.pass], ['不合格数', k.fail],
          ['一次合格率 FPY', `${k.fpy}%`], ['不良品检出率', `${k.detect}%`],
          ['异常闭环 MTTR(分钟)', mttr], ['过程能力 Cpk（检测位2 孔径）', cap.cpk.toFixed(2)],
        ],
      },
      {
        title: '缺陷类型分布',
        head: ['缺陷类型', '数量', '占比'],
        rows: defects.map((d) => [d.name, d.value, `${((d.value / defectSum) * 100).toFixed(1)}%`]),
      },
      {
        title: '检测位合格率',
        head: ['检测位', '检测数', '不合格', '合格率'],
        rows: stations.map((s) => [s.name, s.total, s.fail, `${s.rate.toFixed(2)}%`]),
      },
      {
        title: '异常闭环记录',
        head: ['时间', '位置', '异常描述', '闭环耗时(分钟)'],
        rows: ins.mttr.map((a) => [a.time, a.station, a.desc, a.minutes]),
      },
    ],
  }
}
