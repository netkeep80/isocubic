/**
 * Tests for community gallery service (TASK 45)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { communityGalleryService } from './community-gallery'
import type { CommunityGallerySearchParams } from '../types/community'
import type { UserProfile } from '../types/auth'

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

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
})

describe('CommunityGalleryService', () => {
  beforeEach(() => {
    mockLocalStorage.clear()
    communityGalleryService._resetMockData()
  })

  describe('search', () => {
    it('should return cubes with default parameters', async () => {
      const params: CommunityGallerySearchParams = {
        filters: {},
        sortBy: 'recent',
        page: 1,
        pageSize: 10,
      }

      const result = await communityGalleryService.search(params)

      expect(result.cubes).toBeDefined()
      expect(result.cubes.length).toBeGreaterThan(0)
      expect(result.cubes.length).toBeLessThanOrEqual(10)
      expect(result.pagination).toBeDefined()
      expect(result.pagination.currentPage).toBe(1)
    })

    it('should filter by text query', async () => {
      const params: CommunityGallerySearchParams = {
        filters: { query: 'brick' },
        sortBy: 'recent',
        page: 1,
        pageSize: 20,
      }

      const result = await communityGalleryService.search(params)

      result.cubes.forEach((pub) => {
        const name = pub.cube.meta?.name?.toLowerCase() || ''
        const tags = pub.cube.meta?.tags?.map((t) => t.toLowerCase()) || []
        const prompt = pub.cube.prompt?.toLowerCase() || ''
        const hasMatch =
          name.includes('brick') ||
          tags.some((t) => t.includes('brick')) ||
          prompt.includes('brick')
        expect(hasMatch).toBe(true)
      })
    })

    it('should filter by category', async () => {
      const params: CommunityGallerySearchParams = {
        filters: { category: 'fantasy' },
        sortBy: 'recent',
        page: 1,
        pageSize: 20,
      }

      const result = await communityGalleryService.search(params)

      result.cubes.forEach((pub) => {
        expect(pub.category).toBe('fantasy')
      })
    })

    it('should filter by material type', async () => {
      const params: CommunityGallerySearchParams = {
        filters: { materialType: 'metal' },
        sortBy: 'recent',
        page: 1,
        pageSize: 20,
      }

      const result = await communityGalleryService.search(params)

      result.cubes.forEach((pub) => {
        expect(pub.cube.physics?.material).toBe('metal')
      })
    })

    it('should filter featured cubes only', async () => {
      const params: CommunityGallerySearchParams = {
        filters: { featuredOnly: true },
        sortBy: 'recent',
        page: 1,
        pageSize: 20,
      }

      const result = await communityGalleryService.search(params)

      result.cubes.forEach((pub) => {
        expect(pub.isFeatured).toBe(true)
      })
    })

    it('should filter staff picks only', async () => {
      const params: CommunityGallerySearchParams = {
        filters: { staffPicksOnly: true },
        sortBy: 'recent',
        page: 1,
        pageSize: 20,
      }

      const result = await communityGalleryService.search(params)

      result.cubes.forEach((pub) => {
        expect(pub.isStaffPick).toBe(true)
      })
    })

    it('should sort by most popular (likes)', async () => {
      const params: CommunityGallerySearchParams = {
        filters: {},
        sortBy: 'popular',
        sortDirection: 'desc',
        page: 1,
        pageSize: 20,
      }

      const result = await communityGalleryService.search(params)

      for (let i = 1; i < result.cubes.length; i++) {
        expect(result.cubes[i - 1].stats.likes).toBeGreaterThanOrEqual(result.cubes[i].stats.likes)
      }
    })

    it('should sort by most downloads', async () => {
      const params: CommunityGallerySearchParams = {
        filters: {},
        sortBy: 'downloads',
        sortDirection: 'desc',
        page: 1,
        pageSize: 20,
      }

      const result = await communityGalleryService.search(params)

      for (let i = 1; i < result.cubes.length; i++) {
        expect(result.cubes[i - 1].stats.downloads).toBeGreaterThanOrEqual(
          result.cubes[i].stats.downloads
        )
      }
    })

    it('should sort alphabetically', async () => {
      const params: CommunityGallerySearchParams = {
        filters: {},
        sortBy: 'alphabetical',
        sortDirection: 'asc',
        page: 1,
        pageSize: 20,
      }

      const result = await communityGalleryService.search(params)

      for (let i = 1; i < result.cubes.length; i++) {
        const prevName = result.cubes[i - 1].cube.meta?.name || result.cubes[i - 1].cube.id
        const currName = result.cubes[i].cube.meta?.name || result.cubes[i].cube.id
        expect(prevName.localeCompare(currName)).toBeLessThanOrEqual(0)
      }
    })

    it('should paginate results correctly', async () => {
      const pageSize = 3

      // Get first page
      const page1 = await communityGalleryService.search({
        filters: {},
        sortBy: 'recent',
        page: 1,
        pageSize,
      })

      // Get second page
      const page2 = await communityGalleryService.search({
        filters: {},
        sortBy: 'recent',
        page: 2,
        pageSize,
      })

      expect(page1.cubes.length).toBeLessThanOrEqual(pageSize)
      expect(page2.cubes.length).toBeLessThanOrEqual(pageSize)
      expect(page1.pagination.currentPage).toBe(1)
      expect(page2.pagination.currentPage).toBe(2)

      // Ensure different cubes on different pages
      const page1Ids = new Set(page1.cubes.map((c) => c.id))
      page2.cubes.forEach((cube) => {
        expect(page1Ids.has(cube.id)).toBe(false)
      })
    })

    it('should include correct pagination metadata', async () => {
      const result = await communityGalleryService.search({
        filters: {},
        sortBy: 'recent',
        page: 1,
        pageSize: 5,
      })

      expect(result.pagination.currentPage).toBe(1)
      expect(result.pagination.pageSize).toBe(5)
      expect(result.pagination.totalItems).toBeGreaterThan(0)
      expect(result.pagination.totalPages).toBeGreaterThanOrEqual(1)
      expect(result.pagination.hasPrevPage).toBe(false)
    })
  })

  describe('getCube', () => {
    it('should return a cube by ID', async () => {
      // Get first cube from search
      const searchResult = await communityGalleryService.search({
        filters: {},
        sortBy: 'recent',
        page: 1,
        pageSize: 1,
      })

      const cubeId = searchResult.cubes[0].id
      const cube = await communityGalleryService.getCube(cubeId)

      expect(cube).not.toBeNull()
      expect(cube?.id).toBe(cubeId)
    })

    it('should return null for non-existent cube', async () => {
      const cube = await communityGalleryService.getCube('non-existent-id')
      expect(cube).toBeNull()
    })

    it('should increment view count', async () => {
      const searchResult = await communityGalleryService.search({
        filters: {},
        sortBy: 'recent',
        page: 1,
        pageSize: 1,
      })

      const cubeId = searchResult.cubes[0].id
      const initialViews = searchResult.cubes[0].stats.views

      await communityGalleryService.getCube(cubeId)
      const updatedCube = await communityGalleryService.getCube(cubeId)

      // Views should have increased by 2 (one for each getCube call)
      expect(updatedCube?.stats.views).toBe(initialViews + 2)
    })
  })

  describe('getFeatured', () => {
    it('should return featured cubes', async () => {
      const featured = await communityGalleryService.getFeatured()

      expect(featured.length).toBeGreaterThan(0)
      featured.forEach((pub) => {
        expect(pub.isFeatured).toBe(true)
      })
    })

    it('should respect limit parameter', async () => {
      const featured = await communityGalleryService.getFeatured(2)
      expect(featured.length).toBeLessThanOrEqual(2)
    })
  })

  describe('getTrending', () => {
    it('should return trending cubes', async () => {
      const trending = await communityGalleryService.getTrending()

      expect(trending.length).toBeGreaterThan(0)
    })

    it('should respect limit parameter', async () => {
      const trending = await communityGalleryService.getTrending(3)
      expect(trending.length).toBeLessThanOrEqual(3)
    })
  })

  describe('toggleLike', () => {
    it('should like an unliked cube', async () => {
      const searchResult = await communityGalleryService.search({
        filters: {},
        sortBy: 'recent',
        page: 1,
        pageSize: 1,
      })

      const cubeId = searchResult.cubes[0].id
      const initialLikes = searchResult.cubes[0].stats.likes

      const result = await communityGalleryService.toggleLike(cubeId)

      expect(result.success).toBe(true)
      expect(result.isLiked).toBe(true)
      expect(result.likeCount).toBe(initialLikes + 1)
    })

    it('should unlike a liked cube', async () => {
      const searchResult = await communityGalleryService.search({
        filters: {},
        sortBy: 'recent',
        page: 1,
        pageSize: 1,
      })

      const cubeId = searchResult.cubes[0].id

      // Like first
      await communityGalleryService.toggleLike(cubeId)

      // Then unlike
      const result = await communityGalleryService.toggleLike(cubeId)

      expect(result.success).toBe(true)
      expect(result.isLiked).toBe(false)
    })

    it('should fail for non-existent cube', async () => {
      const result = await communityGalleryService.toggleLike('non-existent-id')

      expect(result.success).toBe(false)
      expect(result.likeCount).toBe(0)
    })

    it('should persist liked state in search results', async () => {
      const searchResult = await communityGalleryService.search({
        filters: {},
        sortBy: 'recent',
        page: 1,
        pageSize: 1,
      })

      const cubeId = searchResult.cubes[0].id

      // Like the cube
      await communityGalleryService.toggleLike(cubeId)

      // Search again
      const newSearchResult = await communityGalleryService.search({
        filters: {},
        sortBy: 'recent',
        page: 1,
        pageSize: 10,
      })

      const likedCube = newSearchResult.cubes.find((c) => c.id === cubeId)
      expect(likedCube?.isLiked).toBe(true)
    })
  })

  describe('publishCube', () => {
    it('should publish a new cube', async () => {
      const author: UserProfile = {
        id: 'test-user',
        email: 'test@example.com',
        displayName: 'Test User',
        role: 'user',
        createdAt: new Date().toISOString(),
      }

      const result = await communityGalleryService.publishCube(
        {
          cube: {
            id: 'new-test-cube',
            base: { color: [0.5, 0.5, 0.5] },
            meta: { name: 'Test Cube' },
          },
          visibility: 'public',
          category: 'abstract',
        },
        author
      )

      expect(result.success).toBe(true)
      expect(result.cube).toBeDefined()
      expect(result.cube?.author.displayName).toBe('Test User')
      expect(result.cube?.status).toBe('published')
      expect(result.cube?.category).toBe('abstract')
    })

    it('should add published cube to search results', async () => {
      const author: UserProfile = {
        id: 'test-user-2',
        email: 'test2@example.com',
        displayName: 'Test User 2',
        role: 'user',
        createdAt: new Date().toISOString(),
      }

      await communityGalleryService.publishCube(
        {
          cube: {
            id: 'searchable-cube',
            base: { color: [0.5, 0.5, 0.5] },
            meta: { name: 'Unique Searchable Name' },
          },
          visibility: 'public',
          category: 'other',
        },
        author
      )

      const searchResult = await communityGalleryService.search({
        filters: { query: 'Unique Searchable' },
        sortBy: 'recent',
        page: 1,
        pageSize: 10,
      })

      expect(searchResult.cubes.length).toBeGreaterThan(0)
      expect(searchResult.cubes[0].cube.meta?.name).toBe('Unique Searchable Name')
    })
  })

  describe('getAllTags', () => {
    it('should return unique tags from all cubes', async () => {
      const tags = await communityGalleryService.getAllTags()

      expect(tags.length).toBeGreaterThan(0)
      expect(Array.isArray(tags)).toBe(true)

      // Should be sorted
      const sortedTags = [...tags].sort()
      expect(tags).toEqual(sortedTags)
    })
  })

  describe('getByAuthor', () => {
    it('should return cubes by specific author', async () => {
      // First get the mock data to find an author
      const mockData = communityGalleryService._getMockData()
      const authorId = mockData[0].author.id

      const cubes = await communityGalleryService.getByAuthor(authorId)

      expect(cubes.length).toBeGreaterThan(0)
      cubes.forEach((pub) => {
        expect(pub.author.id).toBe(authorId)
      })
    })

    it('should respect limit parameter', async () => {
      const mockData = communityGalleryService._getMockData()
      const authorId = mockData[0].author.id

      const cubes = await communityGalleryService.getByAuthor(authorId, 1)
      expect(cubes.length).toBeLessThanOrEqual(1)
    })

    it('should return empty array for unknown author', async () => {
      const cubes = await communityGalleryService.getByAuthor('unknown-author-id')
      expect(cubes.length).toBe(0)
    })
  })

  describe('recordDownload', () => {
    it('should increment download count', async () => {
      const searchResult = await communityGalleryService.search({
        filters: {},
        sortBy: 'recent',
        page: 1,
        pageSize: 1,
      })

      const cubeId = searchResult.cubes[0].id
      const initialDownloads = searchResult.cubes[0].stats.downloads

      await communityGalleryService.recordDownload(cubeId)

      const cube = await communityGalleryService.getCube(cubeId)
      expect(cube?.stats.downloads).toBe(initialDownloads + 1)
    })
  })

  describe('combined filters', () => {
    it('should apply multiple filters together', async () => {
      const result = await communityGalleryService.search({
        filters: {
          materialType: 'crystal',
          featuredOnly: false,
        },
        sortBy: 'popular',
        page: 1,
        pageSize: 20,
      })

      result.cubes.forEach((pub) => {
        expect(pub.cube.physics?.material).toBe('crystal')
      })
    })
  })
})
