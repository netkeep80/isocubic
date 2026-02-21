/**
 * Unit tests for @netkeep80/metamode — issue-generator types and utilities
 *
 * Tests: getDefaultLabels, validateIssueDraft, generateDraftId, createIssueDraft,
 *        getIssueDraftStorageKey, constants
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect } from 'vitest'
import {
  getDefaultLabels,
  validateIssueDraft,
  generateDraftId,
  createIssueDraft,
  getIssueDraftStorageKey,
  MAX_DRAFTS_COUNT,
  DRAFT_AUTO_SAVE_INTERVAL,
  PRIORITY_LABELS,
  TYPE_LABELS,
} from '../issue-generator'

// ============================================================
// Constants
// ============================================================

describe('MAX_DRAFTS_COUNT', () => {
  it('should be 50', () => {
    expect(MAX_DRAFTS_COUNT).toBe(50)
  })
})

describe('DRAFT_AUTO_SAVE_INTERVAL', () => {
  it('should be 30000 ms (30 seconds)', () => {
    expect(DRAFT_AUTO_SAVE_INTERVAL).toBe(30000)
  })
})

// ============================================================
// Storage Key
// ============================================================

describe('getIssueDraftStorageKey', () => {
  it('should return default key without prefix', () => {
    expect(getIssueDraftStorageKey()).toBe('metamode_issue_drafts')
  })

  it('should return prefixed key', () => {
    expect(getIssueDraftStorageKey('my_app')).toBe('my_app_issue_drafts')
  })
})

// ============================================================
// getDefaultLabels
// ============================================================

describe('getDefaultLabels', () => {
  it('should include type and priority labels for bug', () => {
    const labels = getDefaultLabels('bug', 'high')
    expect(labels).toContain(TYPE_LABELS['bug'])
    expect(labels).toContain(PRIORITY_LABELS['high'])
    expect(labels).toContain('needs-triage')
  })

  it('should include extra labels for feature type', () => {
    const labels = getDefaultLabels('feature', 'low')
    expect(labels).toContain('enhancement')
    expect(labels).toContain('feature-request')
  })

  it('should include "enhancement" for improvement type', () => {
    const labels = getDefaultLabels('improvement', 'medium')
    expect(labels).toContain('enhancement')
  })

  it('should not add extra labels for documentation type', () => {
    const labels = getDefaultLabels('documentation', 'low')
    expect(labels).toContain(TYPE_LABELS['documentation'])
    expect(labels).not.toContain('needs-triage')
    expect(labels).not.toContain('enhancement')
  })

  it('should not add extra labels for question type', () => {
    const labels = getDefaultLabels('question', 'medium')
    expect(labels).toContain(TYPE_LABELS['question'])
    expect(labels).not.toContain('needs-triage')
    expect(labels).not.toContain('feature-request')
  })

  it('should always return at least 2 labels (type + priority)', () => {
    const types = [
      'bug',
      'feature',
      'improvement',
      'documentation',
      'question',
      'maintenance',
    ] as const
    const priorities = ['low', 'medium', 'high', 'critical'] as const

    for (const type of types) {
      for (const priority of priorities) {
        const labels = getDefaultLabels(type, priority)
        expect(labels.length).toBeGreaterThanOrEqual(2)
      }
    }
  })
})

// ============================================================
// validateIssueDraft
// ============================================================

describe('validateIssueDraft', () => {
  const validDraft = {
    title: 'Fix login button not responding on mobile',
    body: 'The login button does not fire click event on iOS Safari.',
    type: 'bug' as const,
    priority: 'high' as const,
  }

  it('should pass for a valid draft', () => {
    const result = validateIssueDraft(validDraft)
    expect(result.isValid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it('should fail when title is missing', () => {
    const result = validateIssueDraft({ ...validDraft, title: '' })
    expect(result.isValid).toBe(false)
    expect(result.errors).toContain('Title is required')
  })

  it('should fail when title is only whitespace', () => {
    const result = validateIssueDraft({ ...validDraft, title: '   ' })
    expect(result.isValid).toBe(false)
    expect(result.errors).toContain('Title is required')
  })

  it('should warn when title is too long (>72 chars)', () => {
    const longTitle = 'A'.repeat(73)
    const result = validateIssueDraft({ ...validDraft, title: longTitle })
    expect(result.isValid).toBe(true) // still valid, just a warning
    expect(result.warnings.some((w) => w.includes('too long'))).toBe(true)
  })

  it('should fail when body is missing', () => {
    const result = validateIssueDraft({ ...validDraft, body: '' })
    expect(result.isValid).toBe(false)
    expect(result.errors).toContain('Description is required')
  })

  it('should fail when type is missing', () => {
    const result = validateIssueDraft({
      title: validDraft.title,
      body: validDraft.body,
      priority: validDraft.priority,
    })
    expect(result.isValid).toBe(false)
    expect(result.errors).toContain('Issue type is required')
  })

  it('should fail when priority is missing', () => {
    const result = validateIssueDraft({
      title: validDraft.title,
      body: validDraft.body,
      type: validDraft.type,
    })
    expect(result.isValid).toBe(false)
    expect(result.errors).toContain('Priority is required')
  })

  it('should warn when more than 10 labels', () => {
    const manyLabels = Array.from({ length: 11 }, (_, i) => `label-${i}`)
    const result = validateIssueDraft({ ...validDraft, labels: manyLabels })
    expect(result.warnings.some((w) => w.includes('Too many labels'))).toBe(true)
  })

  it('should fail with multiple errors for empty draft', () => {
    const result = validateIssueDraft({})
    expect(result.isValid).toBe(false)
    expect(result.errors.length).toBeGreaterThan(1)
  })
})

// ============================================================
// generateDraftId
// ============================================================

describe('generateDraftId', () => {
  it('should generate a string ID', () => {
    const id = generateDraftId()
    expect(typeof id).toBe('string')
  })

  it('should start with "draft_" prefix', () => {
    const id = generateDraftId()
    expect(id).toMatch(/^draft_/)
  })

  it('should generate unique IDs', () => {
    const ids = new Set(Array.from({ length: 100 }, () => generateDraftId()))
    expect(ids.size).toBe(100)
  })
})

// ============================================================
// createIssueDraft
// ============================================================

describe('createIssueDraft', () => {
  it('should create a draft with defaults', () => {
    const draft = createIssueDraft()
    expect(draft.id).toMatch(/^draft_/)
    expect(draft.title).toBe('')
    expect(draft.body).toBe('')
    expect(draft.type).toBe('improvement')
    expect(draft.priority).toBe('medium')
    expect(draft.status).toBe('draft')
    expect(draft.confidence).toBe(0.5)
  })

  it('should apply overrides', () => {
    const draft = createIssueDraft({
      title: 'My Issue',
      body: 'Details here',
      type: 'bug',
      priority: 'critical',
    })
    expect(draft.title).toBe('My Issue')
    expect(draft.body).toBe('Details here')
    expect(draft.type).toBe('bug')
    expect(draft.priority).toBe('critical')
  })

  it('should have valid timestamps', () => {
    const draft = createIssueDraft()
    expect(() => new Date(draft.createdAt)).not.toThrow()
    expect(isNaN(new Date(draft.createdAt).getTime())).toBe(false)
    expect(() => new Date(draft.updatedAt)).not.toThrow()
  })

  it('should set default labels for improvement+medium', () => {
    const draft = createIssueDraft()
    const expected = getDefaultLabels('improvement', 'medium')
    expect(draft.labels).toEqual(expected)
  })

  it('should generate unique IDs for each draft', () => {
    const d1 = createIssueDraft()
    const d2 = createIssueDraft()
    expect(d1.id).not.toBe(d2.id)
  })
})
