/**
 * Tests for community gallery types and validation helpers (TASK 45)
 */

import { describe, it, expect } from 'vitest'
import {
  isValidCategory,
  isValidSortOption,
  suggestCategory,
  formatCount,
  DEFAULT_SEARCH_PARAMS,
  DEFAULT_CUBE_STATS,
  CATEGORY_INFO,
  SORT_OPTION_INFO,
  COMMUNITY_STORAGE_KEYS,
  type CubeCategory,
  type CommunitySortOption,
  type PublishedCube,
  type CommunityGallerySearchParams,
  type PaginationMeta,
} from './community'

describe('Community Gallery Types', () => {
  describe('isValidCategory', () => {
    it('should accept valid categories', () => {
      expect(isValidCategory('nature')).toBe(true)
      expect(isValidCategory('building')).toBe(true)
      expect(isValidCategory('fantasy')).toBe(true)
      expect(isValidCategory('industrial')).toBe(true)
      expect(isValidCategory('organic')).toBe(true)
      expect(isValidCategory('abstract')).toBe(true)
      expect(isValidCategory('other')).toBe(true)
    })

    it('should reject invalid categories', () => {
      expect(isValidCategory('invalid')).toBe(false)
      expect(isValidCategory('')).toBe(false)
      expect(isValidCategory('NATURE')).toBe(false)
      expect(isValidCategory('random')).toBe(false)
    })
  })

  describe('isValidSortOption', () => {
    it('should accept valid sort options', () => {
      expect(isValidSortOption('recent')).toBe(true)
      expect(isValidSortOption('popular')).toBe(true)
      expect(isValidSortOption('trending')).toBe(true)
      expect(isValidSortOption('downloads')).toBe(true)
      expect(isValidSortOption('views')).toBe(true)
      expect(isValidSortOption('alphabetical')).toBe(true)
    })

    it('should reject invalid sort options', () => {
      expect(isValidSortOption('invalid')).toBe(false)
      expect(isValidSortOption('')).toBe(false)
      expect(isValidSortOption('RECENT')).toBe(false)
      expect(isValidSortOption('date')).toBe(false)
    })
  })

  describe('suggestCategory', () => {
    it('should suggest correct categories for material types', () => {
      expect(suggestCategory('stone')).toBe('nature')
      expect(suggestCategory('wood')).toBe('nature')
      expect(suggestCategory('metal')).toBe('industrial')
      expect(suggestCategory('glass')).toBe('building')
      expect(suggestCategory('crystal')).toBe('fantasy')
      expect(suggestCategory('organic')).toBe('organic')
      expect(suggestCategory('liquid')).toBe('nature')
    })

    it('should return "other" for undefined material type', () => {
      expect(suggestCategory(undefined)).toBe('other')
    })
  })

  describe('formatCount', () => {
    it('should format small numbers as-is', () => {
      expect(formatCount(0)).toBe('0')
      expect(formatCount(1)).toBe('1')
      expect(formatCount(999)).toBe('999')
    })

    it('should format thousands with K suffix', () => {
      expect(formatCount(1000)).toBe('1.0K')
      expect(formatCount(1500)).toBe('1.5K')
      expect(formatCount(10000)).toBe('10.0K')
      expect(formatCount(999999)).toBe('1000.0K')
    })

    it('should format millions with M suffix', () => {
      expect(formatCount(1000000)).toBe('1.0M')
      expect(formatCount(2500000)).toBe('2.5M')
      expect(formatCount(10000000)).toBe('10.0M')
    })
  })

  describe('DEFAULT_SEARCH_PARAMS', () => {
    it('should have correct default values', () => {
      expect(DEFAULT_SEARCH_PARAMS.filters.materialType).toBe('all')
      expect(DEFAULT_SEARCH_PARAMS.filters.category).toBe('all')
      expect(DEFAULT_SEARCH_PARAMS.filters.timeRange).toBe('all')
      expect(DEFAULT_SEARCH_PARAMS.filters.featuredOnly).toBe(false)
      expect(DEFAULT_SEARCH_PARAMS.filters.staffPicksOnly).toBe(false)
      expect(DEFAULT_SEARCH_PARAMS.sortBy).toBe('recent')
      expect(DEFAULT_SEARCH_PARAMS.sortDirection).toBe('desc')
      expect(DEFAULT_SEARCH_PARAMS.page).toBe(1)
      expect(DEFAULT_SEARCH_PARAMS.pageSize).toBe(20)
    })
  })

  describe('DEFAULT_CUBE_STATS', () => {
    it('should have all stats at zero', () => {
      expect(DEFAULT_CUBE_STATS.views).toBe(0)
      expect(DEFAULT_CUBE_STATS.likes).toBe(0)
      expect(DEFAULT_CUBE_STATS.downloads).toBe(0)
      expect(DEFAULT_CUBE_STATS.comments).toBe(0)
    })
  })

  describe('CATEGORY_INFO', () => {
    it('should have info for all categories', () => {
      const categories: CubeCategory[] = [
        'nature',
        'building',
        'fantasy',
        'industrial',
        'organic',
        'abstract',
        'other',
      ]

      categories.forEach((cat) => {
        expect(CATEGORY_INFO[cat]).toBeDefined()
        expect(CATEGORY_INFO[cat].label).toBeTruthy()
        expect(CATEGORY_INFO[cat].description).toBeTruthy()
      })
    })
  })

  describe('SORT_OPTION_INFO', () => {
    it('should have info for all sort options', () => {
      const options: CommunitySortOption[] = [
        'recent',
        'popular',
        'trending',
        'downloads',
        'views',
        'alphabetical',
      ]

      options.forEach((opt) => {
        expect(SORT_OPTION_INFO[opt]).toBeDefined()
        expect(SORT_OPTION_INFO[opt].label).toBeTruthy()
        expect(SORT_OPTION_INFO[opt].description).toBeTruthy()
      })
    })
  })

  describe('COMMUNITY_STORAGE_KEYS', () => {
    it('should have all required storage keys', () => {
      expect(COMMUNITY_STORAGE_KEYS.LIKED_CUBES).toBe('isocubic_community_liked')
      expect(COMMUNITY_STORAGE_KEYS.RECENT_SEARCHES).toBe('isocubic_community_recent_searches')
      expect(COMMUNITY_STORAGE_KEYS.VIEW_PREFERENCES).toBe('isocubic_community_view_prefs')
    })
  })
})

describe('Type Definitions', () => {
  describe('PublishedCube', () => {
    it('should allow creating a valid published cube object', () => {
      const publishedCube: PublishedCube = {
        id: 'pub-test-123',
        cube: {
          id: 'test-cube',
          base: { color: [0.5, 0.5, 0.5] },
        },
        author: {
          id: 'user-1',
          displayName: 'TestUser',
        },
        status: 'published',
        visibility: 'public',
        category: 'nature',
        stats: {
          views: 100,
          likes: 50,
          downloads: 25,
          comments: 10,
        },
        publishedAt: '2026-01-29T00:00:00Z',
        updatedAt: '2026-01-29T00:00:00Z',
      }

      expect(publishedCube.id).toBe('pub-test-123')
      expect(publishedCube.author.displayName).toBe('TestUser')
      expect(publishedCube.status).toBe('published')
    })
  })

  describe('CommunityGallerySearchParams', () => {
    it('should allow creating valid search params', () => {
      const params: CommunityGallerySearchParams = {
        filters: {
          query: 'stone',
          materialType: 'stone',
          category: 'nature',
          timeRange: 'week',
        },
        sortBy: 'popular',
        page: 1,
        pageSize: 20,
      }

      expect(params.filters.query).toBe('stone')
      expect(params.sortBy).toBe('popular')
    })
  })

  describe('PaginationMeta', () => {
    it('should represent pagination state correctly', () => {
      const pagination: PaginationMeta = {
        currentPage: 2,
        totalPages: 5,
        totalItems: 100,
        pageSize: 20,
        hasNextPage: true,
        hasPrevPage: true,
      }

      expect(pagination.currentPage).toBe(2)
      expect(pagination.hasNextPage).toBe(true)
      expect(pagination.hasPrevPage).toBe(true)
    })

    it('should represent first page correctly', () => {
      const pagination: PaginationMeta = {
        currentPage: 1,
        totalPages: 5,
        totalItems: 100,
        pageSize: 20,
        hasNextPage: true,
        hasPrevPage: false,
      }

      expect(pagination.hasPrevPage).toBe(false)
    })

    it('should represent last page correctly', () => {
      const pagination: PaginationMeta = {
        currentPage: 5,
        totalPages: 5,
        totalItems: 100,
        pageSize: 20,
        hasNextPage: false,
        hasPrevPage: true,
      }

      expect(pagination.hasNextPage).toBe(false)
    })
  })
})
