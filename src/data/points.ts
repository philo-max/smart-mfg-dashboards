import type { ModuleId } from './modules'
import { equipmentOf, inspectionTotals, lightOf, moduleLevels } from './sim/selectors'
import type { PlantState } from './sim/types'

/**
 * PLC 点位（摘自产线 BC_*数据表.csv）。
 * 目前由模拟数据推算点位值；接入 leapiot 平台后按 name 替换为实时采集值即可。
 */
export interface PointDef {
  name: string
  alias: string
  type: 'Boolean' | 'Short' | 'Word' | 'Float' | 'String'
  address: string
}

export interface PointValue extends PointDef {
  value: string | number | boolean
}

const DEFS: Record<ModuleId, PointDef[]> = {
  warehouse: [
    { name: 'Zaikushu', alias: '在库数量', type: 'Word', address: 'DB8.24' },
    { name: 'Num_A', alias: 'A数量', type: 'Word', address: 'DB8.30' },
    { name: 'Num_B', alias: 'B数量', type: 'Word', address: 'DB8.32' },
    { name: 'Num_C', alias: 'C数量', type: 'Word', address: 'DB8.34' },
    { name: 'Quantity_Inbound', alias: '入库数', type: 'Short', address: 'DB26.1106' },
    { name: 'Quantity_Outbound', alias: '出库数', type: 'Short', address: 'DB26.1104' },
    { name: 'Robot_X', alias: 'X轴位置数据', type: 'Float', address: 'DB10.18' },
    { name: 'Robot_Y', alias: 'Y轴位置数据', type: 'Float', address: 'DB10.22' },
    { name: 'Robot_Z', alias: 'Z轴位置数据', type: 'Float', address: 'DB10.26' },
    { name: 'U_conveyorlineRun', alias: '上输送线运行', type: 'Boolean', address: 'Q0.2' },
  ],
  agv: [
    { name: 'moma_Speed', alias: 'MOMA运行速度', type: 'Float', address: 'DB22.8' },
    { name: 'Ydata_Position', alias: 'Y轴位置数据', type: 'Float', address: 'DB22.10' },
    { name: 'ZhuangPei_Reachsignal', alias: '装配工位位置到达', type: 'Boolean', address: 'I2.1' },
    { name: 'JianCe_Reachsignal', alias: '检测工位位置到达', type: 'Boolean', address: 'I2.0' },
    { name: 'WuLiu_Reachsignal', alias: '物流工位位置到达', type: 'Boolean', address: 'I2.2' },
    { name: 'ChongDian_Reachsignal', alias: '充电工位位置到达', type: 'Boolean', address: 'I2.3' },
    { name: 'Alarm_AGV', alias: 'AGV故障', type: 'Short', address: 'DB22.0' },
    { name: 'Alarm_Lowbattery', alias: '电量低报警', type: 'Short', address: 'DB22.6' },
  ],
  assembly: [
    { name: 'RFID', alias: 'RFID信息', type: 'String', address: 'DB13.0' },
    { name: 'ZhuangPeiShu', alias: '已生产数', type: 'Short', address: 'DB13.270' },
    { name: 'ZhuangPeiZongShu', alias: '装配总数', type: 'Word', address: 'DB13.274.0' },
    { name: 'ZhuangPeiQiDong', alias: '装配启动', type: 'Boolean', address: 'DB13.272.1' },
    { name: 'Alarm_Robot', alias: '机器人故障', type: 'Short', address: 'DB13.266' },
    { name: 'Green_Light', alias: '绿灯', type: 'Boolean', address: 'DB13.276.0' },
    { name: 'Yellow_Light', alias: '黄灯', type: 'Boolean', address: 'DB13.276.1' },
    { name: 'Red_Light', alias: '红灯', type: 'Boolean', address: 'DB13.276.2' },
  ],
  inspection: [
    { name: 'JianCeShu', alias: '已检测数', type: 'Short', address: 'DB15.268' },
    { name: 'OKShuLiang', alias: '合格数量', type: 'Word', address: 'DB15.272' },
    { name: 'NGShuLiang', alias: '不合格数量', type: 'Word', address: 'DB15.274' },
    { name: 'Pass_rate', alias: '检测合格率', type: 'Float', address: 'DB15.276' },
    { name: 'JianCe_OK_NG', alias: '检测总结果', type: 'Word', address: 'DB15.292' },
    { name: 'RFID', alias: 'RFID信息', type: 'String', address: 'DB15.0' },
    { name: 'Alarm_Pressure', alias: '气压故障', type: 'Short', address: 'DB15.260' },
    { name: 'Red_Light', alias: '红灯', type: 'Boolean', address: 'DB15.280.2' },
  ],
  logistics: [
    { name: 'IMS_RFID_WriteAddress', alias: 'RFID写地址', type: 'String', address: 'DB13.2' },
    { name: 'IMS_RFID_Infinished', alias: 'RFID写入完成', type: 'Boolean', address: 'DB26.770.0' },
    { name: 'SensorTest_Belt_Tray', alias: '输送线托盘检测', type: 'Boolean', address: 'I0.4' },
    { name: 'U_conveyorlineRun', alias: '上输送线运行', type: 'Boolean', address: 'Q0.2' },
    { name: 'L_conveyorlineRun', alias: '下输送线运行', type: 'Boolean', address: 'Q0.1' },
    { name: 'Alarm_Transport', alias: '传输故障', type: 'Short', address: 'DB26.772' },
    { name: 'Alarm_Print', alias: '打印故障', type: 'Short', address: 'DB26.780' },
    { name: 'Green_Light', alias: '绿灯', type: 'Boolean', address: 'DB13.0.2' },
  ],
}

function faultActive(state: PlantState, unit: ModuleId, code: string): number {
  const eq = equipmentOf(state, unit)
  return eq.availability < 0.8 && eq.faults[0]?.code === code ? 1 : 0
}

function valuesFor(state: PlantState, unit: ModuleId): Record<string, string | number | boolean> {
  const light = lightOf(moduleLevels(state)[unit])
  const lights = { Green_Light: light === 'green', Yellow_Light: light === 'yellow', Red_Light: light === 'red' }
  const wh = state.warehouse
  const count = (m: string) => wh.cells.filter((c) => c.material === m).length
  const moma = state.agv.agvs[0]
  const reach = (route: string) => moma.status !== 'blocked' && moma.routeId === route && moma.progress >= 0.9
  const ins = inspectionTotals(state)
  const lastRec = state.inspection.records[0]
  switch (unit) {
    case 'warehouse':
      return {
        Zaikushu: wh.cells.filter((c) => c.item).length, Num_A: count('A'), Num_B: count('B'), Num_C: count('C'),
        Quantity_Inbound: wh.inboundToday, Quantity_Outbound: wh.outboundToday,
        Robot_X: wh.robot.x, Robot_Y: wh.robot.y, Robot_Z: wh.robot.z, U_conveyorlineRun: wh.upperBelt,
      }
    case 'agv':
      return {
        moma_Speed: moma.status === 'running' ? Math.round(moma.speed * 1000) / 100 : 0,
        Ydata_Position: moma.yAxis,
        ZhuangPei_Reachsignal: reach('R1'), JianCe_Reachsignal: reach('R2'),
        WuLiu_Reachsignal: reach('R3'), ChongDian_Reachsignal: moma.status === 'charging',
        Alarm_AGV: state.agv.agvs.some((a) => a.status === 'blocked') ? 1 : 0,
        Alarm_Lowbattery: state.agv.agvs.some((a) => a.battery < 25) ? 1 : 0,
      }
    case 'assembly':
      return {
        RFID: state.assembly.currentRfid, ZhuangPeiShu: state.assembly.produced % 10000,
        ZhuangPeiZongShu: state.assembly.produced, ZhuangPeiQiDong: state.agv.agvs.some((a) => a.status !== 'blocked'),
        Alarm_Robot: faultActive(state, 'assembly', 'Alarm_Robot'), ...lights,
      }
    case 'inspection':
      return {
        JianCeShu: ins.total, OKShuLiang: ins.pass, NGShuLiang: ins.fail, Pass_rate: ins.fpy,
        JianCe_OK_NG: lastRec ? (lastRec.pass ? 1 : 2) : 0, RFID: lastRec?.rfid ?? '-',
        Alarm_Pressure: faultActive(state, 'inspection', 'Alarm_Pressure'), Red_Light: lights.Red_Light,
      }
    case 'logistics':
      return {
        IMS_RFID_WriteAddress: `ORD-${state.logistics.rfidWrites}`, IMS_RFID_Infinished: state.tick % 2 === 0,
        SensorTest_Belt_Tray: state.tick % 3 !== 0, U_conveyorlineRun: true, L_conveyorlineRun: true,
        Alarm_Transport: faultActive(state, 'logistics', 'Alarm_Transport'),
        Alarm_Print: faultActive(state, 'logistics', 'Alarm_Print'), Green_Light: lights.Green_Light,
      }
  }
}

export function pointSnapshot(state: PlantState, unit: ModuleId): PointValue[] {
  const values = valuesFor(state, unit)
  return DEFS[unit].map((d) => ({ ...d, value: values[d.name] ?? '-' }))
}
