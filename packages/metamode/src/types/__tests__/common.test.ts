/**
 * Unit tests for @netkeep80/metamode — common types and utilities
 *
 * Tests: detectLanguage, DEFAULT_COMPONENT_REGISTRY
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect } from 'vitest'
import { detectLanguage, DEFAULT_COMPONENT_REGISTRY } from '../common'

describe('detectLanguage', () => {
  it('should detect Russian (Cyrillic) text', () => {
    expect(detectLanguage('Привет мир')).toBe('ru')
  })

  it('should detect English text', () => {
    expect(detectLanguage('Hello world')).toBe('en')
  })

  it('should return "ru" for mixed text containing Cyrillic', () => {
    expect(detectLanguage('Hello мир')).toBe('ru')
  })

  it('should return "en" for empty string', () => {
    expect(detectLanguage('')).toBe('en')
  })

  it('should return "en" for numbers only', () => {
    expect(detectLanguage('12345')).toBe('en')
  })

  it('should return "en" for punctuation only', () => {
    expect(detectLanguage('!@#$%')).toBe('en')
  })

  it('should detect single Cyrillic character', () => {
    expect(detectLanguage('а')).toBe('ru')
  })

  it('should return "en" for text with non-Cyrillic unicode', () => {
    expect(detectLanguage('日本語テスト')).toBe('en')
  })
})

describe('DEFAULT_COMPONENT_REGISTRY', () => {
  it('should return empty array from getAllComponents', () => {
    expect(DEFAULT_COMPONENT_REGISTRY.getAllComponents()).toEqual([])
  })

  it('should return empty array from searchComponents', () => {
    expect(DEFAULT_COMPONENT_REGISTRY.searchComponents('test')).toEqual([])
  })

  it('should return empty array from searchComponents with any query', () => {
    expect(DEFAULT_COMPONENT_REGISTRY.searchComponents('')).toEqual([])
    expect(DEFAULT_COMPONENT_REGISTRY.searchComponents('Button')).toEqual([])
  })
})
