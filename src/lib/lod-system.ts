/**
 * LOD (Level of Detail) System
 * Core module for calculating and managing level of detail for cubes
 *
 * ISSUE 17: LOD-система для дальних кубиков
 */

import * as THREE from 'three'
import type {
  LODLevel,
  LODConfig,
  LODLevelSettings,
  CubeLODState,
  LODStatistics,
} from '../types/lod'
import {
  DEFAULT_LOD_CONFIG,
  DEFAULT_LOD_SETTINGS,
  createDefaultLODState,
  createEmptyLODStatistics,
} from '../types/lod'
import type { DeviceCapabilities, QualityLevel } from './performance'

/**
 * Options for LOD calculation
 */
export interface LODCalculationOptions {
  /** Camera position in world space */
  cameraPosition: THREE.Vector3
  /** Camera projection matrix (for screen size calculation) */
  projectionMatrix?: THREE.Matrix4
  /** Viewport width in pixels */
  viewportWidth?: number
  /** Viewport height in pixels */
  viewportHeight?: number
  /** Current quality level */
  qualityLevel?: QualityLevel
  /** Device capabilities */
  deviceCapabilities?: DeviceCapabilities
}

/**
 * Result of LOD calculation for a single cube
 */
export interface LODCalculationResult {
  /** Calculated LOD level */
  level: LODLevel
  /** Distance from camera */
  distance: number
  /** Projected screen size in pixels (if calculable) */
  screenSize?: number
  /** Settings for this LOD level */
  settings: LODLevelSettings
}

/**
 * LOD System class for managing level of detail calculations
 */
export class LODSystem {
  private config: LODConfig
  private cubeStates: Map<string, CubeLODState> = new Map()
  private statistics: LODStatistics = createEmptyLODStatistics()

  constructor(config: LODConfig = DEFAULT_LOD_CONFIG) {
    // Create a deep copy to prevent mutating the default config
    this.config = {
      ...config,
      thresholds: config.thresholds.map((t) => ({ ...t })),
      levelSettings: Object.fromEntries(
        Object.entries(config.levelSettings).map(([k, v]) => [k, { ...v }])
      ) as Record<LODLevel, LODLevelSettings>,
    }
  }

  /**
   * Get the current configuration
   */
  getConfig(): LODConfig {
    return this.config
  }

  /**
   * Update the LOD configuration
   */
  setConfig(config: Partial<LODConfig>): void {
    this.config = { ...this.config, ...config }
  }

  /**
   * Enable or disable the LOD system
   */
  setEnabled(enabled: boolean): void {
    this.config.enabled = enabled
  }

  /**
   * Check if the LOD system is enabled
   */
  isEnabled(): boolean {
    return this.config.enabled
  }

  /**
   * Calculate LOD level based on distance from camera
   */
  calculateLODFromDistance(distance: number): LODLevel {
    if (!this.config.enabled) {
      return 0
    }

    for (const threshold of this.config.thresholds) {
      if (distance >= threshold.minDistance && distance < threshold.maxDistance) {
        return threshold.level
      }
    }

    // Default to lowest detail for very far distances
    return 4
  }

  /**
   * Calculate projected screen size of a cube
   * @param cubePosition - Position of the cube in world space
   * @param cubeSize - Size of the cube (default 1 unit)
   * @param options - Calculation options including camera info
   */
  calculateScreenSize(
    cubePosition: THREE.Vector3,
    cubeSize: number = 1,
    options: LODCalculationOptions
  ): number {
    const { cameraPosition, projectionMatrix, viewportHeight = 1080 } = options

    if (!projectionMatrix) {
      // Fallback: estimate based on distance
      const distance = cubePosition.distanceTo(cameraPosition)
      if (distance <= 0) return viewportHeight
      // Rough approximation: screen size inversely proportional to distance
      return (cubeSize * viewportHeight) / (distance * 2)
    }

    // Calculate using proper projection
    const distance = cubePosition.distanceTo(cameraPosition)
    if (distance <= 0) return viewportHeight

    // Extract FOV from projection matrix (element [1][1])
    const fovFactor = projectionMatrix.elements[5]

    // Calculate angular size and convert to pixels
    const angularSize = cubeSize / distance
    const screenSize = angularSize * fovFactor * (viewportHeight / 2)

    return Math.abs(screenSize)
  }

  /**
   * Calculate LOD level based on screen size
   */
  calculateLODFromScreenSize(screenSize: number): LODLevel {
    if (!this.config.enabled) {
      return 0
    }

    const threshold = this.config.screenSizeThreshold

    // Progressive LOD based on screen size
    if (screenSize >= threshold * 4) return 0
    if (screenSize >= threshold * 2) return 1
    if (screenSize >= threshold) return 2
    if (screenSize >= threshold / 2) return 3
    return 4
  }

  /**
   * Calculate full LOD information for a cube
   */
  calculateLOD(cubePosition: THREE.Vector3, options: LODCalculationOptions): LODCalculationResult {
    const { cameraPosition } = options
    const distance = cubePosition.distanceTo(cameraPosition)

    // Calculate LOD from both distance and screen size
    const distanceLOD = this.calculateLODFromDistance(distance)
    const screenSize = this.calculateScreenSize(cubePosition, 1, options)
    const screenSizeLOD = this.calculateLODFromScreenSize(screenSize)

    // Use the more aggressive (higher number = lower detail) LOD
    let level = Math.max(distanceLOD, screenSizeLOD) as LODLevel

    // Adjust for quality settings
    level = this.adjustLODForQuality(level, options.qualityLevel)

    const settings = this.getSettingsForLevel(level)

    return {
      level,
      distance,
      screenSize,
      settings,
    }
  }

  /**
   * Adjust LOD level based on quality settings and device capabilities
   */
  adjustLODForQuality(baseLOD: LODLevel, qualityLevel?: QualityLevel): LODLevel {
    if (!qualityLevel) return baseLOD

    // On low quality, increase LOD (reduce detail) more aggressively
    if (qualityLevel === 'low') {
      return Math.min(4, baseLOD + 1) as LODLevel
    }

    // On high quality, can optionally reduce LOD (increase detail)
    if (qualityLevel === 'high' && baseLOD > 0) {
      return (baseLOD - 1) as LODLevel
    }

    return baseLOD
  }

  /**
   * Get settings for a specific LOD level
   */
  getSettingsForLevel(level: LODLevel): LODLevelSettings {
    return this.config.levelSettings[level] || DEFAULT_LOD_SETTINGS[level]
  }

  /**
   * Update LOD state for a cube with smooth transitions
   */
  updateCubeState(cubeId: string, targetLevel: LODLevel, deltaTime: number): CubeLODState {
    let state = this.cubeStates.get(cubeId)

    if (!state) {
      state = createDefaultLODState()
      this.cubeStates.set(cubeId, state)
    }

    state.targetLevel = targetLevel

    // Handle transition
    if (state.currentLevel !== state.targetLevel) {
      if (this.config.transitionDuration <= 0) {
        // Instant transition
        state.currentLevel = state.targetLevel
        state.transitionProgress = 1
      } else {
        // Smooth transition
        state.transitionProgress += deltaTime / this.config.transitionDuration
        if (state.transitionProgress >= 1) {
          state.currentLevel = state.targetLevel
          state.transitionProgress = 1
        }
      }
    }

    return state
  }

  /**
   * Get current LOD state for a cube
   */
  getCubeState(cubeId: string): CubeLODState | undefined {
    return this.cubeStates.get(cubeId)
  }

  /**
   * Remove LOD state for a cube (when cube is removed from scene)
   */
  removeCubeState(cubeId: string): void {
    this.cubeStates.delete(cubeId)
  }

  /**
   * Clear all cube states
   */
  clearAllStates(): void {
    this.cubeStates.clear()
  }

  /**
   * Update statistics based on current cube states
   */
  updateStatistics(): LODStatistics {
    const stats = createEmptyLODStatistics()

    for (const state of this.cubeStates.values()) {
      stats.cubesPerLevel[state.currentLevel]++
      stats.totalCubes++

      if (state.currentLevel !== state.targetLevel) {
        stats.transitioningCubes++
      }
    }

    // Calculate average LOD level
    if (stats.totalCubes > 0) {
      let totalLevel = 0
      for (const [level, count] of Object.entries(stats.cubesPerLevel)) {
        totalLevel += parseInt(level) * count
      }
      stats.averageLODLevel = totalLevel / stats.totalCubes
    }

    // Estimate performance savings
    // Based on reduction in noise octaves (main performance factor)
    const maxOctaves = 4
    let totalOctaves = 0
    for (const [level, count] of Object.entries(stats.cubesPerLevel)) {
      const settings = this.getSettingsForLevel(parseInt(level) as LODLevel)
      totalOctaves += settings.noiseOctaves * count
    }
    const maxPossibleOctaves = stats.totalCubes * maxOctaves
    if (maxPossibleOctaves > 0) {
      stats.performanceSavings = ((maxPossibleOctaves - totalOctaves) / maxPossibleOctaves) * 100
    }

    this.statistics = stats
    return stats
  }

  /**
   * Get current statistics
   */
  getStatistics(): LODStatistics {
    return this.statistics
  }
}

/**
 * Singleton LOD system instance
 */
let lodSystemInstance: LODSystem | null = null

/**
 * Get the global LOD system instance
 */
export function getLODSystem(): LODSystem {
  if (!lodSystemInstance) {
    lodSystemInstance = new LODSystem()
  }
  return lodSystemInstance
}

/**
 * Create a new LOD system with custom configuration
 */
export function createLODSystem(config?: Partial<LODConfig>): LODSystem {
  return new LODSystem(config ? { ...DEFAULT_LOD_CONFIG, ...config } : undefined)
}

/**
 * Utility function to calculate LOD for a single position
 */
export function calculateLODForPosition(
  position: THREE.Vector3 | [number, number, number],
  cameraPosition: THREE.Vector3 | [number, number, number],
  config?: Partial<LODConfig>
): LODCalculationResult {
  const system = config ? createLODSystem(config) : getLODSystem()

  const posVec =
    position instanceof THREE.Vector3
      ? position
      : new THREE.Vector3(position[0], position[1], position[2])

  const camVec =
    cameraPosition instanceof THREE.Vector3
      ? cameraPosition
      : new THREE.Vector3(cameraPosition[0], cameraPosition[1], cameraPosition[2])

  return system.calculateLOD(posVec, { cameraPosition: camVec })
}

/**
 * Apply quality-based adjustments to LOD thresholds
 */
export function getAdjustedLODConfig(
  baseConfig: LODConfig,
  qualityLevel: QualityLevel,
  deviceCapabilities?: DeviceCapabilities
): LODConfig {
  const adjustedConfig = { ...baseConfig, thresholds: [...baseConfig.thresholds] }

  // Scale thresholds based on quality
  const distanceMultiplier = qualityLevel === 'low' ? 0.5 : qualityLevel === 'high' ? 1.5 : 1.0

  adjustedConfig.thresholds = adjustedConfig.thresholds.map((threshold) => ({
    ...threshold,
    minDistance: threshold.minDistance * distanceMultiplier,
    maxDistance:
      threshold.maxDistance === Infinity ? Infinity : threshold.maxDistance * distanceMultiplier,
  }))

  // Adjust screen size threshold
  const screenMultiplier = qualityLevel === 'low' ? 1.5 : qualityLevel === 'high' ? 0.75 : 1.0
  adjustedConfig.screenSizeThreshold = baseConfig.screenSizeThreshold * screenMultiplier

  // On low-end devices, be more aggressive with LOD
  if (deviceCapabilities?.isLowEnd) {
    adjustedConfig.thresholds = adjustedConfig.thresholds.map((threshold) => {
      const maxDist = threshold.maxDistance === Infinity ? Infinity : threshold.maxDistance * 0.7
      return {
        ...threshold,
        minDistance: threshold.minDistance * 0.7,
        maxDistance: maxDist,
      }
    })
  }

  return adjustedConfig
}
