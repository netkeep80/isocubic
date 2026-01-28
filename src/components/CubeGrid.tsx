/**
 * CubeGrid Component
 * Renders a grid of parametric cubes with seamless boundary stitching
 *
 * This component demonstrates ISSUE 7: Seamless cube boundary stitching
 * by rendering multiple cubes in a grid with continuous noise and gradient
 * transitions across boundaries.
 */

import { useMemo } from 'react'
import { ParametricCube } from './ParametricCube'
import type { SpectralCube } from '../types/cube'

/**
 * Props for the CubeGrid component
 */
export interface CubeGridProps {
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
}

/**
 * Grid position type for internal use
 */
interface GridCube {
  key: string
  gridPosition: [number, number, number]
  worldPosition: [number, number, number]
}

/**
 * CubeGrid - Renders a grid of parametric cubes with seamless stitching
 *
 * Features:
 * - Renders cubes in a 3D grid pattern
 * - Each cube uses its grid position for seamless noise/gradient continuity
 * - Configurable grid size, spacing, and positioning
 * - Demonstrates boundary stitching across multiple cubes
 */
export function CubeGrid({
  config,
  gridSize = [3, 1, 3],
  spacing = 0,
  cubeScale = 1,
  position = [0, 0, 0],
}: CubeGridProps) {
  // Generate grid positions
  const gridCubes = useMemo<GridCube[]>(() => {
    const cubes: GridCube[] = []
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
            key: `cube-${x}-${y}-${z}`,
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

  return (
    <group>
      {gridCubes.map((cube) => (
        <ParametricCube
          key={cube.key}
          config={gridConfig}
          position={cube.worldPosition}
          gridPosition={cube.gridPosition}
          scale={cubeScale}
        />
      ))}
    </group>
  )
}
