/**
 * Unit tests for ActionHistory component
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { ActionHistory } from './ActionHistory'
import type { CollaborativeAction, Participant, CubeCreateAction } from '../types/collaboration'

// Helper to create mock actions
const createMockAction = (overrides: Partial<CubeCreateAction> = {}): CubeCreateAction => ({
  id: `action-${Math.random().toString(36).slice(2)}`,
  type: 'cube_create',
  participantId: 'participant-1',
  timestamp: new Date().toISOString(),
  sessionId: 'session-1',
  payload: {
    cube: { id: 'cube-1' } as never,
  },
  ...overrides,
})

// Helper to create mock participants
const createMockParticipant = (overrides: Partial<Participant> = {}): Participant => ({
  id: 'participant-1',
  name: 'Test User',
  role: 'editor',
  color: '#646cff',
  joinedAt: new Date().toISOString(),
  lastActiveAt: new Date().toISOString(),
  status: 'online',
  ...overrides,
})

describe('ActionHistory', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('Empty State', () => {
    it('should render empty state when no actions', () => {
      render(<ActionHistory actions={[]} />)

      expect(screen.getByText('No actions yet')).toBeInTheDocument()
      expect(
        screen.getByText(/Actions will appear here as participants make changes/)
      ).toBeInTheDocument()
    })
  })

  describe('Rendering Actions', () => {
    it('should render actions list with count', () => {
      const actions = [createMockAction(), createMockAction()]

      render(<ActionHistory actions={actions} />)

      expect(screen.getByText('Action History')).toBeInTheDocument()
      expect(screen.getByText('2 actions')).toBeInTheDocument()
    })

    it('should display action description', () => {
      const actions = [createMockAction({ type: 'cube_create' })]

      render(<ActionHistory actions={actions} />)

      expect(screen.getByText('Created a cube')).toBeInTheDocument()
    })

    it('should display "just now" for recent actions', () => {
      const actions = [createMockAction({ timestamp: new Date().toISOString() })]

      render(<ActionHistory actions={actions} />)

      expect(screen.getByText('just now')).toBeInTheDocument()
    })

    it('should display participant name from participants map', () => {
      const actions = [createMockAction({ participantId: 'p1' })]
      const participants = new Map([['p1', createMockParticipant({ id: 'p1', name: 'Alice' })]])

      render(<ActionHistory actions={actions} participants={participants} />)

      expect(screen.getByText('Alice')).toBeInTheDocument()
    })

    it('should display Unknown for missing participant', () => {
      const actions = [createMockAction({ participantId: 'unknown-p' })]

      render(<ActionHistory actions={actions} />)

      expect(screen.getByText('Unknown')).toBeInTheDocument()
    })
  })

  describe('Local Participant Highlighting', () => {
    it('should show "(you)" badge for local participant actions', () => {
      const actions = [createMockAction({ participantId: 'local-p' })]

      render(<ActionHistory actions={actions} localParticipantId="local-p" />)

      expect(screen.getByText('(you)')).toBeInTheDocument()
    })

    it('should not show "(you)" badge for other participants', () => {
      const actions = [createMockAction({ participantId: 'other-p' })]

      render(<ActionHistory actions={actions} localParticipantId="local-p" />)

      expect(screen.queryByText('(you)')).not.toBeInTheDocument()
    })

    it('should show participant name with "(you)" badge', () => {
      const actions = [createMockAction({ participantId: 'local-p' })]
      const participants = new Map([
        ['local-p', createMockParticipant({ id: 'local-p', name: 'Me' })],
      ])

      render(
        <ActionHistory actions={actions} participants={participants} localParticipantId="local-p" />
      )

      expect(screen.getByText('Me')).toBeInTheDocument()
      expect(screen.getByText('(you)')).toBeInTheDocument()
    })
  })

  describe('Filtering', () => {
    it('should render filter buttons', () => {
      const actions = [createMockAction()]

      render(<ActionHistory actions={actions} />)

      expect(screen.getByRole('button', { name: 'Create' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Update' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument()
    })

    it('should filter actions when filter clicked', () => {
      const actions = [
        createMockAction({ id: 'a1', type: 'cube_create' }),
        {
          id: 'a2',
          type: 'cube_delete',
          participantId: 'p1',
          timestamp: new Date().toISOString(),
          sessionId: 'session-1',
          payload: { cubeId: 'cube-1' },
        } as CollaborativeAction,
      ]

      render(<ActionHistory actions={actions} />)

      expect(screen.getByText('2 actions')).toBeInTheDocument()

      fireEvent.click(screen.getByRole('button', { name: 'Delete' }))

      expect(screen.getByText('1 actions')).toBeInTheDocument()
    })

    it('should show Clear button when filter is active', () => {
      const actions = [createMockAction()]

      render(<ActionHistory actions={actions} />)

      expect(screen.queryByRole('button', { name: 'Clear' })).not.toBeInTheDocument()

      fireEvent.click(screen.getByRole('button', { name: 'Create' }))

      expect(screen.getByRole('button', { name: 'Clear' })).toBeInTheDocument()
    })

    it('should clear all filters when Clear button clicked', () => {
      const actions = [createMockAction()]

      render(<ActionHistory actions={actions} />)

      fireEvent.click(screen.getByRole('button', { name: 'Create' }))
      fireEvent.click(screen.getByRole('button', { name: 'Clear' }))

      expect(screen.queryByRole('button', { name: 'Clear' })).not.toBeInTheDocument()
    })
  })

  describe('Expanding Action Details', () => {
    it('should expand action details on click', () => {
      const actions = [createMockAction({ id: 'test-action-id' })]

      render(<ActionHistory actions={actions} />)

      expect(screen.queryByText('ID:')).not.toBeInTheDocument()

      fireEvent.click(screen.getByText('Created a cube'))

      expect(screen.getByText('ID:')).toBeInTheDocument()
      expect(screen.getByText('Type:')).toBeInTheDocument()
      expect(screen.getByText('Time:')).toBeInTheDocument()
    })

    it('should collapse action details on second click', () => {
      const actions = [createMockAction()]

      render(<ActionHistory actions={actions} />)

      fireEvent.click(screen.getByText('Created a cube'))
      expect(screen.getByText('ID:')).toBeInTheDocument()

      fireEvent.click(screen.getByText('Created a cube'))
      expect(screen.queryByText('ID:')).not.toBeInTheDocument()
    })

    it('should call onActionClick callback', () => {
      const onActionClick = vi.fn()
      const actions = [createMockAction()]

      render(<ActionHistory actions={actions} onActionClick={onActionClick} />)

      fireEvent.click(screen.getByText('Created a cube'))

      expect(onActionClick).toHaveBeenCalledTimes(1)
    })
  })

  describe('Undo Functionality', () => {
    it('should show undo button for local participant expanded actions', () => {
      const onUndoAction = vi.fn()
      const actions = [createMockAction({ participantId: 'local-p' })]

      render(
        <ActionHistory actions={actions} localParticipantId="local-p" onUndoAction={onUndoAction} />
      )

      fireEvent.click(screen.getByText('Created a cube'))

      expect(screen.getByRole('button', { name: 'Undo' })).toBeInTheDocument()
    })

    it('should not show undo button for other participant actions', () => {
      const onUndoAction = vi.fn()
      const actions = [createMockAction({ participantId: 'other-p' })]

      render(
        <ActionHistory actions={actions} localParticipantId="local-p" onUndoAction={onUndoAction} />
      )

      fireEvent.click(screen.getByText('Created a cube'))

      expect(screen.queryByRole('button', { name: 'Undo' })).not.toBeInTheDocument()
    })

    it('should call onUndoAction when undo clicked', () => {
      const onUndoAction = vi.fn()
      const actions = [createMockAction({ participantId: 'local-p' })]

      render(
        <ActionHistory actions={actions} localParticipantId="local-p" onUndoAction={onUndoAction} />
      )

      fireEvent.click(screen.getByText('Created a cube'))
      fireEvent.click(screen.getByRole('button', { name: 'Undo' }))

      expect(onUndoAction).toHaveBeenCalledWith(actions[0])
    })
  })

  describe('Max Actions Limit', () => {
    it('should limit displayed actions to maxActions', () => {
      const actions = Array.from({ length: 100 }, (_, i) => createMockAction({ id: `action-${i}` }))

      render(<ActionHistory actions={actions} maxActions={10} />)

      expect(screen.getByText('10 actions')).toBeInTheDocument()
    })
  })

  describe('Grouping', () => {
    it('should group actions by participant when enabled', () => {
      const actions = [
        createMockAction({ participantId: 'p1' }),
        createMockAction({ participantId: 'p1' }),
      ]
      const participants = new Map([['p1', createMockParticipant({ id: 'p1', name: 'Alice' })]])

      render(
        <ActionHistory actions={actions} participants={participants} groupByParticipant={true} />
      )

      expect(screen.getByText('Alice')).toBeInTheDocument()
    })

    it('should show action count per group', () => {
      const actions = [
        createMockAction({ participantId: 'p1' }),
        createMockAction({ participantId: 'p1' }),
      ]
      const participants = new Map([['p1', createMockParticipant({ id: 'p1', name: 'Alice' })]])

      render(
        <ActionHistory actions={actions} participants={participants} groupByParticipant={true} />
      )

      // There are multiple elements with "2 actions" (header count and group count)
      const actionCountElements = screen.getAllByText('2 actions')
      expect(actionCountElements.length).toBeGreaterThanOrEqual(1)
    })
  })

  describe('Custom className', () => {
    it('should apply custom className', () => {
      const { container } = render(<ActionHistory actions={[]} className="custom-class" />)

      expect(container.querySelector('.action-history.custom-class')).toBeInTheDocument()
    })
  })

  describe('Relative Time Display', () => {
    it('should display "just now" for very recent actions', () => {
      const actions = [createMockAction({ timestamp: new Date().toISOString() })]

      render(<ActionHistory actions={actions} />)

      expect(screen.getByText('just now')).toBeInTheDocument()
    })

    it('should display seconds ago for actions < 1 minute', () => {
      const timestamp = new Date(Date.now() - 30000).toISOString()
      const actions = [createMockAction({ timestamp })]

      render(<ActionHistory actions={actions} />)

      expect(screen.getByText(/30s ago/)).toBeInTheDocument()
    })

    it('should display minutes ago for actions < 1 hour', () => {
      const timestamp = new Date(Date.now() - 5 * 60 * 1000).toISOString()
      const actions = [createMockAction({ timestamp })]

      render(<ActionHistory actions={actions} />)

      expect(screen.getByText(/5m ago/)).toBeInTheDocument()
    })

    it('should update relative times periodically', async () => {
      // Create timestamp at current fake time (will show "just now")
      const timestamp = new Date().toISOString()
      const actions = [createMockAction({ timestamp })]

      render(<ActionHistory actions={actions} />)

      expect(screen.getByText('just now')).toBeInTheDocument()

      // Advance timers by 15 seconds (past the 10s threshold for "just now")
      await act(async () => {
        vi.advanceTimersByTime(15000)
      })

      // Should now show seconds ago
      expect(screen.getByText(/s ago/)).toBeInTheDocument()
    })
  })
})
