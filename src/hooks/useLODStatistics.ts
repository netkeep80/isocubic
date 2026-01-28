/**
 * LOD Statistics Hook
 * Hook for managing LOD system statistics state
 *
 * ISSUE 17: LOD-система для дальних кубиков
 */

import { useState } from 'react'
import type { LODStatistics } from '../types/lod'
import { createEmptyLODStatistics } from '../types/lod'

/**
 * Hook for using LOD statistics in a component
 * Returns a tuple of [stats, setStats] for managing LOD statistics state
 */
export function useLODStatistics(): [LODStatistics, (stats: LODStatistics) => void] {
  const [stats, setStats] = useState<LODStatistics>(createEmptyLODStatistics())
  return [stats, setStats]
}
