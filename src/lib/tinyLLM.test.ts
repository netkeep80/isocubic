/**
 * Unit tests for tinyLLM module
 * Tests cube generation from text prompts, templates, and random generation
 * @vitest-environment jsdom
 */

import { describe, it, expect } from 'vitest'
import {
  generateFromPrompt,
  generateFromTemplate,
  generateRandom,
  getAvailableTemplates,
  isReady,
  initialize,
} from './tinyLLM'
import { validateCube } from './validation'

describe('tinyLLM', () => {
  describe('isReady', () => {
    it('should return true immediately (rule-based generation)', () => {
      expect(isReady()).toBe(true)
    })
  })

  describe('initialize', () => {
    it('should resolve immediately without errors', async () => {
      await expect(initialize()).resolves.toBeUndefined()
    })
  })

  describe('getAvailableTemplates', () => {
    it('should return an array of template names', () => {
      const templates = getAvailableTemplates()

      expect(Array.isArray(templates)).toBe(true)
      expect(templates.length).toBeGreaterThan(0)
    })

    it('should include common material templates', () => {
      const templates = getAvailableTemplates()

      expect(templates).toContain('stone')
      expect(templates).toContain('wood')
      expect(templates).toContain('metal')
      expect(templates).toContain('crystal')
      expect(templates).toContain('grass')
    })
  })

  describe('generateFromPrompt', () => {
    it('should generate a valid cube from simple English prompt', async () => {
      const result = await generateFromPrompt('stone')

      expect(result.success).toBe(true)
      expect(result.cube).not.toBeNull()
      expect(result.cube?.id).toBeDefined()
      expect(result.cube?.prompt).toBe('stone')

      // Validate the generated cube
      const validation = validateCube(result.cube)
      expect(validation.valid).toBe(true)
    })

    it('should generate a valid cube from Russian prompt', async () => {
      const result = await generateFromPrompt('камень')

      expect(result.success).toBe(true)
      expect(result.cube).not.toBeNull()
      expect(result.method).toBe('keyword')
      expect(result.confidence).toBeGreaterThan(0)

      const validation = validateCube(result.cube)
      expect(validation.valid).toBe(true)
    })

    it('should recognize material keywords and apply properties', async () => {
      const result = await generateFromPrompt('granite')

      expect(result.success).toBe(true)
      expect(result.cube?.physics?.material).toBe('stone')
      expect(result.cube?.meta?.tags).toContain('granite')
    })

    it('should apply color modifiers to base color', async () => {
      const darkResult = await generateFromPrompt('dark stone')
      const lightResult = await generateFromPrompt('light stone')

      expect(darkResult.success).toBe(true)
      expect(lightResult.success).toBe(true)

      // Dark stone should have lower color values
      const darkColor = darkResult.cube!.base.color
      const lightColor = lightResult.cube!.base.color

      // At least one channel should be darker in dark stone
      const isDarker =
        darkColor[0] < lightColor[0] || darkColor[1] < lightColor[1] || darkColor[2] < lightColor[2]
      expect(isDarker).toBe(true)
    })

    it('should apply roughness modifiers', async () => {
      const polishedResult = await generateFromPrompt('polished stone')
      const roughResult = await generateFromPrompt('rough stone')

      expect(polishedResult.success).toBe(true)
      expect(roughResult.success).toBe(true)

      const polishedRoughness = polishedResult.cube!.base.roughness ?? 0.5
      const roughRoughness = roughResult.cube!.base.roughness ?? 0.5

      expect(polishedRoughness).toBeLessThan(roughRoughness)
    })

    it('should use hybrid method when modifiers are applied', async () => {
      const result = await generateFromPrompt('dark weathered stone')

      expect(result.success).toBe(true)
      expect(result.method).toBe('hybrid')
      expect(result.confidence).toBeGreaterThan(0.5)
    })

    it('should fall back to random generation for unrecognized prompts', async () => {
      const result = await generateFromPrompt('xyzzy qwerty')

      expect(result.success).toBe(true)
      expect(result.method).toBe('random')
      expect(result.confidence).toBeLessThan(0.5)
      expect(result.warnings.length).toBeGreaterThan(0)
    })

    it('should generate unique IDs for each cube', async () => {
      const result1 = await generateFromPrompt('stone')
      const result2 = await generateFromPrompt('stone')

      expect(result1.cube?.id).not.toBe(result2.cube?.id)
    })

    it('should clamp color values to valid range', async () => {
      const result = await generateFromPrompt('bright white stone')

      expect(result.success).toBe(true)
      const color = result.cube!.base.color
      expect(color[0]).toBeLessThanOrEqual(1)
      expect(color[1]).toBeLessThanOrEqual(1)
      expect(color[2]).toBeLessThanOrEqual(1)
      expect(color[0]).toBeGreaterThanOrEqual(0)
      expect(color[1]).toBeGreaterThanOrEqual(0)
      expect(color[2]).toBeGreaterThanOrEqual(0)
    })

    it('should clamp roughness to valid range', async () => {
      const result = await generateFromPrompt('extremely polished shiny glossy stone')

      expect(result.success).toBe(true)
      const roughness = result.cube!.base.roughness ?? 0.5
      expect(roughness).toBeGreaterThanOrEqual(0)
      expect(roughness).toBeLessThanOrEqual(1)
    })

    it('should handle complex multi-word prompts', async () => {
      const result = await generateFromPrompt('ancient weathered dark mossy stone with cracks')

      expect(result.success).toBe(true)
      expect(result.cube).not.toBeNull()
      expect(result.method).toBe('hybrid')
    })

    it('should handle empty or whitespace prompts gracefully', async () => {
      const emptyResult = await generateFromPrompt('')
      const whitespaceResult = await generateFromPrompt('   ')

      // Both should still succeed with random generation
      expect(emptyResult.success).toBe(true)
      expect(whitespaceResult.success).toBe(true)
      expect(emptyResult.method).toBe('random')
      expect(whitespaceResult.method).toBe('random')
    })

    it('should recognize metal variants', async () => {
      const results = await Promise.all([
        generateFromPrompt('gold'),
        generateFromPrompt('copper'),
        generateFromPrompt('iron'),
        generateFromPrompt('steel'),
      ])

      for (const result of results) {
        expect(result.success).toBe(true)
        expect(result.cube?.physics?.material).toBe('metal')
      }
    })

    it('should recognize crystal and glass materials', async () => {
      const crystalResult = await generateFromPrompt('crystal')
      const glassResult = await generateFromPrompt('glass')
      const iceResult = await generateFromPrompt('ice')

      expect(crystalResult.cube?.physics?.material).toBe('crystal')
      expect(glassResult.cube?.physics?.material).toBe('glass')
      expect(iceResult.cube?.physics?.material).toBe('crystal')

      // These materials should have transparency
      expect(crystalResult.cube?.base.transparency).toBeLessThan(1)
      expect(glassResult.cube?.base.transparency).toBeLessThan(1)
      expect(iceResult.cube?.base.transparency).toBeLessThan(1)
    })

    it('should include prompt in generated cube', async () => {
      const prompt = 'beautiful ancient marble pillar'
      const result = await generateFromPrompt(prompt)

      expect(result.cube?.prompt).toBe(prompt)
    })

    it('should set author to TinyLLM', async () => {
      const result = await generateFromPrompt('stone')

      expect(result.cube?.meta?.author).toBe('TinyLLM')
    })

    it('should include generated tag in meta', async () => {
      const result = await generateFromPrompt('stone')

      expect(result.cube?.meta?.tags).toContain('generated')
    })

    it('should set created timestamp', async () => {
      const beforeTime = new Date().toISOString()
      const result = await generateFromPrompt('stone')
      const afterTime = new Date().toISOString()

      expect(result.cube?.meta?.created).toBeDefined()
      // Compare ISO string timestamps lexicographically
      const created = result.cube?.meta?.created ?? ''
      expect(created >= beforeTime).toBe(true)
      expect(created <= afterTime).toBe(true)
    })
  })

  describe('generateFromTemplate', () => {
    it('should generate a valid cube from template name', async () => {
      const result = await generateFromTemplate('stone')

      expect(result.success).toBe(true)
      expect(result.cube).not.toBeNull()
      expect(result.method).toBe('template')
      expect(result.confidence).toBe(1.0)
      expect(result.warnings).toHaveLength(0)

      const validation = validateCube(result.cube)
      expect(validation.valid).toBe(true)
    })

    it('should fail for non-existent template', async () => {
      const result = await generateFromTemplate('nonexistent_material')

      expect(result.success).toBe(false)
      expect(result.cube).toBeNull()
      expect(result.warnings.length).toBeGreaterThan(0)
    })

    it('should handle case-insensitive template names', async () => {
      const result1 = await generateFromTemplate('STONE')
      const result2 = await generateFromTemplate('Stone')
      const result3 = await generateFromTemplate('stone')

      expect(result1.success).toBe(true)
      expect(result2.success).toBe(true)
      expect(result3.success).toBe(true)
    })

    it('should trim whitespace from template names', async () => {
      const result = await generateFromTemplate('  stone  ')

      expect(result.success).toBe(true)
      expect(result.cube).not.toBeNull()
    })

    it('should generate cubes with correct material properties', async () => {
      const woodResult = await generateFromTemplate('wood')
      const metalResult = await generateFromTemplate('metal')
      const crystalResult = await generateFromTemplate('crystal')

      expect(woodResult.cube?.physics?.material).toBe('wood')
      expect(metalResult.cube?.physics?.material).toBe('metal')
      expect(crystalResult.cube?.physics?.material).toBe('crystal')

      // Wood should splinter
      expect(woodResult.cube?.physics?.break_pattern).toBe('splinter')
      // Metal should shatter
      expect(metalResult.cube?.physics?.break_pattern).toBe('shatter')
    })

    it('should include template name in cube name', async () => {
      const result = await generateFromTemplate('granite')

      expect(result.cube?.meta?.name?.toLowerCase()).toContain('granite')
    })
  })

  describe('generateRandom', () => {
    it('should generate a valid random cube', async () => {
      const result = await generateRandom()

      expect(result.success).toBe(true)
      expect(result.cube).not.toBeNull()
      expect(result.method).toBe('random')
      expect(result.confidence).toBe(0.2)

      const validation = validateCube(result.cube)
      expect(validation.valid).toBe(true)
    })

    it('should generate cubes with valid color values', async () => {
      for (let i = 0; i < 10; i++) {
        const result = await generateRandom()
        const color = result.cube!.base.color

        expect(color[0]).toBeGreaterThanOrEqual(0)
        expect(color[0]).toBeLessThanOrEqual(1)
        expect(color[1]).toBeGreaterThanOrEqual(0)
        expect(color[1]).toBeLessThanOrEqual(1)
        expect(color[2]).toBeGreaterThanOrEqual(0)
        expect(color[2]).toBeLessThanOrEqual(1)
      }
    })

    it('should generate cubes with valid roughness', async () => {
      for (let i = 0; i < 10; i++) {
        const result = await generateRandom()
        const roughness = result.cube!.base.roughness ?? 0.5

        expect(roughness).toBeGreaterThanOrEqual(0)
        expect(roughness).toBeLessThanOrEqual(1)
      }
    })

    it('should generate cubes with valid noise settings', async () => {
      for (let i = 0; i < 10; i++) {
        const result = await generateRandom()
        const noise = result.cube!.noise

        expect(['perlin', 'worley', 'crackle']).toContain(noise?.type)
        expect(noise?.scale).toBeGreaterThan(0)
      }
    })

    it('should generate unique IDs for random cubes', async () => {
      const ids = new Set<string>()
      for (let i = 0; i < 20; i++) {
        const result = await generateRandom()
        ids.add(result.cube!.id)
      }
      expect(ids.size).toBe(20)
    })

    it('should include random tag in metadata', async () => {
      const result = await generateRandom()

      expect(result.cube?.meta?.tags).toContain('random')
      expect(result.cube?.meta?.tags).toContain('generated')
    })

    it('should set prompt to indicate random generation', async () => {
      const result = await generateRandom()

      expect(result.cube?.prompt).toContain('Random')
    })
  })

  describe('Russian language support', () => {
    it('should translate Russian material words', async () => {
      const russianPrompts = [
        { prompt: 'камень', expectedMaterial: 'stone' },
        { prompt: 'дерево', expectedMaterial: 'wood' },
        { prompt: 'металл', expectedMaterial: 'metal' },
        { prompt: 'кристалл', expectedMaterial: 'crystal' },
        { prompt: 'золото', expectedMaterial: 'metal' },
        { prompt: 'лёд', expectedMaterial: 'crystal' },
      ]

      for (const { prompt, expectedMaterial } of russianPrompts) {
        const result = await generateFromPrompt(prompt)
        expect(result.success).toBe(true)
        expect(result.cube?.physics?.material).toBe(expectedMaterial)
      }
    })

    it('should translate Russian color modifiers', async () => {
      const darkResult = await generateFromPrompt('тёмный камень')
      const lightResult = await generateFromPrompt('светлый камень')

      expect(darkResult.success).toBe(true)
      expect(lightResult.success).toBe(true)

      // Dark should have lower color values
      const darkColor = darkResult.cube!.base.color
      const lightColor = lightResult.cube!.base.color

      const isDarker =
        darkColor[0] < lightColor[0] || darkColor[1] < lightColor[1] || darkColor[2] < lightColor[2]
      expect(isDarker).toBe(true)
    })

    it('should translate Russian texture modifiers', async () => {
      const polishedResult = await generateFromPrompt('полированный камень')
      const roughResult = await generateFromPrompt('шероховатый камень')

      expect(polishedResult.success).toBe(true)
      expect(roughResult.success).toBe(true)

      const polishedRoughness = polishedResult.cube!.base.roughness ?? 0.5
      const roughRoughness = roughResult.cube!.base.roughness ?? 0.5

      expect(polishedRoughness).toBeLessThan(roughRoughness)
    })

    it('should handle mixed Russian and English prompts', async () => {
      const result = await generateFromPrompt('dark камень weathered')

      expect(result.success).toBe(true)
      expect(result.method).toBe('hybrid')
    })
  })

  describe('gradient generation', () => {
    it('should add gradients for gradient keywords', async () => {
      const verticalResult = await generateFromPrompt('stone vertical gradient')

      expect(verticalResult.success).toBe(true)
      expect(verticalResult.cube?.gradients).toBeDefined()
      expect(verticalResult.cube?.gradients?.length).toBeGreaterThan(0)
    })

    it('should not duplicate gradient axes', async () => {
      const result = await generateFromPrompt('stone top bottom vertical')

      expect(result.success).toBe(true)
      if (result.cube?.gradients) {
        const axes = result.cube.gradients.map((g) => g.axis)
        const uniqueAxes = new Set(axes)
        expect(axes.length).toBe(uniqueAxes.size)
      }
    })
  })

  describe('validation integration', () => {
    it('should produce cubes that pass JSON schema validation', async () => {
      const prompts = [
        'stone',
        'dark wood',
        'polished metal',
        'crystal magic',
        'ancient brick',
        'mossy cobblestone',
      ]

      for (const prompt of prompts) {
        const result = await generateFromPrompt(prompt)
        expect(result.success).toBe(true)

        const validation = validateCube(result.cube)
        expect(validation.valid).toBe(true)
      }
    })

    it('should produce templates that pass JSON schema validation', async () => {
      const templates = getAvailableTemplates()

      for (const template of templates.slice(0, 10)) {
        const result = await generateFromTemplate(template)
        if (result.success) {
          const validation = validateCube(result.cube)
          expect(validation.valid).toBe(true)
        }
      }
    })

    it('should produce random cubes that pass JSON schema validation', async () => {
      for (let i = 0; i < 20; i++) {
        const result = await generateRandom()
        expect(result.success).toBe(true)

        const validation = validateCube(result.cube)
        expect(validation.valid).toBe(true)
      }
    })
  })

  describe('confidence scoring', () => {
    it('should have higher confidence for keyword matches vs random', async () => {
      const keywordMatch = await generateFromPrompt('stone')
      const hybridMatch = await generateFromPrompt('dark weathered stone')
      const randomMatch = await generateFromPrompt('xyzzy qwerty')

      // Both keyword and hybrid matches should have similar high confidence
      expect(keywordMatch.confidence).toBeGreaterThanOrEqual(0.9)
      expect(hybridMatch.confidence).toBeGreaterThanOrEqual(0.9)
      // Random match should have much lower confidence
      expect(randomMatch.confidence).toBeLessThan(0.5)
      expect(hybridMatch.confidence).toBeGreaterThan(randomMatch.confidence)
    })

    it('should have maximum confidence for templates', async () => {
      const result = await generateFromTemplate('stone')

      expect(result.confidence).toBe(1.0)
    })

    it('should have low confidence for random generation', async () => {
      const result = await generateRandom()

      expect(result.confidence).toBeLessThanOrEqual(0.3)
    })
  })
})
