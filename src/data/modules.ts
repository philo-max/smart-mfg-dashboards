import type { Component } from 'vue'
import { Bot, Cpu, ScanSearch, Truck, Warehouse, Wrench } from '@lucide/vue'

/** 五个业务模块 = 基建中的五个房间；物料流向：仓库 → AGV → 装配 → 检测 → 物流 */
export type ModuleId = 'warehouse' | 'agv' | 'assembly' | 'inspection' | 'logistics'

export interface ModuleMeta {
  id: ModuleId
  name: string
  room: string
  en: string
  code: string
  level: number
  color: string
  icon: Component
  desc: string
}

export const HUB_META = {
  name: '控制中枢',
  en: 'CONTROL CENTER',
  code: 'HUB-00',
  color: 'var(--room-hub)',
  icon: Cpu,
} as const

export const MODULES: Record<ModuleId, ModuleMeta> = {
  warehouse: {
    id: 'warehouse', name: '仓库单元', room: '仓储站', en: 'WAREHOUSE', code: 'B101', level: 3,
    color: 'var(--room-warehouse)', icon: Warehouse, desc: '立体库位 · RFID 工件追踪',
  },
  agv: {
    id: 'agv', name: 'AGV单元', room: '调度站', en: 'AGV DISPATCH', code: 'B102', level: 3,
    color: 'var(--room-agv)', icon: Bot, desc: '无人搬运 · 路径调度',
  },
  assembly: {
    id: 'assembly', name: '装配单元', room: '制造站', en: 'ASSEMBLY', code: 'B201', level: 3,
    color: 'var(--room-assembly)', icon: Wrench, desc: '工位节拍 · 返工管控',
  },
  inspection: {
    id: 'inspection', name: '检测单元', room: '检测站', en: 'INSPECTION', code: 'B202', level: 3,
    color: 'var(--room-inspection)', icon: ScanSearch, desc: '激光 / 视觉 / RFID 多模态检测',
  },
  logistics: {
    id: 'logistics', name: '物流单元', room: '贸易站', en: 'LOGISTICS', code: 'B301', level: 2,
    color: 'var(--room-logistics)', icon: Truck, desc: '订单交付 · 设备 OEE',
  },
}

export const MODULE_ORDER: ModuleId[] = ['warehouse', 'agv', 'assembly', 'inspection', 'logistics']
