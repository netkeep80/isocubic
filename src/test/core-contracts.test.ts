import { afterEach, describe, expect, it, vi } from 'vitest'
import { validateCube } from '../lib/validation'
import {
  createDefaultCube,
  createDefaultFFTCube,
  type FFTCoefficient,
} from '../types/cube'

afterEach(() => {
  vi.useRealTimers()
})

describe('core cube contracts', () => {
  it('creates a schema-valid default cube with deterministic metadata under a fixed clock', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-02T03:04:05.000Z'))

    const cube = createDefaultCube('contract-cube')

    expect(validateCube(cube)).toEqual({ valid: true, errors: [] })
    expect(cube.meta?.created).toBe('2026-01-02T03:04:05.000Z')
    expect(cube.boundary).toEqual({ mode: 'smooth', neighbor_influence: 0.5 })
  })

  it('does not share mutable nested state between default cubes', () => {
    const first = createDefaultCube('first')
    const second = createDefaultCube('second')

    first.base.color[0] = 1
    first.gradients?.push({
      axis: 'x',
      factor: 0.5,
      color_shift: [0.1, 0.2, 0.3],
    })

    expect(second.base.color).toEqual([0.5, 0.5, 0.5])
    expect(second.gradients).toEqual([])
  })

  it('creates independent FFT channels and respects the public coefficient representation', () => {
    const first = createDefaultFFTCube('fft-first', [0.2, 0.4, 0.6])
    const second = createDefaultFFTCube('fft-second', [0.2, 0.4, 0.6])
    const coefficient: FFTCoefficient = {
      amplitude: 0.25,
      phase: Math.PI / 2,
      freqX: 1,
      freqY: 0,
      freqZ: 0,
    }

    first.channels.R?.coefficients.push(coefficient)

    expect(first.fft_size).toBe(8)
    expect(first.channels.R?.dcAmplitude).toBe(0.2)
    expect(first.channels.G?.dcAmplitude).toBe(0.4)
    expect(first.channels.B?.dcAmplitude).toBe(0.6)
    expect(first.channels.A?.dcAmplitude).toBe(1)
    expect(second.channels.R?.coefficients).toEqual([])
  })

  it('keeps default energy state inside its declared capacity', () => {
    const cube = createDefaultFFTCube('energy-contract')

    expect(cube.current_energy).toBeGreaterThanOrEqual(0)
    expect(cube.current_energy).toBeLessThanOrEqual(cube.energy_capacity)
    expect(cube.physics?.fracture_threshold).toBeLessThanOrEqual(cube.energy_capacity)
  })
})
