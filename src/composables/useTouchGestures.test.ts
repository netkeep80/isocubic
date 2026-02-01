/**
 * Unit tests for useTouchGestures composable
 * Tests swipe, pinch, and long-press gesture recognition
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useTouchGestures } from './useTouchGestures'
import type { GestureEvent } from './useTouchGestures'

/** Helper to create a mock Touch object */
function createTouch(opts: { clientX: number; clientY: number; identifier?: number }): Touch {
  return {
    clientX: opts.clientX,
    clientY: opts.clientY,
    identifier: opts.identifier ?? 0,
    pageX: opts.clientX,
    pageY: opts.clientY,
    screenX: opts.clientX,
    screenY: opts.clientY,
    target: document.body,
    radiusX: 0,
    radiusY: 0,
    rotationAngle: 0,
    force: 0,
  }
}

/** Helper to create a TouchEvent */
function createTouchEvent(type: string, touches: Touch[], changedTouches?: Touch[]): TouchEvent {
  return new TouchEvent(type, {
    touches,
    changedTouches: changedTouches ?? touches,
    bubbles: true,
    cancelable: true,
  })
}

describe('useTouchGestures — Swipe gestures', () => {
  let el: HTMLElement
  let events: GestureEvent[]

  beforeEach(() => {
    vi.useFakeTimers()
    el = document.createElement('div')
    document.body.appendChild(el)
    events = []
  })

  afterEach(() => {
    vi.useRealTimers()
    el.remove()
  })

  it('should recognize swipe-left gesture', () => {
    const { attach } = useTouchGestures((e) => events.push(e))
    attach(el)

    const startTouch = createTouch({ clientX: 300, clientY: 200 })
    const endTouch = createTouch({ clientX: 100, clientY: 200 })

    el.dispatchEvent(createTouchEvent('touchstart', [startTouch]))
    // End within swipeMaxTime
    el.dispatchEvent(createTouchEvent('touchend', [], [endTouch]))

    expect(events).toHaveLength(1)
    expect(events[0].type).toBe('swipe-left')
    expect(events[0].delta).toBe(200)
  })

  it('should recognize swipe-right gesture', () => {
    const { attach } = useTouchGestures((e) => events.push(e))
    attach(el)

    const startTouch = createTouch({ clientX: 100, clientY: 200 })
    const endTouch = createTouch({ clientX: 300, clientY: 200 })

    el.dispatchEvent(createTouchEvent('touchstart', [startTouch]))
    el.dispatchEvent(createTouchEvent('touchend', [], [endTouch]))

    expect(events).toHaveLength(1)
    expect(events[0].type).toBe('swipe-right')
  })

  it('should recognize swipe-up gesture', () => {
    const { attach } = useTouchGestures((e) => events.push(e))
    attach(el)

    const startTouch = createTouch({ clientX: 200, clientY: 400 })
    const endTouch = createTouch({ clientX: 200, clientY: 100 })

    el.dispatchEvent(createTouchEvent('touchstart', [startTouch]))
    el.dispatchEvent(createTouchEvent('touchend', [], [endTouch]))

    expect(events).toHaveLength(1)
    expect(events[0].type).toBe('swipe-up')
  })

  it('should recognize swipe-down gesture', () => {
    const { attach } = useTouchGestures((e) => events.push(e))
    attach(el)

    const startTouch = createTouch({ clientX: 200, clientY: 100 })
    const endTouch = createTouch({ clientX: 200, clientY: 400 })

    el.dispatchEvent(createTouchEvent('touchstart', [startTouch]))
    el.dispatchEvent(createTouchEvent('touchend', [], [endTouch]))

    expect(events).toHaveLength(1)
    expect(events[0].type).toBe('swipe-down')
  })

  it('should not trigger swipe below threshold', () => {
    const { attach } = useTouchGestures((e) => events.push(e))
    attach(el)

    const startTouch = createTouch({ clientX: 200, clientY: 200 })
    const endTouch = createTouch({ clientX: 220, clientY: 200 })

    el.dispatchEvent(createTouchEvent('touchstart', [startTouch]))
    el.dispatchEvent(createTouchEvent('touchend', [], [endTouch]))

    expect(events).toHaveLength(0)
  })

  it('should not trigger swipe if time exceeds swipeMaxTime', () => {
    const { attach } = useTouchGestures((e) => events.push(e), { swipeMaxTime: 100 })
    attach(el)

    const startTouch = createTouch({ clientX: 300, clientY: 200 })
    const endTouch = createTouch({ clientX: 100, clientY: 200 })

    el.dispatchEvent(createTouchEvent('touchstart', [startTouch]))
    vi.advanceTimersByTime(200) // exceed max time
    el.dispatchEvent(createTouchEvent('touchend', [], [endTouch]))

    expect(events).toHaveLength(0)
  })

  it('should respect custom swipeThreshold', () => {
    const { attach } = useTouchGestures((e) => events.push(e), { swipeThreshold: 200 })
    attach(el)

    const startTouch = createTouch({ clientX: 300, clientY: 200 })
    const endTouch = createTouch({ clientX: 150, clientY: 200 })

    el.dispatchEvent(createTouchEvent('touchstart', [startTouch]))
    el.dispatchEvent(createTouchEvent('touchend', [], [endTouch]))

    // 150 px is below 200 threshold
    expect(events).toHaveLength(0)
  })

  it('should not trigger swipe when enableSwipe is false', () => {
    const { attach } = useTouchGestures((e) => events.push(e), { enableSwipe: false })
    attach(el)

    const startTouch = createTouch({ clientX: 300, clientY: 200 })
    const endTouch = createTouch({ clientX: 100, clientY: 200 })

    el.dispatchEvent(createTouchEvent('touchstart', [startTouch]))
    el.dispatchEvent(createTouchEvent('touchend', [], [endTouch]))

    expect(events).toHaveLength(0)
  })
})

describe('useTouchGestures — Long-press', () => {
  let el: HTMLElement
  let events: GestureEvent[]

  beforeEach(() => {
    vi.useFakeTimers()
    el = document.createElement('div')
    document.body.appendChild(el)
    events = []
  })

  afterEach(() => {
    vi.useRealTimers()
    el.remove()
  })

  it('should trigger long-press after delay', () => {
    const { attach } = useTouchGestures((e) => events.push(e))
    attach(el)

    const touch = createTouch({ clientX: 200, clientY: 200 })
    el.dispatchEvent(createTouchEvent('touchstart', [touch]))

    vi.advanceTimersByTime(500) // default longPressDelay

    expect(events).toHaveLength(1)
    expect(events[0].type).toBe('long-press')
    expect(events[0].centerX).toBe(200)
    expect(events[0].centerY).toBe(200)
  })

  it('should cancel long-press on significant move', () => {
    const { attach } = useTouchGestures((e) => events.push(e))
    attach(el)

    const touch = createTouch({ clientX: 200, clientY: 200 })
    el.dispatchEvent(createTouchEvent('touchstart', [touch]))

    // Move more than 10px
    const movedTouch = createTouch({ clientX: 250, clientY: 200 })
    el.dispatchEvent(createTouchEvent('touchmove', [movedTouch]))

    vi.advanceTimersByTime(600)

    // Should not have long-press event
    expect(events).toHaveLength(0)
  })

  it('should not trigger long-press when enableLongPress is false', () => {
    const { attach } = useTouchGestures((e) => events.push(e), { enableLongPress: false })
    attach(el)

    const touch = createTouch({ clientX: 200, clientY: 200 })
    el.dispatchEvent(createTouchEvent('touchstart', [touch]))

    vi.advanceTimersByTime(600)

    expect(events).toHaveLength(0)
  })

  it('should respect custom longPressDelay', () => {
    const { attach } = useTouchGestures((e) => events.push(e), { longPressDelay: 1000 })
    attach(el)

    const touch = createTouch({ clientX: 200, clientY: 200 })
    el.dispatchEvent(createTouchEvent('touchstart', [touch]))

    vi.advanceTimersByTime(500) // not enough time
    expect(events).toHaveLength(0)

    vi.advanceTimersByTime(500) // total 1000ms
    expect(events).toHaveLength(1)
    expect(events[0].type).toBe('long-press')
  })
})

describe('useTouchGestures — Pinch', () => {
  let el: HTMLElement
  let events: GestureEvent[]

  beforeEach(() => {
    vi.useFakeTimers()
    el = document.createElement('div')
    document.body.appendChild(el)
    events = []
  })

  afterEach(() => {
    vi.useRealTimers()
    el.remove()
  })

  it('should recognize pinch gesture with two fingers', () => {
    const { attach } = useTouchGestures((e) => events.push(e))
    attach(el)

    const touch1 = createTouch({ clientX: 100, clientY: 200, identifier: 0 })
    const touch2 = createTouch({ clientX: 200, clientY: 200, identifier: 1 })
    el.dispatchEvent(createTouchEvent('touchstart', [touch1, touch2]))

    // Move fingers apart (zoom in)
    const movedTouch1 = createTouch({ clientX: 50, clientY: 200, identifier: 0 })
    const movedTouch2 = createTouch({ clientX: 250, clientY: 200, identifier: 1 })
    el.dispatchEvent(createTouchEvent('touchmove', [movedTouch1, movedTouch2]))

    expect(events).toHaveLength(1)
    expect(events[0].type).toBe('pinch')
    // Scale should be 200/100 = 2.0
    expect(events[0].delta).toBe(2)
    expect(events[0].centerX).toBe(150)
    expect(events[0].centerY).toBe(200)
  })

  it('should not trigger pinch when enablePinch is false', () => {
    const { attach } = useTouchGestures((e) => events.push(e), { enablePinch: false })
    attach(el)

    const touch1 = createTouch({ clientX: 100, clientY: 200, identifier: 0 })
    const touch2 = createTouch({ clientX: 200, clientY: 200, identifier: 1 })
    el.dispatchEvent(createTouchEvent('touchstart', [touch1, touch2]))

    const movedTouch1 = createTouch({ clientX: 50, clientY: 200, identifier: 0 })
    const movedTouch2 = createTouch({ clientX: 250, clientY: 200, identifier: 1 })
    el.dispatchEvent(createTouchEvent('touchmove', [movedTouch1, movedTouch2]))

    expect(events).toHaveLength(0)
  })
})

describe('useTouchGestures — attach/detach', () => {
  let el: HTMLElement
  let events: GestureEvent[]

  beforeEach(() => {
    vi.useFakeTimers()
    el = document.createElement('div')
    document.body.appendChild(el)
    events = []
  })

  afterEach(() => {
    vi.useRealTimers()
    el.remove()
  })

  it('should stop receiving events after detach', () => {
    const { attach, detach } = useTouchGestures((e) => events.push(e))
    attach(el)
    detach()

    const startTouch = createTouch({ clientX: 300, clientY: 200 })
    const endTouch = createTouch({ clientX: 100, clientY: 200 })
    el.dispatchEvent(createTouchEvent('touchstart', [startTouch]))
    el.dispatchEvent(createTouchEvent('touchend', [], [endTouch]))

    expect(events).toHaveLength(0)
  })

  it('should re-attach to a new element', () => {
    const { attach } = useTouchGestures((e) => events.push(e))
    const el2 = document.createElement('div')
    document.body.appendChild(el2)

    attach(el)
    attach(el2) // detaches from el, attaches to el2

    const startTouch = createTouch({ clientX: 300, clientY: 200 })
    const endTouch = createTouch({ clientX: 100, clientY: 200 })

    // Events on original element should not fire
    el.dispatchEvent(createTouchEvent('touchstart', [startTouch]))
    el.dispatchEvent(createTouchEvent('touchend', [], [endTouch]))
    expect(events).toHaveLength(0)

    // Events on new element should fire
    el2.dispatchEvent(createTouchEvent('touchstart', [startTouch]))
    el2.dispatchEvent(createTouchEvent('touchend', [], [endTouch]))
    expect(events).toHaveLength(1)

    el2.remove()
  })

  it('should expose isTracking ref', () => {
    const { attach, isTracking } = useTouchGestures((e) => events.push(e))
    attach(el)

    expect(isTracking.value).toBe(false)

    const touch = createTouch({ clientX: 200, clientY: 200 })
    el.dispatchEvent(createTouchEvent('touchstart', [touch]))
    expect(isTracking.value).toBe(true)

    el.dispatchEvent(createTouchEvent('touchend', [], [touch]))
    expect(isTracking.value).toBe(false)
  })
})
