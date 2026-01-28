/**
 * LOD Statistics Components
 * Provides UI components for displaying LOD system statistics
 *
 * ISSUE 17: LOD-система для дальних кубиков
 */

import type { LODStatistics } from '../types/lod'

/**
 * LOD Statistics Display Component
 * Renders LOD statistics for debugging and performance monitoring
 */
export function LODStatisticsDisplay({ stats }: { stats: LODStatistics }) {
  return (
    <div
      style={{
        position: 'absolute',
        top: 10,
        left: 10,
        background: 'rgba(0, 0, 0, 0.7)',
        color: 'white',
        padding: '10px',
        borderRadius: '5px',
        fontFamily: 'monospace',
        fontSize: '12px',
      }}
    >
      <div>Total Cubes: {stats.totalCubes}</div>
      <div>Avg LOD Level: {stats.averageLODLevel.toFixed(2)}</div>
      <div>Performance Savings: {stats.performanceSavings.toFixed(1)}%</div>
      <div style={{ marginTop: '5px' }}>
        {Object.entries(stats.cubesPerLevel).map(([level, count]) => (
          <div key={level}>
            LOD {level}: {count} cubes
          </div>
        ))}
      </div>
      {stats.transitioningCubes > 0 && (
        <div style={{ marginTop: '5px' }}>Transitioning: {stats.transitioningCubes}</div>
      )}
    </div>
  )
}
