/**
 * Shader Utility Functions
 * Helper functions for converting SpectralCube configurations to shader uniforms
 */

import * as THREE from 'three'
import type { SpectralCube, GradientAxis, NoiseType, BoundaryMode } from '../types/cube'
import { CUBE_DEFAULTS } from '../types/cube'
import type { LODLevel, LODLevelSettings } from '../types/lod'
import { DEFAULT_LOD_SETTINGS } from '../types/lod'

/**
 * Maps gradient axis string to shader integer
 */
export function axisToInt(axis: GradientAxis): number {
  switch (axis) {
    case 'x':
      return 0
    case 'y':
      return 1
    case 'z':
      return 2
    case 'radial':
      return 3
    default:
      return 1
  }
}

/**
 * Maps noise type string to shader integer
 */
export function noiseTypeToInt(type: NoiseType | undefined): number {
  switch (type) {
    case 'perlin':
      return 1
    case 'worley':
      return 2
    case 'crackle':
      return 3
    default:
      return 0
  }
}

/**
 * Maps boundary mode string to shader integer
 */
export function boundaryModeToInt(mode: BoundaryMode | undefined): number {
  switch (mode) {
    case 'none':
      return 0
    case 'smooth':
      return 1
    case 'hard':
      return 2
    default:
      return 1 // Default to smooth
  }
}

/**
 * Parses mask string like "bottom_40%" or "top_60%" to start/end values
 */
export function parseMask(mask: string | undefined): { start: number; end: number; axis: number } {
  if (!mask) {
    return { start: 0, end: 1, axis: 0 }
  }

  // Default to Y axis
  let axis = 0

  // Parse patterns like "bottom_40%", "top_60%", "left_30%", "right_50%"
  const bottomMatch = mask.match(/bottom_(\d+)%/)
  const topMatch = mask.match(/top_(\d+)%/)
  const leftMatch = mask.match(/left_(\d+)%/)
  const rightMatch = mask.match(/right_(\d+)%/)
  const frontMatch = mask.match(/front_(\d+)%/)
  const backMatch = mask.match(/back_(\d+)%/)

  if (bottomMatch) {
    const percent = parseInt(bottomMatch[1], 10) / 100
    return { start: 0, end: percent, axis: 0 } // Y axis
  }
  if (topMatch) {
    const percent = parseInt(topMatch[1], 10) / 100
    return { start: 1 - percent, end: 1, axis: 0 } // Y axis
  }
  if (leftMatch) {
    const percent = parseInt(leftMatch[1], 10) / 100
    axis = 1 // X axis
    return { start: 0, end: percent, axis }
  }
  if (rightMatch) {
    const percent = parseInt(rightMatch[1], 10) / 100
    axis = 1 // X axis
    return { start: 1 - percent, end: 1, axis }
  }
  if (frontMatch) {
    const percent = parseInt(frontMatch[1], 10) / 100
    axis = 2 // Z axis
    return { start: 0, end: percent, axis }
  }
  if (backMatch) {
    const percent = parseInt(backMatch[1], 10) / 100
    axis = 2 // Z axis
    return { start: 1 - percent, end: 1, axis }
  }

  return { start: 0, end: 1, axis: 0 }
}

/**
 * Options for creating shader uniforms
 */
export interface CreateUniformsOptions {
  /** Grid position of this cube for seamless stitching [x, y, z] */
  gridPosition?: [number, number, number]
  /** LOD level to apply (0 = full detail, 4 = lowest detail) */
  lodLevel?: LODLevel
  /** Custom LOD settings (overrides defaults if provided) */
  lodSettings?: LODLevelSettings
}

/**
 * Get LOD settings for a given level
 */
export function getLODSettings(
  lodLevel: LODLevel | undefined,
  customSettings?: LODLevelSettings
): LODLevelSettings | null {
  if (lodLevel === undefined) return null
  if (customSettings) return customSettings
  return DEFAULT_LOD_SETTINGS[lodLevel]
}

/**
 * Apply LOD settings to noise octaves
 */
export function applyLODToOctaves(
  originalOctaves: number,
  lodSettings: LODLevelSettings | null
): number {
  if (!lodSettings) return originalOctaves
  if (!lodSettings.enableNoise) return 0
  return Math.min(originalOctaves, lodSettings.noiseOctaves)
}

/**
 * Apply LOD settings to gradient count
 */
export function applyLODToGradientCount(
  originalCount: number,
  lodSettings: LODLevelSettings | null
): number {
  if (!lodSettings) return originalCount
  return Math.min(originalCount, lodSettings.maxGradients)
}

/**
 * Apply LOD settings to boundary mode
 */
export function applyLODToBoundaryMode(
  originalMode: number,
  lodSettings: LODLevelSettings | null
): number {
  if (!lodSettings) return originalMode
  if (!lodSettings.enableBoundaryStitching) return 0 // 'none' mode
  return originalMode
}

/**
 * Creates shader uniforms from SpectralCube configuration
 * @param config - The cube configuration
 * @param options - Optional parameters for grid positioning, stitching, and LOD
 */
export function createUniforms(
  config: SpectralCube,
  options: CreateUniformsOptions = {}
): Record<string, THREE.IUniform> {
  const { base, gradients = [], noise, boundary } = config
  const { gridPosition = [0, 0, 0], lodLevel, lodSettings: customLodSettings } = options

  // Get LOD settings if LOD level is specified
  const lodSettings = getLODSettings(lodLevel, customLodSettings)

  // Process gradients (max 4, but may be further limited by LOD)
  const baseGradientCount = Math.min(gradients.length, 4)
  const gradientCount = applyLODToGradientCount(baseGradientCount, lodSettings)
  const gradientAxis: number[] = [0, 0, 0, 0]
  const gradientFactor: number[] = [0, 0, 0, 0]
  const gradientColorShift: THREE.Vector3[] = [
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0, 0, 0),
  ]

  for (let i = 0; i < gradientCount; i++) {
    const g = gradients[i]
    gradientAxis[i] = axisToInt(g.axis)
    gradientFactor[i] = g.factor
    gradientColorShift[i] = new THREE.Vector3(g.color_shift[0], g.color_shift[1], g.color_shift[2])
  }

  // Process noise mask
  const maskParams = parseMask(noise?.mask)

  // Apply LOD to noise octaves
  const baseOctaves = noise?.octaves ?? CUBE_DEFAULTS.noise.octaves
  const noiseOctaves = applyLODToOctaves(baseOctaves, lodSettings)

  // Apply LOD to boundary mode
  const baseBoundaryMode = boundaryModeToInt(boundary?.mode ?? CUBE_DEFAULTS.boundary.mode)
  const boundaryMode = applyLODToBoundaryMode(baseBoundaryMode, lodSettings)

  // Determine if noise should be enabled at all (LOD may disable it)
  const noiseType =
    lodSettings && !lodSettings.enableNoise
      ? 0
      : noise
        ? noiseTypeToInt(noise.type ?? CUBE_DEFAULTS.noise.type)
        : 0

  return {
    // Base material
    uBaseColor: {
      value: new THREE.Vector3(base.color[0], base.color[1], base.color[2]),
    },
    uRoughness: { value: base.roughness ?? CUBE_DEFAULTS.base.roughness },
    uTransparency: { value: base.transparency ?? CUBE_DEFAULTS.base.transparency },

    // Gradients
    uGradientCount: { value: gradientCount },
    uGradientAxis: { value: gradientAxis },
    uGradientFactor: { value: gradientFactor },
    uGradientColorShift: { value: gradientColorShift },

    // Noise (with LOD applied)
    uNoiseType: { value: noiseType },
    uNoiseScale: { value: noise?.scale ?? CUBE_DEFAULTS.noise.scale },
    uNoiseOctaves: { value: noiseOctaves },
    uNoisePersistence: { value: noise?.persistence ?? CUBE_DEFAULTS.noise.persistence },
    uNoiseMaskStart: { value: maskParams.start },
    uNoiseMaskEnd: { value: maskParams.end },
    uNoiseMaskAxis: { value: maskParams.axis },

    // Lighting
    uLightDirection: { value: new THREE.Vector3(1, 1, 1).normalize() },
    uLightColor: { value: new THREE.Vector3(1, 1, 1) },
    uAmbientIntensity: { value: 0.3 },

    // Boundary stitching (with LOD applied)
    uBoundaryMode: { value: boundaryMode },
    uNeighborInfluence: {
      value: boundary?.neighbor_influence ?? CUBE_DEFAULTS.boundary.neighbor_influence,
    },
    uGridPosition: { value: new THREE.Vector3(gridPosition[0], gridPosition[1], gridPosition[2]) },
  }
}
