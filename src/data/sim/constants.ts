import type { AgvRoute, Point } from './types'

/* 依据《联想笔记本 Mini 产线》实训资料与 PLC 点位表（BC_*数据表）建模 */

export const TICK_MS = 2000
export const TICK_SECONDS = TICK_MS / 1000
export const MAX_ALARMS = 60

export const FPY_THRESHOLD = 98
export const REWORK_THRESHOLD = 1.5
export const OEE_WARN = 75
export const DWELL_HOT_MIN = 120
export const TAKT_TARGET = 20
export const TRANSPORT_LATE_S = 40
export const RECENT_WINDOW = 200

/** 检测位2：后盖螺丝孔孔径 Φ2.50 ± 0.03 mm */
export const NOMINAL = 2.5
export const TOLERANCE = 0.03
export const TOLERANCE_SD = 0.0065
export const SPOT_CHECK_ESCAPED = 2

/** 线上仓库 12 个工位（Storage_Status_1..12），按 3 层 × 4 列排布 */
export const WAREHOUSE_ROWS = 3
export const WAREHOUSE_COLS = 4
export const MATERIAL_TYPES = ['A', 'B', 'C'] as const

/** 产线地图虚拟坐标系 1000×520 */
export const MAP_W = 1000
export const MAP_H = 520

export const MAP_ZONES = [
  { id: 'W', name: '线上仓库', x: 40, y: 40, w: 200, h: 120 },
  { id: 'L', name: '物流工位', x: 40, y: 220, w: 200, h: 120 },
  { id: 'A', name: '装配工位', x: 420, y: 40, w: 200, h: 120 },
  { id: 'I', name: '检测工位', x: 760, y: 40, w: 200, h: 120 },
  { id: 'C', name: '充电工位', x: 760, y: 380, w: 200, h: 110 },
] as const

export const AGV_ROUTES: AgvRoute[] = [
  { id: 'R1', name: '物流 → 装配送料', from: '物流工位', to: '装配工位', points: [{ x: 240, y: 280 }, { x: 330, y: 280 }, { x: 330, y: 220 }, { x: 520, y: 220 }, { x: 520, y: 160 }] },
  { id: 'R2', name: '装配取料 → 检测送料', from: '装配工位', to: '检测工位', points: [{ x: 620, y: 100 }, { x: 690, y: 100 }, { x: 690, y: 220 }, { x: 860, y: 220 }, { x: 860, y: 160 }] },
  { id: 'R3', name: '检测取料 → 物流回库', from: '检测工位', to: '物流工位', points: [{ x: 900, y: 160 }, { x: 900, y: 300 }, { x: 600, y: 300 }, { x: 600, y: 320 }, { x: 240, y: 320 }] },
  { id: 'R4', name: '返回充电', from: '物流工位', to: '充电工位', points: [{ x: 240, y: 330 }, { x: 600, y: 330 }, { x: 600, y: 435 }, { x: 760, y: 435 }] },
  { id: 'R5', name: '充电完成 → 物流待命', from: '充电工位', to: '物流工位', points: [{ x: 760, y: 450 }, { x: 560, y: 450 }, { x: 560, y: 340 }, { x: 240, y: 340 }] },
]

/** 作业循环：送料 → 检测送料 → 回库，低电量插入充电往返 */
export const WORK_ROUTES = ['R1', 'R2', 'R3'] as const

export const CHARGE_SPOTS: Point[] = [{ x: 810, y: 450 }, { x: 860, y: 450 }, { x: 910, y: 450 }]

/** 检测工位 5 个检测位（JianCe1_OK_NG … JianCe5_OK_NG） */
export const INSPECTION_STATIONS = [
  { name: '检测位1', method: '激光测距', item: '螺丝孔位置度' },
  { name: '检测位2', method: '激光测径', item: '螺丝孔孔径' },
  { name: '检测位3', method: '机器视觉', item: '外观划痕' },
  { name: '检测位4', method: '机器视觉', item: '屏幕贴合间隙' },
  { name: '检测位5', method: 'RFID核验', item: '工艺追溯' },
] as const

export const DEFECT_TYPES = ['孔径超差', '孔位偏移', '外观划痕', '贴合间隙超标', 'RFID异常', '缺件漏装'] as const

export const WORKPIECE_NAMES = ['笔记本主板', '屏幕组件', '键盘模组', '电池模组', 'C 面后盖', '散热模组'] as const

export const ASSEMBLY_WORKERS = ['陈工', '李工', '王工', '赵工', '周工', '吴工'] as const

/** 各单元主设备，OEE 与故障记录挂在设备上 */
export const EQUIPMENT = [
  { id: 'EQ-WL', name: '物流输送线', unit: 'logistics' },
  { id: 'EQ-CK', name: '仓库三轴机械手', unit: 'warehouse' },
  { id: 'EQ-MM', name: 'MOMA 复合机器人', unit: 'agv' },
  { id: 'EQ-ZP', name: '装配机器人', unit: 'assembly' },
  { id: 'EQ-JC', name: '检测机器人', unit: 'inspection' },
] as const

/** 故障码取自各单元点位表 Alarm_* 字段 */
export const FAULT_CATALOG: Record<string, readonly { code: string; desc: string }[]> = {
  'EQ-WL': [
    { code: 'Alarm_Transport', desc: '传输故障' }, { code: 'Alarm_Print', desc: '打印故障' },
    { code: 'Alarm_ItemsSensor', desc: '物料感应故障' }, { code: 'Alarm_Servo', desc: '伺服故障' },
  ],
  'EQ-CK': [
    { code: 'Alarm_Storage', desc: '仓库故障' }, { code: 'Alarm_Servo', desc: '伺服故障' },
    { code: 'Alarm_RFID', desc: 'RFID故障' }, { code: 'Alarm_Pressure', desc: '气压故障' },
  ],
  'EQ-MM': [
    { code: 'Alarm_AGV', desc: 'AGV故障' }, { code: 'Alarm_Yaxis', desc: 'Y轴故障' },
    { code: 'Alarm_Zaxis', desc: 'Z轴故障' }, { code: 'Alarm_code', desc: '二维码故障' },
  ],
  'EQ-ZP': [
    { code: 'Alarm_Robot', desc: '机器人故障' }, { code: 'Alarm_GongWei', desc: '装配工位故障' },
    { code: 'Alarm_AGV', desc: 'AGV对接故障' }, { code: 'Alarm_Print', desc: '打码故障' },
  ],
  'EQ-JC': [
    { code: 'Alarm_Robot', desc: '机器人故障' }, { code: 'Alarm_GongWei', desc: '检测工位故障' },
    { code: 'Alarm_Pressure', desc: '气压故障' }, { code: 'Alarm_AGV', desc: 'AGV对接故障' },
  ],
}

/** 装配机器人故障会引起装配质量漂移（联动链 2） */
export const DRIFT_EQUIPMENT = ['EQ-ZP']
