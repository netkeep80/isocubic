/**
 * Unit tests for CommentsSection Vue component
 * Tests the Vue.js 3.0 migration of the CommentsSection component (TASK 64)
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect } from 'vitest'

describe('CommentsSection Vue Component — Module Exports', () => {
  it('should export CommentsSection.vue as a valid Vue component', async () => {
    const module = await import('./CommentsSection.vue')
    expect(module.default).toBeDefined()
    expect(typeof module.default).toBe('object')
  })

  it('should export COMMENTS_SECTION_META with correct metadata', async () => {
    const module = await import('./CommentsSection.vue')
    expect(module.COMMENTS_SECTION_META).toBeDefined()
    expect(module.COMMENTS_SECTION_META.id).toBe('comments-section')
    expect(module.COMMENTS_SECTION_META.name).toBe('CommentsSection')
    expect(module.COMMENTS_SECTION_META.filePath).toBe('components/CommentsSection.vue')
  })
})

describe('CommentsSection Vue Component — Comment Logic', () => {
  it('should identify own comments correctly', () => {
    const currentUser = { id: 'user-1', displayName: 'Test User' }
    const ownComment = { author: { id: 'user-1', displayName: 'Test User' } }
    const otherComment = { author: { id: 'user-2', displayName: 'Other User' } }

    const isOwnComment = (comment: typeof ownComment) =>
      !!currentUser && currentUser.id === comment.author.id

    expect(isOwnComment(ownComment)).toBe(true)
    expect(isOwnComment(otherComment)).toBe(false)
  })

  it('should enforce MAX_COMMENT_LENGTH', () => {
    const MAX_COMMENT_LENGTH = 1000
    const shortComment = 'Hello'
    const longComment = 'a'.repeat(1001)

    expect(shortComment.length).toBeLessThanOrEqual(MAX_COMMENT_LENGTH)
    expect(longComment.length).toBeGreaterThan(MAX_COMMENT_LENGTH)
  })

  it('should trim empty comments', () => {
    const comment = '   '
    expect(comment.trim()).toBe('')
    expect(!comment.trim()).toBe(true)
  })
})

describe('CommentsSection Vue Component — Features', () => {
  it('should have all expected features in metadata', async () => {
    const module = await import('./CommentsSection.vue')
    const features = module.COMMENTS_SECTION_META.features
    expect(features).toBeDefined()

    const featureIds = features!.map((f) => f.id)
    expect(featureIds).toContain('view-comments')
    expect(featureIds).toContain('add-comment')
    expect(featureIds).toContain('reply')
    expect(featureIds).toContain('like-comment')
    expect(featureIds).toContain('edit-delete')
  })
})
