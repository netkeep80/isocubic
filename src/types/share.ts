/**
 * TypeScript types for Share Links feature (TASK 46)
 * Defines types for share links, QR codes, and link management
 *
 * This module provides types for:
 * - Share links with unique identifiers
 * - Link visibility and protection settings
 * - QR code generation options
 * - Link analytics and tracking
 * - OG meta tag configuration for social previews
 */

import type { SpectralCube } from './cube'

// ============================================================================
// Share Link Types
// ============================================================================

/**
 * Visibility level for share links
 */
export type ShareLinkVisibility = 'public' | 'unlisted' | 'protected'

/**
 * Link expiration options
 */
export type LinkExpiration =
  | 'never' // Link never expires
  | '1h' // 1 hour
  | '24h' // 24 hours
  | '7d' // 7 days
  | '30d' // 30 days
  | 'custom' // Custom expiration time

/**
 * Share link protection settings
 */
export interface ShareLinkProtection {
  /** Whether password protection is enabled */
  enabled: boolean
  /** Hashed password (using simple hash for mock implementation) */
  passwordHash?: string
  /** Number of allowed accesses (null = unlimited) */
  maxAccessCount?: number | null
  /** Current access count */
  currentAccessCount: number
}

/**
 * OpenGraph meta tags for social sharing preview
 */
export interface OGMetaTags {
  /** Page title */
  title: string
  /** Page description */
  description: string
  /** Preview image URL */
  imageUrl?: string
  /** Content type */
  type: 'website' | 'article'
  /** Site name */
  siteName: string
}

/**
 * QR code configuration
 */
export interface QRCodeConfig {
  /** QR code size in pixels */
  size: number
  /** Error correction level */
  errorCorrectionLevel: 'L' | 'M' | 'Q' | 'H'
  /** Foreground color (hex) */
  foregroundColor: string
  /** Background color (hex) */
  backgroundColor: string
  /** Include logo in center */
  includeLogo: boolean
  /** Output format */
  format: 'svg' | 'png' | 'dataUrl'
}

/**
 * Default QR code configuration
 */
export const DEFAULT_QR_CONFIG: QRCodeConfig = {
  size: 256,
  errorCorrectionLevel: 'M',
  foregroundColor: '#000000',
  backgroundColor: '#ffffff',
  includeLogo: false,
  format: 'svg',
}

/**
 * Share link analytics
 */
export interface ShareLinkAnalytics {
  /** Total number of views */
  totalViews: number
  /** Unique visitors (by session) */
  uniqueVisitors: number
  /** Last accessed timestamp */
  lastAccessedAt?: string
  /** Access history (limited to last 10) */
  accessHistory: ShareLinkAccessEntry[]
}

/**
 * Single access entry for analytics
 */
export interface ShareLinkAccessEntry {
  /** Access timestamp (ISO 8601) */
  timestamp: string
  /** User agent (truncated) */
  userAgent?: string
  /** Referrer (if available) */
  referrer?: string
}

/**
 * A share link for a cube
 */
export interface ShareLink {
  /** Unique identifier (short code) */
  id: string
  /** Full share URL */
  url: string
  /** Short URL for display */
  shortUrl: string
  /** The shared cube configuration */
  cube: SpectralCube
  /** Link visibility */
  visibility: ShareLinkVisibility
  /** Protection settings */
  protection: ShareLinkProtection
  /** Link expiration */
  expiration: LinkExpiration
  /** Custom expiration timestamp (ISO 8601) if expiration is 'custom' */
  expiresAt?: string
  /** Whether the link is currently active */
  isActive: boolean
  /** OpenGraph meta tags */
  ogTags: OGMetaTags
  /** Analytics data */
  analytics: ShareLinkAnalytics
  /** Creation timestamp (ISO 8601) */
  createdAt: string
  /** Creator user ID (if authenticated) */
  createdBy?: string
}

// ============================================================================
// API Request/Response Types
// ============================================================================

/**
 * Request to create a share link
 */
export interface CreateShareLinkRequest {
  /** The cube to share */
  cube: SpectralCube
  /** Link visibility */
  visibility?: ShareLinkVisibility
  /** Password for protected links */
  password?: string
  /** Link expiration */
  expiration?: LinkExpiration
  /** Custom expiration timestamp (ISO 8601) */
  customExpiresAt?: string
  /** Custom OG tags */
  ogTags?: Partial<OGMetaTags>
}

/**
 * Result of creating a share link
 */
export interface CreateShareLinkResult {
  /** Whether the operation succeeded */
  success: boolean
  /** Error message if failed */
  error?: string
  /** The created share link */
  shareLink?: ShareLink
}

/**
 * Request to access a share link
 */
export interface AccessShareLinkRequest {
  /** Share link ID */
  id: string
  /** Password for protected links */
  password?: string
}

/**
 * Result of accessing a share link
 */
export interface AccessShareLinkResult {
  /** Whether access was granted */
  success: boolean
  /** Error message if access denied */
  error?: string
  /** Whether password is required */
  requiresPassword?: boolean
  /** The shared cube (if access granted) */
  cube?: SpectralCube
  /** Share link metadata (if access granted) */
  shareLink?: Omit<ShareLink, 'cube' | 'protection'>
}

/**
 * Result of generating a QR code
 */
export interface QRCodeResult {
  /** Whether generation succeeded */
  success: boolean
  /** Error message if failed */
  error?: string
  /** Generated QR code data (SVG string, PNG data URL, etc.) */
  data?: string
  /** QR code format */
  format?: QRCodeConfig['format']
}

// ============================================================================
// Default Values and Constants
// ============================================================================

/**
 * Default OG meta tags
 */
export const DEFAULT_OG_TAGS: OGMetaTags = {
  title: 'Shared Cube - isocubic',
  description: 'A parametric cube created with isocubic - web editor for isometric 3D worlds',
  type: 'website',
  siteName: 'isocubic',
}

/**
 * Default share link protection
 */
export const DEFAULT_PROTECTION: ShareLinkProtection = {
  enabled: false,
  currentAccessCount: 0,
}

/**
 * Default share link analytics
 */
export const DEFAULT_ANALYTICS: ShareLinkAnalytics = {
  totalViews: 0,
  uniqueVisitors: 0,
  accessHistory: [],
}

/**
 * Storage keys for share links
 */
export const SHARE_STORAGE_KEYS = {
  SHARE_LINKS: 'isocubic_share_links',
  SHARE_LINK_SESSIONS: 'isocubic_share_sessions',
} as const

/**
 * Expiration display information
 */
export const EXPIRATION_INFO: Record<LinkExpiration, { label: string; description: string }> = {
  never: { label: 'Never', description: 'Link never expires' },
  '1h': { label: '1 Hour', description: 'Expires in 1 hour' },
  '24h': { label: '24 Hours', description: 'Expires in 24 hours' },
  '7d': { label: '7 Days', description: 'Expires in 7 days' },
  '30d': { label: '30 Days', description: 'Expires in 30 days' },
  custom: { label: 'Custom', description: 'Set custom expiration date' },
}

/**
 * Visibility display information
 */
export const VISIBILITY_INFO: Record<
  ShareLinkVisibility,
  { label: string; description: string; icon: string }
> = {
  public: {
    label: 'Public',
    description: 'Anyone with the link can access',
    icon: '🌐',
  },
  unlisted: {
    label: 'Unlisted',
    description: 'Only accessible via direct link',
    icon: '🔗',
  },
  protected: {
    label: 'Password Protected',
    description: 'Requires password to access',
    icon: '🔒',
  },
}

// ============================================================================
// Validation and Utility Functions
// ============================================================================

/**
 * Generates a random short code for share links
 */
export function generateShortCode(length: number = 8): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

/**
 * Simple hash function for password protection (not for production security)
 * Uses a basic FNV-1a hash - sufficient for mock implementation
 */
export function simpleHash(str: string): string {
  let hash = 2166136261
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i)
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24)
  }
  return (hash >>> 0).toString(16).padStart(8, '0')
}

/**
 * Validates a share link ID format
 */
export function isValidShareLinkId(id: string): boolean {
  return /^[A-Za-z0-9]{6,12}$/.test(id)
}

/**
 * Calculates expiration timestamp from expiration option
 */
export function calculateExpirationTimestamp(
  expiration: LinkExpiration,
  customDate?: string
): string | undefined {
  if (expiration === 'never') return undefined
  if (expiration === 'custom' && customDate) return customDate

  const now = Date.now()
  const durations: Record<Exclude<LinkExpiration, 'never' | 'custom'>, number> = {
    '1h': 60 * 60 * 1000,
    '24h': 24 * 60 * 60 * 1000,
    '7d': 7 * 24 * 60 * 60 * 1000,
    '30d': 30 * 24 * 60 * 60 * 1000,
  }

  const duration = durations[expiration as keyof typeof durations]
  if (duration) {
    return new Date(now + duration).toISOString()
  }

  return undefined
}

/**
 * Checks if a share link has expired
 */
export function isShareLinkExpired(shareLink: ShareLink): boolean {
  if (!shareLink.expiresAt) return false
  return new Date(shareLink.expiresAt).getTime() < Date.now()
}

/**
 * Checks if a share link has reached its access limit
 */
export function isShareLinkAccessLimitReached(shareLink: ShareLink): boolean {
  const { protection } = shareLink
  if (protection.maxAccessCount === null || protection.maxAccessCount === undefined) {
    return false
  }
  return protection.currentAccessCount >= protection.maxAccessCount
}

/**
 * Formats a share link URL for display
 */
export function formatShareUrl(url: string): string {
  // Remove protocol for display
  return url.replace(/^https?:\/\//, '')
}

/**
 * Generates OG meta tags for a cube
 */
export function generateOGTags(cube: SpectralCube, baseUrl: string): OGMetaTags {
  const name = cube.meta?.name || cube.id
  const prompt = cube.prompt || 'A parametric cube'

  return {
    title: `${name} - isocubic`,
    description: prompt.slice(0, 160),
    type: 'website',
    siteName: 'isocubic',
    imageUrl: `${baseUrl}/api/preview/${cube.id}.png`, // Placeholder for future preview generation
  }
}

/**
 * Builds a complete share URL from base URL and share link ID
 */
export function buildShareUrl(baseUrl: string, shareId: string): string {
  return `${baseUrl}/share/${shareId}`
}
