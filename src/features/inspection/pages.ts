export type InspectionPageId = 'overview' | 'efficiency' | 'quality' | 'resource' | 'exception'

export interface InspectionPageMeta {
  id: InspectionPageId
  name: string
  en: string
  /** 页面回答的业务问题 */
  question: string
}

export const INSPECTION_PAGES: InspectionPageMeta[] = [
  { id: 'overview', name: '检测总览', en: 'OVERVIEW', question: '检测单元现在整体怎么样？' },
  { id: 'efficiency', name: '检测效率', en: 'EFFICIENCY', question: '检测快不快，会不会拖慢产线节拍？' },
  { id: 'quality', name: '检测质量', en: 'QUALITY', question: '检得准不准，能不能把不良品筛出来？' },
  { id: 'resource', name: '资源消耗', en: 'RESOURCE', question: '设备和耗材用得值不值？' },
  { id: 'exception', name: '异常处理', en: 'EXCEPTION', question: '出了问题，响应和闭环够不够快？' },
]

export function isInspectionPage(v: string | null): v is InspectionPageId {
  return INSPECTION_PAGES.some((p) => p.id === v)
}
