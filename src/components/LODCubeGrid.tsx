/**
 * LODCubeGrid Component
 * Renders a grid of parametric cubes with automatic LOD (Level of Detail) management
 *
 * ISSUE 17: LOD-система для дальних кубиков
 *
 * This component extends CubeGrid with:
 * - Distance-based LOD calculation for each cube
 * - Camera position tracking
 * - Dynamic LOD level updates
 * - Performance statistics
 */

import { useMemo, useRef, useCallback, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { ParametricCube } from './ParametricCube'
import type { SpectralCube } from '../types/cube'
import type { LODLevel, LODConfig, LODStatistics } from '../types/lod'
import { DEFAULT_LOD_CONFIG } from '../types/lod'
import { createLODSystem } from '../lib/lod-system'
import type { QualityLevel, DeviceCapabilities } from '../lib/performance'

/**
 * Props for the LODCubeGrid component
 */
export interface LODCubeGridProps {
  /** Base SpectralCube configuration to use for all cubes in the grid */
  config: SpectralCube
  /** Number of cubes along each axis [x, y, z] - defaults to 3x1x3 for a flat grid */
  gridSize?: [number, number, number]
  /** Spacing between cubes (0 = touching, >0 = gap) */
  spacing?: number
  /** Scale of each cube */
  cubeScale?: number
  /** Center position of the grid in 3D space */
  position?: [number, number, number]
  /** LOD configuration (optional, uses defaults if not provided) */
  lodConfig?: Partial<LODConfig>
  /** Current quality level for LOD adjustments */
  qualityLevel?: QualityLevel
  /** Device capabilities for adaptive LOD */
  deviceCapabilities?: DeviceCapabilities
  /** Callback when LOD statistics update */
  onStatisticsUpdate?: (stats: LODStatistics) => void
  /** How often to update LOD calculations (in seconds) */
  updateInterval?: number
  /** Show debug visualization */
  debug?: boolean
}

/**
 * Grid cube data with LOD information
 */
interface LODGridCube {
  key: string
  gridPosition: [number, number, number]
  worldPosition: [number, number, number]
  lodLevel: LODLevel
}

/**
 * Debug sphere component to visualize LOD levels
 */
function LODDebugSphere({
  position,
  lodLevel,
}: {
  position: [number, number, number]
  lodLevel: LODLevel
}) {
  // Color coding for LOD levels
  const colors: Record<LODLevel, string> = {
    0: '#00ff00', // Green - highest detail
    1: '#80ff00', // Yellow-green
    2: '#ffff00', // Yellow
    3: '#ff8000', // Orange
    4: '#ff0000', // Red - lowest detail
  }

  return (
    <mesh position={[position[0], position[1] + 0.8, position[2]]}>
      <sphereGeometry args={[0.1, 8, 8]} />
      <meshBasicMaterial color={colors[lodLevel]} />
    </mesh>
  )
}

/**
 * LODCubeGrid - Renders a grid of parametric cubes with automatic LOD management
 *
 * Features:
 * - Automatic LOD level calculation based on camera distance
 * - Per-cube LOD state management
 * - Performance statistics tracking
 * - Debug visualization mode
 * - Smooth LOD transitions
 */
export function LODCubeGrid({
  config,
  gridSize = [3, 1, 3],
  spacing = 0,
  cubeScale = 1,
  position = [0, 0, 0],
  lodConfig,
  qualityLevel,
  deviceCapabilities,
  onStatisticsUpdate,
  updateInterval = 0.1, // Update LOD every 100ms by default
  debug = false,
}: LODCubeGridProps) {
  const { camera } = useThree()
  const lastUpdateTime = useRef(0)
  const [cubeLODLevels, setCubeLODLevels] = useState<Map<string, LODLevel>>(new Map())

  // Create LOD system with merged config
  const lodSystem = useMemo(() => {
    const mergedConfig: LODConfig = {
      ...DEFAULT_LOD_CONFIG,
      ...lodConfig,
    }
    return createLODSystem(mergedConfig)
  }, [lodConfig])

  // Generate static grid positions
  const gridCubes = useMemo<Omit<LODGridCube, 'lodLevel'>[]>(() => {
    const cubes: Omit<LODGridCube, 'lodLevel'>[] = []
    const [sizeX, sizeY, sizeZ] = gridSize
    const step = cubeScale + spacing

    // Calculate offset to center the grid
    const offsetX = ((sizeX - 1) * step) / 2
    const offsetY = ((sizeY - 1) * step) / 2
    const offsetZ = ((sizeZ - 1) * step) / 2

    for (let x = 0; x < sizeX; x++) {
      for (let y = 0; y < sizeY; y++) {
        for (let z = 0; z < sizeZ; z++) {
          cubes.push({
            key: `lod-cube-${x}-${y}-${z}`,
            gridPosition: [x, y, z],
            worldPosition: [
              position[0] + x * step - offsetX,
              position[1] + y * step - offsetY,
              position[2] + z * step - offsetZ,
            ],
          })
        }
      }
    }

    return cubes
  }, [gridSize, spacing, cubeScale, position])

  // Create config with boundary mode enabled
  const gridConfig = useMemo<SpectralCube>(() => {
    return {
      ...config,
      boundary: {
        mode: config.boundary?.mode ?? 'smooth',
        neighbor_influence: config.boundary?.neighbor_influence ?? 0.5,
      },
    }
  }, [config])

  // Update LOD levels based on camera position
  const updateLODLevels = useCallback(() => {
    const cameraPosition = camera.position.clone()
    const newLevels = new Map<string, LODLevel>()

    for (const cube of gridCubes) {
      const cubePos = new THREE.Vector3(
        cube.worldPosition[0],
        cube.worldPosition[1],
        cube.worldPosition[2]
      )

      const result = lodSystem.calculateLOD(cubePos, {
        cameraPosition,
        qualityLevel,
        deviceCapabilities,
      })

      newLevels.set(cube.key, result.level)
      lodSystem.updateCubeState(cube.key, result.level, updateInterval)
    }

    setCubeLODLevels(newLevels)

    // Update and report statistics
    const stats = lodSystem.updateStatistics()
    if (onStatisticsUpdate) {
      onStatisticsUpdate(stats)
    }
  }, [
    camera,
    gridCubes,
    lodSystem,
    qualityLevel,
    deviceCapabilities,
    onStatisticsUpdate,
    updateInterval,
  ])

  // Frame update for LOD calculations
  useFrame((state) => {
    const elapsed = state.clock.getElapsedTime()

    // Update LOD levels at specified interval
    if (elapsed - lastUpdateTime.current >= updateInterval) {
      updateLODLevels()
      lastUpdateTime.current = elapsed
    }
  })

  // Get cubes with their current LOD levels
  const cubesWithLOD = useMemo<LODGridCube[]>(() => {
    return gridCubes.map((cube) => ({
      ...cube,
      lodLevel: cubeLODLevels.get(cube.key) ?? 0,
    }))
  }, [gridCubes, cubeLODLevels])

  return (
    <group>
      {cubesWithLOD.map((cube) => (
        <group key={cube.key}>
          <ParametricCube
            config={gridConfig}
            position={cube.worldPosition}
            gridPosition={cube.gridPosition}
            scale={cubeScale}
            lodLevel={cube.lodLevel}
          />
          {debug && <LODDebugSphere position={cube.worldPosition} lodLevel={cube.lodLevel} />}
        </group>
      ))}
    </group>
  )
}
