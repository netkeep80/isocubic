/**
 * Unit tests for ParticipantCursor component
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { ParticipantCursor, CursorList } from './ParticipantCursor'
import type { Participant } from '../types/collaboration'
import type { CursorPosition } from './ParticipantCursor'

// Mock participant data
const createMockParticipant = (overrides: Partial<Participant> = {}): Participant => ({
  id: 'participant-1',
  name: 'Test User',
  role: 'editor',
  color: '#646cff',
  joinedAt: new Date().toISOString(),
  status: 'online',
  ...overrides,
})

// Mock cursor data
const createMockCursor = (overrides: Partial<CursorPosition> = {}): CursorPosition => ({
  x: 1.5,
  y: 2.0,
  z: 0.5,
  ...overrides,
})

describe('ParticipantCursor', () => {
  describe('Rendering', () => {
    it('should render nothing when no participants', () => {
      const { container } = render(<ParticipantCursor participants={[]} />)

      expect(container.querySelector('.participant-cursors')).not.toBeInTheDocument()
    })

    it('should render nothing when only local participant', () => {
      const participant = createMockParticipant()
      const cursor = createMockCursor()

      const { container } = render(
        <ParticipantCursor
          participants={[{ participant, cursor }]}
          localParticipantId={participant.id}
        />
      )

      expect(container.querySelector('.participant-cursors')).not.toBeInTheDocument()
    })

    it('should render cursor for remote participants', () => {
      const participant = createMockParticipant({
        presence: {
          cursor: createMockCursor(),
        },
      })
      const cursor = createMockCursor()

      const { container } = render(
        <ParticipantCursor
          participants={[{ participant, cursor }]}
          localParticipantId="different-id"
        />
      )

      expect(container.querySelector('.participant-cursors')).toBeInTheDocument()
      expect(container.querySelector('.participant-cursor')).toBeInTheDocument()
    })

    it('should not render cursor for offline participants', () => {
      const participant = createMockParticipant({
        status: 'offline',
        presence: {
          cursor: createMockCursor(),
        },
      })
      const cursor = createMockCursor()

      const { container } = render(
        <ParticipantCursor
          participants={[{ participant, cursor }]}
          localParticipantId="different-id"
        />
      )

      expect(container.querySelector('.participant-cursor')).not.toBeInTheDocument()
    })

    it('should display participant name', () => {
      const participant = createMockParticipant({
        name: 'John Doe',
        presence: {
          cursor: createMockCursor(),
        },
      })
      const cursor = createMockCursor()

      render(
        <ParticipantCursor
          participants={[{ participant, cursor }]}
          localParticipantId="different-id"
        />
      )

      expect(screen.getByText('John Doe')).toBeInTheDocument()
    })

    it('should display coordinates when showCoordinates is true', () => {
      const participant = createMockParticipant({
        presence: {
          cursor: { x: 1.5, y: 2.0, z: 3.0 },
        },
      })
      const cursor = { x: 1.5, y: 2.0, z: 3.0 }

      render(
        <ParticipantCursor
          participants={[{ participant, cursor }]}
          localParticipantId="different-id"
          showCoordinates={true}
        />
      )

      expect(screen.getByText('(1.5, 2.0, 3.0)')).toBeInTheDocument()
    })

    it('should show selection indicator when cube is selected', () => {
      const participant = createMockParticipant({
        presence: {
          cursor: { x: 1, y: 2, z: 3, selectedCubeId: 'cube-123' },
        },
      })
      const cursor = { x: 1, y: 2, z: 3, selectedCubeId: 'cube-123' }

      render(
        <ParticipantCursor
          participants={[{ participant, cursor }]}
          localParticipantId="different-id"
        />
      )

      expect(screen.getByText(/Selected: cube-123/)).toBeInTheDocument()
    })

    it('should apply custom className', () => {
      const participant = createMockParticipant({
        presence: {
          cursor: createMockCursor(),
        },
      })
      const cursor = createMockCursor()

      const { container } = render(
        <ParticipantCursor
          participants={[{ participant, cursor }]}
          localParticipantId="different-id"
          className="custom-class"
        />
      )

      expect(container.querySelector('.participant-cursors.custom-class')).toBeInTheDocument()
    })

    it('should render multiple cursors', () => {
      const participant1 = createMockParticipant({
        id: 'p1',
        name: 'User 1',
        presence: { cursor: createMockCursor() },
      })
      const participant2 = createMockParticipant({
        id: 'p2',
        name: 'User 2',
        presence: { cursor: createMockCursor() },
      })
      const cursor1 = createMockCursor()
      const cursor2 = createMockCursor()

      const { container } = render(
        <ParticipantCursor
          participants={[
            { participant: participant1, cursor: cursor1 },
            { participant: participant2, cursor: cursor2 },
          ]}
          localParticipantId="different-id"
        />
      )

      const cursors = container.querySelectorAll('.participant-cursor')
      expect(cursors.length).toBe(2)
    })
  })
})

describe('CursorList', () => {
  describe('Rendering', () => {
    it('should render empty message when no participants', () => {
      render(<CursorList participants={[]} />)

      expect(screen.getByText('No other participants online')).toBeInTheDocument()
    })

    it('should render empty message when only local participant', () => {
      const participant = createMockParticipant()
      const cursor = createMockCursor()

      render(
        <CursorList participants={[{ participant, cursor }]} localParticipantId={participant.id} />
      )

      expect(screen.getByText('No other participants online')).toBeInTheDocument()
    })

    it('should render title', () => {
      const participant = createMockParticipant()
      const cursor = createMockCursor()

      render(
        <CursorList participants={[{ participant, cursor }]} localParticipantId="different-id" />
      )

      expect(screen.getByText('Participants')).toBeInTheDocument()
    })

    it('should render participant list', () => {
      const participant = createMockParticipant({ name: 'Jane Doe' })
      const cursor = createMockCursor()

      render(
        <CursorList participants={[{ participant, cursor }]} localParticipantId="different-id" />
      )

      expect(screen.getByText('Jane Doe')).toBeInTheDocument()
    })

    it('should display cursor position', () => {
      const participant = createMockParticipant()
      const cursor = { x: 1.5, y: 2.5, z: 3.5 }

      render(
        <CursorList participants={[{ participant, cursor }]} localParticipantId="different-id" />
      )

      expect(screen.getByText('x: 1.5, y: 2.5, z: 3.5')).toBeInTheDocument()
    })

    it('should show "No position" when cursor is null', () => {
      const participant = createMockParticipant()

      render(
        <CursorList
          participants={[{ participant, cursor: null }]}
          localParticipantId="different-id"
        />
      )

      expect(screen.getByText('No position')).toBeInTheDocument()
    })

    it('should call onCursorClick when item is clicked', async () => {
      const onCursorClick = vi.fn()
      const participant = createMockParticipant()
      const cursor = createMockCursor()

      render(
        <CursorList
          participants={[{ participant, cursor }]}
          localParticipantId="different-id"
          onCursorClick={onCursorClick}
        />
      )

      const button = screen.getByRole('button')
      await act(async () => {
        fireEvent.click(button)
      })

      expect(onCursorClick).toHaveBeenCalledWith(cursor, participant)
    })

    it('should disable button when cursor is null', () => {
      const participant = createMockParticipant()

      render(
        <CursorList
          participants={[{ participant, cursor: null }]}
          localParticipantId="different-id"
        />
      )

      const button = screen.getByRole('button')
      expect(button).toBeDisabled()
    })

    it('should apply custom className', () => {
      const participant = createMockParticipant()
      const cursor = createMockCursor()

      const { container } = render(
        <CursorList
          participants={[{ participant, cursor }]}
          localParticipantId="different-id"
          className="custom-class"
        />
      )

      expect(container.querySelector('.cursor-list.custom-class')).toBeInTheDocument()
    })

    it('should not render offline participants', () => {
      const onlineParticipant = createMockParticipant({ id: 'p1', name: 'Online' })
      const offlineParticipant = createMockParticipant({
        id: 'p2',
        name: 'Offline',
        status: 'offline',
      })
      const cursor = createMockCursor()

      render(
        <CursorList
          participants={[
            { participant: onlineParticipant, cursor },
            { participant: offlineParticipant, cursor },
          ]}
          localParticipantId="different-id"
        />
      )

      expect(screen.getByText('Online')).toBeInTheDocument()
      expect(screen.queryByText('Offline')).not.toBeInTheDocument()
    })
  })
})
