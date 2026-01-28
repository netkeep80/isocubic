/**
 * Unit tests for shader utility functions
 * @vitest-environment jsdom
 */

import { describe, it, expect } from 'vitest'
import * as THREE from 'three'
import {
  axisToInt,
  noiseTypeToInt,
  boundaryModeToInt,
  parseMask,
  createUniforms,
  getLODSettings,
  applyLODToOctaves,
  applyLODToGradientCount,
  applyLODToBoundaryMode,
} from './shader-utils'
import type { SpectralCube } from '../types/cube'
import { DEFAULT_LOD_SETTINGS } from '../types/lod'

describe('Shader Utils', () => {
  describe('axisToInt', () => {
    it('should map x axis to 0', () => {
      expect(axisToInt('x')).toBe(0)
    })

    it('should map y axis to 1', () => {
      expect(axisToInt('y')).toBe(1)
    })

    it('should map z axis to 2', () => {
      expect(axisToInt('z')).toBe(2)
    })

    it('should map radial to 3', () => {
      expect(axisToInt('radial')).toBe(3)
    })
  })

  describe('noiseTypeToInt', () => {
    it('should map perlin to 1', () => {
      expect(noiseTypeToInt('perlin')).toBe(1)
    })

    it('should map worley to 2', () => {
      expect(noiseTypeToInt('worley')).toBe(2)
    })

    it('should map crackle to 3', () => {
      expect(noiseTypeToInt('crackle')).toBe(3)
    })

    it('should return 0 for undefined', () => {
      expect(noiseTypeToInt(undefined)).toBe(0)
    })
  })

  describe('boundaryModeToInt', () => {
    it('should map none to 0', () => {
      expect(boundaryModeToInt('none')).toBe(0)
    })

    it('should map smooth to 1', () => {
      expect(boundaryModeToInt('smooth')).toBe(1)
    })

    it('should map hard to 2', () => {
      expect(boundaryModeToInt('hard')).toBe(2)
    })

    it('should default to smooth (1) for undefined', () => {
      expect(boundaryModeToInt(undefined)).toBe(1)
    })
  })

  describe('parseMask', () => {
    it('should parse bottom percentage', () => {
      const result = parseMask('bottom_40%')
      expect(result.start).toBe(0)
      expect(result.end).toBe(0.4)
      expect(result.axis).toBe(0) // Y axis
    })

    it('should parse top percentage', () => {
      const result = parseMask('top_60%')
      expect(result.start).toBe(0.4)
      expect(result.end).toBe(1)
      expect(result.axis).toBe(0) // Y axis
    })

    it('should parse left percentage', () => {
      const result = parseMask('left_30%')
      expect(result.start).toBe(0)
      expect(result.end).toBe(0.3)
      expect(result.axis).toBe(1) // X axis
    })

    it('should parse right percentage', () => {
      const result = parseMask('right_50%')
      expect(result.start).toBe(0.5)
      expect(result.end).toBe(1)
      expect(result.axis).toBe(1) // X axis
    })

    it('should parse front percentage', () => {
      const result = parseMask('front_25%')
      expect(result.start).toBe(0)
      expect(result.end).toBe(0.25)
      expect(result.axis).toBe(2) // Z axis
    })

    it('should parse back percentage', () => {
      const result = parseMask('back_75%')
      expect(result.start).toBe(0.25)
      expect(result.end).toBe(1)
      expect(result.axis).toBe(2) // Z axis
    })

    it('should return full range for undefined mask', () => {
      const result = parseMask(undefined)
      expect(result.start).toBe(0)
      expect(result.end).toBe(1)
      expect(result.axis).toBe(0)
    })

    it('should return full range for unrecognized mask', () => {
      const result = parseMask('unknown_mask')
      expect(result.start).toBe(0)
      expect(result.end).toBe(1)
    })
  })

  describe('createUniforms', () => {
    const baseConfig: SpectralCube = {
      id: 'test-cube',
      base: {
        color: [0.5, 0.5, 0.5],
        roughness: 0.8,
        transparency: 1.0,
      },
    }

    it('should create basic uniforms', () => {
      const uniforms = createUniforms(baseConfig)

      expect(uniforms.uBaseColor).toBeDefined()
      expect(uniforms.uBaseColor.value).toBeInstanceOf(THREE.Vector3)
      expect(uniforms.uRoughness.value).toBe(0.8)
      expect(uniforms.uTransparency.value).toBe(1.0)
    })

    it('should handle gradients', () => {
      const configWithGradients: SpectralCube = {
        ...baseConfig,
        gradients: [
          { axis: 'y', factor: 0.5, color_shift: [0.1, 0.2, 0.3] },
          { axis: 'x', factor: 0.3, color_shift: [0.2, 0.1, 0.0] },
        ],
      }

      const uniforms = createUniforms(configWithGradients)

      expect(uniforms.uGradientCount.value).toBe(2)
      expect(uniforms.uGradientAxis.value).toEqual([1, 0, 0, 0])
      expect(uniforms.uGradientFactor.value).toEqual([0.5, 0.3, 0, 0])
    })

    it('should handle noise settings', () => {
      const configWithNoise: SpectralCube = {
        ...baseConfig,
        noise: {
          type: 'perlin',
          scale: 10,
          octaves: 3,
          persistence: 0.6,
          mask: 'bottom_40%',
        },
      }

      const uniforms = createUniforms(configWithNoise)

      expect(uniforms.uNoiseType.value).toBe(1) // perlin
      expect(uniforms.uNoiseScale.value).toBe(10)
      expect(uniforms.uNoiseOctaves.value).toBe(3)
      expect(uniforms.uNoisePersistence.value).toBe(0.6)
      expect(uniforms.uNoiseMaskStart.value).toBe(0)
      expect(uniforms.uNoiseMaskEnd.value).toBe(0.4)
    })

    it('should handle boundary settings', () => {
      const configWithBoundary: SpectralCube = {
        ...baseConfig,
        boundary: {
          mode: 'smooth',
          neighbor_influence: 0.7,
        },
      }

      const uniforms = createUniforms(configWithBoundary)

      expect(uniforms.uBoundaryMode.value).toBe(1) // smooth
      expect(uniforms.uNeighborInfluence.value).toBe(0.7)
    })

    it('should handle grid position', () => {
      const uniforms = createUniforms(baseConfig, {
        gridPosition: [1, 2, 3],
      })

      expect(uniforms.uGridPosition.value).toBeInstanceOf(THREE.Vector3)
      expect(uniforms.uGridPosition.value.x).toBe(1)
      expect(uniforms.uGridPosition.value.y).toBe(2)
      expect(uniforms.uGridPosition.value.z).toBe(3)
    })

    it('should limit gradients to 4', () => {
      const configWithManyGradients: SpectralCube = {
        ...baseConfig,
        gradients: [
          { axis: 'x', factor: 0.1, color_shift: [0.1, 0, 0] },
          { axis: 'y', factor: 0.2, color_shift: [0, 0.1, 0] },
          { axis: 'z', factor: 0.3, color_shift: [0, 0, 0.1] },
          { axis: 'radial', factor: 0.4, color_shift: [0.1, 0.1, 0] },
          { axis: 'x', factor: 0.5, color_shift: [0.2, 0, 0] }, // Should be ignored
        ],
      }

      const uniforms = createUniforms(configWithManyGradients)

      expect(uniforms.uGradientCount.value).toBe(4)
    })
  })

  describe('LOD functions', () => {
    describe('getLODSettings', () => {
      it('should return null for undefined LOD level', () => {
        expect(getLODSettings(undefined)).toBeNull()
      })

      it('should return default settings for LOD 0', () => {
        const settings = getLODSettings(0)
        expect(settings).toEqual(DEFAULT_LOD_SETTINGS[0])
      })

      it('should return default settings for LOD 4', () => {
        const settings = getLODSettings(4)
        expect(settings).toEqual(DEFAULT_LOD_SETTINGS[4])
      })

      it('should return custom settings if provided', () => {
        const customSettings = {
          noiseOctaves: 2,
          maxGradients: 2,
          enableNoise: true,
          enableBoundaryStitching: false,
          fftCoefficients: 4,
          geometryDetail: 0.5,
        }

        const settings = getLODSettings(0, customSettings)
        expect(settings).toEqual(customSettings)
      })
    })

    describe('applyLODToOctaves', () => {
      it('should return original octaves when no LOD settings', () => {
        expect(applyLODToOctaves(4, null)).toBe(4)
      })

      it('should limit octaves to LOD setting', () => {
        const lodSettings = DEFAULT_LOD_SETTINGS[2] // noiseOctaves: 2
        expect(applyLODToOctaves(4, lodSettings)).toBe(2)
      })

      it('should return 0 when noise is disabled', () => {
        const lodSettings = DEFAULT_LOD_SETTINGS[4] // enableNoise: false
        expect(applyLODToOctaves(4, lodSettings)).toBe(0)
      })

      it('should not increase octaves beyond original', () => {
        const lodSettings = DEFAULT_LOD_SETTINGS[0] // noiseOctaves: 4
        expect(applyLODToOctaves(2, lodSettings)).toBe(2)
      })
    })

    describe('applyLODToGradientCount', () => {
      it('should return original count when no LOD settings', () => {
        expect(applyLODToGradientCount(4, null)).toBe(4)
      })

      it('should limit gradient count to LOD setting', () => {
        const lodSettings = DEFAULT_LOD_SETTINGS[3] // maxGradients: 2
        expect(applyLODToGradientCount(4, lodSettings)).toBe(2)
      })

      it('should not increase count beyond original', () => {
        const lodSettings = DEFAULT_LOD_SETTINGS[0] // maxGradients: 4
        expect(applyLODToGradientCount(2, lodSettings)).toBe(2)
      })
    })

    describe('applyLODToBoundaryMode', () => {
      it('should return original mode when no LOD settings', () => {
        expect(applyLODToBoundaryMode(1, null)).toBe(1)
      })

      it('should disable boundary stitching when LOD disables it', () => {
        const lodSettings = DEFAULT_LOD_SETTINGS[3] // enableBoundaryStitching: false
        expect(applyLODToBoundaryMode(1, lodSettings)).toBe(0) // 'none'
      })

      it('should preserve mode when LOD enables boundary stitching', () => {
        const lodSettings = DEFAULT_LOD_SETTINGS[0] // enableBoundaryStitching: true
        expect(applyLODToBoundaryMode(2, lodSettings)).toBe(2) // 'hard' stays 'hard'
      })
    })

    describe('createUniforms with LOD', () => {
      const baseConfig: SpectralCube = {
        id: 'test-cube',
        base: {
          color: [0.5, 0.5, 0.5],
        },
        gradients: [
          { axis: 'y', factor: 0.5, color_shift: [0.1, 0.2, 0.3] },
          { axis: 'x', factor: 0.3, color_shift: [0.2, 0.1, 0.0] },
          { axis: 'z', factor: 0.4, color_shift: [0.1, 0.1, 0.1] },
          { axis: 'radial', factor: 0.2, color_shift: [0.0, 0.1, 0.2] },
        ],
        noise: {
          type: 'perlin',
          octaves: 4,
        },
        boundary: {
          mode: 'smooth',
        },
      }

      it('should apply LOD 0 (full detail)', () => {
        const uniforms = createUniforms(baseConfig, { lodLevel: 0 })

        expect(uniforms.uNoiseOctaves.value).toBe(4)
        expect(uniforms.uGradientCount.value).toBe(4)
        expect(uniforms.uBoundaryMode.value).toBe(1) // smooth
      })

      it('should apply LOD 2 (reduced detail)', () => {
        const uniforms = createUniforms(baseConfig, { lodLevel: 2 })

        expect(uniforms.uNoiseOctaves.value).toBe(2)
        expect(uniforms.uGradientCount.value).toBe(3)
        expect(uniforms.uBoundaryMode.value).toBe(1) // smooth still enabled
      })

      it('should apply LOD 3 (low detail)', () => {
        const uniforms = createUniforms(baseConfig, { lodLevel: 3 })

        expect(uniforms.uNoiseOctaves.value).toBe(1)
        expect(uniforms.uGradientCount.value).toBe(2)
        expect(uniforms.uBoundaryMode.value).toBe(0) // boundary stitching disabled
      })

      it('should apply LOD 4 (minimum detail)', () => {
        const uniforms = createUniforms(baseConfig, { lodLevel: 4 })

        expect(uniforms.uNoiseOctaves.value).toBe(0)
        expect(uniforms.uNoiseType.value).toBe(0) // noise disabled
        expect(uniforms.uGradientCount.value).toBe(1)
        expect(uniforms.uBoundaryMode.value).toBe(0) // boundary stitching disabled
      })

      it('should apply custom LOD settings', () => {
        const customLodSettings = {
          noiseOctaves: 1,
          maxGradients: 2,
          enableNoise: true,
          enableBoundaryStitching: true,
          fftCoefficients: 2,
          geometryDetail: 0.5,
        }

        const uniforms = createUniforms(baseConfig, {
          lodLevel: 0,
          lodSettings: customLodSettings,
        })

        expect(uniforms.uNoiseOctaves.value).toBe(1)
        expect(uniforms.uGradientCount.value).toBe(2)
      })
    })
  })
})
