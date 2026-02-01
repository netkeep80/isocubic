/**
 * Touch gestures composable for mobile/tablet interactions
 * Provides swipe, pinch-to-zoom, and long-press gesture recognition
 *
 * Phase 11, TASK 75: Responsive design for different devices
 */

import { ref, onUnmounted } from 'vue'

/** Gesture types recognized by the composable */
export type GestureType =
  | 'swipe-left'
  | 'swipe-right'
  | 'swipe-up'
  | 'swipe-down'
  | 'pinch'
  | 'long-press'

/** Result of a recognized gesture */
export interface GestureEvent {
  type: GestureType
  /** Distance or scale factor depending on gesture */
  delta: number
  /** Center X coordinate of the gesture */
  centerX: number
  /** Center Y coordinate of the gesture */
  centerY: number
}

/** Callback for gesture events */
export type GestureCallback = (event: GestureEvent) => void

/** Configuration options for touch gestures */
export interface TouchGestureOptions {
  /** Minimum distance in px to recognize a swipe (default: 50) */
  swipeThreshold?: number
  /** Maximum time in ms for a swipe gesture (default: 300) */
  swipeMaxTime?: number
  /** Duration in ms to trigger long-press (default: 500) */
  longPressDelay?: number
  /** Enable swipe gestures (default: true) */
  enableSwipe?: boolean
  /** Enable pinch gestures (default: true) */
  enablePinch?: boolean
  /** Enable long-press gestures (default: true) */
  enableLongPress?: boolean
}

const DEFAULT_OPTIONS: Required<TouchGestureOptions> = {
  swipeThreshold: 50,
  swipeMaxTime: 300,
  longPressDelay: 500,
  enableSwipe: true,
  enablePinch: true,
  enableLongPress: true,
}

/**
 * Composable providing touch gesture recognition
 *
 * @param onGesture callback invoked when a gesture is recognized
 * @param options configuration for thresholds and enabled gestures
 */
export function useTouchGestures(onGesture: GestureCallback, options: TouchGestureOptions = {}) {
  const config = { ...DEFAULT_OPTIONS, ...options }

  // Internal state
  const isTracking = ref(false)
  const startX = ref(0)
  const startY = ref(0)
  const startTime = ref(0)
  const initialPinchDistance = ref(0)
  let longPressTimer: ReturnType<typeof setTimeout> | null = null
  let element: HTMLElement | null = null

  function getDistance(t1: Touch, t2: Touch): number {
    const dx = t1.clientX - t2.clientX
    const dy = t1.clientY - t2.clientY
    return Math.sqrt(dx * dx + dy * dy)
  }

  function clearLongPress() {
    if (longPressTimer !== null) {
      clearTimeout(longPressTimer)
      longPressTimer = null
    }
  }

  function handleTouchStart(e: TouchEvent) {
    isTracking.value = true

    if (e.touches.length === 1) {
      const touch = e.touches[0]
      startX.value = touch.clientX
      startY.value = touch.clientY
      startTime.value = Date.now()

      // Start long-press timer
      if (config.enableLongPress) {
        clearLongPress()
        longPressTimer = setTimeout(() => {
          onGesture({
            type: 'long-press',
            delta: 0,
            centerX: startX.value,
            centerY: startY.value,
          })
          isTracking.value = false
        }, config.longPressDelay)
      }
    } else if (e.touches.length === 2 && config.enablePinch) {
      clearLongPress()
      initialPinchDistance.value = getDistance(e.touches[0], e.touches[1])
    }
  }

  function handleTouchMove(e: TouchEvent) {
    // Any significant move cancels long-press
    if (e.touches.length === 1 && isTracking.value) {
      const touch = e.touches[0]
      const dx = Math.abs(touch.clientX - startX.value)
      const dy = Math.abs(touch.clientY - startY.value)
      if (dx > 10 || dy > 10) {
        clearLongPress()
      }
    }

    // Pinch tracking
    if (e.touches.length === 2 && config.enablePinch && initialPinchDistance.value > 0) {
      const currentDistance = getDistance(e.touches[0], e.touches[1])
      const scale = currentDistance / initialPinchDistance.value
      const centerX = (e.touches[0].clientX + e.touches[1].clientX) / 2
      const centerY = (e.touches[0].clientY + e.touches[1].clientY) / 2

      onGesture({
        type: 'pinch',
        delta: scale,
        centerX,
        centerY,
      })
    }
  }

  function handleTouchEnd(e: TouchEvent) {
    clearLongPress()

    if (!isTracking.value) return

    if (e.changedTouches.length === 1 && config.enableSwipe) {
      const touch = e.changedTouches[0]
      const dx = touch.clientX - startX.value
      const dy = touch.clientY - startY.value
      const elapsed = Date.now() - startTime.value

      if (elapsed <= config.swipeMaxTime) {
        const absDx = Math.abs(dx)
        const absDy = Math.abs(dy)

        if (absDx >= config.swipeThreshold && absDx > absDy) {
          onGesture({
            type: dx < 0 ? 'swipe-left' : 'swipe-right',
            delta: absDx,
            centerX: touch.clientX,
            centerY: touch.clientY,
          })
        } else if (absDy >= config.swipeThreshold && absDy > absDx) {
          onGesture({
            type: dy < 0 ? 'swipe-up' : 'swipe-down',
            delta: absDy,
            centerX: touch.clientX,
            centerY: touch.clientY,
          })
        }
      }
    }

    initialPinchDistance.value = 0
    isTracking.value = false
  }

  /** Attach gesture listeners to an HTML element */
  function attach(el: HTMLElement) {
    detach()
    element = el
    el.addEventListener('touchstart', handleTouchStart, { passive: true })
    el.addEventListener('touchmove', handleTouchMove, { passive: true })
    el.addEventListener('touchend', handleTouchEnd, { passive: true })
  }

  /** Remove gesture listeners from the current element */
  function detach() {
    clearLongPress()
    if (element) {
      element.removeEventListener('touchstart', handleTouchStart)
      element.removeEventListener('touchmove', handleTouchMove)
      element.removeEventListener('touchend', handleTouchEnd)
      element = null
    }
  }

  onUnmounted(() => {
    detach()
  })

  return {
    attach,
    detach,
    isTracking,
  }
}
