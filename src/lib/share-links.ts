/**
 * Share Links Service (TASK 46)
 * Provides API for creating, managing, and accessing share links for cubes
 *
 * Current implementation: Mock service with localStorage persistence
 * Future: Replace with real API calls to backend (Supabase/Firebase)
 */

import type {
  ShareLink,
  ShareLinkVisibility,
  ShareLinkProtection,
  LinkExpiration,
  OGMetaTags,
  ShareLinkAnalytics,
  CreateShareLinkRequest,
  CreateShareLinkResult,
  AccessShareLinkRequest,
  AccessShareLinkResult,
  QRCodeConfig,
  QRCodeResult,
} from '../types/share'
import {
  DEFAULT_OG_TAGS,
  DEFAULT_PROTECTION,
  SHARE_STORAGE_KEYS,
  generateShortCode,
  simpleHash,
  calculateExpirationTimestamp,
  isShareLinkExpired,
  isShareLinkAccessLimitReached,
  buildShareUrl,
  generateOGTags,
  DEFAULT_QR_CONFIG,
} from '../types/share'

// ============================================================================
// Configuration
// ============================================================================

/** Base URL for share links (configurable for different environments) */
const BASE_URL = typeof window !== 'undefined' ? window.location.origin : 'https://isocubic.app'

/** Maximum number of share links stored per user */
const MAX_SHARE_LINKS = 100

/** Maximum access history entries per link */
const MAX_ACCESS_HISTORY = 10

// ============================================================================
// In-Memory Mock Database
// ============================================================================

/** Map of share links by ID */
let shareLinkDatabase: Map<string, ShareLink> = new Map()

/** Set of unique visitor session IDs (for analytics) */
let visitorSessions: Set<string> = new Set()

/**
 * Loads share links from localStorage
 */
function loadShareLinks(): void {
  try {
    const stored = localStorage.getItem(SHARE_STORAGE_KEYS.SHARE_LINKS)
    if (stored) {
      const links: ShareLink[] = JSON.parse(stored)
      shareLinkDatabase = new Map(links.map((link) => [link.id, link]))
    }

    const sessions = localStorage.getItem(SHARE_STORAGE_KEYS.SHARE_LINK_SESSIONS)
    if (sessions) {
      visitorSessions = new Set(JSON.parse(sessions))
    }
  } catch {
    shareLinkDatabase = new Map()
    visitorSessions = new Set()
  }
}

/**
 * Saves share links to localStorage
 */
function saveShareLinks(): void {
  try {
    const links = Array.from(shareLinkDatabase.values())
    localStorage.setItem(SHARE_STORAGE_KEYS.SHARE_LINKS, JSON.stringify(links))
    localStorage.setItem(
      SHARE_STORAGE_KEYS.SHARE_LINK_SESSIONS,
      JSON.stringify(Array.from(visitorSessions))
    )
  } catch {
    // Ignore storage errors (quota exceeded, etc.)
  }
}

// Initialize from storage
loadShareLinks()

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Simulates network delay for realistic async behavior
 */
async function simulateNetworkDelay(ms: number = 200): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Generates a unique session ID for visitor tracking
 */
function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Gets or creates a session ID for the current visitor
 */
function getOrCreateSessionId(): string {
  const sessionKey = 'isocubic_visitor_session'
  let sessionId = sessionStorage.getItem(sessionKey)
  if (!sessionId) {
    sessionId = generateSessionId()
    sessionStorage.setItem(sessionKey, sessionId)
  }
  return sessionId
}

// ============================================================================
// QR Code Generation
// ============================================================================

/**
 * Simple QR code generator using SVG
 * Implements a basic QR code matrix generation algorithm
 * For production, consider using a library like qrcode or qr.js
 */
function generateQRMatrix(data: string, errorLevel: 'L' | 'M' | 'Q' | 'H'): boolean[][] {
  // This is a simplified QR code generation
  // For a real implementation, use a proper QR code library
  // Here we create a placeholder pattern that visually resembles a QR code

  const size = 25 // Standard QR code size for short URLs
  const matrix: boolean[][] = []

  // Initialize matrix
  for (let i = 0; i < size; i++) {
    matrix[i] = new Array(size).fill(false)
  }

  // Add finder patterns (corners)
  const addFinderPattern = (row: number, col: number) => {
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < 7; c++) {
        if (r === 0 || r === 6 || c === 0 || c === 6 || (r >= 2 && r <= 4 && c >= 2 && c <= 4)) {
          if (row + r < size && col + c < size) {
            matrix[row + r][col + c] = true
          }
        }
      }
    }
  }

  // Add finder patterns to corners
  addFinderPattern(0, 0) // Top-left
  addFinderPattern(0, size - 7) // Top-right
  addFinderPattern(size - 7, 0) // Bottom-left

  // Add timing patterns
  for (let i = 8; i < size - 8; i++) {
    matrix[6][i] = i % 2 === 0
    matrix[i][6] = i % 2 === 0
  }

  // Add data area with hash of the input data
  // This creates a pseudo-random but deterministic pattern
  const dataHash = simpleHash(data + errorLevel)
  let hashIndex = 0

  for (let row = 8; row < size - 8; row++) {
    for (let col = 8; col < size - 8; col++) {
      if (row !== 6 && col !== 6) {
        // Use hash to determine module state
        const charCode = dataHash.charCodeAt(hashIndex % dataHash.length)
        matrix[row][col] = (charCode + row + col) % 3 === 0
        hashIndex++
      }
    }
  }

  return matrix
}

/**
 * Converts QR matrix to SVG string
 */
function matrixToSVG(matrix: boolean[][], size: number, fgColor: string, bgColor: string): string {
  const moduleSize = size / matrix.length
  let pathData = ''

  for (let row = 0; row < matrix.length; row++) {
    for (let col = 0; col < matrix[row].length; col++) {
      if (matrix[row][col]) {
        const x = col * moduleSize
        const y = row * moduleSize
        pathData += `M${x},${y}h${moduleSize}v${moduleSize}h-${moduleSize}z`
      }
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
  <rect width="${size}" height="${size}" fill="${bgColor}"/>
  <path d="${pathData}" fill="${fgColor}"/>
</svg>`
}

/**
 * Generates a QR code for a share link
 */
export async function generateQRCode(
  url: string,
  config: Partial<QRCodeConfig> = {}
): Promise<QRCodeResult> {
  await simulateNetworkDelay(100)

  try {
    const mergedConfig: QRCodeConfig = { ...DEFAULT_QR_CONFIG, ...config }

    const matrix = generateQRMatrix(url, mergedConfig.errorCorrectionLevel)
    const svg = matrixToSVG(
      matrix,
      mergedConfig.size,
      mergedConfig.foregroundColor,
      mergedConfig.backgroundColor
    )

    if (mergedConfig.format === 'dataUrl') {
      const base64 = btoa(svg)
      return {
        success: true,
        data: `data:image/svg+xml;base64,${base64}`,
        format: 'dataUrl',
      }
    }

    return {
      success: true,
      data: svg,
      format: 'svg',
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate QR code',
    }
  }
}

// ============================================================================
// Share Links Service
// ============================================================================

/**
 * Share Links Service API
 */
export const shareLinkService = {
  /**
   * Creates a new share link for a cube
   */
  async createShareLink(request: CreateShareLinkRequest): Promise<CreateShareLinkResult> {
    await simulateNetworkDelay(300)

    try {
      // Check link limit
      if (shareLinkDatabase.size >= MAX_SHARE_LINKS) {
        // Remove oldest links
        const sortedLinks = Array.from(shareLinkDatabase.values()).sort(
          (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        )
        const toRemove = sortedLinks.slice(0, 10) // Remove 10 oldest
        toRemove.forEach((link) => shareLinkDatabase.delete(link.id))
      }

      // Generate unique ID
      let id: string
      do {
        id = generateShortCode(8)
      } while (shareLinkDatabase.has(id))

      const visibility: ShareLinkVisibility = request.visibility || 'public'
      const expiration: LinkExpiration = request.expiration || 'never'

      // Setup protection
      const protection: ShareLinkProtection = {
        ...DEFAULT_PROTECTION,
        enabled: visibility === 'protected' && !!request.password,
        passwordHash: request.password ? simpleHash(request.password) : undefined,
      }

      // Calculate expiration
      const expiresAt = calculateExpirationTimestamp(expiration, request.customExpiresAt)

      // Generate OG tags
      const ogTags: OGMetaTags = {
        ...DEFAULT_OG_TAGS,
        ...generateOGTags(request.cube, BASE_URL),
        ...request.ogTags,
      }

      // Build URLs
      const url = buildShareUrl(BASE_URL, id)
      const shortUrl = `${BASE_URL}/s/${id}`

      // Create share link with fresh analytics (deep copy to avoid shared array)
      const shareLink: ShareLink = {
        id,
        url,
        shortUrl,
        cube: request.cube,
        visibility,
        protection,
        expiration,
        expiresAt,
        isActive: true,
        ogTags,
        analytics: {
          totalViews: 0,
          uniqueVisitors: 0,
          accessHistory: [],
        },
        createdAt: new Date().toISOString(),
      }

      // Store link
      shareLinkDatabase.set(id, shareLink)
      saveShareLinks()

      return {
        success: true,
        shareLink,
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create share link',
      }
    }
  },

  /**
   * Accesses a share link and returns the cube if authorized
   */
  async accessShareLink(request: AccessShareLinkRequest): Promise<AccessShareLinkResult> {
    await simulateNetworkDelay(150)

    try {
      const shareLink = shareLinkDatabase.get(request.id)

      if (!shareLink) {
        return { success: false, error: 'Share link not found' }
      }

      // Check if link is active
      if (!shareLink.isActive) {
        return { success: false, error: 'This share link has been deactivated' }
      }

      // Check expiration
      if (isShareLinkExpired(shareLink)) {
        return { success: false, error: 'This share link has expired' }
      }

      // Check access limit
      if (isShareLinkAccessLimitReached(shareLink)) {
        return { success: false, error: 'This share link has reached its access limit' }
      }

      // Check password protection
      if (shareLink.protection.enabled) {
        if (!request.password) {
          return { success: false, requiresPassword: true, error: 'Password required' }
        }

        const passwordHash = simpleHash(request.password)
        if (passwordHash !== shareLink.protection.passwordHash) {
          return { success: false, requiresPassword: true, error: 'Incorrect password' }
        }
      }

      // Update analytics
      const sessionId = getOrCreateSessionId()
      const isNewVisitor = !visitorSessions.has(`${request.id}_${sessionId}`)

      shareLink.analytics.totalViews += 1
      if (isNewVisitor) {
        shareLink.analytics.uniqueVisitors += 1
        visitorSessions.add(`${request.id}_${sessionId}`)
      }

      shareLink.analytics.lastAccessedAt = new Date().toISOString()

      // Add to access history
      const accessEntry = {
        timestamp: new Date().toISOString(),
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 100) : undefined,
        referrer: typeof document !== 'undefined' ? document.referrer || undefined : undefined,
      }
      shareLink.analytics.accessHistory.unshift(accessEntry)
      shareLink.analytics.accessHistory = shareLink.analytics.accessHistory.slice(
        0,
        MAX_ACCESS_HISTORY
      )

      // Update protection access count
      shareLink.protection.currentAccessCount += 1

      // Save updates
      saveShareLinks()

      // Return result without sensitive data
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { cube, protection: _protection, ...metadata } = shareLink

      return {
        success: true,
        cube,
        shareLink: metadata,
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to access share link',
      }
    }
  },

  /**
   * Gets a share link by ID (for owners)
   */
  async getShareLink(id: string): Promise<ShareLink | null> {
    await simulateNetworkDelay(100)
    return shareLinkDatabase.get(id) || null
  },

  /**
   * Gets all share links for the current user
   */
  async getUserShareLinks(): Promise<ShareLink[]> {
    await simulateNetworkDelay(200)
    return Array.from(shareLinkDatabase.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
  },

  /**
   * Updates a share link
   */
  async updateShareLink(
    id: string,
    updates: Partial<Pick<ShareLink, 'isActive' | 'visibility' | 'expiration' | 'expiresAt'>>
  ): Promise<CreateShareLinkResult> {
    await simulateNetworkDelay(200)

    const shareLink = shareLinkDatabase.get(id)
    if (!shareLink) {
      return { success: false, error: 'Share link not found' }
    }

    // Apply updates
    Object.assign(shareLink, updates)

    // Recalculate expiration if changed
    if (updates.expiration && updates.expiration !== 'custom') {
      shareLink.expiresAt = calculateExpirationTimestamp(updates.expiration)
    }

    saveShareLinks()

    return { success: true, shareLink }
  },

  /**
   * Deletes a share link
   */
  async deleteShareLink(id: string): Promise<{ success: boolean; error?: string }> {
    await simulateNetworkDelay(150)

    if (!shareLinkDatabase.has(id)) {
      return { success: false, error: 'Share link not found' }
    }

    shareLinkDatabase.delete(id)
    saveShareLinks()

    return { success: true }
  },

  /**
   * Deactivates a share link (soft delete)
   */
  async deactivateShareLink(id: string): Promise<CreateShareLinkResult> {
    return this.updateShareLink(id, { isActive: false })
  },

  /**
   * Generates a QR code for a share link
   */
  async generateQRCode(
    shareLink: ShareLink,
    config?: Partial<QRCodeConfig>
  ): Promise<QRCodeResult> {
    return generateQRCode(shareLink.url, config)
  },

  /**
   * Copies share link URL to clipboard
   */
  async copyToClipboard(shareLink: ShareLink): Promise<{ success: boolean; error?: string }> {
    try {
      await navigator.clipboard.writeText(shareLink.url)
      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to copy to clipboard',
      }
    }
  },

  /**
   * Gets share link analytics
   */
  async getAnalytics(id: string): Promise<ShareLinkAnalytics | null> {
    await simulateNetworkDelay(100)
    const shareLink = shareLinkDatabase.get(id)
    return shareLink?.analytics || null
  },

  /**
   * Resets mock data (for testing)
   */
  _resetMockData(): void {
    shareLinkDatabase.clear()
    visitorSessions.clear()
    saveShareLinks()
  },

  /**
   * Gets current mock data (for testing)
   */
  _getMockData(): Map<string, ShareLink> {
    return shareLinkDatabase
  },

  /**
   * Sets mock data directly (for testing)
   */
  _setMockData(links: ShareLink[]): void {
    shareLinkDatabase = new Map(links.map((link) => [link.id, link]))
    saveShareLinks()
  },
}

export default shareLinkService
