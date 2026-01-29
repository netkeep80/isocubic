/**
 * Unit tests for CommunityGallery component (TASK 45)
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react'
import { CommunityGallery } from './CommunityGallery'
import { communityGalleryService } from '../lib/community-gallery'

// Mock community gallery service
vi.mock('../lib/community-gallery', () => ({
  communityGalleryService: {
    search: vi.fn(),
    toggleLike: vi.fn(),
    recordDownload: vi.fn(),
    _resetMockData: vi.fn(),
  },
}))

// Mock DevMode context
vi.mock('../lib/devmode', () => ({
  useIsDevModeEnabled: vi.fn(() => false),
}))

// Mock data
const mockPublishedCubes = [
  {
    id: 'pub-1',
    cube: {
      id: 'cube-1',
      base: { color: [0.5, 0.3, 0.2] as [number, number, number], roughness: 0.8 },
      gradients: [
        {
          axis: 'y' as const,
          factor: 0.3,
          color_shift: [0.1, 0.1, 0.1] as [number, number, number],
        },
      ],
      physics: { material: 'stone' as const },
      meta: { name: 'Mossy Stone', tags: ['stone', 'moss'] },
    },
    author: { id: 'user-1', displayName: 'Artist1' },
    status: 'published' as const,
    visibility: 'public' as const,
    category: 'nature' as const,
    stats: { views: 100, likes: 50, downloads: 25, comments: 5 },
    isLiked: false,
    isFeatured: true,
    isStaffPick: false,
    publishedAt: '2026-01-29T00:00:00Z',
    updatedAt: '2026-01-29T00:00:00Z',
  },
  {
    id: 'pub-2',
    cube: {
      id: 'cube-2',
      base: { color: [0.8, 0.7, 0.3] as [number, number, number], roughness: 0.2 },
      gradients: [],
      physics: { material: 'metal' as const },
      meta: { name: 'Golden Metal', tags: ['gold', 'metal', 'shiny'] },
    },
    author: { id: 'user-2', displayName: 'Artist2' },
    status: 'published' as const,
    visibility: 'public' as const,
    category: 'industrial' as const,
    stats: { views: 200, likes: 80, downloads: 40, comments: 10 },
    isLiked: true,
    isFeatured: false,
    isStaffPick: true,
    publishedAt: '2026-01-28T00:00:00Z',
    updatedAt: '2026-01-28T00:00:00Z',
  },
]

const mockSearchResponse = {
  cubes: mockPublishedCubes,
  pagination: {
    currentPage: 1,
    totalPages: 1,
    totalItems: 2,
    pageSize: 12,
    hasNextPage: false,
    hasPrevPage: false,
  },
  params: {
    filters: {},
    sortBy: 'recent' as const,
    page: 1,
    pageSize: 12,
  },
}

describe('CommunityGallery', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(communityGalleryService.search).mockResolvedValue(mockSearchResponse)
    vi.mocked(communityGalleryService.toggleLike).mockResolvedValue({
      success: true,
      isLiked: true,
      likeCount: 51,
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    it('should render gallery title', async () => {
      render(<CommunityGallery />)

      await waitFor(() => {
        expect(screen.getByText('Community Gallery')).toBeInTheDocument()
      })
    })

    it('should render subtitle', async () => {
      render(<CommunityGallery />)

      await waitFor(() => {
        expect(
          screen.getByText('Discover cubes created by the isocubic community')
        ).toBeInTheDocument()
      })
    })

    it('should render search input', async () => {
      render(<CommunityGallery />)

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Search by name, tags, author...')).toBeInTheDocument()
      })
    })

    it('should render category dropdown', async () => {
      render(<CommunityGallery />)

      await waitFor(() => {
        expect(screen.getByLabelText('Filter by category')).toBeInTheDocument()
      })
    })

    it('should render material dropdown', async () => {
      render(<CommunityGallery />)

      await waitFor(() => {
        expect(screen.getByLabelText('Filter by material')).toBeInTheDocument()
      })
    })

    it('should render sort dropdown', async () => {
      render(<CommunityGallery />)

      await waitFor(() => {
        expect(screen.getByLabelText('Sort by')).toBeInTheDocument()
      })
    })

    it('should show loading state initially', () => {
      render(<CommunityGallery />)
      expect(screen.getByText('Loading cubes...')).toBeInTheDocument()
    })

    it('should render cube cards after loading', async () => {
      render(<CommunityGallery />)

      await waitFor(() => {
        expect(screen.getByText('Mossy Stone')).toBeInTheDocument()
        expect(screen.getByText('Golden Metal')).toBeInTheDocument()
      })
    })

    it('should display author names', async () => {
      render(<CommunityGallery />)

      await waitFor(() => {
        expect(screen.getByText('by Artist1')).toBeInTheDocument()
        expect(screen.getByText('by Artist2')).toBeInTheDocument()
      })
    })

    it('should display cube tags', async () => {
      render(<CommunityGallery />)

      await waitFor(() => {
        expect(screen.getByText('stone')).toBeInTheDocument()
        expect(screen.getByText('moss')).toBeInTheDocument()
      })
    })

    it('should show featured badge', async () => {
      render(<CommunityGallery />)

      await waitFor(() => {
        expect(screen.getByText('Featured')).toBeInTheDocument()
      })
    })

    it('should show staff pick badge', async () => {
      render(<CommunityGallery />)

      await waitFor(() => {
        expect(screen.getByText('Staff Pick')).toBeInTheDocument()
      })
    })

    it('should display results count', async () => {
      render(<CommunityGallery />)

      await waitFor(() => {
        expect(screen.getByText(/Showing 2 of 2 cubes/)).toBeInTheDocument()
      })
    })
  })

  describe('Search', () => {
    it('should call search service when search input changes', async () => {
      render(<CommunityGallery />)

      await waitFor(() => {
        expect(screen.getByText('Mossy Stone')).toBeInTheDocument()
      })

      const searchInput = screen.getByPlaceholderText('Search by name, tags, author...')

      await act(async () => {
        fireEvent.change(searchInput, { target: { value: 'stone' } })
      })

      // Wait for debounce and search call
      await waitFor(() => {
        const calls = vi.mocked(communityGalleryService.search).mock.calls
        const lastCall = calls[calls.length - 1]
        expect(lastCall[0].filters.query).toBe('stone')
      })
    })

    it('should show clear button when search has value', async () => {
      render(<CommunityGallery />)

      await waitFor(() => {
        expect(screen.getByText('Mossy Stone')).toBeInTheDocument()
      })

      const searchInput = screen.getByPlaceholderText('Search by name, tags, author...')

      await act(async () => {
        fireEvent.change(searchInput, { target: { value: 'test' } })
      })

      expect(screen.getByLabelText('Clear search')).toBeInTheDocument()
    })

    it('should clear search when clear button is clicked', async () => {
      render(<CommunityGallery />)

      await waitFor(() => {
        expect(screen.getByText('Mossy Stone')).toBeInTheDocument()
      })

      const searchInput = screen.getByPlaceholderText('Search by name, tags, author...')

      await act(async () => {
        fireEvent.change(searchInput, { target: { value: 'test' } })
      })

      const clearButton = screen.getByLabelText('Clear search')

      await act(async () => {
        fireEvent.click(clearButton)
      })

      expect(searchInput).toHaveValue('')
    })
  })

  describe('Filtering', () => {
    it('should filter by category', async () => {
      render(<CommunityGallery />)

      await waitFor(() => {
        expect(screen.getByText('Mossy Stone')).toBeInTheDocument()
      })

      const categorySelect = screen.getByLabelText('Filter by category')

      await act(async () => {
        fireEvent.change(categorySelect, { target: { value: 'nature' } })
      })

      await waitFor(() => {
        const calls = vi.mocked(communityGalleryService.search).mock.calls
        const lastCall = calls[calls.length - 1]
        expect(lastCall[0].filters.category).toBe('nature')
      })
    })

    it('should filter by material type', async () => {
      render(<CommunityGallery />)

      await waitFor(() => {
        expect(screen.getByText('Mossy Stone')).toBeInTheDocument()
      })

      const materialSelect = screen.getByLabelText('Filter by material')

      await act(async () => {
        fireEvent.change(materialSelect, { target: { value: 'metal' } })
      })

      await waitFor(() => {
        const calls = vi.mocked(communityGalleryService.search).mock.calls
        const lastCall = calls[calls.length - 1]
        expect(lastCall[0].filters.materialType).toBe('metal')
      })
    })
  })

  describe('Sorting', () => {
    it('should sort by different options', async () => {
      render(<CommunityGallery />)

      await waitFor(() => {
        expect(screen.getByText('Mossy Stone')).toBeInTheDocument()
      })

      const sortSelect = screen.getByLabelText('Sort by')

      await act(async () => {
        fireEvent.change(sortSelect, { target: { value: 'popular' } })
      })

      await waitFor(() => {
        const calls = vi.mocked(communityGalleryService.search).mock.calls
        const lastCall = calls[calls.length - 1]
        expect(lastCall[0].sortBy).toBe('popular')
      })
    })
  })

  describe('Cube Selection', () => {
    it('should call onCubeSelect when a cube is clicked', async () => {
      const handleCubeSelect = vi.fn()
      render(<CommunityGallery onCubeSelect={handleCubeSelect} />)

      await waitFor(() => {
        expect(screen.getByText('Mossy Stone')).toBeInTheDocument()
      })

      const cubeCard = screen.getByLabelText('Select Mossy Stone')

      await act(async () => {
        fireEvent.click(cubeCard)
      })

      expect(handleCubeSelect).toHaveBeenCalledWith(mockPublishedCubes[0].cube)
      expect(communityGalleryService.recordDownload).toHaveBeenCalledWith('pub-1')
    })

    it('should handle keyboard navigation', async () => {
      const handleCubeSelect = vi.fn()
      render(<CommunityGallery onCubeSelect={handleCubeSelect} />)

      await waitFor(() => {
        expect(screen.getByText('Mossy Stone')).toBeInTheDocument()
      })

      const cubeCard = screen.getByLabelText('Select Mossy Stone')

      await act(async () => {
        fireEvent.keyDown(cubeCard, { key: 'Enter' })
      })

      expect(handleCubeSelect).toHaveBeenCalled()
    })
  })

  describe('Like Functionality', () => {
    it('should toggle like when like button is clicked', async () => {
      render(<CommunityGallery />)

      await waitFor(() => {
        expect(screen.getByText('Mossy Stone')).toBeInTheDocument()
      })

      // Find the unlike button (first cube is not liked)
      const likeButtons = screen.getAllByLabelText('Like')

      await act(async () => {
        fireEvent.click(likeButtons[0])
      })

      expect(communityGalleryService.toggleLike).toHaveBeenCalledWith('pub-1')
    })

    it('should show filled heart for liked cubes', async () => {
      render(<CommunityGallery />)

      await waitFor(() => {
        expect(screen.getByText('Mossy Stone')).toBeInTheDocument()
      })

      // Second cube is liked
      expect(screen.getByLabelText('Unlike')).toBeInTheDocument()
    })

    it('should update like count after toggling', async () => {
      render(<CommunityGallery />)

      await waitFor(() => {
        expect(screen.getByText('Mossy Stone')).toBeInTheDocument()
      })

      const likeButtons = screen.getAllByLabelText('Like')

      await act(async () => {
        fireEvent.click(likeButtons[0])
      })

      await waitFor(() => {
        expect(screen.getByText('51')).toBeInTheDocument()
      })
    })
  })

  describe('Empty State', () => {
    it('should show empty message when no cubes match filters', async () => {
      vi.mocked(communityGalleryService.search).mockResolvedValue({
        ...mockSearchResponse,
        cubes: [],
        pagination: {
          ...mockSearchResponse.pagination,
          totalItems: 0,
        },
      })

      render(<CommunityGallery />)

      await waitFor(() => {
        expect(screen.getByText('No community cubes available yet')).toBeInTheDocument()
      })
    })

    it('should show different message when filters are active', async () => {
      vi.mocked(communityGalleryService.search).mockResolvedValue({
        ...mockSearchResponse,
        cubes: [],
        pagination: {
          ...mockSearchResponse.pagination,
          totalItems: 0,
        },
      })

      render(<CommunityGallery />)

      await waitFor(() => {
        expect(screen.queryByText('Loading cubes...')).not.toBeInTheDocument()
      })

      const searchInput = screen.getByPlaceholderText('Search by name, tags, author...')

      await act(async () => {
        fireEvent.change(searchInput, { target: { value: 'nonexistent' } })
      })

      await waitFor(() => {
        expect(screen.getByText('No cubes match your search criteria')).toBeInTheDocument()
      })
    })
  })

  describe('Error State', () => {
    it('should show error message when search fails', async () => {
      vi.mocked(communityGalleryService.search).mockRejectedValue(new Error('Network error'))

      render(<CommunityGallery />)

      await waitFor(() => {
        expect(screen.getByText('Failed to load community cubes')).toBeInTheDocument()
      })
    })
  })

  describe('Pagination', () => {
    it('should show pagination when multiple pages exist', async () => {
      vi.mocked(communityGalleryService.search).mockResolvedValue({
        ...mockSearchResponse,
        pagination: {
          ...mockSearchResponse.pagination,
          totalPages: 3,
          hasNextPage: true,
        },
      })

      render(<CommunityGallery />)

      await waitFor(() => {
        expect(screen.getByLabelText('Next page')).toBeInTheDocument()
        expect(screen.getByLabelText('Previous page')).toBeInTheDocument()
      })
    })

    it('should disable previous button on first page', async () => {
      vi.mocked(communityGalleryService.search).mockResolvedValue({
        ...mockSearchResponse,
        pagination: {
          ...mockSearchResponse.pagination,
          totalPages: 3,
          hasPrevPage: false,
          hasNextPage: true,
        },
      })

      render(<CommunityGallery />)

      await waitFor(() => {
        expect(screen.getByLabelText('Previous page')).toBeDisabled()
      })
    })

    it('should disable next button on last page', async () => {
      vi.mocked(communityGalleryService.search).mockResolvedValue({
        ...mockSearchResponse,
        pagination: {
          ...mockSearchResponse.pagination,
          currentPage: 3,
          totalPages: 3,
          hasPrevPage: true,
          hasNextPage: false,
        },
      })

      render(<CommunityGallery />)

      await waitFor(() => {
        expect(screen.getByLabelText('Next page')).toBeDisabled()
      })
    })

    it('should call search with new page when pagination is used', async () => {
      vi.mocked(communityGalleryService.search).mockResolvedValue({
        ...mockSearchResponse,
        pagination: {
          ...mockSearchResponse.pagination,
          totalPages: 3,
          hasNextPage: true,
        },
      })

      render(<CommunityGallery />)

      await waitFor(() => {
        expect(screen.getByLabelText('Next page')).toBeInTheDocument()
      })

      const nextButton = screen.getByLabelText('Next page')

      await act(async () => {
        fireEvent.click(nextButton)
      })

      await waitFor(() => {
        const calls = vi.mocked(communityGalleryService.search).mock.calls
        const lastCall = calls[calls.length - 1]
        expect(lastCall[0].page).toBe(2)
      })
    })
  })

  describe('Stats Display', () => {
    it('should display view counts', async () => {
      render(<CommunityGallery />)

      await waitFor(() => {
        // Views are displayed with emoji prefix, so check for the stats container
        const viewStats = document.querySelectorAll('.community-gallery__views')
        expect(viewStats.length).toBe(2)
      })
    })

    it('should display download counts', async () => {
      render(<CommunityGallery />)

      await waitFor(() => {
        // Downloads are displayed with emoji prefix
        const downloadStats = document.querySelectorAll('.community-gallery__downloads')
        expect(downloadStats.length).toBe(2)
      })
    })

    it('should display like counts', async () => {
      render(<CommunityGallery />)

      await waitFor(() => {
        // Like counts are displayed in like buttons
        const likeButtons = document.querySelectorAll('.community-gallery__like-btn')
        expect(likeButtons.length).toBe(2)
      })
    })
  })
})
