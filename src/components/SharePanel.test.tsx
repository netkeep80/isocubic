/**
 * Unit tests for SharePanel component (TASK 46)
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SharePanel, SHARE_PANEL_META } from './SharePanel'
import { shareLinkService, generateQRCode } from '../lib/share-links'
import type { SpectralCube } from '../types/cube'
import type { ShareLink } from '../types/share'

// Mock the share-links service
vi.mock('../lib/share-links', () => ({
  shareLinkService: {
    createShareLink: vi.fn(),
    getUserShareLinks: vi.fn(),
    copyToClipboard: vi.fn(),
    deleteShareLink: vi.fn(),
    updateShareLink: vi.fn(),
    generateQRCode: vi.fn(),
    _resetMockData: vi.fn(),
  },
  generateQRCode: vi.fn(),
}))

// Mock devmode
vi.mock('../lib/devmode', () => ({
  useIsDevModeEnabled: vi.fn(() => false),
}))

// Mock ComponentInfo
vi.mock('./ComponentInfo', () => ({
  ComponentInfo: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

// Sample cube for testing
const sampleCube: SpectralCube = {
  id: 'test-cube',
  base: { color: [0.5, 0.5, 0.5], roughness: 0.7, transparency: 1.0 },
  prompt: 'A test cube',
  meta: { name: 'Test Cube', tags: ['test'] },
}

// Sample share link
const sampleShareLink: ShareLink = {
  id: 'abc12345',
  url: 'https://isocubic.app/share/abc12345',
  shortUrl: 'https://isocubic.app/s/abc12345',
  cube: sampleCube,
  visibility: 'public',
  protection: { enabled: false, currentAccessCount: 0 },
  expiration: 'never',
  isActive: true,
  ogTags: {
    title: 'Test Cube - isocubic',
    description: 'A test cube',
    type: 'website',
    siteName: 'isocubic',
  },
  analytics: {
    totalViews: 10,
    uniqueVisitors: 5,
    accessHistory: [],
  },
  createdAt: '2026-01-29T12:00:00Z',
}

describe('SharePanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Default mock implementations
    vi.mocked(shareLinkService.getUserShareLinks).mockResolvedValue([])
    vi.mocked(shareLinkService.createShareLink).mockResolvedValue({
      success: true,
      shareLink: sampleShareLink,
    })
    vi.mocked(shareLinkService.copyToClipboard).mockResolvedValue({ success: true })
    vi.mocked(shareLinkService.deleteShareLink).mockResolvedValue({ success: true })
    vi.mocked(shareLinkService.updateShareLink).mockResolvedValue({
      success: true,
      shareLink: { ...sampleShareLink, isActive: false },
    })
    vi.mocked(shareLinkService.generateQRCode).mockResolvedValue({
      success: true,
      data: '<svg></svg>',
      format: 'svg',
    })
    vi.mocked(generateQRCode).mockResolvedValue({
      success: true,
      data: '<svg></svg>',
      format: 'svg',
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  // --------------------------------------------------------------------------
  // Rendering Tests
  // --------------------------------------------------------------------------

  describe('Rendering', () => {
    it('renders the share panel', () => {
      render(<SharePanel currentCube={sampleCube} />)

      expect(screen.getByTestId('share-panel')).toBeInTheDocument()
      // Check for the heading specifically
      expect(screen.getByRole('heading', { name: 'Create Share Link' })).toBeInTheDocument()
    })

    it('renders visibility select', () => {
      render(<SharePanel currentCube={sampleCube} />)

      expect(screen.getByTestId('visibility-select')).toBeInTheDocument()
    })

    it('renders expiration select', () => {
      render(<SharePanel currentCube={sampleCube} />)

      expect(screen.getByTestId('expiration-select')).toBeInTheDocument()
    })

    it('renders create button', () => {
      render(<SharePanel currentCube={sampleCube} />)

      expect(screen.getByTestId('create-link-button')).toBeInTheDocument()
    })

    it('disables create button when no cube', () => {
      render(<SharePanel currentCube={null} />)

      expect(screen.getByTestId('create-link-button')).toBeDisabled()
    })

    it('shows empty state when no links', async () => {
      render(<SharePanel currentCube={sampleCube} />)

      await waitFor(() => {
        expect(screen.getByText('No share links created yet')).toBeInTheDocument()
      })
    })

    it('applies custom className', () => {
      render(<SharePanel currentCube={sampleCube} className="custom-class" />)

      expect(screen.getByTestId('share-panel')).toHaveClass('custom-class')
    })
  })

  // --------------------------------------------------------------------------
  // Visibility Selection Tests
  // --------------------------------------------------------------------------

  describe('Visibility Selection', () => {
    it('defaults to public visibility', () => {
      render(<SharePanel currentCube={sampleCube} />)

      const select = screen.getByTestId('visibility-select') as HTMLSelectElement
      expect(select.value).toBe('public')
    })

    it('shows password field when protected visibility selected', async () => {
      render(<SharePanel currentCube={sampleCube} />)

      const select = screen.getByTestId('visibility-select')
      fireEvent.change(select, { target: { value: 'protected' } })

      await waitFor(() => {
        expect(screen.getByTestId('password-input')).toBeInTheDocument()
      })
    })

    it('hides password field for non-protected visibility', () => {
      render(<SharePanel currentCube={sampleCube} />)

      const select = screen.getByTestId('visibility-select')
      fireEvent.change(select, { target: { value: 'unlisted' } })

      expect(screen.queryByTestId('password-input')).not.toBeInTheDocument()
    })

    it('shows visibility hint', () => {
      render(<SharePanel currentCube={sampleCube} />)

      expect(screen.getByText('Anyone with the link can access')).toBeInTheDocument()
    })
  })

  // --------------------------------------------------------------------------
  // Expiration Selection Tests
  // --------------------------------------------------------------------------

  describe('Expiration Selection', () => {
    it('defaults to never expiration', () => {
      render(<SharePanel currentCube={sampleCube} />)

      const select = screen.getByTestId('expiration-select') as HTMLSelectElement
      expect(select.value).toBe('never')
    })

    it('allows changing expiration', () => {
      render(<SharePanel currentCube={sampleCube} />)

      const select = screen.getByTestId('expiration-select')
      fireEvent.change(select, { target: { value: '24h' } })

      expect((select as HTMLSelectElement).value).toBe('24h')
    })

    it('shows expiration hint', () => {
      render(<SharePanel currentCube={sampleCube} />)

      expect(screen.getByText('Link never expires')).toBeInTheDocument()
    })
  })

  // --------------------------------------------------------------------------
  // Create Link Tests
  // --------------------------------------------------------------------------

  describe('Create Link', () => {
    it('creates link when button clicked', async () => {
      render(<SharePanel currentCube={sampleCube} />)

      const button = screen.getByTestId('create-link-button')
      await userEvent.click(button)

      expect(shareLinkService.createShareLink).toHaveBeenCalledWith({
        cube: sampleCube,
        visibility: 'public',
        password: undefined,
        expiration: 'never',
      })
    })

    it('shows success message after creating link', async () => {
      render(<SharePanel currentCube={sampleCube} />)

      await userEvent.click(screen.getByTestId('create-link-button'))

      await waitFor(() => {
        expect(screen.getByText('Share link created successfully!')).toBeInTheDocument()
      })
    })

    it('shows created link URL', async () => {
      render(<SharePanel currentCube={sampleCube} />)

      await userEvent.click(screen.getByTestId('create-link-button'))

      await waitFor(() => {
        expect(screen.getByTestId('share-link-url')).toHaveValue(sampleShareLink.url)
      })
    })

    it('generates QR code automatically', async () => {
      render(<SharePanel currentCube={sampleCube} />)

      await userEvent.click(screen.getByTestId('create-link-button'))

      await waitFor(() => {
        expect(screen.getByTestId('qr-code-container')).toBeInTheDocument()
      })
    })

    it('shows error message on failure', async () => {
      vi.mocked(shareLinkService.createShareLink).mockResolvedValue({
        success: false,
        error: 'Failed to create link',
      })

      render(<SharePanel currentCube={sampleCube} />)

      await userEvent.click(screen.getByTestId('create-link-button'))

      await waitFor(() => {
        expect(screen.getByText('Failed to create link')).toBeInTheDocument()
      })
    })

    it('disables button while creating', async () => {
      // Make createShareLink slow
      vi.mocked(shareLinkService.createShareLink).mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(() => resolve({ success: true, shareLink: sampleShareLink }), 100)
          )
      )

      render(<SharePanel currentCube={sampleCube} />)

      const button = screen.getByTestId('create-link-button')
      await userEvent.click(button)

      expect(button).toBeDisabled()
      expect(button).toHaveTextContent('Creating...')
    })

    it('disables button when protected but no password', async () => {
      render(<SharePanel currentCube={sampleCube} />)

      // Select protected visibility
      fireEvent.change(screen.getByTestId('visibility-select'), { target: { value: 'protected' } })

      await waitFor(() => {
        expect(screen.getByTestId('create-link-button')).toBeDisabled()
      })
    })

    it('enables button when protected with password', async () => {
      render(<SharePanel currentCube={sampleCube} />)

      // Select protected visibility
      fireEvent.change(screen.getByTestId('visibility-select'), { target: { value: 'protected' } })

      // Enter password
      await waitFor(() => {
        const passwordInput = screen.getByTestId('password-input')
        fireEvent.change(passwordInput, { target: { value: 'secret123' } })
      })

      await waitFor(() => {
        expect(screen.getByTestId('create-link-button')).not.toBeDisabled()
      })
    })

    it('passes password for protected links', async () => {
      render(<SharePanel currentCube={sampleCube} />)

      // Select protected visibility and enter password
      fireEvent.change(screen.getByTestId('visibility-select'), { target: { value: 'protected' } })

      await waitFor(() => {
        fireEvent.change(screen.getByTestId('password-input'), { target: { value: 'secret123' } })
      })

      await userEvent.click(screen.getByTestId('create-link-button'))

      expect(shareLinkService.createShareLink).toHaveBeenCalledWith(
        expect.objectContaining({
          visibility: 'protected',
          password: 'secret123',
        })
      )
    })

    it('calls onShareLinkCreated callback', async () => {
      const onShareLinkCreated = vi.fn()
      render(<SharePanel currentCube={sampleCube} onShareLinkCreated={onShareLinkCreated} />)

      await userEvent.click(screen.getByTestId('create-link-button'))

      await waitFor(() => {
        expect(onShareLinkCreated).toHaveBeenCalledWith(sampleShareLink)
      })
    })
  })

  // --------------------------------------------------------------------------
  // Copy to Clipboard Tests
  // --------------------------------------------------------------------------

  describe('Copy to Clipboard', () => {
    it('copies link when copy button clicked', async () => {
      render(<SharePanel currentCube={sampleCube} />)

      // Create a link first
      await userEvent.click(screen.getByTestId('create-link-button'))

      await waitFor(() => {
        expect(screen.getByTestId('copy-link-button')).toBeInTheDocument()
      })

      await userEvent.click(screen.getByTestId('copy-link-button'))

      expect(shareLinkService.copyToClipboard).toHaveBeenCalledWith(sampleShareLink)
    })

    it('shows Copied! after copying', async () => {
      render(<SharePanel currentCube={sampleCube} />)

      await userEvent.click(screen.getByTestId('create-link-button'))

      await waitFor(() => {
        expect(screen.getByTestId('copy-link-button')).toBeInTheDocument()
      })

      await userEvent.click(screen.getByTestId('copy-link-button'))

      await waitFor(() => {
        expect(screen.getByTestId('copy-link-button')).toHaveTextContent('Copied!')
      })
    })
  })

  // --------------------------------------------------------------------------
  // QR Code Tests
  // --------------------------------------------------------------------------

  describe('QR Code', () => {
    it('shows QR code after link creation', async () => {
      render(<SharePanel currentCube={sampleCube} />)

      await userEvent.click(screen.getByTestId('create-link-button'))

      await waitFor(() => {
        expect(screen.getByTestId('qr-code-container')).toBeInTheDocument()
      })
    })

    it('shows download QR button', async () => {
      render(<SharePanel currentCube={sampleCube} />)

      await userEvent.click(screen.getByTestId('create-link-button'))

      await waitFor(() => {
        expect(screen.getByTestId('download-qr-button')).toBeInTheDocument()
      })
    })
  })

  // --------------------------------------------------------------------------
  // Share Links List Tests
  // --------------------------------------------------------------------------

  describe('Share Links List', () => {
    beforeEach(() => {
      vi.mocked(shareLinkService.getUserShareLinks).mockResolvedValue([sampleShareLink])
    })

    it('loads user links on mount', async () => {
      render(<SharePanel currentCube={sampleCube} />)

      await waitFor(() => {
        expect(shareLinkService.getUserShareLinks).toHaveBeenCalled()
      })
    })

    it('displays existing share links', async () => {
      render(<SharePanel currentCube={sampleCube} />)

      await waitFor(() => {
        expect(screen.getByTestId('share-links-list')).toBeInTheDocument()
      })

      expect(screen.getByText(sampleShareLink.shortUrl)).toBeInTheDocument()
    })

    it('shows analytics for links', async () => {
      render(<SharePanel currentCube={sampleCube} />)

      await waitFor(() => {
        expect(screen.getByText('10 views')).toBeInTheDocument()
        expect(screen.getByText('5 unique')).toBeInTheDocument()
      })
    })

    it('shows active links count', async () => {
      render(<SharePanel currentCube={sampleCube} />)

      await waitFor(() => {
        expect(screen.getByText(/\(1 active\)/)).toBeInTheDocument()
      })
    })
  })

  // --------------------------------------------------------------------------
  // Delete Link Tests
  // --------------------------------------------------------------------------

  describe('Delete Link', () => {
    beforeEach(() => {
      vi.mocked(shareLinkService.getUserShareLinks).mockResolvedValue([sampleShareLink])
    })

    it('deletes link when delete button clicked', async () => {
      render(<SharePanel currentCube={sampleCube} />)

      await waitFor(() => {
        expect(screen.getByTestId('share-links-list')).toBeInTheDocument()
      })

      const deleteButton = screen.getByTitle('Delete link')
      await userEvent.click(deleteButton)

      expect(shareLinkService.deleteShareLink).toHaveBeenCalledWith(sampleShareLink.id)
    })
  })

  // --------------------------------------------------------------------------
  // Toggle Active Tests
  // --------------------------------------------------------------------------

  describe('Toggle Active', () => {
    beforeEach(() => {
      vi.mocked(shareLinkService.getUserShareLinks).mockResolvedValue([sampleShareLink])
    })

    it('toggles link active status', async () => {
      render(<SharePanel currentCube={sampleCube} />)

      await waitFor(() => {
        expect(screen.getByTestId('share-links-list')).toBeInTheDocument()
      })

      const toggleButton = screen.getByTitle('Deactivate link')
      await userEvent.click(toggleButton)

      expect(shareLinkService.updateShareLink).toHaveBeenCalledWith(sampleShareLink.id, {
        isActive: false,
      })
    })

    it('shows correct toggle button text for active links', async () => {
      render(<SharePanel currentCube={sampleCube} />)

      await waitFor(() => {
        expect(screen.getByText('Disable')).toBeInTheDocument()
      })
    })

    it('shows correct toggle button text for inactive links', async () => {
      vi.mocked(shareLinkService.getUserShareLinks).mockResolvedValue([
        { ...sampleShareLink, isActive: false },
      ])

      render(<SharePanel currentCube={sampleCube} />)

      await waitFor(() => {
        expect(screen.getByText('Enable')).toBeInTheDocument()
      })
    })
  })

  // --------------------------------------------------------------------------
  // Component Metadata Tests
  // --------------------------------------------------------------------------

  describe('Component Metadata', () => {
    it('has correct metadata id', () => {
      expect(SHARE_PANEL_META.id).toBe('share-panel')
    })

    it('has correct metadata name', () => {
      expect(SHARE_PANEL_META.name).toBe('SharePanel')
    })

    it('has correct phase', () => {
      expect(SHARE_PANEL_META.phase).toBe(7)
    })

    it('has correct taskId', () => {
      expect(SHARE_PANEL_META.taskId).toBe('TASK 46')
    })

    it('has features defined', () => {
      expect(SHARE_PANEL_META.features.length).toBeGreaterThan(0)
    })

    it('has link-generation feature', () => {
      const feature = SHARE_PANEL_META.features.find((f) => f.id === 'link-generation')
      expect(feature).toBeDefined()
      expect(feature!.enabled).toBe(true)
    })

    it('has qr-code feature', () => {
      const feature = SHARE_PANEL_META.features.find((f) => f.id === 'qr-code')
      expect(feature).toBeDefined()
      expect(feature!.enabled).toBe(true)
    })

    it('has password-protection feature', () => {
      const feature = SHARE_PANEL_META.features.find((f) => f.id === 'password-protection')
      expect(feature).toBeDefined()
      expect(feature!.enabled).toBe(true)
    })
  })

  // --------------------------------------------------------------------------
  // Loading States Tests
  // --------------------------------------------------------------------------

  describe('Loading States', () => {
    it('shows loading state while fetching links', async () => {
      vi.mocked(shareLinkService.getUserShareLinks).mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve([]), 100))
      )

      render(<SharePanel currentCube={sampleCube} />)

      expect(screen.getByText('Loading links...')).toBeInTheDocument()
    })
  })
})
