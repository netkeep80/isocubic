/**
 * Responsive layout composable for adapting window system to different screens
 * Provides per-device layout profiles and automatic window position correction
 *
 * Phase 11, TASK 75: Responsive design for different devices
 */

import { computed } from 'vue'
import { useDeviceType, type DeviceType } from './useDeviceType'

/** Layout profile key used for localStorage separation */
export type LayoutProfileKey = `layout-${DeviceType}`

/** Constraints applied to windows based on device type */
export interface LayoutConstraints {
  /** Maximum number of simultaneously visible windows */
  maxVisibleWindows: number
  /** Whether windows can be freely dragged */
  allowDrag: boolean
  /** Whether windows can be freely resized */
  allowResize: boolean
  /** Whether windows should be full-screen on this device */
  fullScreenWindows: boolean
  /** Minimum touch-target size in px (for button sizing) */
  minTouchTarget: number
  /** Padding around the workspace edge in px */
  workspacePadding: number
}

const LAYOUT_CONSTRAINTS: Record<DeviceType, LayoutConstraints> = {
  desktop: {
    maxVisibleWindows: 20,
    allowDrag: true,
    allowResize: true,
    fullScreenWindows: false,
    minTouchTarget: 22,
    workspacePadding: 0,
  },
  tablet: {
    maxVisibleWindows: 6,
    allowDrag: true,
    allowResize: true,
    fullScreenWindows: false,
    minTouchTarget: 44,
    workspacePadding: 8,
  },
  mobile: {
    maxVisibleWindows: 1,
    allowDrag: false,
    allowResize: false,
    fullScreenWindows: true,
    minTouchTarget: 48,
    workspacePadding: 0,
  },
}

/**
 * Clamp a window position so it stays within viewport bounds
 */
export function clampPosition(
  x: number,
  y: number,
  width: number,
  height: number,
  viewportWidth: number,
  viewportHeight: number,
  padding: number = 0
): { x: number; y: number } {
  const maxX = Math.max(0, viewportWidth - width - padding)
  const maxY = Math.max(0, viewportHeight - height - padding)
  return {
    x: Math.max(padding, Math.min(x, maxX)),
    y: Math.max(padding, Math.min(y, maxY)),
  }
}

/**
 * Composable for responsive layout management
 * Returns device-dependent constraints and helpers for adapting the window UI
 */
export function useResponsiveLayout() {
  const { deviceType, isMobile, isTablet, isDesktop, windowWidth } = useDeviceType()

  /** Current layout constraints based on device type */
  const constraints = computed<LayoutConstraints>(() => {
    return LAYOUT_CONSTRAINTS[deviceType.value]
  })

  /** Storage key for current device profile */
  const profileKey = computed<LayoutProfileKey>(() => {
    return `layout-${deviceType.value}`
  })

  /** Whether the current device supports touch interaction */
  const isTouchDevice = computed(() => {
    if (typeof window === 'undefined') return false
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0
  })

  /** Recommended button size for current device (px) */
  const buttonSize = computed(() => constraints.value.minTouchTarget)

  /** Whether windows should be displayed as full-screen panels */
  const useFullScreenWindows = computed(() => constraints.value.fullScreenWindows)

  /** Whether free dragging is allowed */
  const allowDrag = computed(() => constraints.value.allowDrag)

  /** Whether free resizing is allowed */
  const allowResize = computed(() => constraints.value.allowResize)

  return {
    deviceType,
    isMobile,
    isTablet,
    isDesktop,
    windowWidth,
    constraints,
    profileKey,
    isTouchDevice,
    buttonSize,
    useFullScreenWindows,
    allowDrag,
    allowResize,
    clampPosition,
  }
}
