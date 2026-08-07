import { describe, expect, it } from 'vitest'
import { validateAndParseCube, validateCube } from '../lib/validation'
import cubeSchema from '../types/cube-schema.json'
import {
  CUBE_DEFAULTS,
  createDefaultCube,
  type BreakPattern,
  type BoundaryMode,
  type GradientAxis,
  type MaterialType,
  type NoiseType,
  type SpectralCube,
} from '../types/cube'

const cloneThroughJson = (cube: SpectralCube): unknown => JSON.parse(JSON.stringify(cube))

describe('canonical SpectralCube characterization', () => {
  it('round-trips a fully populated typed cube through JSON and runtime validation', () => {
    const cube = {
      id: 'round_trip_cube',
      prompt: 'characterization fixture',
      base: {
        color: [0, 0.5, 1],
        roughness: 0,
        transparency: 1,
      },
      gradients: [
        { axis: 'x', factor: 0, color_shift: [-1, 0, 1] },
        { axis: 'radial', factor: 1, color_shift: [1, -1, 0] },
      ],
      noise: {
        type: 'worley',
        scale: 0.1,
        octaves: 8,
        persistence: 1,
        mask: 'edges_20%',
      },
      physics: {
        material: 'crystal',
        density: 20,
        break_pattern: 'shatter',
      },
      boundary: {
        mode: 'hard',
        neighbor_influence: 1,
      },
      meta: {
        name: 'Round-trip fixture',
        tags: ['contract', 'cube'],
        author: 'test',
        created: '2026-01-02T03:04:05.000Z',
        modified: '2026-01-03T03:04:05.000Z',
      },
    } satisfies SpectralCube

    const parsed = validateAndParseCube(cloneThroughJson(cube))

    expect(parsed).toEqual(cube)
    expect(JSON.parse(JSON.stringify(parsed))).toEqual(cube)
  })

  it('keeps TypeScript enum members accepted by the JSON schema', () => {
    const axes: GradientAxis[] = ['x', 'y', 'z', 'radial']
    const noiseTypes: NoiseType[] = ['perlin', 'worley', 'crackle']
    const materials: MaterialType[] = [
      'stone',
      'wood',
      'metal',
      'glass',
      'organic',
      'crystal',
      'liquid',
    ]
    const breakPatterns: BreakPattern[] = ['crumble', 'shatter', 'splinter', 'melt', 'dissolve']
    const boundaryModes: BoundaryMode[] = ['none', 'smooth', 'hard']

    for (const axis of axes) {
      expect(
        validateCube({
          id: `axis_${axis}`,
          base: { color: [0.5, 0.5, 0.5] },
          gradients: [{ axis, factor: 0.5, color_shift: [0, 0, 0] }],
        }).valid
      ).toBe(true)
    }

    for (const type of noiseTypes) {
      expect(
        validateCube({ id: `noise_${type}`, base: { color: [0.5, 0.5, 0.5] }, noise: { type } })
          .valid
      ).toBe(true)
    }

    for (const material of materials) {
      expect(
        validateCube({
          id: `material_${material}`,
          base: { color: [0.5, 0.5, 0.5] },
          physics: { material },
        }).valid
      ).toBe(true)
    }

    for (const break_pattern of breakPatterns) {
      expect(
        validateCube({
          id: `break_${break_pattern}`,
          base: { color: [0.5, 0.5, 0.5] },
          physics: { break_pattern },
        }).valid
      ).toBe(true)
    }

    for (const mode of boundaryModes) {
      expect(
        validateCube({
          id: `boundary_${mode}`,
          base: { color: [0.5, 0.5, 0.5] },
          boundary: { mode },
        }).valid
      ).toBe(true)
    }
  })

  it('accepts documented numeric boundaries and rejects values immediately outside them', () => {
    const validBoundaryCube = {
      id: 'numeric_boundaries',
      base: { color: [0, 1, 0.5], roughness: 0, transparency: 1 },
      gradients: [{ axis: 'z', factor: 1, color_shift: [-1, 1, 0] }],
      noise: { scale: 100, octaves: 1, persistence: 0 },
      physics: { density: 0.01 },
      boundary: { neighbor_influence: 0 },
    } satisfies SpectralCube

    expect(validateCube(validBoundaryCube).valid).toBe(true)

    const invalidCases: unknown[] = [
      { ...validBoundaryCube, base: { ...validBoundaryCube.base, color: [-0.0001, 1, 0.5] } },
      { ...validBoundaryCube, base: { ...validBoundaryCube.base, roughness: 1.0001 } },
      { ...validBoundaryCube, base: { ...validBoundaryCube.base, transparency: -0.0001 } },
      { ...validBoundaryCube, gradients: [{ axis: 'z', factor: 1.0001, color_shift: [-1, 1, 0] }] },
      { ...validBoundaryCube, gradients: [{ axis: 'z', factor: 1, color_shift: [-1.0001, 1, 0] }] },
      { ...validBoundaryCube, noise: { scale: 0.0999 } },
      { ...validBoundaryCube, noise: { octaves: 9 } },
      { ...validBoundaryCube, physics: { density: 20.0001 } },
      { ...validBoundaryCube, boundary: { neighbor_influence: 1.0001 } },
    ]

    for (const invalid of invalidCases) {
      expect(validateCube(invalid).valid).toBe(false)
    }
  })

  it('rejects unknown fields at every persisted object boundary', () => {
    const base = { id: 'unknown_fields', base: { color: [0.5, 0.5, 0.5] } }
    const invalidCases: unknown[] = [
      { ...base, unexpected: true },
      { ...base, base: { ...base.base, unexpected: true } },
      {
        ...base,
        gradients: [{ axis: 'x', factor: 0.5, color_shift: [0, 0, 0], unexpected: true }],
      },
      { ...base, noise: { type: 'perlin', unexpected: true } },
      { ...base, physics: { material: 'stone', unexpected: true } },
      { ...base, boundary: { mode: 'smooth', unexpected: true } },
      { ...base, meta: { name: 'fixture', unexpected: true } },
    ]

    for (const invalid of invalidCases) {
      const result = validateCube(invalid)
      expect(result.valid).toBe(false)
      expect(result.errors.some((error) => error.keyword === 'additionalProperties')).toBe(true)
    }
  })

  it('rejects malformed required fields, invalid ids and invalid timestamps', () => {
    const invalidCases: unknown[] = [
      {},
      { id: 'missing_base' },
      { id: 'UPPERCASE', base: { color: [0.5, 0.5, 0.5] } },
      { id: 'bad-color', base: { color: [0.5, 0.5] } },
      { id: 'bad_color_value', base: { color: [0.5, 0.5, 2] } },
      { id: 'bad_date', base: { color: [0.5, 0.5, 0.5] }, meta: { created: 'not-a-date' } },
    ]

    for (const invalid of invalidCases) {
      expect(validateCube(invalid).valid).toBe(false)
    }
  })

  it('keeps constructor defaults synchronized with schema defaults', () => {
    const cube = createDefaultCube('default_parity')
    const properties = cubeSchema.properties

    expect(cube.base.roughness).toBe(properties.base.properties.roughness.default)
    expect(cube.base.transparency).toBe(properties.base.properties.transparency.default)
    expect(cube.noise?.type).toBe(properties.noise.properties.type.default)
    expect(cube.noise?.scale).toBe(properties.noise.properties.scale.default)
    expect(cube.noise?.octaves).toBe(properties.noise.properties.octaves.default)
    expect(cube.noise?.persistence).toBe(properties.noise.properties.persistence.default)
    expect(cube.physics?.material).toBe(properties.physics.properties.material.default)
    expect(cube.physics?.density).toBe(properties.physics.properties.density.default)
    expect(cube.physics?.break_pattern).toBe(properties.physics.properties.break_pattern.default)
    expect(cube.boundary?.mode).toBe(properties.boundary.properties.mode.default)
    expect(cube.boundary?.neighbor_influence).toBe(
      properties.boundary.properties.neighbor_influence.default
    )

    expect(CUBE_DEFAULTS.base.roughness).toBe(properties.base.properties.roughness.default)
    expect(CUBE_DEFAULTS.base.transparency).toBe(properties.base.properties.transparency.default)
  })
})
