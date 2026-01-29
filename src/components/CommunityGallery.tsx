/**
 * Community Gallery Component (TASK 45)
 * Displays published cubes from the community with search, filtering, and sorting
 *
 * Features:
 * - Browse community-published cubes
 * - Search by name, tags, author
 * - Filter by category and material type
 * - Sort by recent, popular, trending, etc.
 * - Like/unlike cubes
 * - Pagination support
 */

import { useState, useCallback, useEffect, useMemo } from 'react'
import type { SpectralCube, MaterialType } from '../types/cube'
import type { ComponentMeta } from '../types/component-meta'
import type {
  PublishedCube,
  CommunityGallerySearchParams,
  CubeCategory,
  CommunitySortOption,
  PaginationMeta,
} from '../types/community'
import { CATEGORY_INFO, SORT_OPTION_INFO, formatCount } from '../types/community'
import { communityGalleryService } from '../lib/community-gallery'
import { registerComponentMeta } from '../types/component-meta'
import { ComponentInfo } from './ComponentInfo'
import { useIsDevModeEnabled } from '../lib/devmode'

/**
 * Component metadata for Developer Mode
 */
export const COMMUNITY_GALLERY_META: ComponentMeta = {
  id: 'community-gallery',
  name: 'CommunityGallery',
  version: '1.0.0',
  summary: 'Browse and interact with community-published cubes.',
  description:
    'CommunityGallery is the public gallery for viewing cubes published by other users. ' +
    'It provides search, filtering by category and material type, sorting options, and ' +
    'social features like liking cubes. The component supports pagination for browsing ' +
    'large collections efficiently.',
  phase: 7,
  taskId: 'TASK 45',
  filePath: 'components/CommunityGallery.tsx',
  history: [
    {
      version: '1.0.0',
      date: '2026-01-29T22:00:00Z',
      description: 'Initial implementation with search, filter, sort, and like features',
      taskId: 'TASK 45',
      type: 'created',
    },
  ],
  features: [
    {
      id: 'search',
      name: 'Search',
      description: 'Search cubes by name, tags, prompt, or author',
      enabled: true,
      taskId: 'TASK 45',
    },
    {
      id: 'filter-category',
      name: 'Category Filter',
      description: 'Filter by category (Nature, Building, Fantasy, etc.)',
      enabled: true,
      taskId: 'TASK 45',
    },
    {
      id: 'filter-material',
      name: 'Material Filter',
      description: 'Filter by material type (Stone, Wood, Metal, etc.)',
      enabled: true,
      taskId: 'TASK 45',
    },
    {
      id: 'sorting',
      name: 'Sorting',
      description: 'Sort by recent, popular, trending, downloads, views',
      enabled: true,
      taskId: 'TASK 45',
    },
    {
      id: 'likes',
      name: 'Like System',
      description: 'Like and unlike cubes with persisted state',
      enabled: true,
      taskId: 'TASK 45',
    },
    {
      id: 'pagination',
      name: 'Pagination',
      description: 'Navigate through pages of results',
      enabled: true,
      taskId: 'TASK 45',
    },
  ],
  dependencies: [
    {
      name: 'community-gallery',
      type: 'lib',
      path: 'lib/community-gallery.ts',
      purpose: 'API service for community cubes',
    },
    { name: 'community', type: 'lib', path: 'types/community.ts', purpose: 'Type definitions' },
  ],
  relatedFiles: [
    {
      path: 'components/CommunityGallery.test.tsx',
      type: 'test',
      description: 'Unit tests for CommunityGallery',
    },
    {
      path: 'lib/community-gallery.ts',
      type: 'util',
      description: 'Community gallery service',
    },
    { path: 'types/community.ts', type: 'type', description: 'Community types' },
  ],
  props: [
    {
      name: 'onCubeSelect',
      type: '(cube: SpectralCube) => void',
      required: false,
      description: 'Callback when a cube is selected for use',
    },
    {
      name: 'onCubePreview',
      type: '(cube: PublishedCube) => void',
      required: false,
      description: 'Callback to preview a cube details',
    },
    { name: 'className', type: 'string', required: false, description: 'Additional CSS class' },
  ],
  tips: [
    'Use the search bar to find specific cubes by name or tags',
    'Click the heart icon to like a cube and save it for later',
    'Switch between sorting options to discover new and popular cubes',
    'Filter by category to focus on specific types of materials',
  ],
  tags: ['community', 'gallery', 'social', 'search', 'filter', 'phase-7'],
  status: 'stable',
  lastUpdated: '2026-01-29T22:00:00Z',
}

// Register metadata in the global registry
registerComponentMeta(COMMUNITY_GALLERY_META)

// ============================================================================
// Constants
// ============================================================================

/** Material types with labels */
const MATERIAL_TYPES: { id: MaterialType | 'all'; label: string }[] = [
  { id: 'all', label: 'All Materials' },
  { id: 'stone', label: 'Stone' },
  { id: 'wood', label: 'Wood' },
  { id: 'metal', label: 'Metal' },
  { id: 'glass', label: 'Glass' },
  { id: 'crystal', label: 'Crystal' },
  { id: 'organic', label: 'Organic' },
  { id: 'liquid', label: 'Liquid' },
]

/** Categories with labels */
const CATEGORIES: { id: CubeCategory | 'all'; label: string }[] = [
  { id: 'all', label: 'All Categories' },
  ...Object.entries(CATEGORY_INFO).map(([id, info]) => ({
    id: id as CubeCategory,
    label: info.label,
  })),
]

/** Sort options with labels */
const SORT_OPTIONS: { id: CommunitySortOption; label: string }[] = Object.entries(
  SORT_OPTION_INFO
).map(([id, info]) => ({
  id: id as CommunitySortOption,
  label: info.label,
}))

// ============================================================================
// Props Interface
// ============================================================================

export interface CommunityGalleryProps {
  /** Callback when a cube is selected for use */
  onCubeSelect?: (cube: SpectralCube) => void
  /** Callback to preview cube details */
  onCubePreview?: (cube: PublishedCube) => void
  /** Custom class name */
  className?: string
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Converts RGB color array to CSS color string
 */
function colorToCSS(color: [number, number, number]): string {
  const r = Math.round(color[0] * 255)
  const g = Math.round(color[1] * 255)
  const b = Math.round(color[2] * 255)
  return `rgb(${r}, ${g}, ${b})`
}

/**
 * Generates a gradient CSS based on cube configuration
 */
function generateCubeGradient(cube: SpectralCube): string {
  const baseColor = colorToCSS(cube.base.color)

  if (!cube.gradients || cube.gradients.length === 0) {
    return baseColor
  }

  const gradient = cube.gradients[0]
  const shift = gradient.color_shift
  const endColor = colorToCSS([
    Math.max(0, Math.min(1, cube.base.color[0] + shift[0] * gradient.factor)),
    Math.max(0, Math.min(1, cube.base.color[1] + shift[1] * gradient.factor)),
    Math.max(0, Math.min(1, cube.base.color[2] + shift[2] * gradient.factor)),
  ])

  switch (gradient.axis) {
    case 'y':
      return `linear-gradient(to top, ${baseColor}, ${endColor})`
    case 'x':
      return `linear-gradient(to right, ${baseColor}, ${endColor})`
    case 'z':
      return `linear-gradient(135deg, ${baseColor}, ${endColor})`
    case 'radial':
      return `radial-gradient(circle, ${endColor}, ${baseColor})`
    default:
      return baseColor
  }
}

// ============================================================================
// Component
// ============================================================================

/**
 * Community Gallery Component
 * Browse and interact with community-published cubes
 */
export function CommunityGallery({ onCubeSelect, className = '' }: CommunityGalleryProps) {
  // State
  const [cubes, setCubes] = useState<PublishedCube[]>([])
  const [pagination, setPagination] = useState<PaginationMeta | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Search/filter state
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<CubeCategory | 'all'>('all')
  const [selectedMaterial, setSelectedMaterial] = useState<MaterialType | 'all'>('all')
  const [sortBy, setSortBy] = useState<CommunitySortOption>('recent')
  const [currentPage, setCurrentPage] = useState(1)

  // Build search params from state
  const searchParams = useMemo<CommunityGallerySearchParams>(
    () => ({
      filters: {
        query: searchQuery || undefined,
        category: selectedCategory !== 'all' ? selectedCategory : undefined,
        materialType: selectedMaterial !== 'all' ? selectedMaterial : undefined,
      },
      sortBy,
      sortDirection: 'desc',
      page: currentPage,
      pageSize: 12,
    }),
    [searchQuery, selectedCategory, selectedMaterial, sortBy, currentPage]
  )

  // Fetch cubes when params change
  useEffect(() => {
    let cancelled = false

    async function fetchCubes() {
      setIsLoading(true)
      setError(null)

      try {
        const response = await communityGalleryService.search(searchParams)
        if (!cancelled) {
          setCubes(response.cubes)
          setPagination(response.pagination)
        }
      } catch (err) {
        if (!cancelled) {
          setError('Failed to load community cubes')
          console.error('CommunityGallery fetch error:', err)
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    fetchCubes()

    return () => {
      cancelled = true
    }
  }, [searchParams])

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, selectedCategory, selectedMaterial, sortBy])

  // Handle cube selection
  const handleCubeSelect = useCallback(
    (pub: PublishedCube) => {
      onCubeSelect?.(pub.cube)
      communityGalleryService.recordDownload(pub.id)
    },
    [onCubeSelect]
  )

  // Handle like toggle
  const handleLikeToggle = useCallback(async (e: React.MouseEvent, cubeId: string) => {
    e.stopPropagation()

    try {
      const result = await communityGalleryService.toggleLike(cubeId)
      if (result.success) {
        setCubes((prev) =>
          prev.map((cube) =>
            cube.id === cubeId
              ? {
                  ...cube,
                  isLiked: result.isLiked,
                  stats: { ...cube.stats, likes: result.likeCount },
                }
              : cube
          )
        )
      }
    } catch (err) {
      console.error('Failed to toggle like:', err)
    }
  }, [])

  // Handle search input
  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value)
  }, [])

  // Handle category change
  const handleCategoryChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedCategory(e.target.value as CubeCategory | 'all')
  }, [])

  // Handle material change
  const handleMaterialChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedMaterial(e.target.value as MaterialType | 'all')
  }, [])

  // Handle sort change
  const handleSortChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setSortBy(e.target.value as CommunitySortOption)
  }, [])

  // Handle pagination
  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])

  // Check if DevMode is enabled
  const isDevModeEnabled = useIsDevModeEnabled()

  // Render pagination controls
  const renderPagination = () => {
    if (!pagination || pagination.totalPages <= 1) return null

    const pages: (number | string)[] = []
    const { currentPage, totalPages } = pagination

    // Always show first page
    pages.push(1)

    // Show ellipsis if needed
    if (currentPage > 3) {
      pages.push('...')
    }

    // Show pages around current
    for (
      let i = Math.max(2, currentPage - 1);
      i <= Math.min(totalPages - 1, currentPage + 1);
      i++
    ) {
      if (!pages.includes(i)) {
        pages.push(i)
      }
    }

    // Show ellipsis if needed
    if (currentPage < totalPages - 2) {
      pages.push('...')
    }

    // Always show last page
    if (totalPages > 1 && !pages.includes(totalPages)) {
      pages.push(totalPages)
    }

    return (
      <div className="community-gallery__pagination">
        <button
          type="button"
          className="community-gallery__page-btn"
          onClick={() => handlePageChange(currentPage - 1)}
          disabled={!pagination.hasPrevPage}
          aria-label="Previous page"
        >
          &lt;
        </button>

        {pages.map((page, index) =>
          typeof page === 'number' ? (
            <button
              key={page}
              type="button"
              className={`community-gallery__page-btn ${
                page === currentPage ? 'community-gallery__page-btn--active' : ''
              }`}
              onClick={() => handlePageChange(page)}
            >
              {page}
            </button>
          ) : (
            <span key={`ellipsis-${index}`} className="community-gallery__ellipsis">
              {page}
            </span>
          )
        )}

        <button
          type="button"
          className="community-gallery__page-btn"
          onClick={() => handlePageChange(currentPage + 1)}
          disabled={!pagination.hasNextPage}
          aria-label="Next page"
        >
          &gt;
        </button>
      </div>
    )
  }

  const galleryContent = (
    <div className={`community-gallery ${className}`}>
      {/* Header */}
      <div className="community-gallery__header">
        <h2 className="community-gallery__title">Community Gallery</h2>
        <p className="community-gallery__subtitle">
          Discover cubes created by the isocubic community
        </p>
      </div>

      {/* Search and Filters */}
      <div className="community-gallery__controls">
        {/* Search Input */}
        <div className="community-gallery__search">
          <input
            type="text"
            className="community-gallery__search-input"
            placeholder="Search by name, tags, author..."
            value={searchQuery}
            onChange={handleSearchChange}
            aria-label="Search community cubes"
          />
          {searchQuery && (
            <button
              type="button"
              className="community-gallery__search-clear"
              onClick={() => setSearchQuery('')}
              aria-label="Clear search"
            >
              ×
            </button>
          )}
        </div>

        {/* Filter Controls */}
        <div className="community-gallery__filters">
          <select
            className="community-gallery__select"
            value={selectedCategory}
            onChange={handleCategoryChange}
            aria-label="Filter by category"
          >
            {CATEGORIES.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.label}
              </option>
            ))}
          </select>

          <select
            className="community-gallery__select"
            value={selectedMaterial}
            onChange={handleMaterialChange}
            aria-label="Filter by material"
          >
            {MATERIAL_TYPES.map((mat) => (
              <option key={mat.id} value={mat.id}>
                {mat.label}
              </option>
            ))}
          </select>

          <select
            className="community-gallery__select"
            value={sortBy}
            onChange={handleSortChange}
            aria-label="Sort by"
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="community-gallery__loading">
          <div className="community-gallery__spinner" />
          <span>Loading cubes...</span>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="community-gallery__error" role="alert">
          {error}
        </div>
      )}

      {/* Cube Grid */}
      {!isLoading && !error && (
        <>
          <div className="community-gallery__grid">
            {cubes.length === 0 ? (
              <div className="community-gallery__empty">
                {searchQuery || selectedCategory !== 'all' || selectedMaterial !== 'all'
                  ? 'No cubes match your search criteria'
                  : 'No community cubes available yet'}
              </div>
            ) : (
              cubes.map((pub) => (
                <div
                  key={pub.id}
                  className="community-gallery__item"
                  onClick={() => handleCubeSelect(pub)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      handleCubeSelect(pub)
                    }
                  }}
                  role="button"
                  tabIndex={0}
                  aria-label={`Select ${pub.cube.meta?.name || pub.cube.id}`}
                >
                  {/* Badges */}
                  <div className="community-gallery__badges">
                    {pub.isFeatured && (
                      <span className="community-gallery__badge community-gallery__badge--featured">
                        Featured
                      </span>
                    )}
                    {pub.isStaffPick && (
                      <span className="community-gallery__badge community-gallery__badge--staff">
                        Staff Pick
                      </span>
                    )}
                  </div>

                  {/* Thumbnail */}
                  <div
                    className="community-gallery__thumbnail"
                    style={{
                      background: generateCubeGradient(pub.cube),
                      opacity: pub.cube.base.transparency ?? 1,
                    }}
                  >
                    {pub.cube.noise?.type && (
                      <div
                        className={`community-gallery__noise-indicator community-gallery__noise-indicator--${pub.cube.noise.type}`}
                      />
                    )}
                  </div>

                  {/* Info */}
                  <div className="community-gallery__item-info">
                    <span className="community-gallery__item-name">
                      {pub.cube.meta?.name || pub.cube.id}
                    </span>
                    <span className="community-gallery__item-author">
                      by {pub.author.displayName}
                    </span>
                  </div>

                  {/* Stats */}
                  <div className="community-gallery__item-stats">
                    <button
                      type="button"
                      className={`community-gallery__like-btn ${
                        pub.isLiked ? 'community-gallery__like-btn--liked' : ''
                      }`}
                      onClick={(e) => handleLikeToggle(e, pub.id)}
                      aria-label={pub.isLiked ? 'Unlike' : 'Like'}
                    >
                      <span className="community-gallery__like-icon">
                        {pub.isLiked ? '❤️' : '🤍'}
                      </span>
                      <span className="community-gallery__like-count">
                        {formatCount(pub.stats.likes)}
                      </span>
                    </button>
                    <span className="community-gallery__views">
                      👁 {formatCount(pub.stats.views)}
                    </span>
                    <span className="community-gallery__downloads">
                      ⬇ {formatCount(pub.stats.downloads)}
                    </span>
                  </div>

                  {/* Tags */}
                  {pub.cube.meta?.tags && pub.cube.meta.tags.length > 0 && (
                    <div className="community-gallery__item-tags">
                      {pub.cube.meta.tags.slice(0, 3).map((tag) => (
                        <span key={tag} className="community-gallery__item-tag">
                          {tag}
                        </span>
                      ))}
                      {pub.cube.meta.tags.length > 3 && (
                        <span className="community-gallery__item-tag community-gallery__item-tag--more">
                          +{pub.cube.meta.tags.length - 3}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Pagination */}
          {renderPagination()}

          {/* Results Count */}
          {pagination && (
            <div className="community-gallery__footer">
              <span className="community-gallery__count">
                Showing {cubes.length} of {pagination.totalItems} cubes
                {pagination.totalPages > 1 &&
                  ` (Page ${pagination.currentPage} of ${pagination.totalPages})`}
              </span>
            </div>
          )}
        </>
      )}
    </div>
  )

  return isDevModeEnabled ? (
    <ComponentInfo meta={COMMUNITY_GALLERY_META}>{galleryContent}</ComponentInfo>
  ) : (
    galleryContent
  )
}

export default CommunityGallery
