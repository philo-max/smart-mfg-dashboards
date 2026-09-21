import { pad2 } from '@/data/sim/rng'

/** 质量检测日报：弹窗展示、CSV 导出与打印共用同一份数据 */
export interface ReportSection {
  title: string
  head: string[]
  rows: (string | number)[][]
}

export interface InspectionReport {
  generatedAt: Date
  sections: ReportSection[]
  /** 结论文本，<b> 用于强调关键数字 */
  conclusion: string
}

const UTF8_BOM = '﻿'

const PRINT_CSS =
  'body{font-family:"Microsoft YaHei",sans-serif;color:#1a2433;margin:32px;}' +
  'h1{font-size:24px;margin:0 0 4px;border-bottom:3px solid #ff6f3c;padding-bottom:8px;}' +
  '.meta{color:#667;font-size:13px;margin-bottom:16px;}' +
  'h3{font-size:16px;margin:20px 0 8px;padding-left:8px;border-left:4px solid #ff6f3c;}' +
  'table{width:100%;border-collapse:collapse;font-size:13px;page-break-inside:avoid;}' +
  'th,td{border:1px solid #c9d3e0;padding:6px 10px;text-align:center;}th{background:#fdf0ea;}' +
  'p{font-size:14px;line-height:1.9;}b{color:#c0392b;}'

export function stamp(d: Date): string {
  return `${d.getFullYear()}${pad2(d.getMonth() + 1)}${pad2(d.getDate())}_${pad2(d.getHours())}${pad2(d.getMinutes())}`
}

function readableTime(d: Date): string {
  return d.toLocaleString('zh-CN', { hour12: false })
}

function stripTags(html: string): string {
  return html.replace(/<[^>]+>/g, '')
}

function escapeHtml(v: string | number): string {
  const map: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }
  return String(v).replace(/[&<>"']/g, (c) => map[c])
}

export function csvCell(v: string | number): string {
  const s = String(v)
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export function toCsvText(r: InspectionReport): string {
  const lines: (string | number)[][] = [['质量检测日报'], ['生成时间', readableTime(r.generatedAt)], []]
  for (const sec of r.sections) lines.push([`【${sec.title}】`], sec.head, ...sec.rows, [])
  lines.push(['【结论】'], [stripTags(r.conclusion)])
  return UTF8_BOM + lines.map((row) => row.map(csvCell).join(',')).join('\r\n')
}

export function downloadCsv(r: InspectionReport): void {
  const url = URL.createObjectURL(new Blob([toCsvText(r)], { type: 'text/csv;charset=utf-8' }))
  const a = document.createElement('a')
  a.href = url
  a.download = `质量检测日报_${stamp(r.generatedAt)}.csv`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

function printTable(sec: ReportSection): string {
  const head = sec.head.map((h) => `<th>${escapeHtml(h)}</th>`).join('')
  const body = sec.rows.map((row) => `<tr>${row.map((c) => `<td>${escapeHtml(c)}</td>`).join('')}</tr>`).join('')
  return `<h3>${escapeHtml(sec.title)}</h3><table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`
}

/** 打开白底打印版并调起打印对话框；返回 false 表示弹窗被浏览器拦截 */
export function printReport(r: InspectionReport): boolean {
  const win = window.open('', '_blank')
  if (!win) return false
  const title = `质量检测日报_${stamp(r.generatedAt)}`
  win.document.write(
    `<!DOCTYPE html><html lang="zh-CN"><head><meta charset="UTF-8"><title>${title}</title><style>${PRINT_CSS}</style></head>` +
      `<body><h1>质量检测日报</h1><div class="meta">联想笔记本 Mini 产线 · 检测单元　|　生成时间 ${readableTime(r.generatedAt)}</div>` +
      `${r.sections.map(printTable).join('')}<h3>结论</h3><p>${r.conclusion}</p></body></html>`,
  )
  win.document.close()
  win.focus()
  win.onafterprint = () => win.close()
  window.setTimeout(() => win.print(), 300)
  return true
}
