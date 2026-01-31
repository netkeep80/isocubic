/**
 * LOD Statistics Composable
 * Vue.js 3.0 composable for managing LOD system statistics state
 *
 * Vue.js 3.0 composable (migrated from React hook as part of Phase 10, TASK 67)
 *
 * ISSUE 17: LOD-система для дальних кубиков
 */

import { ref } from 'vue'
import type { LODStatistics } from '../types/lod'
import { createEmptyLODStatistics } from '../types/lod'

/**
 * Composable for using LOD statistics in a component
 * Returns reactive stats ref and a setter function
 */
export function useLODStatistics() {
  const stats = ref<LODStatistics>(createEmptyLODStatistics())

  function setStats(newStats: LODStatistics) {
    stats.value = newStats
  }

  return {
    stats,
    setStats,
  }
}
