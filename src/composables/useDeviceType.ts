/**
 * Device type detection composable
 * Provides reactive device type (desktop/tablet/mobile) based on window width
 *
 * Phase 10, TASK 67: App.vue layout and adaptive design
 */

import { ref, onMounted, onUnmounted, computed } from 'vue'

/** Breakpoints for device detection */
const BREAKPOINT_MOBILE = 768
const BREAKPOINT_TABLET = 1024

/** Detected device type */
export type DeviceType = 'desktop' | 'tablet' | 'mobile'

/**
 * Composable for reactive device type detection
 * Listens to window resize events and returns the current device type
 */
export function useDeviceType() {
  const windowWidth = ref(typeof window !== 'undefined' ? window.innerWidth : 1200)

  const deviceType = computed<DeviceType>(() => {
    if (windowWidth.value < BREAKPOINT_MOBILE) return 'mobile'
    if (windowWidth.value < BREAKPOINT_TABLET) return 'tablet'
    return 'desktop'
  })

  const isMobile = computed(() => deviceType.value === 'mobile')
  const isTablet = computed(() => deviceType.value === 'tablet')
  const isDesktop = computed(() => deviceType.value === 'desktop')

  function handleResize() {
    windowWidth.value = window.innerWidth
  }

  onMounted(() => {
    window.addEventListener('resize', handleResize)
  })

  onUnmounted(() => {
    window.removeEventListener('resize', handleResize)
  })

  return {
    deviceType,
    isMobile,
    isTablet,
    isDesktop,
    windowWidth,
  }
}
