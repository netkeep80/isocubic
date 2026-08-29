import { beforeEach, describe, expect, it } from 'vitest'
import { CURRENT_CUBE_FORMAT_VERSION } from '../domain/cube-format'
import { getHistoryState, pushToHistory } from '../lib/storage'
import type { SpectralCube } from '../types/cube'

const HISTORY_KEY = 'isocubic_history'

const legacyCube = {
  id: 'history_cube',
  base: {
    color: [0.25, 0.5, 0.75],
    roughness: 0.4,
    transparency: 1,
  },
  meta: {
    name: 'History fixture',
    created: '2026-01-02T03:04:05.000Z',
  },
} satisfies SpectralCube

describe('history canonical cube boundary', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('writes history entries in canonical v1 format', () => {
    pushToHistory(legacyCube)

    const raw = JSON.parse(localStorage.getItem(HISTORY_KEY)!)
    expect(raw.present).toMatchObject({
      id: legacyCube.id,
      format_version: CURRENT_CUBE_FORMAT_VERSION,
    })
  })

  it('migrates every legacy history slot when reading persisted state', () => {
    localStorage.setItem(
      HISTORY_KEY,
      JSON.stringify({
        past: [legacyCube],
        present: { ...legacyCube, id: 'history_present' },
        future: [{ ...legacyCube, id: 'history_future' }],
      })
    )

    const state = getHistoryState()

    expect(state.past[0]).toMatchObject({
      id: legacyCube.id,
      format_version: CURRENT_CUBE_FORMAT_VERSION,
    })
    expect(state.present).toMatchObject({
      id: 'history_present',
      format_version: CURRENT_CUBE_FORMAT_VERSION,
    })
    expect(state.future[0]).toMatchObject({
      id: 'history_future',
      format_version: CURRENT_CUBE_FORMAT_VERSION,
    })
  })

  it('drops malformed or unsupported history entries instead of returning unchecked cubes', () => {
    localStorage.setItem(
      HISTORY_KEY,
      JSON.stringify({
        past: [legacyCube, { id: 'malformed_cube' }],
        present: {
          ...legacyCube,
          id: 'future_version',
          format_version: CURRENT_CUBE_FORMAT_VERSION + 1,
        },
        future: [{ ...legacyCube, id: 'valid_future' }, { id: 'invalid_future' }],
      })
    )

    const state = getHistoryState()

    expect(state.past).toHaveLength(1)
    expect(state.past[0]?.id).toBe(legacyCube.id)
    expect(state.present).toBeNull()
    expect(state.future).toHaveLength(1)
    expect(state.future[0]?.id).toBe('valid_future')
  })
})
