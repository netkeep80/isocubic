import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'
import { CubeGrid } from './CubeGrid'
import type { SpectralCube } from '../types/cube'

// Mock react-three-fiber to avoid WebGL context issues in tests
vi.mock('@react-three/fiber', () => ({
  Canvas: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="canvas-mock">{children}</div>
  ),
  useFrame: vi.fn(),
  useThree: vi.fn(() => ({
    size: { width: 800, height: 600 },
    camera: {},
    gl: {},
  })),
}))

// Mock THREE.js
vi.mock('three', async () => {
  const actual = await vi.importActual('three')
  return {
    ...actual,
    ShaderMaterial: vi.fn().mockImplementation(() => ({
      vertexShader: '',
      fragmentShader: '',
      uniforms: {},
    })),
  }
})

// Mock ParametricCube since it uses Three.js internals
vi.mock('./ParametricCube', () => ({
  ParametricCube: ({
    config,
    position,
    gridPosition,
    scale,
  }: {
    config: SpectralCube
    position?: [number, number, number]
    gridPosition?: [number, number, number]
    scale?: number
  }) => (
    <div
      data-testid="parametric-cube-mock"
      data-config-id={config.id}
      data-position={position?.join(',')}
      data-grid-position={gridPosition?.join(',')}
      data-scale={scale}
    />
  ),
}))

describe('CubeGrid', () => {
  const mockConfig: SpectralCube = {
    id: 'test-cube',
    base: {
      color: [0.5, 0.5, 0.5],
      roughness: 0.5,
      transparency: 1.0,
    },
    boundary: {
      mode: 'smooth',
      neighbor_influence: 0.5,
    },
  }

  describe('Grid Generation', () => {
    it('should render default 3x1x3 grid (9 cubes)', () => {
      const { getAllByTestId } = render(<CubeGrid config={mockConfig} />)
      const cubes = getAllByTestId('parametric-cube-mock')
      expect(cubes).toHaveLength(9)
    })

    it('should render custom grid size', () => {
      const { getAllByTestId } = render(<CubeGrid config={mockConfig} gridSize={[2, 2, 2]} />)
      const cubes = getAllByTestId('parametric-cube-mock')
      expect(cubes).toHaveLength(8)
    })

    it('should render single cube when gridSize is [1,1,1]', () => {
      const { getAllByTestId } = render(<CubeGrid config={mockConfig} gridSize={[1, 1, 1]} />)
      const cubes = getAllByTestId('parametric-cube-mock')
      expect(cubes).toHaveLength(1)
    })

    it('should render large grid correctly', () => {
      const { getAllByTestId } = render(<CubeGrid config={mockConfig} gridSize={[5, 1, 5]} />)
      const cubes = getAllByTestId('parametric-cube-mock')
      expect(cubes).toHaveLength(25)
    })
  })

  describe('Grid Positioning', () => {
    it('should pass correct grid positions to cubes', () => {
      const { getAllByTestId } = render(<CubeGrid config={mockConfig} gridSize={[2, 1, 2]} />)
      const cubes = getAllByTestId('parametric-cube-mock')

      // Check that grid positions are unique and correct
      const gridPositions = cubes.map((cube) => cube.getAttribute('data-grid-position'))

      expect(gridPositions).toContain('0,0,0')
      expect(gridPositions).toContain('0,0,1')
      expect(gridPositions).toContain('1,0,0')
      expect(gridPositions).toContain('1,0,1')
    })

    it('should center the grid when using default position', () => {
      const { getAllByTestId } = render(
        <CubeGrid config={mockConfig} gridSize={[3, 1, 1]} cubeScale={1} spacing={0} />
      )
      const cubes = getAllByTestId('parametric-cube-mock')
      const positions = cubes.map((cube) => cube.getAttribute('data-position'))

      // With 3 cubes centered, positions should be -1,0,1
      expect(positions).toContain('-1,0,0')
      expect(positions).toContain('0,0,0')
      expect(positions).toContain('1,0,0')
    })
  })

  describe('Spacing', () => {
    it('should apply spacing between cubes', () => {
      const { getAllByTestId } = render(
        <CubeGrid config={mockConfig} gridSize={[2, 1, 1]} cubeScale={1} spacing={0.5} />
      )
      const cubes = getAllByTestId('parametric-cube-mock')
      const positions = cubes.map((cube) => {
        const pos = cube.getAttribute('data-position')
        return pos ? pos.split(',').map(Number) : null
      })

      // With spacing 0.5 and cubeScale 1, step is 1.5
      // Two cubes centered means -0.75 and +0.75
      const xPositions = positions.map((p) => p?.[0] ?? 0)
      const distance = Math.abs(xPositions[1] - xPositions[0])
      expect(distance).toBeCloseTo(1.5)
    })
  })

  describe('Scale', () => {
    it('should pass scale to all cubes', () => {
      const { getAllByTestId } = render(
        <CubeGrid config={mockConfig} gridSize={[2, 1, 1]} cubeScale={2} />
      )
      const cubes = getAllByTestId('parametric-cube-mock')

      cubes.forEach((cube) => {
        expect(cube.getAttribute('data-scale')).toBe('2')
      })
    })
  })

  describe('Configuration', () => {
    it('should pass config with boundary settings to all cubes', () => {
      const { getAllByTestId } = render(<CubeGrid config={mockConfig} gridSize={[2, 1, 1]} />)
      const cubes = getAllByTestId('parametric-cube-mock')

      cubes.forEach((cube) => {
        expect(cube.getAttribute('data-config-id')).toBe('test-cube')
      })
    })

    it('should use default boundary mode if not specified in config', () => {
      const configWithoutBoundary: SpectralCube = {
        id: 'no-boundary',
        base: {
          color: [0.5, 0.5, 0.5],
        },
      }

      const { getAllByTestId } = render(
        <CubeGrid config={configWithoutBoundary} gridSize={[2, 1, 1]} />
      )
      const cubes = getAllByTestId('parametric-cube-mock')

      // Should still render without errors
      expect(cubes).toHaveLength(2)
    })
  })

  describe('Props Interface', () => {
    it('should accept all optional props', () => {
      const { getAllByTestId } = render(
        <CubeGrid
          config={mockConfig}
          gridSize={[3, 2, 3]}
          spacing={0.1}
          cubeScale={0.5}
          position={[1, 2, 3]}
        />
      )
      const cubes = getAllByTestId('parametric-cube-mock')
      expect(cubes).toHaveLength(18)
    })

    it('should work with minimal props', () => {
      const { getAllByTestId } = render(<CubeGrid config={mockConfig} />)
      const cubes = getAllByTestId('parametric-cube-mock')
      expect(cubes.length).toBeGreaterThan(0)
    })
  })
})

describe('CubeGrid Boundary Stitching', () => {
  const mockConfig: SpectralCube = {
    id: 'boundary-test',
    base: {
      color: [0.5, 0.5, 0.5],
    },
    boundary: {
      mode: 'smooth',
      neighbor_influence: 0.7,
    },
  }

  it('should generate sequential grid positions for seamless stitching', () => {
    const { getAllByTestId } = render(<CubeGrid config={mockConfig} gridSize={[3, 1, 3]} />)
    const cubes = getAllByTestId('parametric-cube-mock')

    const gridPositions = cubes.map((cube) => cube.getAttribute('data-grid-position'))

    // All grid positions should be unique
    const uniquePositions = new Set(gridPositions)
    expect(uniquePositions.size).toBe(9)

    // Check corner positions exist
    expect(gridPositions).toContain('0,0,0')
    expect(gridPositions).toContain('2,0,0')
    expect(gridPositions).toContain('0,0,2')
    expect(gridPositions).toContain('2,0,2')

    // Check center position exists
    expect(gridPositions).toContain('1,0,1')
  })

  it('should maintain grid integrity for 3D grids', () => {
    const { getAllByTestId } = render(<CubeGrid config={mockConfig} gridSize={[2, 2, 2]} />)
    const cubes = getAllByTestId('parametric-cube-mock')

    // Should have all 8 corner cubes
    expect(cubes).toHaveLength(8)

    const gridPositions = cubes.map((cube) => cube.getAttribute('data-grid-position'))

    // All 8 corners of a 2x2x2 cube
    const expectedPositions = [
      '0,0,0',
      '0,0,1',
      '0,1,0',
      '0,1,1',
      '1,0,0',
      '1,0,1',
      '1,1,0',
      '1,1,1',
    ]

    expectedPositions.forEach((pos) => {
      expect(gridPositions).toContain(pos)
    })
  })
})
