import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useUiStore } from './ui'

function readyStore() {
  const ui = useUiStore()
  ui.endBoot()
  ui.setCurtainReady(true)
  return ui
}

describe('ui navigation transition', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('swaps immediately when no curtain is mounted', () => {
    const ui = useUiStore()
    ui.endBoot()
    ui.navigate('agv', 'AGV-01')
    expect(ui.view).toBe('agv')
    expect(ui.focus).toBe('AGV-01')
    expect(ui.phase).toBe('idle')
  })

  it('holds the current view until the curtain commits', () => {
    const ui = readyStore()
    ui.navigate('inspection', 'ng')
    expect(ui.phase).toBe('cover')
    expect(ui.view).toBe('overview')
    ui.commit()
    expect(ui.view).toBe('inspection')
    expect(ui.focus).toBe('ng')
    expect(ui.phase).toBe('reveal')
    ui.finish()
    expect(ui.phase).toBe('idle')
    expect(ui.target).toBeNull()
  })

  it('runs only the latest navigation requested during a transition', () => {
    const ui = readyStore()
    ui.navigate('warehouse')
    ui.navigate('agv')
    ui.navigate('logistics')
    ui.commit()
    ui.finish()
    expect(ui.view).toBe('warehouse')
    expect(ui.phase).toBe('cover')
    expect(ui.target?.to).toBe('logistics')
    ui.commit()
    ui.finish()
    expect(ui.view).toBe('logistics')
    expect(ui.phase).toBe('idle')
  })

  it('defers navigation until the boot sequence ends', () => {
    const ui = useUiStore()
    ui.setCurtainReady(true)
    ui.navigate('assembly')
    expect(ui.view).toBe('overview')
    ui.endBoot()
    expect(ui.phase).toBe('cover')
    expect(ui.target?.to).toBe('assembly')
  })

  it('only updates focus when navigating to the current view', () => {
    const ui = readyStore()
    ui.navigate('overview', 'x')
    expect(ui.phase).toBe('idle')
    expect(ui.focus).toBe('x')
  })

  it('skips the curtain when motion is reduced', () => {
    const ui = readyStore()
    ui.setReducedMotion(true)
    ui.navigate('agv')
    expect(ui.view).toBe('agv')
    expect(ui.phase).toBe('idle')
  })

  it('ignores commit outside of the cover phase', () => {
    const ui = readyStore()
    ui.commit()
    expect(ui.phase).toBe('idle')
  })
})

describe('solo unit mode', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('starts on the solo module and ignores navigation elsewhere', () => {
    const ui = useUiStore()
    ui.enterSolo('inspection')
    ui.endBoot()
    expect(ui.view).toBe('inspection')
    ui.navigate('agv', 'AGV-01')
    ui.back()
    expect(ui.view).toBe('inspection')
    expect(ui.focus).toBeNull()
  })

  it('still accepts navigation to the solo module itself', () => {
    const ui = useUiStore()
    ui.enterSolo('inspection')
    ui.endBoot()
    ui.navigate('inspection', 'ng')
    expect(ui.view).toBe('inspection')
    expect(ui.focus).toBe('ng')
  })
})

describe('inspection sub pages', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('defaults to the overview page and switches by id', () => {
    const ui = useUiStore()
    expect(ui.inspectionPage).toBe('overview')
    ui.setInspectionPage('quality')
    expect(ui.inspectionPage).toBe('quality')
  })

  it('opens a given sub page when navigating to inspection with that focus', () => {
    const ui = useUiStore()
    ui.endBoot()
    ui.navigate('inspection', 'ng')
    expect(ui.inspectionPage).toBe('quality')
    expect(ui.focus).toBe('ng')
  })

  it('keeps the chosen sub page when entering inspection without a focus', () => {
    const ui = useUiStore()
    ui.endBoot()
    ui.setInspectionPage('resource')
    ui.navigate('inspection')
    expect(ui.inspectionPage).toBe('resource')
  })
})
