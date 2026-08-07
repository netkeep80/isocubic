import { describe, expect, it } from 'vitest'
import brickRed from '../../examples/brick-red.json'
import crystalMagic from '../../examples/crystal-magic.json'
import energyShield from '../../examples/energy-shield.json'
import grassGreen from '../../examples/grass-green.json'
import iceFrozen from '../../examples/ice-frozen.json'
import lavaMolten from '../../examples/lava-molten.json'
import magicCrystalEnergy from '../../examples/magic-crystal-energy.json'
import marbleWhite from '../../examples/marble-white.json'
import metalRust from '../../examples/metal-rust.json'
import sandDesert from '../../examples/sand-desert.json'
import stoneMoss from '../../examples/stone-moss.json'
import unstableCore from '../../examples/unstable-core.json'
import woodOak from '../../examples/wood-oak.json'
import { validateAndParseCube, validateCube } from '../lib/validation'

const shippedPresets: Array<[string, unknown]> = [
  ['brick-red.json', brickRed],
  ['crystal-magic.json', crystalMagic],
  ['energy-shield.json', energyShield],
  ['grass-green.json', grassGreen],
  ['ice-frozen.json', iceFrozen],
  ['lava-molten.json', lavaMolten],
  ['magic-crystal-energy.json', magicCrystalEnergy],
  ['marble-white.json', marbleWhite],
  ['metal-rust.json', metalRust],
  ['sand-desert.json', sandDesert],
  ['stone-moss.json', stoneMoss],
  ['unstable-core.json', unstableCore],
  ['wood-oak.json', woodOak],
]

describe('shipped cube preset contracts', () => {
  it.each(shippedPresets)('%s is schema-valid', (_filename, preset) => {
    expect(validateCube(preset)).toEqual({ valid: true, errors: [] })
  })

  it.each(shippedPresets)('%s survives the canonical JSON round trip', (_filename, preset) => {
    const serialized = JSON.stringify(preset)
    const reparsed: unknown = JSON.parse(serialized)
    const cube = validateAndParseCube(reparsed)

    expect(cube).toEqual(preset)
    expect(JSON.parse(JSON.stringify(cube))).toEqual(preset)
  })
})
