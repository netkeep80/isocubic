/**
 * Unit tests for SessionPanel component
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { SessionPanel } from './SessionPanel'
import type { CollaborationManager } from '../lib/collaboration'
import type { Session, Participant, ConnectionState } from '../types/collaboration'

// Mock collaboration manager
const createMockManager = (overrides: Partial<CollaborationManager> = {}): CollaborationManager => {
  const listeners = new Map<string, Set<(event: { data: unknown }) => void>>()

  return {
    getSession: vi.fn().mockReturnValue(null),
    getParticipants: vi.fn().mockReturnValue([]),
    getLocalParticipant: vi.fn().mockReturnValue(null),
    getState: vi.fn().mockReturnValue({ connectionState: 'disconnected' as ConnectionState }),
    createSession: vi.fn().mockReturnValue({ success: true }),
    leaveSession: vi.fn(),
    updateParticipantRole: vi.fn().mockReturnValue(true),
    kickParticipant: vi.fn().mockReturnValue(true),
    on: vi.fn((event: string, callback: (event: { data: unknown }) => void) => {
      if (!listeners.has(event)) {
        listeners.set(event, new Set())
      }
      listeners.get(event)!.add(callback)
    }),
    off: vi.fn((event: string, callback: (event: { data: unknown }) => void) => {
      listeners.get(event)?.delete(callback)
    }),
    ...overrides,
  } as unknown as CollaborationManager
}

// Mock session data
const mockSession: Session = {
  id: 'session-123',
  code: 'ABC123',
  ownerId: 'owner-1',
  settings: {
    name: 'Test Session',
    isOpen: true,
    maxParticipants: 10,
    allowRoleRequests: true,
    autoSaveInterval: 0,
  },
  participants: new Map(),
  cubes: new Map(),
  createdAt: new Date().toISOString(),
  modifiedAt: new Date().toISOString(),
}

// Mock participant data
const mockLocalParticipant: Participant = {
  id: 'owner-1',
  name: 'Test User',
  role: 'owner',
  color: '#646cff',
  joinedAt: new Date().toISOString(),
  lastActiveAt: new Date().toISOString(),
  status: 'online',
}

const mockOtherParticipant: Participant = {
  id: 'participant-2',
  name: 'Other User',
  role: 'editor',
  color: '#4caf50',
  joinedAt: new Date().toISOString(),
  lastActiveAt: new Date().toISOString(),
  status: 'online',
}

describe('SessionPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Idle State (No Session)', () => {
    it('should render collaboration title', () => {
      const mockManager = createMockManager()
      render(<SessionPanel collaborationManager={mockManager} />)

      expect(screen.getByText('Collaboration')).toBeInTheDocument()
    })

    it('should render welcome message', () => {
      const mockManager = createMockManager()
      render(<SessionPanel collaborationManager={mockManager} />)

      expect(screen.getByText(/Work together in real-time/)).toBeInTheDocument()
    })

    it('should render Create Session button', () => {
      const mockManager = createMockManager()
      render(<SessionPanel collaborationManager={mockManager} />)

      expect(screen.getByRole('button', { name: 'Create Session' })).toBeInTheDocument()
    })

    it('should render Join Session button', () => {
      const mockManager = createMockManager()
      render(<SessionPanel collaborationManager={mockManager} />)

      expect(screen.getByRole('button', { name: 'Join Session' })).toBeInTheDocument()
    })
  })

  describe('Create Session View', () => {
    it('should show create session form when Create Session is clicked', () => {
      const mockManager = createMockManager()
      render(<SessionPanel collaborationManager={mockManager} />)

      fireEvent.click(screen.getByRole('button', { name: 'Create Session' }))

      expect(screen.getByLabelText(/Your Name/)).toBeInTheDocument()
      expect(screen.getByLabelText(/Session Name/)).toBeInTheDocument()
    })

    it('should show back button in create view', () => {
      const mockManager = createMockManager()
      render(<SessionPanel collaborationManager={mockManager} />)

      fireEvent.click(screen.getByRole('button', { name: 'Create Session' }))

      expect(screen.getByRole('button', { name: 'Back' })).toBeInTheDocument()
    })

    it('should return to idle view when back is clicked', () => {
      const mockManager = createMockManager()
      render(<SessionPanel collaborationManager={mockManager} />)

      fireEvent.click(screen.getByRole('button', { name: 'Create Session' }))
      fireEvent.click(screen.getByRole('button', { name: 'Back' }))

      expect(screen.getByText('Collaboration')).toBeInTheDocument()
      expect(screen.queryByLabelText(/Your Name/)).not.toBeInTheDocument()
    })

    it('should show error when name is empty on create', () => {
      const mockManager = createMockManager()
      render(<SessionPanel collaborationManager={mockManager} />)

      fireEvent.click(screen.getByRole('button', { name: 'Create Session' }))
      fireEvent.click(screen.getByRole('button', { name: 'Create Session' }))

      expect(screen.getByText('Please enter your name')).toBeInTheDocument()
    })

    it('should call createSession on manager when form is valid', () => {
      const mockManager = createMockManager()
      render(<SessionPanel collaborationManager={mockManager} />)

      fireEvent.click(screen.getByRole('button', { name: 'Create Session' }))
      fireEvent.change(screen.getByLabelText(/Your Name/), { target: { value: 'Test User' } })
      fireEvent.click(screen.getByRole('button', { name: 'Create Session' }))

      expect(mockManager.createSession).toHaveBeenCalledWith('Test User', undefined)
    })
  })

  describe('Join Session View', () => {
    it('should show join session form when Join Session is clicked', () => {
      const mockManager = createMockManager()
      render(<SessionPanel collaborationManager={mockManager} />)

      fireEvent.click(screen.getByRole('button', { name: 'Join Session' }))

      expect(screen.getByLabelText(/Your Name/)).toBeInTheDocument()
      expect(screen.getByLabelText(/Session Code/)).toBeInTheDocument()
    })

    it('should show error when name is empty on join', () => {
      const mockManager = createMockManager()
      render(<SessionPanel collaborationManager={mockManager} />)

      fireEvent.click(screen.getByRole('button', { name: 'Join Session' }))
      fireEvent.click(screen.getByRole('button', { name: 'Join Session' }))

      expect(screen.getByText('Please enter your name')).toBeInTheDocument()
    })

    it('should show error when session code is empty on join', () => {
      const mockManager = createMockManager()
      render(<SessionPanel collaborationManager={mockManager} />)

      fireEvent.click(screen.getByRole('button', { name: 'Join Session' }))
      fireEvent.change(screen.getByLabelText(/Your Name/), { target: { value: 'Test User' } })
      fireEvent.click(screen.getByRole('button', { name: 'Join Session' }))

      expect(screen.getByText('Please enter session code')).toBeInTheDocument()
    })
  })

  describe('Active Session View', () => {
    it('should render session name when session is active', () => {
      const mockManager = createMockManager({
        getSession: vi.fn().mockReturnValue(mockSession),
        getParticipants: vi.fn().mockReturnValue([mockLocalParticipant]),
        getLocalParticipant: vi.fn().mockReturnValue(mockLocalParticipant),
        getState: vi.fn().mockReturnValue({ connectionState: 'connected' as ConnectionState }),
      })

      render(<SessionPanel collaborationManager={mockManager} />)

      expect(screen.getByText('Test Session')).toBeInTheDocument()
    })

    it('should show connection status when connected', () => {
      const mockManager = createMockManager({
        getSession: vi.fn().mockReturnValue(mockSession),
        getParticipants: vi.fn().mockReturnValue([mockLocalParticipant]),
        getLocalParticipant: vi.fn().mockReturnValue(mockLocalParticipant),
        getState: vi.fn().mockReturnValue({ connectionState: 'connected' as ConnectionState }),
      })

      render(<SessionPanel collaborationManager={mockManager} />)

      expect(screen.getByText('Connected')).toBeInTheDocument()
    })

    it('should display session code', () => {
      const mockManager = createMockManager({
        getSession: vi.fn().mockReturnValue(mockSession),
        getParticipants: vi.fn().mockReturnValue([mockLocalParticipant]),
        getLocalParticipant: vi.fn().mockReturnValue(mockLocalParticipant),
        getState: vi.fn().mockReturnValue({ connectionState: 'connected' as ConnectionState }),
      })

      render(<SessionPanel collaborationManager={mockManager} />)

      expect(screen.getByText('Session Code:')).toBeInTheDocument()
      expect(screen.getByText(/ABC.*123/)).toBeInTheDocument()
    })

    it('should display participants list', () => {
      const mockManager = createMockManager({
        getSession: vi.fn().mockReturnValue(mockSession),
        getParticipants: vi.fn().mockReturnValue([mockLocalParticipant, mockOtherParticipant]),
        getLocalParticipant: vi.fn().mockReturnValue(mockLocalParticipant),
        getState: vi.fn().mockReturnValue({ connectionState: 'connected' as ConnectionState }),
      })

      render(<SessionPanel collaborationManager={mockManager} />)

      expect(screen.getByText('Test User')).toBeInTheDocument()
      expect(screen.getByText('Other User')).toBeInTheDocument()
    })

    it('should show "(you)" next to local participant', () => {
      const mockManager = createMockManager({
        getSession: vi.fn().mockReturnValue(mockSession),
        getParticipants: vi.fn().mockReturnValue([mockLocalParticipant]),
        getLocalParticipant: vi.fn().mockReturnValue(mockLocalParticipant),
        getState: vi.fn().mockReturnValue({ connectionState: 'connected' as ConnectionState }),
      })

      render(<SessionPanel collaborationManager={mockManager} />)

      expect(screen.getByText('(you)')).toBeInTheDocument()
    })

    it('should show Leave Session button', () => {
      const mockManager = createMockManager({
        getSession: vi.fn().mockReturnValue(mockSession),
        getParticipants: vi.fn().mockReturnValue([mockLocalParticipant]),
        getLocalParticipant: vi.fn().mockReturnValue(mockLocalParticipant),
        getState: vi.fn().mockReturnValue({ connectionState: 'connected' as ConnectionState }),
      })

      render(<SessionPanel collaborationManager={mockManager} />)

      expect(screen.getByRole('button', { name: 'Leave Session' })).toBeInTheDocument()
    })

    it('should call leaveSession when Leave Session is clicked', () => {
      const mockManager = createMockManager({
        getSession: vi.fn().mockReturnValue(mockSession),
        getParticipants: vi.fn().mockReturnValue([mockLocalParticipant]),
        getLocalParticipant: vi.fn().mockReturnValue(mockLocalParticipant),
        getState: vi.fn().mockReturnValue({ connectionState: 'connected' as ConnectionState }),
      })

      render(<SessionPanel collaborationManager={mockManager} />)

      fireEvent.click(screen.getByRole('button', { name: 'Leave Session' }))

      expect(mockManager.leaveSession).toHaveBeenCalled()
    })

    it('should show role info for local participant', () => {
      const mockManager = createMockManager({
        getSession: vi.fn().mockReturnValue(mockSession),
        getParticipants: vi.fn().mockReturnValue([mockLocalParticipant]),
        getLocalParticipant: vi.fn().mockReturnValue(mockLocalParticipant),
        getState: vi.fn().mockReturnValue({ connectionState: 'connected' as ConnectionState }),
      })

      render(<SessionPanel collaborationManager={mockManager} />)

      expect(screen.getByText('Your role:')).toBeInTheDocument()
      // Check role info section has 'owner' - use getAllByText since it appears in multiple places
      const ownerTexts = screen.getAllByText('owner')
      expect(ownerTexts.length).toBeGreaterThanOrEqual(1)
    })
  })

  describe('Owner Controls', () => {
    it('should show role select for other participants when owner', () => {
      const mockManager = createMockManager({
        getSession: vi.fn().mockReturnValue(mockSession),
        getParticipants: vi.fn().mockReturnValue([mockLocalParticipant, mockOtherParticipant]),
        getLocalParticipant: vi.fn().mockReturnValue(mockLocalParticipant),
        getState: vi.fn().mockReturnValue({ connectionState: 'connected' as ConnectionState }),
      })

      render(<SessionPanel collaborationManager={mockManager} />)

      // Should have a select for the other participant
      const roleSelect = screen.getByRole('combobox', { name: /Change role for Other User/ })
      expect(roleSelect).toBeInTheDocument()
    })

    it('should show kick button for other participants when owner', () => {
      const mockManager = createMockManager({
        getSession: vi.fn().mockReturnValue(mockSession),
        getParticipants: vi.fn().mockReturnValue([mockLocalParticipant, mockOtherParticipant]),
        getLocalParticipant: vi.fn().mockReturnValue(mockLocalParticipant),
        getState: vi.fn().mockReturnValue({ connectionState: 'connected' as ConnectionState }),
      })

      render(<SessionPanel collaborationManager={mockManager} />)

      expect(screen.getByRole('button', { name: /Remove Other User/ })).toBeInTheDocument()
    })

    it('should call kickParticipant when kick button is clicked', async () => {
      const mockManager = createMockManager({
        getSession: vi.fn().mockReturnValue(mockSession),
        getParticipants: vi.fn().mockReturnValue([mockLocalParticipant, mockOtherParticipant]),
        getLocalParticipant: vi.fn().mockReturnValue(mockLocalParticipant),
        getState: vi.fn().mockReturnValue({ connectionState: 'connected' as ConnectionState }),
      })

      render(<SessionPanel collaborationManager={mockManager} />)

      fireEvent.click(screen.getByRole('button', { name: /Remove Other User/ }))

      expect(mockManager.kickParticipant).toHaveBeenCalledWith('participant-2')
    })

    it('should call updateParticipantRole when role is changed', () => {
      const mockManager = createMockManager({
        getSession: vi.fn().mockReturnValue(mockSession),
        getParticipants: vi.fn().mockReturnValue([mockLocalParticipant, mockOtherParticipant]),
        getLocalParticipant: vi.fn().mockReturnValue(mockLocalParticipant),
        getState: vi.fn().mockReturnValue({ connectionState: 'connected' as ConnectionState }),
      })

      render(<SessionPanel collaborationManager={mockManager} />)

      const roleSelect = screen.getByRole('combobox', { name: /Change role for Other User/ })
      fireEvent.change(roleSelect, { target: { value: 'viewer' } })

      expect(mockManager.updateParticipantRole).toHaveBeenCalledWith('participant-2', 'viewer')
    })

    it('should not show controls for non-owner participants', () => {
      const nonOwnerParticipant = { ...mockLocalParticipant, role: 'editor' as const }

      const mockManager = createMockManager({
        getSession: vi.fn().mockReturnValue(mockSession),
        getParticipants: vi.fn().mockReturnValue([nonOwnerParticipant, mockOtherParticipant]),
        getLocalParticipant: vi.fn().mockReturnValue(nonOwnerParticipant),
        getState: vi.fn().mockReturnValue({ connectionState: 'connected' as ConnectionState }),
      })

      render(<SessionPanel collaborationManager={mockManager} />)

      expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /Remove/ })).not.toBeInTheDocument()
    })
  })

  describe('Custom className', () => {
    it('should apply custom className', () => {
      const mockManager = createMockManager()
      const { container } = render(
        <SessionPanel collaborationManager={mockManager} className="custom-class" />
      )

      expect(container.querySelector('.session-panel.custom-class')).toBeInTheDocument()
    })
  })
})
