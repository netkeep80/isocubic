/**
 * Community Gallery Service (TASK 45)
 * Provides API for browsing, searching, and interacting with community-published cubes
 *
 * Current implementation: Mock service with in-memory data
 * Future: Replace with real API calls to backend (Supabase/Firebase)
 */

import type { SpectralCube } from '../types/cube'
import type { UserProfile } from '../types/auth'
import type {
  PublishedCube,
  CubeAuthor,
  CubeStats,
  CubeCategory,
  CubeVisibility,
  PublishedCubeStatus,
  CommunityGalleryFilters,
  CommunityGallerySearchParams,
  CommunityGalleryResponse,
  PaginationMeta,
  LikeResult,
  PublishCubeRequest,
  CubeOperationResult,
  CommunitySortOption,
} from '../types/community'
import { DEFAULT_CUBE_STATS, COMMUNITY_STORAGE_KEYS } from '../types/community'

// ============================================================================
// Mock Data Generation
// ============================================================================

/**
 * Mock authors for community cubes
 */
const MOCK_AUTHORS: CubeAuthor[] = [
  { id: 'user-1', displayName: 'CubeArtist', avatarUrl: undefined },
  { id: 'user-2', displayName: 'PixelMaster', avatarUrl: undefined },
  { id: 'user-3', displayName: 'VoxelCreator', avatarUrl: undefined },
  { id: 'user-4', displayName: 'IsoCrafter', avatarUrl: undefined },
  { id: 'user-5', displayName: 'CubeDesigner', avatarUrl: undefined },
]

/**
 * Sample cube configurations for mock data
 */
const SAMPLE_CUBES: SpectralCube[] = [
  {
    id: 'community-mossy-brick',
    prompt: 'Aged brick wall covered with green moss',
    base: { color: [0.6, 0.3, 0.25], roughness: 0.85, transparency: 1.0 },
    gradients: [{ axis: 'y', factor: 0.3, color_shift: [0.1, 0.2, 0.05] }],
    noise: { type: 'worley', scale: 6.0, octaves: 3, persistence: 0.5 },
    physics: { material: 'stone', density: 2.2, break_pattern: 'crumble' },
    meta: { name: 'Mossy Brick', tags: ['brick', 'moss', 'aged', 'wall'], author: 'CubeArtist' },
  },
  {
    id: 'community-golden-metal',
    prompt: 'Polished golden metal with subtle scratches',
    base: { color: [0.85, 0.7, 0.3], roughness: 0.2, transparency: 1.0 },
    gradients: [{ axis: 'radial', factor: 0.15, color_shift: [0.1, 0.05, -0.1] }],
    noise: { type: 'perlin', scale: 20.0, octaves: 2, persistence: 0.3 },
    physics: { material: 'metal', density: 19.3, break_pattern: 'shatter' },
    meta: {
      name: 'Golden Metal',
      tags: ['gold', 'metal', 'shiny', 'luxury'],
      author: 'PixelMaster',
    },
  },
  {
    id: 'community-mystic-crystal',
    prompt: 'Glowing purple crystal with inner energy',
    base: { color: [0.5, 0.2, 0.8], roughness: 0.1, transparency: 0.7 },
    gradients: [{ axis: 'y', factor: 0.4, color_shift: [0.2, 0.1, 0.3] }],
    noise: { type: 'crackle', scale: 4.0, octaves: 5, persistence: 0.6 },
    physics: { material: 'crystal', density: 3.5, break_pattern: 'shatter' },
    meta: {
      name: 'Mystic Crystal',
      tags: ['crystal', 'magic', 'purple', 'glowing'],
      author: 'VoxelCreator',
    },
  },
  {
    id: 'community-ancient-wood',
    prompt: 'Ancient oak wood with deep grain patterns',
    base: { color: [0.4, 0.25, 0.15], roughness: 0.7, transparency: 1.0 },
    gradients: [{ axis: 'x', factor: 0.2, color_shift: [-0.1, -0.05, 0.0] }],
    noise: { type: 'perlin', scale: 3.0, octaves: 6, persistence: 0.7 },
    physics: { material: 'wood', density: 0.8, break_pattern: 'splinter' },
    meta: { name: 'Ancient Oak', tags: ['wood', 'oak', 'ancient', 'grain'], author: 'IsoCrafter' },
  },
  {
    id: 'community-lava-flow',
    prompt: 'Flowing lava with bright orange cracks',
    base: { color: [0.9, 0.3, 0.1], roughness: 0.3, transparency: 1.0 },
    gradients: [{ axis: 'y', factor: 0.5, color_shift: [0.1, -0.2, -0.05] }],
    noise: { type: 'worley', scale: 5.0, octaves: 4, persistence: 0.5 },
    physics: { material: 'liquid', density: 2.5, break_pattern: 'melt' },
    meta: { name: 'Lava Flow', tags: ['lava', 'fire', 'hot', 'volcanic'], author: 'CubeDesigner' },
  },
  {
    id: 'community-ice-glacier',
    prompt: 'Translucent blue glacier ice with air bubbles',
    base: { color: [0.7, 0.85, 0.95], roughness: 0.15, transparency: 0.6 },
    gradients: [{ axis: 'z', factor: 0.25, color_shift: [-0.1, 0.0, 0.1] }],
    noise: { type: 'perlin', scale: 8.0, octaves: 3, persistence: 0.4 },
    physics: { material: 'glass', density: 0.9, break_pattern: 'shatter' },
    meta: { name: 'Glacier Ice', tags: ['ice', 'glacier', 'cold', 'frozen'], author: 'CubeArtist' },
  },
  {
    id: 'community-rusty-iron',
    prompt: 'Heavily corroded iron with orange rust patches',
    base: { color: [0.35, 0.25, 0.2], roughness: 0.95, transparency: 1.0 },
    gradients: [{ axis: 'radial', factor: 0.3, color_shift: [0.25, 0.1, -0.05] }],
    noise: { type: 'worley', scale: 10.0, octaves: 4, persistence: 0.6 },
    physics: { material: 'metal', density: 7.8, break_pattern: 'crumble' },
    meta: {
      name: 'Rusty Iron',
      tags: ['metal', 'rust', 'iron', 'corroded'],
      author: 'PixelMaster',
    },
  },
  {
    id: 'community-enchanted-emerald',
    prompt: 'Magical emerald gem with swirling energy',
    base: { color: [0.15, 0.7, 0.35], roughness: 0.05, transparency: 0.65 },
    gradients: [{ axis: 'y', factor: 0.35, color_shift: [0.1, 0.15, 0.05] }],
    noise: { type: 'crackle', scale: 6.0, octaves: 4, persistence: 0.5 },
    physics: { material: 'crystal', density: 4.0, break_pattern: 'shatter' },
    meta: {
      name: 'Enchanted Emerald',
      tags: ['emerald', 'gem', 'magic', 'green'],
      author: 'VoxelCreator',
    },
  },
  {
    id: 'community-sandstone-desert',
    prompt: 'Weathered desert sandstone with wind erosion',
    base: { color: [0.85, 0.75, 0.55], roughness: 0.8, transparency: 1.0 },
    gradients: [{ axis: 'y', factor: 0.2, color_shift: [-0.1, -0.08, -0.05] }],
    noise: { type: 'perlin', scale: 12.0, octaves: 5, persistence: 0.55 },
    physics: { material: 'stone', density: 2.0, break_pattern: 'crumble' },
    meta: {
      name: 'Desert Sandstone',
      tags: ['sand', 'desert', 'stone', 'weathered'],
      author: 'IsoCrafter',
    },
  },
  {
    id: 'community-neon-plasma',
    prompt: 'Pulsating neon plasma with electric blue glow',
    base: { color: [0.2, 0.6, 1.0], roughness: 0.0, transparency: 0.5 },
    gradients: [{ axis: 'radial', factor: 0.5, color_shift: [0.3, 0.2, -0.2] }],
    noise: { type: 'crackle', scale: 3.0, octaves: 3, persistence: 0.7 },
    physics: { material: 'liquid', density: 0.1, break_pattern: 'dissolve' },
    meta: {
      name: 'Neon Plasma',
      tags: ['plasma', 'neon', 'energy', 'electric'],
      author: 'CubeDesigner',
    },
  },
  {
    id: 'community-marble-veined',
    prompt: 'White marble with gray and gold veins',
    base: { color: [0.95, 0.93, 0.9], roughness: 0.25, transparency: 1.0 },
    gradients: [{ axis: 'x', factor: 0.1, color_shift: [-0.05, -0.03, 0.02] }],
    noise: { type: 'worley', scale: 4.0, octaves: 4, persistence: 0.6 },
    physics: { material: 'stone', density: 2.7, break_pattern: 'shatter' },
    meta: {
      name: 'Veined Marble',
      tags: ['marble', 'luxury', 'white', 'elegant'],
      author: 'CubeArtist',
    },
  },
  {
    id: 'community-copper-patina',
    prompt: 'Aged copper with turquoise green patina',
    base: { color: [0.3, 0.5, 0.45], roughness: 0.6, transparency: 1.0 },
    gradients: [{ axis: 'y', factor: 0.4, color_shift: [0.4, 0.15, -0.1] }],
    noise: { type: 'perlin', scale: 7.0, octaves: 3, persistence: 0.5 },
    physics: { material: 'metal', density: 8.9, break_pattern: 'crumble' },
    meta: {
      name: 'Copper Patina',
      tags: ['copper', 'patina', 'aged', 'turquoise'],
      author: 'PixelMaster',
    },
  },
]

/**
 * Generates mock published cubes from sample data
 */
function generateMockPublishedCubes(): PublishedCube[] {
  const now = Date.now()
  const dayMs = 24 * 60 * 60 * 1000

  return SAMPLE_CUBES.map((cube, index) => {
    const author = MOCK_AUTHORS[index % MOCK_AUTHORS.length]
    const daysAgo = Math.floor(Math.random() * 30)
    const publishedAt = new Date(now - daysAgo * dayMs).toISOString()

    // Determine category based on material type
    let category: CubeCategory = 'other'
    const material = cube.physics?.material
    if (material === 'stone' || material === 'wood') category = 'nature'
    else if (material === 'metal') category = 'industrial'
    else if (material === 'crystal' || material === 'glass') category = 'fantasy'
    else if (material === 'liquid') category = 'nature'
    else if (material === 'organic') category = 'organic'

    // Generate random stats
    const stats: CubeStats = {
      views: Math.floor(Math.random() * 1000) + 50,
      likes: Math.floor(Math.random() * 200) + 10,
      downloads: Math.floor(Math.random() * 100) + 5,
      comments: Math.floor(Math.random() * 20),
    }

    return {
      id: `pub-${cube.id}`,
      cube,
      author,
      status: 'published' as PublishedCubeStatus,
      visibility: 'public' as CubeVisibility,
      category,
      stats,
      isLiked: false,
      publishedAt,
      updatedAt: publishedAt,
      isFeatured: index < 3, // First 3 are featured
      isStaffPick: index === 0 || index === 4, // Some are staff picks
    }
  })
}

// ============================================================================
// In-Memory Mock Database
// ============================================================================

/** Mock database of published cubes */
let mockPublishedCubes: PublishedCube[] = generateMockPublishedCubes()

/** Set of liked cube IDs (stored in localStorage) */
let likedCubeIds: Set<string> = new Set()

/**
 * Loads liked cubes from localStorage
 */
function loadLikedCubes(): void {
  try {
    const stored = localStorage.getItem(COMMUNITY_STORAGE_KEYS.LIKED_CUBES)
    if (stored) {
      likedCubeIds = new Set(JSON.parse(stored))
    }
  } catch {
    likedCubeIds = new Set()
  }
}

/**
 * Saves liked cubes to localStorage
 */
function saveLikedCubes(): void {
  try {
    localStorage.setItem(
      COMMUNITY_STORAGE_KEYS.LIKED_CUBES,
      JSON.stringify(Array.from(likedCubeIds))
    )
  } catch {
    // Ignore storage errors
  }
}

// Initialize liked cubes from storage
loadLikedCubes()

// ============================================================================
// Community Gallery Service
// ============================================================================

/**
 * Simulates network delay for realistic async behavior
 */
async function simulateNetworkDelay(ms: number = 300): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Filters cubes based on search parameters
 */
function filterCubes(cubes: PublishedCube[], filters: CommunityGalleryFilters): PublishedCube[] {
  return cubes.filter((pub) => {
    // Text search
    if (filters.query) {
      const query = filters.query.toLowerCase()
      const cube = pub.cube
      const matchesName = cube.meta?.name?.toLowerCase().includes(query)
      const matchesTags = cube.meta?.tags?.some((tag) => tag.toLowerCase().includes(query))
      const matchesPrompt = cube.prompt?.toLowerCase().includes(query)
      const matchesAuthor = pub.author.displayName.toLowerCase().includes(query)
      if (!matchesName && !matchesTags && !matchesPrompt && !matchesAuthor) {
        return false
      }
    }

    // Material type filter
    if (filters.materialType && filters.materialType !== 'all') {
      if (pub.cube.physics?.material !== filters.materialType) {
        return false
      }
    }

    // Category filter
    if (filters.category && filters.category !== 'all') {
      if (pub.category !== filters.category) {
        return false
      }
    }

    // Author filter
    if (filters.authorId) {
      if (pub.author.id !== filters.authorId) {
        return false
      }
    }

    // Time range filter
    if (filters.timeRange && filters.timeRange !== 'all') {
      const pubDate = new Date(pub.publishedAt).getTime()
      const now = Date.now()
      const dayMs = 24 * 60 * 60 * 1000

      let maxAge: number
      switch (filters.timeRange) {
        case 'today':
          maxAge = dayMs
          break
        case 'week':
          maxAge = 7 * dayMs
          break
        case 'month':
          maxAge = 30 * dayMs
          break
        case 'year':
          maxAge = 365 * dayMs
          break
        default:
          maxAge = Infinity
      }

      if (now - pubDate > maxAge) {
        return false
      }
    }

    // Featured filter
    if (filters.featuredOnly && !pub.isFeatured) {
      return false
    }

    // Staff picks filter
    if (filters.staffPicksOnly && !pub.isStaffPick) {
      return false
    }

    // Tags filter
    if (filters.tags && filters.tags.length > 0) {
      const cubeTags = pub.cube.meta?.tags || []
      const hasMatchingTag = filters.tags.some((tag) =>
        cubeTags.some((cubeTag) => cubeTag.toLowerCase() === tag.toLowerCase())
      )
      if (!hasMatchingTag) {
        return false
      }
    }

    return true
  })
}

/**
 * Sorts cubes based on sort option
 */
function sortCubes(
  cubes: PublishedCube[],
  sortBy: CommunitySortOption,
  sortDirection: 'asc' | 'desc' = 'desc'
): PublishedCube[] {
  const sorted = [...cubes]
  const multiplier = sortDirection === 'desc' ? -1 : 1

  sorted.sort((a, b) => {
    let comparison: number
    switch (sortBy) {
      case 'recent':
        comparison = new Date(a.publishedAt).getTime() - new Date(b.publishedAt).getTime()
        break
      case 'popular':
        comparison = a.stats.likes - b.stats.likes
        break
      case 'trending': {
        // Trending = likes weighted by recency
        const ageA = (Date.now() - new Date(a.publishedAt).getTime()) / (24 * 60 * 60 * 1000) + 1
        const ageB = (Date.now() - new Date(b.publishedAt).getTime()) / (24 * 60 * 60 * 1000) + 1
        comparison = a.stats.likes / ageA - b.stats.likes / ageB
        break
      }
      case 'downloads':
        comparison = a.stats.downloads - b.stats.downloads
        break
      case 'views':
        comparison = a.stats.views - b.stats.views
        break
      case 'alphabetical': {
        const nameA = a.cube.meta?.name || a.cube.id
        const nameB = b.cube.meta?.name || b.cube.id
        comparison = nameA.localeCompare(nameB)
        break
      }
      default:
        comparison = 0
    }
    return comparison * multiplier
  })

  return sorted
}

/**
 * Paginates an array of items
 */
function paginate<T>(
  items: T[],
  page: number,
  pageSize: number
): { items: T[]; meta: PaginationMeta } {
  const totalItems = items.length
  const totalPages = Math.ceil(totalItems / pageSize)
  const currentPage = Math.max(1, Math.min(page, totalPages || 1))
  const startIndex = (currentPage - 1) * pageSize
  const endIndex = startIndex + pageSize

  return {
    items: items.slice(startIndex, endIndex),
    meta: {
      currentPage,
      totalPages,
      totalItems,
      pageSize,
      hasNextPage: currentPage < totalPages,
      hasPrevPage: currentPage > 1,
    },
  }
}

/**
 * Community Gallery Service API
 */
export const communityGalleryService = {
  /**
   * Searches and retrieves published cubes
   */
  async search(params: CommunityGallerySearchParams): Promise<CommunityGalleryResponse> {
    await simulateNetworkDelay()

    // Filter cubes
    let filtered = filterCubes(mockPublishedCubes, params.filters)

    // Sort cubes
    filtered = sortCubes(filtered, params.sortBy, params.sortDirection)

    // Apply liked status
    filtered = filtered.map((pub) => ({
      ...pub,
      isLiked: likedCubeIds.has(pub.id),
    }))

    // Paginate
    const { items, meta } = paginate(filtered, params.page, params.pageSize)

    return {
      cubes: items,
      pagination: meta,
      params,
    }
  },

  /**
   * Gets a single published cube by ID
   */
  async getCube(id: string): Promise<PublishedCube | null> {
    await simulateNetworkDelay(150)

    const cube = mockPublishedCubes.find((pub) => pub.id === id)
    if (!cube) return null

    // Increment view count
    cube.stats.views += 1

    return {
      ...cube,
      isLiked: likedCubeIds.has(cube.id),
    }
  },

  /**
   * Gets featured cubes
   */
  async getFeatured(limit: number = 6): Promise<PublishedCube[]> {
    await simulateNetworkDelay(200)

    const featured = mockPublishedCubes
      .filter((pub) => pub.isFeatured)
      .slice(0, limit)
      .map((pub) => ({
        ...pub,
        isLiked: likedCubeIds.has(pub.id),
      }))

    return featured
  },

  /**
   * Gets trending cubes
   */
  async getTrending(limit: number = 10): Promise<PublishedCube[]> {
    await simulateNetworkDelay(200)

    const sorted = sortCubes(mockPublishedCubes, 'trending', 'desc')
    return sorted.slice(0, limit).map((pub) => ({
      ...pub,
      isLiked: likedCubeIds.has(pub.id),
    }))
  },

  /**
   * Likes or unlikes a cube
   */
  async toggleLike(cubeId: string): Promise<LikeResult> {
    await simulateNetworkDelay(100)

    const cube = mockPublishedCubes.find((pub) => pub.id === cubeId)
    if (!cube) {
      return { success: false, isLiked: false, likeCount: 0 }
    }

    const wasLiked = likedCubeIds.has(cubeId)
    if (wasLiked) {
      likedCubeIds.delete(cubeId)
      cube.stats.likes = Math.max(0, cube.stats.likes - 1)
    } else {
      likedCubeIds.add(cubeId)
      cube.stats.likes += 1
    }

    saveLikedCubes()

    return {
      success: true,
      isLiked: !wasLiked,
      likeCount: cube.stats.likes,
    }
  },

  /**
   * Publishes a cube to the community gallery
   */
  async publishCube(
    request: PublishCubeRequest,
    author: UserProfile
  ): Promise<CubeOperationResult> {
    await simulateNetworkDelay(500)

    const now = new Date().toISOString()
    const newCube: PublishedCube = {
      id: `pub-${request.cube.id}-${Date.now()}`,
      cube: request.cube,
      author: {
        id: author.id,
        displayName: author.displayName,
        avatarUrl: author.avatarUrl,
      },
      status: 'published',
      visibility: request.visibility,
      category: request.category,
      stats: { ...DEFAULT_CUBE_STATS },
      isLiked: false,
      publishedAt: now,
      updatedAt: now,
      isFeatured: false,
      isStaffPick: false,
    }

    // Add tags from request
    if (request.tags) {
      newCube.cube.meta = {
        ...newCube.cube.meta,
        tags: [...(newCube.cube.meta?.tags || []), ...request.tags],
      }
    }

    mockPublishedCubes.unshift(newCube)

    return {
      success: true,
      cube: newCube,
    }
  },

  /**
   * Gets all unique tags from published cubes
   */
  async getAllTags(): Promise<string[]> {
    await simulateNetworkDelay(100)

    const tagSet = new Set<string>()
    mockPublishedCubes.forEach((pub) => {
      pub.cube.meta?.tags?.forEach((tag) => tagSet.add(tag))
    })

    return Array.from(tagSet).sort()
  },

  /**
   * Gets cubes by author
   */
  async getByAuthor(authorId: string, limit?: number): Promise<PublishedCube[]> {
    await simulateNetworkDelay(200)

    let cubes = mockPublishedCubes.filter((pub) => pub.author.id === authorId)
    if (limit) {
      cubes = cubes.slice(0, limit)
    }

    return cubes.map((pub) => ({
      ...pub,
      isLiked: likedCubeIds.has(pub.id),
    }))
  },

  /**
   * Increments the download count for a cube
   */
  async recordDownload(cubeId: string): Promise<void> {
    const cube = mockPublishedCubes.find((pub) => pub.id === cubeId)
    if (cube) {
      cube.stats.downloads += 1
    }
  },

  /**
   * Resets the mock database (for testing)
   */
  _resetMockData(): void {
    mockPublishedCubes = generateMockPublishedCubes()
    likedCubeIds.clear()
    saveLikedCubes()
  },

  /**
   * Gets the current mock data (for testing)
   */
  _getMockData(): PublishedCube[] {
    return mockPublishedCubes
  },
}

export default communityGalleryService
