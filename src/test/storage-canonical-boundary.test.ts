import { beforeEach, describe, expect, it } from 'vitest'
import { CURRENT_CUBE_FORMAT_VERSION } from '../domain/cube-format'
import {
  getAllConfigsFromStorage,
  importCubeFromFile,
  importCubesFromFile,
  loadCubeFromStorage,
  loadCurrentCube,
  saveCubeToStorage,
  saveCurrentCube,
} from '../lib/storage'
import type { SpectralCube } from '../types/cube'

const CONFIGS_KEY = 'isocubic_configs'
const CURRENT_KEY = 'isocubic_current'

const legacyCube = {
  id: 'storage_cube',
  prompt: 'legacy storage fixture',
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
    name: 'Storage fixture',
    created: '2026-01-02T03:04:05.000Z',
  },
} satisfies SpectralCube

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

describe('storage canonical cube boundary', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('writes named saved configs in canonical v1 format', () => {
    saveCubeToStorage(legacyCube)

    const raw = JSON.parse(localStorage.getItem(CONFIGS_KEY)!)
    expect(raw[legacyCube.id].cube.format_version).toBe(CURRENT_CUBE_FORMAT_VERSION)

    expect(loadCubeFromStorage(legacyCube.id)).toMatchObject({
      id: legacyCube.id,
      format_version: CURRENT_CUBE_FORMAT_VERSION,
    })
  })

  it('migrates legacy saved configs on read and excludes invalid persisted cubes', () => {
    localStorage.setItem(
      CONFIGS_KEY,
      JSON.stringify({
        [legacyCube.id]: {
          cube: legacyCube,
          savedAt: '2026-01-04T03:04:05.000Z',
        },
        malformed_cube: {
          cube: { id: 'malformed_cube' },
          savedAt: '2026-01-04T03:04:05.000Z',
        },
      })
    )

    const configs = getAllConfigsFromStorage()

    expect(configs[legacyCube.id]?.cube).toMatchObject({
      id: legacyCube.id,
      format_version: CURRENT_CUBE_FORMAT_VERSION,
    })
    expect(configs.malformed_cube).toBeUndefined()
    expect(loadCubeFromStorage('malformed_cube')).toBeNull()
  })

  it('writes and reads the autosaved current cube through canonical v1', () => {
    saveCurrentCube(legacyCube)

    expect(JSON.parse(localStorage.getItem(CURRENT_KEY)!).format_version).toBe(
      CURRENT_CUBE_FORMAT_VERSION
    )
    expect(loadCurrentCube()).toMatchObject({
      id: legacyCube.id,
      format_version: CURRENT_CUBE_FORMAT_VERSION,
    })
  })

  it('migrates an unversioned legacy current cube on read', () => {
    localStorage.setItem(CURRENT_KEY, JSON.stringify(legacyCube))

    expect(loadCurrentCube()).toMatchObject({
      id: legacyCube.id,
      format_version: CURRENT_CUBE_FORMAT_VERSION,
    })
  })

  it('migrates legacy single-file imports before returning them to consumers', async () => {
    const result = await importCubeFromFile(createJsonFile(legacyCube))

    expect(result.success).toBe(true)
    expect(result.cube).toMatchObject({
      id: legacyCube.id,
      format_version: CURRENT_CUBE_FORMAT_VERSION,
    })
  })

  it('migrates each valid multi-file import independently', async () => {
    const secondCube = { ...legacyCube, id: 'storage_cube_2' }
    const results = await importCubesFromFile(createJsonFile([legacyCube, secondCube]))

    expect(results).toHaveLength(2)
    expect(results.map((result) => result.cube?.format_version)).toEqual([
      CURRENT_CUBE_FORMAT_VERSION,
      CURRENT_CUBE_FORMAT_VERSION,
    ])
  })

  it('rejects unsupported future versions at storage and import boundaries', async () => {
    const futureCube = { ...legacyCube, format_version: CURRENT_CUBE_FORMAT_VERSION + 1 }

    localStorage.setItem(CURRENT_KEY, JSON.stringify(futureCube))
    expect(loadCurrentCube()).toBeNull()

    localStorage.setItem(
      CONFIGS_KEY,
      JSON.stringify({
        [legacyCube.id]: {
          cube: futureCube,
          savedAt: '2026-01-04T03:04:05.000Z',
        },
      })
    )
    expect(getAllConfigsFromStorage()).toEqual({})
    expect(loadCubeFromStorage(legacyCube.id)).toBeNull()

    const result = await importCubeFromFile(createJsonFile(futureCube))
    expect(result.success).toBe(false)
  })
})
