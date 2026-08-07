import { describe, expect, it } from 'vitest'
import {
  CURRENT_CUBE_FORMAT_VERSION,
  migrateCubeDocument,
  parseCubeDocument,
  serializeCubeDocument,
} from '../domain/cube-format'
import { validateCube } from '../lib/validation'

const legacyCube = {
  id: 'legacy_cube',
  base: {
    color: [0.25, 0.5, 0.75],
    roughness: 0.4,
    transparency: 1,
  },
  boundary: {
    mode: 'smooth',
    neighbor_influence: 0.5,
  },
  meta: {
    name: 'Legacy cube',
    created: '2026-01-02T03:04:05.000Z',
  },
}

describe('cube format versioning contracts', () => {
  it('defines version 1 as the current canonical cube format', () => {
    expect(CURRENT_CUBE_FORMAT_VERSION).toBe(1)
  })

  it('migrates an unversioned legacy cube to canonical v1 without mutating the input', () => {
    const original = JSON.parse(JSON.stringify(legacyCube))

    const migrated = migrateCubeDocument(legacyCube)

    expect(migrated).toEqual({
      ...legacyCube,
      format_version: CURRENT_CUBE_FORMAT_VERSION,
    })
    expect(legacyCube).toEqual(original)
    expect(validateCube(migrated)).toEqual({ valid: true, errors: [] })
  })

  it('accepts an already-current document without changing its semantic data', () => {
    const current = {
      ...legacyCube,
      format_version: CURRENT_CUBE_FORMAT_VERSION,
    }

    expect(parseCubeDocument(current)).toEqual(current)
  })

  it('normalizes legacy input before parse returns a canonical document', () => {
    const parsed = parseCubeDocument(legacyCube)

    expect(parsed.format_version).toBe(CURRENT_CUBE_FORMAT_VERSION)
    expect(parsed.id).toBe(legacyCube.id)
    expect(parsed.base).toEqual(legacyCube.base)
  })

  it('rejects unsupported future format versions instead of silently coercing them', () => {
    expect(() =>
      parseCubeDocument({
        ...legacyCube,
        format_version: CURRENT_CUBE_FORMAT_VERSION + 1,
      })
    ).toThrow('Unsupported cube format version: 2')
  })

  it('rejects malformed legacy input after migration instead of blessing it as canonical', () => {
    expect(() =>
      parseCubeDocument({
        id: 'malformed_cube',
        base: { color: [2, 0.5, 0.5] },
      })
    ).toThrow('Invalid SpectralCube configuration')
  })

  it('serializes canonical v1 deterministically enough for semantic parse round trips', () => {
    const canonical = parseCubeDocument(legacyCube)
    const serialized = serializeCubeDocument(canonical)
    const reparsed = parseCubeDocument(JSON.parse(serialized))

    expect(reparsed).toEqual(canonical)
    expect(JSON.parse(serialized)).toEqual(canonical)
  })
})
