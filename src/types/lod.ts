/**
 * LOD (Level of Detail) System Types
 * Types and interfaces for the level of detail system
 *
 * ISSUE 17: LOD-система для дальних кубиков
 */

/**
 * LOD level enumeration (0 = highest detail, 4 = lowest detail)
 */
export type LODLevel = 0 | 1 | 2 | 3 | 4

/**
 * LOD threshold configuration for a specific level
 */
export interface LODThreshold {
  /** LOD level */
  level: LODLevel
  /** Minimum distance from camera for this LOD level */
  minDistance: number
  /** Maximum distance from camera for this LOD level */
  maxDistance: number
}

/**
 * Settings for each LOD level
 */
export interface LODLevelSettings {
  /** Number of noise octaves (0-8) */
  noiseOctaves: number
  /** Maximum number of gradients to apply (0-4) */
  maxGradients: number
  /** Whether to enable noise at all */
  enableNoise: boolean
  /** Whether to enable boundary stitching */
  enableBoundaryStitching: boolean
  /** FFT coefficient count for energy cubes (per channel) */
  fftCoefficients: number
  /** Geometry simplification factor (1.0 = full detail) */
  geometryDetail: number
}

/**
 * Complete LOD configuration
 */
export interface LODConfig {
  /** Whether LOD system is enabled */
  enabled: boolean
  /** Distance thresholds for LOD switching */
  thresholds: LODThreshold[]
  /** Settings for each LOD level */
  levelSettings: Record<LODLevel, LODLevelSettings>
  /** Transition smoothing duration in seconds */
  transitionDuration: number
  /** Screen size threshold (pixels) below which LOD is more aggressive */
  screenSizeThreshold: number
}

/**
 * Runtime LOD state for a single cube
 */
export interface CubeLODState {
  /** Current LOD level */
  currentLevel: LODLevel
  /** Target LOD level (for transitions) */
  targetLevel: LODLevel
  /** Transition progress (0-1) */
  transitionProgress: number
  /** Distance from camera */
  distanceFromCamera: number
  /** Projected screen size in pixels */
  screenSize: number
}

/**
 * LOD statistics for performance monitoring
 */
export interface LODStatistics {
  /** Number of cubes at each LOD level */
  cubesPerLevel: Record<LODLevel, number>
  /** Total number of cubes being rendered */
  totalCubes: number
  /** Average LOD level across all cubes */
  averageLODLevel: number
  /** Number of cubes currently transitioning */
  transitioningCubes: number
  /** Estimated performance savings (percentage) */
  performanceSavings: number
}

/**
 * Default LOD thresholds based on distance
 */
export const DEFAULT_LOD_THRESHOLDS: LODThreshold[] = [
  { level: 0, minDistance: 0, maxDistance: 5 },
  { level: 1, minDistance: 5, maxDistance: 15 },
  { level: 2, minDistance: 15, maxDistance: 30 },
  { level: 3, minDistance: 30, maxDistance: 50 },
  { level: 4, minDistance: 50, maxDistance: Infinity },
]

/**
 * Default settings for each LOD level
 */
export const DEFAULT_LOD_SETTINGS: Record<LODLevel, LODLevelSettings> = {
  0: {
    noiseOctaves: 4,
    maxGradients: 4,
    enableNoise: true,
    enableBoundaryStitching: true,
    fftCoefficients: 8,
    geometryDetail: 1.0,
  },
  1: {
    noiseOctaves: 3,
    maxGradients: 4,
    enableNoise: true,
    enableBoundaryStitching: true,
    fftCoefficients: 6,
    geometryDetail: 1.0,
  },
  2: {
    noiseOctaves: 2,
    maxGradients: 3,
    enableNoise: true,
    enableBoundaryStitching: true,
    fftCoefficients: 4,
    geometryDetail: 1.0,
  },
  3: {
    noiseOctaves: 1,
    maxGradients: 2,
    enableNoise: true,
    enableBoundaryStitching: false,
    fftCoefficients: 2,
    geometryDetail: 1.0,
  },
  4: {
    noiseOctaves: 0,
    maxGradients: 1,
    enableNoise: false,
    enableBoundaryStitching: false,
    fftCoefficients: 1, // DC only
    geometryDetail: 1.0,
  },
}

/**
 * Default LOD configuration
 */
export const DEFAULT_LOD_CONFIG: LODConfig = {
  enabled: true,
  thresholds: DEFAULT_LOD_THRESHOLDS,
  levelSettings: DEFAULT_LOD_SETTINGS,
  transitionDuration: 0.3,
  screenSizeThreshold: 50,
}

/**
 * Creates a default LOD state for a cube
 */
export function createDefaultLODState(): CubeLODState {
  return {
    currentLevel: 0,
    targetLevel: 0,
    transitionProgress: 1,
    distanceFromCamera: 0,
    screenSize: 100,
  }
}

/**
 * Creates empty LOD statistics
 */
export function createEmptyLODStatistics(): LODStatistics {
  return {
    cubesPerLevel: { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0 },
    totalCubes: 0,
    averageLODLevel: 0,
    transitioningCubes: 0,
    performanceSavings: 0,
  }
}
