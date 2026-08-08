/**
 * Canonical cube persistence/import contracts for Phase 15.2.
 *
 * These tests intentionally precede the storage consumer migration. They freeze the
 * requirement that every persisted/imported cube crosses the canonical v1 boundary.
 *
 * @vitest-environment jsdom
 */

import { beforeEach, describe, expect, it } from 'vitest'
import { CURRENT_CUBE_FORMAT_VERSION } from '../domain/cube-format'
import {
  importCubeFromFile,
  loadCubeFromStorage,
  loadCurrentCube,
  saveCubeToStorage,
  saveCurrentCube,
} from '../lib/storage'
import type { SpectralCube } from '../types/cube'

const legacyCube: SpectralCube = {
  id: 'storage_contract_cube',
  prompt: 'legacy persisted cube',
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
    name: 'Storage contract cube',
    created: '2026-01-02T03:04:05.000Z',
  },
}

function createJsonFile(value: unknown, name = 'cube.json'): File {
  const content = JSON.stringify(value)
  const blob = new Blob([content], { type: 'application/json' })
  return Object.assign(blob, {
    name,
    lastModified: 0,
    webkitRelativePath: '',
    text: () => Promise.resolve(content),
  }) as File
}

describe('canonical cube storage/import migration boundary', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('persists the current cube in explicit canonical v1 format', () => {
    saveCurrentCube(legacyCube)

    const persisted = JSON.parse(localStorage.getItem('isocubic_current') ?? 'null')
    expect(persisted).toEqual({
      ...legacyCube,
      format_version: CURRENT_CUBE_FORMAT_VERSION,
    })
  })

  it('migrates a legacy unversioned current cube when loading it', () => {
    localStorage.setItem('isocubic_current', JSON.stringify(legacyCube))

    expect(loadCurrentCube()).toEqual({
      ...legacyCube,
      format_version: CURRENT_CUBE_FORMAT_VERSION,
    })
  })

  it('persists named saved cubes canonically and migrates legacy saved records on load', () => {
    saveCubeToStorage(legacyCube)

    const configs = JSON.parse(localStorage.getItem('isocubic_configs') ?? '{}')
    expect(configs[legacyCube.id].cube.format_version).toBe(CURRENT_CUBE_FORMAT_VERSION)

    localStorage.setItem(
      'isocubic_configs',
      JSON.stringify({
        [legacyCube.id]: {
          cube: legacyCube,
          savedAt: '2026-01-02T03:04:05.000Z',
        },
      })
    )

    expect(loadCubeFromStorage(legacyCube.id)).toEqual({
      ...legacyCube,
      format_version: CURRENT_CUBE_FORMAT_VERSION,
    })
  })

  it('migrates an imported legacy cube before exposing it to consumers', async () => {
    const result = await importCubeFromFile(createJsonFile(legacyCube))

    expect(result.success).toBe(true)
    expect(result.cube).toEqual({
      ...legacyCube,
      format_version: CURRENT_CUBE_FORMAT_VERSION,
    })
  })

  it('rejects unsupported future versions at the same import boundary', async () => {
    const futureCube = {
      ...legacyCube,
      format_version: CURRENT_CUBE_FORMAT_VERSION + 1,
    }

    const result = await importCubeFromFile(createJsonFile(futureCube))

    expect(result.success).toBe(false)
    expect(result.cube).toBeUndefined()
  })
})
