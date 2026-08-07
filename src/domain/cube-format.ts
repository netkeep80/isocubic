import { validateAndParseCube } from '../lib/validation'
import type { SpectralCube } from '../types/cube'

export const CURRENT_CUBE_FORMAT_VERSION = 1 as const

export type CubeFormatVersion = typeof CURRENT_CUBE_FORMAT_VERSION

export type CanonicalSpectralCube = SpectralCube & {
  format_version: CubeFormatVersion
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function describeVersion(version: unknown): string {
  return typeof version === 'string' ? JSON.stringify(version) : String(version)
}

export function migrateCubeDocument(input: unknown): unknown {
  if (!isRecord(input)) {
    return input
  }

  const version = input.format_version

  if (version === undefined) {
    return {
      ...input,
      format_version: CURRENT_CUBE_FORMAT_VERSION,
    }
  }

  if (version !== CURRENT_CUBE_FORMAT_VERSION) {
    throw new Error(`Unsupported cube format version: ${describeVersion(version)}`)
  }

  return input
}

export function parseCubeDocument(input: unknown): CanonicalSpectralCube {
  const migrated = migrateCubeDocument(input)
  const cube = validateAndParseCube(migrated)

  if (cube.format_version !== CURRENT_CUBE_FORMAT_VERSION) {
    throw new Error('Cube migration did not produce the current canonical format')
  }

  return cube as CanonicalSpectralCube
}

export function serializeCubeDocument(cube: CanonicalSpectralCube): string {
  const validated = parseCubeDocument(cube)
  return JSON.stringify(validated)
}
