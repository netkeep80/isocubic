/**
 * Unit tests for share links service (TASK 46)
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { shareLinkService, generateQRCode } from './share-links'
import type { SpectralCube } from '../types/cube'
import type { ShareLink, CreateShareLinkRequest } from '../types/share'

// Mock localStorage
const mockLocalStorage = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key]
    }),
    clear: vi.fn(() => {
      store = {}
    }),
  }
})()

// Mock sessionStorage
const mockSessionStorage = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key]
    }),
    clear: vi.fn(() => {
      store = {}
    }),
  }
})()

// Mock navigator.clipboard
const mockClipboard = {
  writeText: vi.fn().mockResolvedValue(undefined),
}

Object.defineProperty(window, 'localStorage', { value: mockLocalStorage })
Object.defineProperty(window, 'sessionStorage', { value: mockSessionStorage })
Object.defineProperty(navigator, 'clipboard', { value: mockClipboard, writable: true })

// Sample cube for testing
const sampleCube: SpectralCube = {
  id: 'test-cube-1',
  base: { color: [0.5, 0.5, 0.5], roughness: 0.7, transparency: 1.0 },
  prompt: 'A test cube for sharing',
  meta: { name: 'Test Cube', tags: ['test', 'sample'] },
}

// ============================================================================
// shareLinkService Tests
// ============================================================================

describe('shareLinkService', () => {
  beforeEach(() => {
    // Reset mock storage
    mockLocalStorage.clear()
    mockSessionStorage.clear()
    // Reset service mock data
    shareLinkService._resetMockData()
    // Reset clipboard mock
    mockClipboard.writeText.mockReset()
    mockClipboard.writeText.mockResolvedValue(undefined)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  // --------------------------------------------------------------------------
  // createShareLink Tests
  // --------------------------------------------------------------------------

  describe('createShareLink', () => {
    it('creates a public share link successfully', async () => {
      const request: CreateShareLinkRequest = {
        cube: sampleCube,
        visibility: 'public',
      }

      const result = await shareLinkService.createShareLink(request)

      expect(result.success).toBe(true)
      expect(result.shareLink).toBeDefined()
      expect(result.shareLink!.id).toHaveLength(8)
      expect(result.shareLink!.visibility).toBe('public')
      expect(result.shareLink!.isActive).toBe(true)
      expect(result.shareLink!.cube.id).toBe(sampleCube.id)
    })

    it('creates an unlisted share link', async () => {
      const result = await shareLinkService.createShareLink({
        cube: sampleCube,
        visibility: 'unlisted',
      })

      expect(result.success).toBe(true)
      expect(result.shareLink!.visibility).toBe('unlisted')
    })

    it('creates a password-protected share link', async () => {
      const result = await shareLinkService.createShareLink({
        cube: sampleCube,
        visibility: 'protected',
        password: 'secret123',
      })

      expect(result.success).toBe(true)
      expect(result.shareLink!.visibility).toBe('protected')
      expect(result.shareLink!.protection.enabled).toBe(true)
      expect(result.shareLink!.protection.passwordHash).toBeDefined()
    })

    it('creates share link with expiration', async () => {
      const result = await shareLinkService.createShareLink({
        cube: sampleCube,
        expiration: '24h',
      })

      expect(result.success).toBe(true)
      expect(result.shareLink!.expiration).toBe('24h')
      expect(result.shareLink!.expiresAt).toBeDefined()
    })

    it('creates share link without expiration (never)', async () => {
      const result = await shareLinkService.createShareLink({
        cube: sampleCube,
        expiration: 'never',
      })

      expect(result.success).toBe(true)
      expect(result.shareLink!.expiration).toBe('never')
      expect(result.shareLink!.expiresAt).toBeUndefined()
    })

    it('generates valid URLs', async () => {
      const result = await shareLinkService.createShareLink({ cube: sampleCube })

      expect(result.shareLink!.url).toContain('/share/')
      expect(result.shareLink!.shortUrl).toContain('/s/')
      expect(result.shareLink!.url).toContain(result.shareLink!.id)
    })

    it('initializes analytics correctly', async () => {
      const result = await shareLinkService.createShareLink({ cube: sampleCube })

      expect(result.shareLink!.analytics.totalViews).toBe(0)
      expect(result.shareLink!.analytics.uniqueVisitors).toBe(0)
      expect(result.shareLink!.analytics.accessHistory).toEqual([])
    })

    it('generates OG tags', async () => {
      const result = await shareLinkService.createShareLink({ cube: sampleCube })

      expect(result.shareLink!.ogTags.title).toContain('Test Cube')
      expect(result.shareLink!.ogTags.siteName).toBe('isocubic')
    })

    it('allows custom OG tags', async () => {
      const result = await shareLinkService.createShareLink({
        cube: sampleCube,
        ogTags: { title: 'Custom Title' },
      })

      expect(result.shareLink!.ogTags.title).toBe('Custom Title')
    })

    it('generates unique IDs for multiple links', async () => {
      const ids = new Set<string>()

      for (let i = 0; i < 10; i++) {
        const result = await shareLinkService.createShareLink({ cube: sampleCube })
        ids.add(result.shareLink!.id)
      }

      expect(ids.size).toBe(10)
    })
  })

  // --------------------------------------------------------------------------
  // accessShareLink Tests
  // --------------------------------------------------------------------------

  describe('accessShareLink', () => {
    let createdLink: ShareLink

    beforeEach(async () => {
      const result = await shareLinkService.createShareLink({ cube: sampleCube })
      createdLink = result.shareLink!
    })

    it('accesses a public link successfully', async () => {
      const result = await shareLinkService.accessShareLink({ id: createdLink.id })

      expect(result.success).toBe(true)
      expect(result.cube).toBeDefined()
      expect(result.cube!.id).toBe(sampleCube.id)
    })

    it('returns error for non-existent link', async () => {
      const result = await shareLinkService.accessShareLink({ id: 'nonexistent' })

      expect(result.success).toBe(false)
      expect(result.error).toContain('not found')
    })

    it('requires password for protected link', async () => {
      const protectedResult = await shareLinkService.createShareLink({
        cube: sampleCube,
        visibility: 'protected',
        password: 'secret123',
      })

      const accessResult = await shareLinkService.accessShareLink({
        id: protectedResult.shareLink!.id,
      })

      expect(accessResult.success).toBe(false)
      expect(accessResult.requiresPassword).toBe(true)
    })

    it('grants access with correct password', async () => {
      const protectedResult = await shareLinkService.createShareLink({
        cube: sampleCube,
        visibility: 'protected',
        password: 'secret123',
      })

      const accessResult = await shareLinkService.accessShareLink({
        id: protectedResult.shareLink!.id,
        password: 'secret123',
      })

      expect(accessResult.success).toBe(true)
      expect(accessResult.cube).toBeDefined()
    })

    it('denies access with wrong password', async () => {
      const protectedResult = await shareLinkService.createShareLink({
        cube: sampleCube,
        visibility: 'protected',
        password: 'secret123',
      })

      const accessResult = await shareLinkService.accessShareLink({
        id: protectedResult.shareLink!.id,
        password: 'wrongpassword',
      })

      expect(accessResult.success).toBe(false)
      expect(accessResult.error).toContain('Incorrect password')
    })

    it('updates analytics on access', async () => {
      await shareLinkService.accessShareLink({ id: createdLink.id })
      await shareLinkService.accessShareLink({ id: createdLink.id })

      const link = await shareLinkService.getShareLink(createdLink.id)

      expect(link!.analytics.totalViews).toBe(2)
    })

    it('tracks unique visitors', async () => {
      // Access from same session twice
      await shareLinkService.accessShareLink({ id: createdLink.id })
      await shareLinkService.accessShareLink({ id: createdLink.id })

      const link = await shareLinkService.getShareLink(createdLink.id)

      // Should count as 1 unique visitor
      expect(link!.analytics.uniqueVisitors).toBe(1)
    })

    it('denies access to inactive link', async () => {
      await shareLinkService.deactivateShareLink(createdLink.id)

      const result = await shareLinkService.accessShareLink({ id: createdLink.id })

      expect(result.success).toBe(false)
      expect(result.error).toContain('deactivated')
    })

    it('denies access to expired link', async () => {
      // Create a link with past expiration
      const expiredResult = await shareLinkService.createShareLink({
        cube: sampleCube,
        expiration: '1h',
      })

      // Manually set expiration to past
      const link = await shareLinkService.getShareLink(expiredResult.shareLink!.id)
      link!.expiresAt = new Date(Date.now() - 1000).toISOString()

      const result = await shareLinkService.accessShareLink({
        id: expiredResult.shareLink!.id,
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain('expired')
    })

    it('updates access history', async () => {
      // Reset and create a completely fresh link to test access history
      shareLinkService._resetMockData()
      mockSessionStorage.clear() // Clear session too

      const freshResult = await shareLinkService.createShareLink({ cube: sampleCube })
      const freshLink = freshResult.shareLink!

      // Verify link starts with empty history
      expect(freshLink.analytics.accessHistory.length).toBe(0)

      await shareLinkService.accessShareLink({ id: freshLink.id })

      const link = await shareLinkService.getShareLink(freshLink.id)

      expect(link!.analytics.accessHistory.length).toBe(1)
      expect(link!.analytics.accessHistory[0].timestamp).toBeDefined()
    })

    it('limits access history entries', async () => {
      // Access 15 times
      for (let i = 0; i < 15; i++) {
        mockSessionStorage.clear() // Clear session to create new visitor
        await shareLinkService.accessShareLink({ id: createdLink.id })
      }

      const link = await shareLinkService.getShareLink(createdLink.id)

      // Should be limited to MAX_ACCESS_HISTORY (10)
      expect(link!.analytics.accessHistory.length).toBeLessThanOrEqual(10)
    })
  })

  // --------------------------------------------------------------------------
  // getShareLink Tests
  // --------------------------------------------------------------------------

  describe('getShareLink', () => {
    it('retrieves existing link', async () => {
      const createResult = await shareLinkService.createShareLink({ cube: sampleCube })
      const link = await shareLinkService.getShareLink(createResult.shareLink!.id)

      expect(link).toBeDefined()
      expect(link!.id).toBe(createResult.shareLink!.id)
    })

    it('returns null for non-existent link', async () => {
      const link = await shareLinkService.getShareLink('nonexistent')
      expect(link).toBeNull()
    })
  })

  // --------------------------------------------------------------------------
  // getUserShareLinks Tests
  // --------------------------------------------------------------------------

  describe('getUserShareLinks', () => {
    it('returns empty array when no links', async () => {
      const links = await shareLinkService.getUserShareLinks()
      expect(links).toEqual([])
    })

    it('returns all created links', async () => {
      await shareLinkService.createShareLink({ cube: sampleCube })
      await shareLinkService.createShareLink({ cube: sampleCube })
      await shareLinkService.createShareLink({ cube: sampleCube })

      const links = await shareLinkService.getUserShareLinks()

      expect(links.length).toBe(3)
    })

    it('sorts links by creation date (newest first)', async () => {
      await shareLinkService.createShareLink({ cube: sampleCube })
      await new Promise((r) => setTimeout(r, 10)) // Small delay
      await shareLinkService.createShareLink({ cube: sampleCube })

      const links = await shareLinkService.getUserShareLinks()

      expect(new Date(links[0].createdAt).getTime()).toBeGreaterThanOrEqual(
        new Date(links[1].createdAt).getTime()
      )
    })
  })

  // --------------------------------------------------------------------------
  // updateShareLink Tests
  // --------------------------------------------------------------------------

  describe('updateShareLink', () => {
    let createdLink: ShareLink

    beforeEach(async () => {
      const result = await shareLinkService.createShareLink({ cube: sampleCube })
      createdLink = result.shareLink!
    })

    it('updates link active status', async () => {
      const result = await shareLinkService.updateShareLink(createdLink.id, { isActive: false })

      expect(result.success).toBe(true)
      expect(result.shareLink!.isActive).toBe(false)
    })

    it('updates link visibility', async () => {
      const result = await shareLinkService.updateShareLink(createdLink.id, {
        visibility: 'unlisted',
      })

      expect(result.success).toBe(true)
      expect(result.shareLink!.visibility).toBe('unlisted')
    })

    it('updates link expiration', async () => {
      const result = await shareLinkService.updateShareLink(createdLink.id, { expiration: '7d' })

      expect(result.success).toBe(true)
      expect(result.shareLink!.expiration).toBe('7d')
      expect(result.shareLink!.expiresAt).toBeDefined()
    })

    it('returns error for non-existent link', async () => {
      const result = await shareLinkService.updateShareLink('nonexistent', { isActive: false })

      expect(result.success).toBe(false)
      expect(result.error).toContain('not found')
    })
  })

  // --------------------------------------------------------------------------
  // deleteShareLink Tests
  // --------------------------------------------------------------------------

  describe('deleteShareLink', () => {
    it('deletes existing link', async () => {
      const createResult = await shareLinkService.createShareLink({ cube: sampleCube })
      const deleteResult = await shareLinkService.deleteShareLink(createResult.shareLink!.id)

      expect(deleteResult.success).toBe(true)

      const link = await shareLinkService.getShareLink(createResult.shareLink!.id)
      expect(link).toBeNull()
    })

    it('returns error for non-existent link', async () => {
      const result = await shareLinkService.deleteShareLink('nonexistent')

      expect(result.success).toBe(false)
      expect(result.error).toContain('not found')
    })
  })

  // --------------------------------------------------------------------------
  // deactivateShareLink Tests
  // --------------------------------------------------------------------------

  describe('deactivateShareLink', () => {
    it('deactivates link', async () => {
      const createResult = await shareLinkService.createShareLink({ cube: sampleCube })
      const deactivateResult = await shareLinkService.deactivateShareLink(
        createResult.shareLink!.id
      )

      expect(deactivateResult.success).toBe(true)
      expect(deactivateResult.shareLink!.isActive).toBe(false)
    })
  })

  // --------------------------------------------------------------------------
  // copyToClipboard Tests
  // --------------------------------------------------------------------------

  describe('copyToClipboard', () => {
    it('copies URL to clipboard', async () => {
      const createResult = await shareLinkService.createShareLink({ cube: sampleCube })
      const copyResult = await shareLinkService.copyToClipboard(createResult.shareLink!)

      expect(copyResult.success).toBe(true)
      expect(mockClipboard.writeText).toHaveBeenCalledWith(createResult.shareLink!.url)
    })

    it('handles clipboard error', async () => {
      mockClipboard.writeText.mockRejectedValue(new Error('Clipboard error'))

      const createResult = await shareLinkService.createShareLink({ cube: sampleCube })
      const copyResult = await shareLinkService.copyToClipboard(createResult.shareLink!)

      expect(copyResult.success).toBe(false)
      expect(copyResult.error).toContain('Clipboard error')
    })
  })

  // --------------------------------------------------------------------------
  // getAnalytics Tests
  // --------------------------------------------------------------------------

  describe('getAnalytics', () => {
    it('returns analytics for existing link', async () => {
      const createResult = await shareLinkService.createShareLink({ cube: sampleCube })
      await shareLinkService.accessShareLink({ id: createResult.shareLink!.id })

      const analytics = await shareLinkService.getAnalytics(createResult.shareLink!.id)

      expect(analytics).toBeDefined()
      expect(analytics!.totalViews).toBe(1)
    })

    it('returns null for non-existent link', async () => {
      const analytics = await shareLinkService.getAnalytics('nonexistent')
      expect(analytics).toBeNull()
    })
  })

  // --------------------------------------------------------------------------
  // generateQRCode (service method) Tests
  // --------------------------------------------------------------------------

  describe('generateQRCode (service method)', () => {
    it('generates QR code for share link', async () => {
      const createResult = await shareLinkService.createShareLink({ cube: sampleCube })
      const qrResult = await shareLinkService.generateQRCode(createResult.shareLink!)

      expect(qrResult.success).toBe(true)
      expect(qrResult.data).toContain('<svg')
    })

    it('accepts custom config', async () => {
      const createResult = await shareLinkService.createShareLink({ cube: sampleCube })
      const qrResult = await shareLinkService.generateQRCode(createResult.shareLink!, {
        size: 128,
        foregroundColor: '#ff0000',
      })

      expect(qrResult.success).toBe(true)
      expect(qrResult.data).toContain('#ff0000')
    })
  })
})

// ============================================================================
// generateQRCode Function Tests
// ============================================================================

describe('generateQRCode', () => {
  it('generates SVG QR code', async () => {
    const result = await generateQRCode('https://example.com/share/abc123')

    expect(result.success).toBe(true)
    expect(result.data).toContain('<svg')
    expect(result.format).toBe('svg')
  })

  it('generates data URL format', async () => {
    const result = await generateQRCode('https://example.com/share/abc123', {
      format: 'dataUrl',
    })

    expect(result.success).toBe(true)
    expect(result.data).toContain('data:image/svg+xml;base64,')
    expect(result.format).toBe('dataUrl')
  })

  it('respects custom colors', async () => {
    const result = await generateQRCode('https://example.com', {
      foregroundColor: '#0000ff',
      backgroundColor: '#ffff00',
    })

    expect(result.success).toBe(true)
    expect(result.data).toContain('#0000ff')
    expect(result.data).toContain('#ffff00')
  })

  it('respects custom size', async () => {
    const result = await generateQRCode('https://example.com', { size: 512 })

    expect(result.success).toBe(true)
    expect(result.data).toContain('width="512"')
    expect(result.data).toContain('height="512"')
  })

  it('generates deterministic output for same input', async () => {
    const result1 = await generateQRCode('https://example.com/test')
    const result2 = await generateQRCode('https://example.com/test')

    expect(result1.data).toBe(result2.data)
  })

  it('generates different output for different inputs', async () => {
    const result1 = await generateQRCode('https://example.com/test1')
    const result2 = await generateQRCode('https://example.com/test2')

    expect(result1.data).not.toBe(result2.data)
  })
})

// ============================================================================
// Persistence Tests
// ============================================================================

describe('Persistence', () => {
  it('saves links to localStorage', async () => {
    await shareLinkService.createShareLink({ cube: sampleCube })

    expect(mockLocalStorage.setItem).toHaveBeenCalled()
    expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
      'isocubic_share_links',
      expect.any(String)
    )
  })

  it('maintains data after reset and reload', async () => {
    // Create a link
    const createResult = await shareLinkService.createShareLink({ cube: sampleCube })
    const linkId = createResult.shareLink!.id
    const linkData = createResult.shareLink!

    // Verify link exists
    const linkBeforeReset = await shareLinkService.getShareLink(linkId)
    expect(linkBeforeReset).toBeDefined()

    // Reset service
    shareLinkService._resetMockData()

    // Verify link is gone after reset
    const linkAfterReset = await shareLinkService.getShareLink(linkId)
    expect(linkAfterReset).toBeNull()

    // Simulate reload by setting data back directly
    shareLinkService._setMockData([linkData])

    // Verify link is back
    const linkAfterReload = await shareLinkService.getShareLink(linkId)
    expect(linkAfterReload).toBeDefined()
    expect(linkAfterReload!.id).toBe(linkId)
  })
})

// ============================================================================
// Edge Cases Tests
// ============================================================================

describe('Edge Cases', () => {
  it('handles cube without meta', async () => {
    const cubeWithoutMeta: SpectralCube = {
      id: 'minimal-cube',
      base: { color: [1, 1, 1], roughness: 0.5, transparency: 1 },
    }

    const result = await shareLinkService.createShareLink({ cube: cubeWithoutMeta })

    expect(result.success).toBe(true)
    expect(result.shareLink!.ogTags.title).toContain('minimal-cube')
  })

  it('handles cube without prompt', async () => {
    const cubeWithoutPrompt: SpectralCube = {
      id: 'no-prompt-cube',
      base: { color: [1, 1, 1], roughness: 0.5, transparency: 1 },
    }

    const result = await shareLinkService.createShareLink({ cube: cubeWithoutPrompt })

    expect(result.success).toBe(true)
    expect(result.shareLink!.ogTags.description).toBeDefined()
  })

  it('handles empty password for protected link', async () => {
    const result = await shareLinkService.createShareLink({
      cube: sampleCube,
      visibility: 'protected',
      password: '',
    })

    expect(result.success).toBe(true)
    // Empty password should not enable protection
    expect(result.shareLink!.protection.enabled).toBe(false)
  })

  it('handles concurrent link creation', async () => {
    const promises = Array(5)
      .fill(null)
      .map(() => shareLinkService.createShareLink({ cube: sampleCube }))

    const results = await Promise.all(promises)

    const ids = new Set(results.map((r) => r.shareLink!.id))
    expect(ids.size).toBe(5) // All unique IDs
  })
})
