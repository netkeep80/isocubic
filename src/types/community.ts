/**
 * TypeScript types for Community Gallery feature (TASK 45)
 * Defines types for published cubes, user interactions, and gallery operations
 *
 * This module provides types for:
 * - Published cubes with author information and metadata
 * - Social features (likes, views, comments)
 * - Search and filtering parameters
 * - Sorting options
 * - API response types
 */

import type { SpectralCube, MaterialType } from './cube'
// Note: UserProfile is intentionally not imported here as it's used by the service, not the types

// ============================================================================
// Published Cube Types
// ============================================================================

/**
 * Status of a published cube
 */
export type PublishedCubeStatus = 'published' | 'draft' | 'under_review' | 'rejected'

/**
 * Visibility level for published cubes
 */
export type CubeVisibility = 'public' | 'unlisted' | 'private'

/**
 * Cube category for community organization
 */
export type CubeCategory =
  | 'nature' // grass, stone, wood, etc.
  | 'building' // brick, concrete, tiles, etc.
  | 'fantasy' // magical, crystal, energy, etc.
  | 'industrial' // metal, rust, pipes, etc.
  | 'organic' // flesh, plants, creatures, etc.
  | 'abstract' // patterns, gradients, artistic
  | 'other' // uncategorized

/**
 * Compact author information for published cubes
 */
export interface CubeAuthor {
  /** User ID */
  id: string
  /** Display name */
  displayName: string
  /** Avatar URL */
  avatarUrl?: string
}

/**
 * Statistics for a published cube
 */
export interface CubeStats {
  /** Number of views */
  views: number
  /** Number of likes */
  likes: number
  /** Number of downloads/uses */
  downloads: number
  /** Number of comments */
  comments: number
}

/**
 * A cube published to the community gallery
 */
export interface PublishedCube {
  /** Unique identifier for the published cube */
  id: string
  /** The actual cube configuration */
  cube: SpectralCube
  /** Author information */
  author: CubeAuthor
  /** Publication status */
  status: PublishedCubeStatus
  /** Visibility level */
  visibility: CubeVisibility
  /** Category for organization */
  category: CubeCategory
  /** Community statistics */
  stats: CubeStats
  /** Whether the current user has liked this cube */
  isLiked?: boolean
  /** Publication timestamp (ISO 8601) */
  publishedAt: string
  /** Last update timestamp (ISO 8601) */
  updatedAt: string
  /** Featured on home page */
  isFeatured?: boolean
  /** Staff pick badge */
  isStaffPick?: boolean
}

// ============================================================================
// Search and Filter Types
// ============================================================================

/**
 * Sorting options for community gallery
 */
export type CommunitySortOption =
  | 'recent' // Most recently published
  | 'popular' // Most liked
  | 'trending' // Popular in last 7 days
  | 'downloads' // Most downloaded
  | 'views' // Most viewed
  | 'alphabetical' // A-Z by name

/**
 * Time range filter
 */
export type TimeRangeFilter = 'all' | 'today' | 'week' | 'month' | 'year'

/**
 * Search and filter parameters for community gallery
 */
export interface CommunityGalleryFilters {
  /** Text search query */
  query?: string
  /** Filter by material type */
  materialType?: MaterialType | 'all'
  /** Filter by category */
  category?: CubeCategory | 'all'
  /** Filter by author ID */
  authorId?: string
  /** Time range filter */
  timeRange?: TimeRangeFilter
  /** Show only featured cubes */
  featuredOnly?: boolean
  /** Show only staff picks */
  staffPicksOnly?: boolean
  /** Filter by tags */
  tags?: string[]
}

/**
 * Complete search parameters including pagination and sorting
 */
export interface CommunityGallerySearchParams {
  /** Filter parameters */
  filters: CommunityGalleryFilters
  /** Sort option */
  sortBy: CommunitySortOption
  /** Sort direction */
  sortDirection?: 'asc' | 'desc'
  /** Page number (1-indexed) */
  page: number
  /** Items per page */
  pageSize: number
}

// ============================================================================
// API Response Types
// ============================================================================

/**
 * Pagination metadata
 */
export interface PaginationMeta {
  /** Current page number (1-indexed) */
  currentPage: number
  /** Total number of pages */
  totalPages: number
  /** Total number of items */
  totalItems: number
  /** Items per page */
  pageSize: number
  /** Whether there's a next page */
  hasNextPage: boolean
  /** Whether there's a previous page */
  hasPrevPage: boolean
}

/**
 * Paginated response for community gallery
 */
export interface CommunityGalleryResponse {
  /** Array of published cubes */
  cubes: PublishedCube[]
  /** Pagination information */
  pagination: PaginationMeta
  /** Search/filter parameters used */
  params: CommunityGallerySearchParams
}

/**
 * Result of a single cube operation
 */
export interface CubeOperationResult {
  /** Whether the operation succeeded */
  success: boolean
  /** Error message if failed */
  error?: string
  /** The affected cube (if applicable) */
  cube?: PublishedCube
}

// ============================================================================
// User Interaction Types
// ============================================================================

/**
 * Like/unlike action result
 */
export interface LikeResult {
  /** Whether the operation succeeded */
  success: boolean
  /** New like state */
  isLiked: boolean
  /** Updated like count */
  likeCount: number
}

/**
 * Comment on a published cube
 */
export interface CubeComment {
  /** Comment ID */
  id: string
  /** Cube ID this comment belongs to */
  cubeId: string
  /** Author information */
  author: CubeAuthor
  /** Comment text content */
  content: string
  /** Comment creation timestamp */
  createdAt: string
  /** Whether this is edited */
  isEdited?: boolean
  /** Edit timestamp (if edited) */
  editedAt?: string
  /** Number of likes on the comment */
  likes: number
  /** Whether current user liked this comment */
  isLiked?: boolean
}

/**
 * Request to publish a cube
 */
export interface PublishCubeRequest {
  /** The cube to publish */
  cube: SpectralCube
  /** Visibility level */
  visibility: CubeVisibility
  /** Category for organization */
  category: CubeCategory
  /** Additional tags */
  tags?: string[]
}

// ============================================================================
// Default Values and Constants
// ============================================================================

/**
 * Default search parameters
 */
export const DEFAULT_SEARCH_PARAMS: CommunityGallerySearchParams = {
  filters: {
    materialType: 'all',
    category: 'all',
    timeRange: 'all',
    featuredOnly: false,
    staffPicksOnly: false,
  },
  sortBy: 'recent',
  sortDirection: 'desc',
  page: 1,
  pageSize: 20,
}

/**
 * Default cube stats for new publications
 */
export const DEFAULT_CUBE_STATS: CubeStats = {
  views: 0,
  likes: 0,
  downloads: 0,
  comments: 0,
}

/**
 * Category display information
 */
export const CATEGORY_INFO: Record<CubeCategory, { label: string; description: string }> = {
  nature: { label: 'Nature', description: 'Natural materials like stone, wood, grass' },
  building: { label: 'Building', description: 'Construction materials like brick, concrete' },
  fantasy: { label: 'Fantasy', description: 'Magical and energy-based materials' },
  industrial: { label: 'Industrial', description: 'Metal, rust, and mechanical textures' },
  organic: { label: 'Organic', description: 'Living materials and creatures' },
  abstract: { label: 'Abstract', description: 'Artistic patterns and gradients' },
  other: { label: 'Other', description: 'Uncategorized cubes' },
}

/**
 * Sort option display information
 */
export const SORT_OPTION_INFO: Record<CommunitySortOption, { label: string; description: string }> =
  {
    recent: { label: 'Most Recent', description: 'Newest first' },
    popular: { label: 'Most Popular', description: 'Most liked' },
    trending: { label: 'Trending', description: 'Popular this week' },
    downloads: { label: 'Most Downloaded', description: 'Most used' },
    views: { label: 'Most Viewed', description: 'Most seen' },
    alphabetical: { label: 'A-Z', description: 'Alphabetical order' },
  }

/**
 * Storage keys for community gallery
 */
export const COMMUNITY_STORAGE_KEYS = {
  LIKED_CUBES: 'isocubic_community_liked',
  RECENT_SEARCHES: 'isocubic_community_recent_searches',
  VIEW_PREFERENCES: 'isocubic_community_view_prefs',
} as const

// ============================================================================
// Validation Helpers
// ============================================================================

/**
 * Validates a cube category
 */
export function isValidCategory(category: string): category is CubeCategory {
  return Object.keys(CATEGORY_INFO).includes(category)
}

/**
 * Validates a sort option
 */
export function isValidSortOption(option: string): option is CommunitySortOption {
  return Object.keys(SORT_OPTION_INFO).includes(option)
}

/**
 * Maps material type to suggested category
 */
export function suggestCategory(materialType: MaterialType | undefined): CubeCategory {
  if (!materialType) return 'other'

  const mapping: Record<MaterialType, CubeCategory> = {
    stone: 'nature',
    wood: 'nature',
    metal: 'industrial',
    glass: 'building',
    organic: 'organic',
    crystal: 'fantasy',
    liquid: 'nature',
  }

  return mapping[materialType] || 'other'
}

/**
 * Formats a number for display (e.g., 1500 -> "1.5K")
 */
export function formatCount(count: number): string {
  if (count < 1000) return count.toString()
  if (count < 1000000) return `${(count / 1000).toFixed(1)}K`
  return `${(count / 1000000).toFixed(1)}M`
}
