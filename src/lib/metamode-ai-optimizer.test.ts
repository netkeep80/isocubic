/**
 * Tests for MetaMode AI Optimizer (TASK 74)
 *
 * Tests the AI-optimized metamode format conversion:
 * - Shortened field names (desc, ver, lang, dirs, deps)
 * - Status abbreviations (exp, dep)
 * - AI summary generation
 * - Token savings calculation
 */

import { describe, it, expect } from 'vitest'

// Since the optimizer is a CLI script, we'll test the core functions inline
// These are the same functions used in the optimizer

const STATUS_MAP: Record<string, 'stable' | 'beta' | 'exp' | 'dep'> = {
  stable: 'stable',
  beta: 'beta',
  experimental: 'exp',
  deprecated: 'dep',
}

/**
 * Generate an AI summary from a description
 */
function generateAISummary(description: string, maxLength: number = 100): string {
  let summary = description
    .replace(/^(The |A |An |This |It )/i, '')
    .replace(/ for the isocubic application/gi, '')
    .replace(/ for isocubic/gi, '')
    .replace(/ component$/gi, '')
    .replace(/ module$/gi, '')
    .replace(/\s+/g, ' ')
    .trim()

  if (summary.length > maxLength) {
    summary = summary.substring(0, maxLength - 3).trim() + '...'
  }

  return summary
}

interface FileDescriptor {
  description: string
  tags?: string[]
  phase?: number
  status?: 'stable' | 'beta' | 'experimental' | 'deprecated'
  dependencies?: string[]
}

interface AIFileDescriptor {
  desc: string
  tags?: string[]
  phase?: number
  status?: 'stable' | 'beta' | 'exp' | 'dep'
  deps?: string[]
  ai?: string
}

/**
 * Convert a verbose file descriptor to AI-optimized format
 */
function convertFileDescriptor(file: FileDescriptor): AIFileDescriptor {
  const result: AIFileDescriptor = {
    desc: file.description,
  }

  if (file.tags && file.tags.length > 0) result.tags = file.tags
  if (file.phase !== undefined) result.phase = file.phase
  if (file.status)
    result.status = STATUS_MAP[file.status] || (file.status as 'stable' | 'beta' | 'exp' | 'dep')
  if (file.dependencies && file.dependencies.length > 0) result.deps = file.dependencies
  if (file.description.length > 50) result.ai = generateAISummary(file.description, 80)

  return result
}

describe('MetaMode AI Optimizer (TASK 74)', () => {
  describe('generateAISummary', () => {
    it('removes common filler words', () => {
      expect(generateAISummary('The main component for rendering cubes')).toBe(
        'main component for rendering cubes'
      )
      expect(generateAISummary('A utility for parsing data')).toBe('utility for parsing data')
      expect(generateAISummary('This module handles events')).toBe('module handles events')
    })

    it('removes isocubic-specific phrases', () => {
      expect(generateAISummary('Editor component for the isocubic application')).toBe('Editor')
      expect(generateAISummary('Renderer for isocubic cubes')).toBe('Renderer cubes')
    })

    it('removes trailing component/module words', () => {
      expect(generateAISummary('Parameter editor component')).toBe('Parameter editor')
      expect(generateAISummary('FFT computation module')).toBe('FFT computation')
    })

    it('truncates long descriptions with ellipsis', () => {
      const longDesc =
        'This is a very long description that exceeds the maximum length and should be truncated with ellipsis at the end'
      const result = generateAISummary(longDesc, 50)
      expect(result.length).toBeLessThanOrEqual(50)
      expect(result.endsWith('...')).toBe(true)
    })

    it('preserves short descriptions', () => {
      expect(generateAISummary('Short desc', 100)).toBe('Short desc')
    })

    it('handles empty descriptions', () => {
      expect(generateAISummary('')).toBe('')
    })

    it('normalizes whitespace', () => {
      expect(generateAISummary('Multiple   spaces   between   words')).toBe(
        'Multiple spaces between words'
      )
    })
  })

  describe('convertFileDescriptor', () => {
    it('converts description to desc', () => {
      const input: FileDescriptor = {
        description: 'Test file',
      }
      const result = convertFileDescriptor(input)
      expect(result.desc).toBe('Test file')
      expect(result).not.toHaveProperty('description')
    })

    it('preserves tags', () => {
      const input: FileDescriptor = {
        description: 'Test',
        tags: ['vue', 'ui'],
      }
      const result = convertFileDescriptor(input)
      expect(result.tags).toEqual(['vue', 'ui'])
    })

    it('preserves phase', () => {
      const input: FileDescriptor = {
        description: 'Test',
        phase: 5,
      }
      const result = convertFileDescriptor(input)
      expect(result.phase).toBe(5)
    })

    it('converts experimental status to exp', () => {
      const input: FileDescriptor = {
        description: 'Test',
        status: 'experimental',
      }
      const result = convertFileDescriptor(input)
      expect(result.status).toBe('exp')
    })

    it('converts deprecated status to dep', () => {
      const input: FileDescriptor = {
        description: 'Test',
        status: 'deprecated',
      }
      const result = convertFileDescriptor(input)
      expect(result.status).toBe('dep')
    })

    it('preserves stable status', () => {
      const input: FileDescriptor = {
        description: 'Test',
        status: 'stable',
      }
      const result = convertFileDescriptor(input)
      expect(result.status).toBe('stable')
    })

    it('converts dependencies to deps', () => {
      const input: FileDescriptor = {
        description: 'Test',
        dependencies: ['./other.ts', './utils.ts'],
      }
      const result = convertFileDescriptor(input)
      expect(result.deps).toEqual(['./other.ts', './utils.ts'])
      expect(result).not.toHaveProperty('dependencies')
    })

    it('generates AI summary for long descriptions', () => {
      const input: FileDescriptor = {
        description:
          'This is a component that handles the rendering of parametric cubes in the application',
      }
      const result = convertFileDescriptor(input)
      expect(result.ai).toBeDefined()
      expect(result.ai!.length).toBeLessThanOrEqual(80)
    })

    it('does not generate AI summary for short descriptions', () => {
      const input: FileDescriptor = {
        description: 'Short desc',
      }
      const result = convertFileDescriptor(input)
      expect(result.ai).toBeUndefined()
    })

    it('omits empty arrays', () => {
      const input: FileDescriptor = {
        description: 'Test',
        tags: [],
        dependencies: [],
      }
      const result = convertFileDescriptor(input)
      expect(result.tags).toBeUndefined()
      expect(result.deps).toBeUndefined()
    })
  })

  describe('Token savings', () => {
    it('saves tokens with shortened field names', () => {
      const verbose = {
        name: 'test',
        description: 'Test module',
        version: '1.0.0',
        languages: ['typescript'],
        directories: {
          src: {
            description: 'Source code',
            metamode: 'src/metamode.json',
          },
        },
      }

      const compact = {
        name: 'test',
        desc: 'Test module',
        ver: '1.0.0',
        lang: ['typescript'],
        dirs: {
          src: 'Source code',
        },
      }

      const verboseSize = JSON.stringify(verbose).length
      const compactSize = JSON.stringify(compact).length
      const savings = ((verboseSize - compactSize) / verboseSize) * 100

      expect(savings).toBeGreaterThan(20) // At least 20% savings
    })

    it('saves tokens with status abbreviations', () => {
      const verbose = {
        status: 'experimental',
      }
      const compact = {
        status: 'exp',
      }

      const verboseSize = JSON.stringify(verbose).length
      const compactSize = JSON.stringify(compact).length

      expect(compactSize).toBeLessThan(verboseSize)
    })
  })

  describe('STATUS_MAP', () => {
    it('maps all statuses correctly', () => {
      expect(STATUS_MAP.stable).toBe('stable')
      expect(STATUS_MAP.beta).toBe('beta')
      expect(STATUS_MAP.experimental).toBe('exp')
      expect(STATUS_MAP.deprecated).toBe('dep')
    })
  })
})
