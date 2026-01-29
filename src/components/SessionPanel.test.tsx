/**
 * Unit tests for SessionPanel component
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
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
  participantIds: ['owner-1', 'participant-2'],
  settings: {
    name: 'Test Session',
    maxParticipants: 10,
    allowAnonymous: false,
  },
  state: 'active',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
}

// Mock participant data
const mockLocalParticipant: Participant = {
  id: 'owner-1',
  name: 'Test User',
  role: 'owner',
  color: '#646cff',
  joinedAt: new Date().toISOString(),
  status: 'online',
}

const mockOtherParticipant: Participant = {
  id: 'participant-2',
  name: 'Other User',
  role: 'editor',
  color: '#4caf50',
  joinedAt: new Date().toISOString(),
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
    it('should show create session form when Create Session is clicked', async () => {
      const mockManager = createMockManager()
      render(<SessionPanel collaborationManager={mockManager} />)

      const createButton = screen.getByRole('button', { name: 'Create Session' })
      await act(async () => {
        fireEvent.click(createButton)
      })

      expect(screen.getByLabelText(/Your Name/)).toBeInTheDocument()
      expect(screen.getByLabelText(/Session Name/)).toBeInTheDocument()
    })

    it('should show back button in create view', async () => {
      const mockManager = createMockManager()
      render(<SessionPanel collaborationManager={mockManager} />)

      const createButton = screen.getByRole('button', { name: 'Create Session' })
      await act(async () => {
        fireEvent.click(createButton)
      })

      expect(screen.getByRole('button', { name: 'Back' })).toBeInTheDocument()
    })

    it('should return to idle view when back is clicked', async () => {
      const mockManager = createMockManager()
      render(<SessionPanel collaborationManager={mockManager} />)

      // Go to create view
      const createButton = screen.getByRole('button', { name: 'Create Session' })
      await act(async () => {
        fireEvent.click(createButton)
      })

      // Click back
      const backButton = screen.getByRole('button', { name: 'Back' })
      await act(async () => {
        fireEvent.click(backButton)
      })

      expect(screen.getByText('Collaboration')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Create Session' })).toBeInTheDocument()
    })

    it('should show error when name is empty on create', async () => {
      const mockManager = createMockManager()
      render(<SessionPanel collaborationManager={mockManager} />)

      // Go to create view
      const createButton = screen.getByRole('button', { name: 'Create Session' })
      await act(async () => {
        fireEvent.click(createButton)
      })

      // Click create without entering name
      const submitButton = screen.getByRole('button', { name: 'Create Session' })
      await act(async () => {
        fireEvent.click(submitButton)
      })

      expect(screen.getByRole('alert')).toBeInTheDocument()
      expect(screen.getByText(/Please enter your name/)).toBeInTheDocument()
    })

    it('should call createSession on manager when form is valid', async () => {
      const mockManager = createMockManager()
      render(<SessionPanel collaborationManager={mockManager} />)

      // Go to create view
      const createButton = screen.getByRole('button', { name: 'Create Session' })
      await act(async () => {
        fireEvent.click(createButton)
      })

      // Fill in name
      const nameInput = screen.getByLabelText(/Your Name/)
      await act(async () => {
        fireEvent.change(nameInput, { target: { value: 'Test User' } })
      })

      // Submit
      const submitButton = screen.getByRole('button', { name: 'Create Session' })
      await act(async () => {
        fireEvent.click(submitButton)
      })

      expect(mockManager.createSession).toHaveBeenCalledWith('Test User', undefined)
    })
  })

  describe('Join Session View', () => {
    it('should show join session form when Join Session is clicked', async () => {
      const mockManager = createMockManager()
      render(<SessionPanel collaborationManager={mockManager} />)

      const joinButton = screen.getByRole('button', { name: 'Join Session' })
      await act(async () => {
        fireEvent.click(joinButton)
      })

      expect(screen.getByLabelText(/Your Name/)).toBeInTheDocument()
      expect(screen.getByLabelText(/Session Code/)).toBeInTheDocument()
    })

    it('should show error when name is empty on join', async () => {
      const mockManager = createMockManager()
      render(<SessionPanel collaborationManager={mockManager} />)

      // Go to join view
      const joinButton = screen.getByRole('button', { name: 'Join Session' })
      await act(async () => {
        fireEvent.click(joinButton)
      })

      // Click join without entering data
      const submitButton = screen.getByRole('button', { name: 'Join Session' })
      await act(async () => {
        fireEvent.click(submitButton)
      })

      expect(screen.getByRole('alert')).toBeInTheDocument()
      expect(screen.getByText(/Please enter your name/)).toBeInTheDocument()
    })

    it('should show error when session code is empty on join', async () => {
      const mockManager = createMockManager()
      render(<SessionPanel collaborationManager={mockManager} />)

      // Go to join view
      const joinButton = screen.getByRole('button', { name: 'Join Session' })
      await act(async () => {
        fireEvent.click(joinButton)
      })

      // Fill in name but not code
      const nameInput = screen.getByLabelText(/Your Name/)
      await act(async () => {
        fireEvent.change(nameInput, { target: { value: 'Test User' } })
      })

      // Click join
      const submitButton = screen.getByRole('button', { name: 'Join Session' })
      await act(async () => {
        fireEvent.click(submitButton)
      })

      expect(screen.getByRole('alert')).toBeInTheDocument()
      expect(screen.getByText(/Please enter session code/)).toBeInTheDocument()
    })
  })

  describe('Active Session View', () => {
    it('should render session name when session is active', () => {
      const mockManager = createMockManager({
        getSession: vi.fn().mockReturnValue(mockSession),
        getParticipants: vi.fn().mockReturnValue([mockLocalParticipant, mockOtherParticipant]),
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
      expect(screen.getByText(/ABC-123/)).toBeInTheDocument()
    })

    it('should display participant count', () => {
      const mockManager = createMockManager({
        getSession: vi.fn().mockReturnValue(mockSession),
        getParticipants: vi.fn().mockReturnValue([mockLocalParticipant, mockOtherParticipant]),
        getLocalParticipant: vi.fn().mockReturnValue(mockLocalParticipant),
        getState: vi.fn().mockReturnValue({ connectionState: 'connected' as ConnectionState }),
      })

      render(<SessionPanel collaborationManager={mockManager} />)

      expect(screen.getByText('Participants (2)')).toBeInTheDocument()
    })

    it('should display participant list', () => {
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

    it('should show "(you)" indicator for local participant', () => {
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

    it('should call leaveSession when Leave Session is clicked', async () => {
      const mockManager = createMockManager({
        getSession: vi.fn().mockReturnValue(mockSession),
        getParticipants: vi.fn().mockReturnValue([mockLocalParticipant]),
        getLocalParticipant: vi.fn().mockReturnValue(mockLocalParticipant),
        getState: vi.fn().mockReturnValue({ connectionState: 'connected' as ConnectionState }),
      })

      render(<SessionPanel collaborationManager={mockManager} />)

      const leaveButton = screen.getByRole('button', { name: 'Leave Session' })
      await act(async () => {
        fireEvent.click(leaveButton)
      })

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

      const kickButton = screen.getByRole('button', { name: /Remove Other User/ })
      await act(async () => {
        fireEvent.click(kickButton)
      })

      expect(mockManager.kickParticipant).toHaveBeenCalledWith('participant-2')
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
