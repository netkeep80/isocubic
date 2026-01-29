/**
 * Unit tests for ActionHistory component
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { ActionHistory } from './ActionHistory'
import type { CollaborativeAction, Participant, ActionType } from '../types/collaboration'

// Helper to create mock actions
const createMockAction = (overrides: Partial<CollaborativeAction> = {}): CollaborativeAction => ({
  id: `action-${Math.random().toString(36).slice(2)}`,
  type: 'add_cube',
  participantId: 'participant-1',
  timestamp: new Date().toISOString(),
  ...overrides,
})

// Helper to create mock participants
const createMockParticipant = (overrides: Partial<Participant> = {}): Participant => ({
  id: 'participant-1',
  name: 'Test User',
  role: 'editor',
  color: '#646cff',
  joinedAt: new Date().toISOString(),
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
    it('should render action list title', () => {
      const actions = [createMockAction()]

      render(<ActionHistory actions={actions} />)

      expect(screen.getByText('Action History')).toBeInTheDocument()
    })

    it('should display action count', () => {
      const actions = [createMockAction(), createMockAction(), createMockAction()]

      render(<ActionHistory actions={actions} />)

      expect(screen.getByText('3 actions')).toBeInTheDocument()
    })

    it('should render action items', () => {
      const actions = [createMockAction({ type: 'add_cube', targetId: 'cube-1' })]

      render(<ActionHistory actions={actions} />)

      expect(screen.getByText(/Added cube/)).toBeInTheDocument()
    })

    it('should render participant name when available', () => {
      const actions = [createMockAction({ participantId: 'p1' })]
      const participants = new Map([['p1', createMockParticipant({ id: 'p1', name: 'John' })]])

      render(<ActionHistory actions={actions} participants={participants} />)

      expect(screen.getByText('John')).toBeInTheDocument()
    })

    it('should show "Unknown" for unresolved participants', () => {
      const actions = [createMockAction({ participantId: 'unknown-id' })]

      render(<ActionHistory actions={actions} />)

      expect(screen.getByText('Unknown')).toBeInTheDocument()
    })

    it('should mark local participant actions', () => {
      const actions = [createMockAction({ participantId: 'local-p' })]

      const { container } = render(<ActionHistory actions={actions} localParticipantId="local-p" />)

      expect(container.querySelector('.action-history__item--local')).toBeInTheDocument()
    })

    it('should show "(you)" badge for local participant', () => {
      const actions = [createMockAction({ participantId: 'local-p' })]
      const participants = new Map([
        ['local-p', createMockParticipant({ id: 'local-p', name: 'Me' })],
      ])

      render(
        <ActionHistory actions={actions} participants={participants} localParticipantId="local-p" />
      )

      expect(screen.getByText('(you)')).toBeInTheDocument()
    })
  })

  describe('Action Types', () => {
    const actionTypes: Array<{ type: ActionType; expectedText: RegExp }> = [
      { type: 'add_cube', expectedText: /Added cube/ },
      { type: 'remove_cube', expectedText: /Removed cube/ },
      { type: 'modify_cube', expectedText: /Modified cube/ },
      { type: 'select_cube', expectedText: /Selected/ },
      { type: 'deselect_cube', expectedText: /Deselected/ },
      { type: 'move_cube', expectedText: /Moved cube/ },
      { type: 'rotate_cube', expectedText: /Rotated cube/ },
      { type: 'scale_cube', expectedText: /Scaled cube/ },
      { type: 'change_color', expectedText: /Changed color/ },
      { type: 'change_material', expectedText: /Changed material/ },
      { type: 'batch', expectedText: /Batch operation/ },
    ]

    actionTypes.forEach(({ type, expectedText }) => {
      it(`should display correct description for ${type}`, () => {
        const actions = [createMockAction({ type })]

        render(<ActionHistory actions={actions} />)

        expect(screen.getByText(expectedText)).toBeInTheDocument()
      })
    })
  })

  describe('Filtering', () => {
    it('should exclude cursor_move and presence_update by default', () => {
      const actions = [
        createMockAction({ type: 'cursor_move' }),
        createMockAction({ type: 'presence_update' }),
        createMockAction({ type: 'add_cube' }),
      ]

      render(<ActionHistory actions={actions} />)

      expect(screen.getByText('1 actions')).toBeInTheDocument()
    })

    it('should render filter buttons', () => {
      const actions = [createMockAction()]

      render(<ActionHistory actions={actions} />)

      expect(screen.getByRole('button', { name: 'Add' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Remove' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Modify' })).toBeInTheDocument()
    })

    it('should filter actions when filter is clicked', async () => {
      const actions = [
        createMockAction({ type: 'add_cube' }),
        createMockAction({ type: 'remove_cube' }),
        createMockAction({ type: 'add_cube' }),
      ]

      render(<ActionHistory actions={actions} />)

      const addFilter = screen.getByRole('button', { name: 'Add' })
      await act(async () => {
        fireEvent.click(addFilter)
      })

      expect(screen.getByText('2 actions')).toBeInTheDocument()
    })

    it('should show Clear button when filters are active', async () => {
      const actions = [createMockAction()]

      render(<ActionHistory actions={actions} />)

      const addFilter = screen.getByRole('button', { name: 'Add' })
      await act(async () => {
        fireEvent.click(addFilter)
      })

      expect(screen.getByRole('button', { name: 'Clear' })).toBeInTheDocument()
    })

    it('should clear filters when Clear is clicked', async () => {
      const actions = [
        createMockAction({ type: 'add_cube' }),
        createMockAction({ type: 'remove_cube' }),
      ]

      render(<ActionHistory actions={actions} />)

      // Activate filter
      const addFilter = screen.getByRole('button', { name: 'Add' })
      await act(async () => {
        fireEvent.click(addFilter)
      })

      // Clear filter
      const clearButton = screen.getByRole('button', { name: 'Clear' })
      await act(async () => {
        fireEvent.click(clearButton)
      })

      expect(screen.getByText('2 actions')).toBeInTheDocument()
    })

    it('should show no results message when filter matches nothing', async () => {
      const actions = [createMockAction({ type: 'add_cube' })]

      render(<ActionHistory actions={actions} />)

      // Filter by Remove (which we don't have)
      const removeFilter = screen.getByRole('button', { name: 'Remove' })
      await act(async () => {
        fireEvent.click(removeFilter)
      })

      expect(screen.getByText('No actions match the selected filters')).toBeInTheDocument()
    })
  })

  describe('Action Details', () => {
    it('should expand details when action is clicked', async () => {
      const actions = [createMockAction({ id: 'action-123', type: 'add_cube' })]

      render(<ActionHistory actions={actions} />)

      const actionButton = screen.getByRole('button', { name: /Added cube/ })
      await act(async () => {
        fireEvent.click(actionButton)
      })

      expect(screen.getByText('ID:')).toBeInTheDocument()
      expect(screen.getByText('Type:')).toBeInTheDocument()
    })

    it('should collapse details when clicked again', async () => {
      const actions = [createMockAction({ id: 'action-123', type: 'add_cube' })]

      render(<ActionHistory actions={actions} />)

      const actionButton = screen.getByRole('button', { name: /Added cube/ })

      // Expand
      await act(async () => {
        fireEvent.click(actionButton)
      })

      // Collapse
      await act(async () => {
        fireEvent.click(actionButton)
      })

      expect(screen.queryByText('ID:')).not.toBeInTheDocument()
    })

    it('should show target ID in details when available', async () => {
      const actions = [createMockAction({ targetId: 'cube-456' })]

      render(<ActionHistory actions={actions} />)

      const actionButton = screen.getByRole('button', { name: /Added cube/ })
      await act(async () => {
        fireEvent.click(actionButton)
      })

      expect(screen.getByText('Target:')).toBeInTheDocument()
      expect(screen.getByText('cube-456')).toBeInTheDocument()
    })
  })

  describe('Undo Functionality', () => {
    it('should show undo button for local participant actions', async () => {
      const actions = [createMockAction({ participantId: 'local-p' })]
      const onUndoAction = vi.fn()

      render(
        <ActionHistory actions={actions} localParticipantId="local-p" onUndoAction={onUndoAction} />
      )

      const actionButton = screen.getByRole('button', { name: /Added cube/ })
      await act(async () => {
        fireEvent.click(actionButton)
      })

      expect(screen.getByRole('button', { name: 'Undo' })).toBeInTheDocument()
    })

    it('should call onUndoAction when undo is clicked', async () => {
      const action = createMockAction({ participantId: 'local-p' })
      const onUndoAction = vi.fn()

      render(
        <ActionHistory
          actions={[action]}
          localParticipantId="local-p"
          onUndoAction={onUndoAction}
        />
      )

      const actionButton = screen.getByRole('button', { name: /Added cube/ })
      await act(async () => {
        fireEvent.click(actionButton)
      })

      const undoButton = screen.getByRole('button', { name: 'Undo' })
      await act(async () => {
        fireEvent.click(undoButton)
      })

      expect(onUndoAction).toHaveBeenCalledWith(action)
    })

    it('should not show undo button for other participants', async () => {
      const actions = [createMockAction({ participantId: 'other-p' })]
      const onUndoAction = vi.fn()

      render(
        <ActionHistory actions={actions} localParticipantId="local-p" onUndoAction={onUndoAction} />
      )

      const actionButton = screen.getByRole('button', { name: /Added cube/ })
      await act(async () => {
        fireEvent.click(actionButton)
      })

      expect(screen.queryByRole('button', { name: 'Undo' })).not.toBeInTheDocument()
    })
  })

  describe('Action Click Callback', () => {
    it('should call onActionClick when action is clicked', async () => {
      const action = createMockAction()
      const onActionClick = vi.fn()

      render(<ActionHistory actions={[action]} onActionClick={onActionClick} />)

      const actionButton = screen.getByRole('button', { name: /Added cube/ })
      await act(async () => {
        fireEvent.click(actionButton)
      })

      expect(onActionClick).toHaveBeenCalledWith(action)
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
    it('should group actions by participant when groupByParticipant is true', () => {
      const actions = [
        createMockAction({ participantId: 'p1' }),
        createMockAction({ participantId: 'p2' }),
        createMockAction({ participantId: 'p1' }),
      ]
      const participants = new Map([
        ['p1', createMockParticipant({ id: 'p1', name: 'User 1' })],
        ['p2', createMockParticipant({ id: 'p2', name: 'User 2' })],
      ])

      const { container } = render(
        <ActionHistory actions={actions} participants={participants} groupByParticipant={true} />
      )

      const groups = container.querySelectorAll('.action-history__group')
      expect(groups.length).toBe(2)
    })

    it('should show group headers with participant names', () => {
      const actions = [createMockAction({ participantId: 'p1' })]
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
      const timestamp = new Date(Date.now() - 30000).toISOString() // 30 seconds ago
      const actions = [createMockAction({ timestamp })]

      render(<ActionHistory actions={actions} />)

      expect(screen.getByText(/30s ago/)).toBeInTheDocument()
    })

    it('should display minutes ago for actions < 1 hour', () => {
      const timestamp = new Date(Date.now() - 300000).toISOString() // 5 minutes ago
      const actions = [createMockAction({ timestamp })]

      render(<ActionHistory actions={actions} />)

      expect(screen.getByText(/5m ago/)).toBeInTheDocument()
    })
  })
})
