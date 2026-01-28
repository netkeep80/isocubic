/**
 * Unit tests for LOD (Level of Detail) system
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach } from 'vitest'
import * as THREE from 'three'
import {
  createLODSystem,
  getLODSystem,
  calculateLODForPosition,
  getAdjustedLODConfig,
} from './lod-system'
import type { LODSystem } from './lod-system'
import {
  DEFAULT_LOD_CONFIG,
  DEFAULT_LOD_THRESHOLDS,
  DEFAULT_LOD_SETTINGS,
  createDefaultLODState,
  createEmptyLODStatistics,
} from '../types/lod'

describe('LOD System', () => {
  describe('LODSystem class', () => {
    let system: LODSystem

    beforeEach(() => {
      system = createLODSystem()
    })

    describe('constructor and configuration', () => {
      it('should create system with default config', () => {
        const config = system.getConfig()
        expect(config.enabled).toBe(true)
        expect(config.thresholds).toEqual(DEFAULT_LOD_THRESHOLDS)
      })

      it('should allow custom config', () => {
        const customSystem = createLODSystem({
          enabled: false,
          transitionDuration: 0.5,
        })
        const config = customSystem.getConfig()
        expect(config.enabled).toBe(false)
        expect(config.transitionDuration).toBe(0.5)
      })

      it('should allow enabling/disabling', () => {
        system.setEnabled(false)
        expect(system.isEnabled()).toBe(false)
        system.setEnabled(true)
        expect(system.isEnabled()).toBe(true)
      })

      it('should allow partial config updates', () => {
        system.setConfig({ screenSizeThreshold: 100 })
        expect(system.getConfig().screenSizeThreshold).toBe(100)
        expect(system.getConfig().enabled).toBe(true) // unchanged
      })
    })

    describe('calculateLODFromDistance', () => {
      it('should return LOD 0 for close objects', () => {
        expect(system.calculateLODFromDistance(0)).toBe(0)
        expect(system.calculateLODFromDistance(3)).toBe(0)
        expect(system.calculateLODFromDistance(4.9)).toBe(0)
      })

      it('should return LOD 1 for medium distance objects', () => {
        expect(system.calculateLODFromDistance(5)).toBe(1)
        expect(system.calculateLODFromDistance(10)).toBe(1)
        expect(system.calculateLODFromDistance(14.9)).toBe(1)
      })

      it('should return LOD 2 for medium-far distance objects', () => {
        expect(system.calculateLODFromDistance(15)).toBe(2)
        expect(system.calculateLODFromDistance(25)).toBe(2)
        expect(system.calculateLODFromDistance(29.9)).toBe(2)
      })

      it('should return LOD 3 for far distance objects', () => {
        expect(system.calculateLODFromDistance(30)).toBe(3)
        expect(system.calculateLODFromDistance(40)).toBe(3)
        expect(system.calculateLODFromDistance(49.9)).toBe(3)
      })

      it('should return LOD 4 for very far distance objects', () => {
        expect(system.calculateLODFromDistance(50)).toBe(4)
        expect(system.calculateLODFromDistance(100)).toBe(4)
        expect(system.calculateLODFromDistance(1000)).toBe(4)
      })

      it('should return LOD 0 when system is disabled', () => {
        system.setEnabled(false)
        expect(system.calculateLODFromDistance(100)).toBe(0)
      })
    })

    describe('calculateScreenSize', () => {
      it('should return large size for close objects', () => {
        const cubePos = new THREE.Vector3(0, 0, 0)
        const cameraPos = new THREE.Vector3(0, 0, 2)
        const size = system.calculateScreenSize(cubePos, 1, { cameraPosition: cameraPos })
        expect(size).toBeGreaterThan(100)
      })

      it('should return small size for far objects', () => {
        const cubePos = new THREE.Vector3(0, 0, 0)
        const cameraPos = new THREE.Vector3(0, 0, 100)
        const size = system.calculateScreenSize(cubePos, 1, { cameraPosition: cameraPos })
        expect(size).toBeLessThan(50)
      })

      it('should scale with cube size', () => {
        const cubePos = new THREE.Vector3(0, 0, 0)
        const cameraPos = new THREE.Vector3(0, 0, 10)

        const size1 = system.calculateScreenSize(cubePos, 1, { cameraPosition: cameraPos })
        const size2 = system.calculateScreenSize(cubePos, 2, { cameraPosition: cameraPos })

        expect(size2).toBeCloseTo(size1 * 2, 0)
      })
    })

    describe('calculateLODFromScreenSize', () => {
      it('should return LOD 0 for large screen sizes', () => {
        expect(system.calculateLODFromScreenSize(300)).toBe(0)
        expect(system.calculateLODFromScreenSize(200)).toBe(0)
      })

      it('should return LOD 1 for medium-large screen sizes', () => {
        expect(system.calculateLODFromScreenSize(100)).toBe(1)
        expect(system.calculateLODFromScreenSize(150)).toBe(1)
      })

      it('should return LOD 2 for medium screen sizes', () => {
        expect(system.calculateLODFromScreenSize(50)).toBe(2)
        expect(system.calculateLODFromScreenSize(75)).toBe(2)
      })

      it('should return LOD 3 for small screen sizes', () => {
        expect(system.calculateLODFromScreenSize(25)).toBe(3)
        expect(system.calculateLODFromScreenSize(40)).toBe(3)
      })

      it('should return LOD 4 for very small screen sizes', () => {
        expect(system.calculateLODFromScreenSize(10)).toBe(4)
        expect(system.calculateLODFromScreenSize(5)).toBe(4)
      })
    })

    describe('calculateLOD', () => {
      it('should use more aggressive LOD from distance and screen size', () => {
        const cubePos = new THREE.Vector3(0, 0, 0)
        const cameraPos = new THREE.Vector3(0, 0, 20) // LOD 2 by distance

        const result = system.calculateLOD(cubePos, {
          cameraPosition: cameraPos,
          viewportHeight: 1080,
        })

        expect(result.level).toBeGreaterThanOrEqual(2)
        expect(result.distance).toBeCloseTo(20, 1)
        expect(result.settings).toBeDefined()
      })

      it('should include settings in result', () => {
        const cubePos = new THREE.Vector3(0, 0, 0)
        const cameraPos = new THREE.Vector3(0, 0, 5)

        const result = system.calculateLOD(cubePos, { cameraPosition: cameraPos })

        expect(result.settings).toHaveProperty('noiseOctaves')
        expect(result.settings).toHaveProperty('maxGradients')
        expect(result.settings).toHaveProperty('enableNoise')
        expect(result.settings).toHaveProperty('fftCoefficients')
      })
    })

    describe('adjustLODForQuality', () => {
      it('should increase LOD (reduce detail) on low quality', () => {
        const adjusted = system.adjustLODForQuality(2, 'low')
        expect(adjusted).toBe(3)
      })

      it('should decrease LOD (increase detail) on high quality', () => {
        const adjusted = system.adjustLODForQuality(2, 'high')
        expect(adjusted).toBe(1)
      })

      it('should not change LOD on medium quality', () => {
        const adjusted = system.adjustLODForQuality(2, 'medium')
        expect(adjusted).toBe(2)
      })

      it('should cap LOD at 4', () => {
        const adjusted = system.adjustLODForQuality(4, 'low')
        expect(adjusted).toBe(4) // Should not exceed 4
      })

      it('should not go below 0', () => {
        const adjusted = system.adjustLODForQuality(0, 'high')
        expect(adjusted).toBe(0) // Should not go below 0
      })
    })

    describe('getSettingsForLevel', () => {
      it('should return settings for LOD 0', () => {
        const settings = system.getSettingsForLevel(0)
        expect(settings.noiseOctaves).toBe(4)
        expect(settings.maxGradients).toBe(4)
        expect(settings.enableNoise).toBe(true)
        expect(settings.enableBoundaryStitching).toBe(true)
        expect(settings.fftCoefficients).toBe(8)
      })

      it('should return settings for LOD 4', () => {
        const settings = system.getSettingsForLevel(4)
        expect(settings.noiseOctaves).toBe(0)
        expect(settings.maxGradients).toBe(1)
        expect(settings.enableNoise).toBe(false)
        expect(settings.enableBoundaryStitching).toBe(false)
        expect(settings.fftCoefficients).toBe(1)
      })

      it('should return progressively reduced settings', () => {
        const lod0 = system.getSettingsForLevel(0)
        const lod2 = system.getSettingsForLevel(2)
        const lod4 = system.getSettingsForLevel(4)

        expect(lod0.noiseOctaves).toBeGreaterThan(lod2.noiseOctaves)
        expect(lod2.noiseOctaves).toBeGreaterThan(lod4.noiseOctaves)
      })
    })

    describe('cube state management', () => {
      it('should update cube state', () => {
        const state = system.updateCubeState('cube-1', 2, 0.1)

        expect(state.targetLevel).toBe(2)
        expect(state).toHaveProperty('currentLevel')
        expect(state).toHaveProperty('transitionProgress')
      })

      it('should get cube state', () => {
        system.updateCubeState('cube-1', 2, 0.1)
        const state = system.getCubeState('cube-1')

        expect(state).toBeDefined()
        expect(state?.targetLevel).toBe(2)
      })

      it('should return undefined for unknown cube', () => {
        const state = system.getCubeState('unknown-cube')
        expect(state).toBeUndefined()
      })

      it('should remove cube state', () => {
        system.updateCubeState('cube-1', 2, 0.1)
        system.removeCubeState('cube-1')
        const state = system.getCubeState('cube-1')

        expect(state).toBeUndefined()
      })

      it('should clear all states', () => {
        system.updateCubeState('cube-1', 2, 0.1)
        system.updateCubeState('cube-2', 3, 0.1)
        system.clearAllStates()

        expect(system.getCubeState('cube-1')).toBeUndefined()
        expect(system.getCubeState('cube-2')).toBeUndefined()
      })

      it('should handle transition progress', () => {
        // Set instant transition
        system.setConfig({ transitionDuration: 0 })
        const state = system.updateCubeState('cube-1', 3, 0.1)

        expect(state.currentLevel).toBe(3)
        expect(state.transitionProgress).toBe(1)
      })
    })

    describe('statistics', () => {
      it('should update statistics', () => {
        system.updateCubeState('cube-1', 0, 0.1)
        system.updateCubeState('cube-2', 2, 0.1)
        system.updateCubeState('cube-3', 4, 0.1)

        const stats = system.updateStatistics()

        expect(stats.totalCubes).toBe(3)
      })

      it('should calculate average LOD level', () => {
        system.setConfig({ transitionDuration: 0 }) // Instant transitions

        system.updateCubeState('cube-1', 0, 0.1)
        system.updateCubeState('cube-2', 2, 0.1)
        system.updateCubeState('cube-3', 4, 0.1)

        const stats = system.updateStatistics()

        // Average of 0, 2, 4 = 2
        expect(stats.averageLODLevel).toBe(2)
      })

      it('should calculate performance savings', () => {
        system.setConfig({ transitionDuration: 0 })

        // All cubes at LOD 4 (0 octaves vs max 4)
        system.updateCubeState('cube-1', 4, 0.1)
        system.updateCubeState('cube-2', 4, 0.1)

        const stats = system.updateStatistics()

        // 100% savings when all at LOD 4 (0 octaves each)
        expect(stats.performanceSavings).toBe(100)
      })

      it('should count cubes per level', () => {
        system.setConfig({ transitionDuration: 0 })

        system.updateCubeState('cube-1', 0, 0.1)
        system.updateCubeState('cube-2', 0, 0.1)
        system.updateCubeState('cube-3', 2, 0.1)

        const stats = system.updateStatistics()

        expect(stats.cubesPerLevel[0]).toBe(2)
        expect(stats.cubesPerLevel[2]).toBe(1)
        expect(stats.cubesPerLevel[4]).toBe(0)
      })
    })
  })

  describe('Singleton instance', () => {
    it('should return same instance on multiple calls', () => {
      const instance1 = getLODSystem()
      const instance2 = getLODSystem()

      expect(instance1).toBe(instance2)
    })
  })

  describe('calculateLODForPosition utility', () => {
    it('should work with Vector3 positions', () => {
      const result = calculateLODForPosition(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, 5))

      expect(result.level).toBeDefined()
      expect(result.distance).toBeCloseTo(5, 1)
    })

    it('should work with array positions', () => {
      const result = calculateLODForPosition([0, 0, 0], [0, 0, 5])

      expect(result.level).toBeDefined()
      expect(result.distance).toBeCloseTo(5, 1)
    })

    it('should accept custom config', () => {
      const result = calculateLODForPosition([0, 0, 0], [0, 0, 100], { enabled: false })

      expect(result.level).toBe(0) // Disabled means always LOD 0
    })
  })

  describe('getAdjustedLODConfig', () => {
    it('should reduce thresholds on low quality', () => {
      const adjusted = getAdjustedLODConfig(DEFAULT_LOD_CONFIG, 'low')

      expect(adjusted.thresholds[0].maxDistance).toBeLessThan(
        DEFAULT_LOD_CONFIG.thresholds[0].maxDistance
      )
    })

    it('should increase thresholds on high quality', () => {
      const adjusted = getAdjustedLODConfig(DEFAULT_LOD_CONFIG, 'high')

      expect(adjusted.thresholds[0].maxDistance).toBeGreaterThan(
        DEFAULT_LOD_CONFIG.thresholds[0].maxDistance
      )
    })

    it('should increase screen size threshold on low quality', () => {
      const adjusted = getAdjustedLODConfig(DEFAULT_LOD_CONFIG, 'low')

      expect(adjusted.screenSizeThreshold).toBeGreaterThan(DEFAULT_LOD_CONFIG.screenSizeThreshold)
    })

    it('should handle low-end devices', () => {
      const adjusted = getAdjustedLODConfig(DEFAULT_LOD_CONFIG, 'medium', {
        isLowEnd: true,
      } as unknown as import('./performance').DeviceCapabilities)

      // Thresholds should be further reduced for low-end devices
      expect(adjusted.thresholds[1].maxDistance).toBeLessThan(
        DEFAULT_LOD_CONFIG.thresholds[1].maxDistance
      )
    })
  })

  describe('Type exports', () => {
    it('should export DEFAULT_LOD_CONFIG', () => {
      expect(DEFAULT_LOD_CONFIG).toBeDefined()
      expect(DEFAULT_LOD_CONFIG.enabled).toBe(true)
    })

    it('should export DEFAULT_LOD_THRESHOLDS', () => {
      expect(DEFAULT_LOD_THRESHOLDS).toBeDefined()
      expect(DEFAULT_LOD_THRESHOLDS.length).toBe(5)
    })

    it('should export DEFAULT_LOD_SETTINGS', () => {
      expect(DEFAULT_LOD_SETTINGS).toBeDefined()
      expect(DEFAULT_LOD_SETTINGS[0]).toBeDefined()
      expect(DEFAULT_LOD_SETTINGS[4]).toBeDefined()
    })

    it('should export createDefaultLODState', () => {
      const state = createDefaultLODState()

      expect(state.currentLevel).toBe(0)
      expect(state.targetLevel).toBe(0)
      expect(state.transitionProgress).toBe(1)
    })

    it('should export createEmptyLODStatistics', () => {
      const stats = createEmptyLODStatistics()

      expect(stats.totalCubes).toBe(0)
      expect(stats.averageLODLevel).toBe(0)
      expect(stats.cubesPerLevel[0]).toBe(0)
    })
  })
})
