/**
 * Unit tests for ParticipantCursor component
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ParticipantCursor, CursorList } from './ParticipantCursor'
import type { Participant, CursorPosition } from '../types/collaboration'

// Mock participant data
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
        cursor: createMockCursor(),
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

    it('should display participant name in label', () => {
      const participant = createMockParticipant({
        name: 'Alice',
        cursor: createMockCursor(),
      })
      const cursor = createMockCursor()

      render(
        <ParticipantCursor
          participants={[{ participant, cursor }]}
          localParticipantId="different-id"
        />
      )

      expect(screen.getByText('Alice')).toBeInTheDocument()
    })

    it('should use participant color', () => {
      const participant = createMockParticipant({
        color: '#ff0000',
        cursor: createMockCursor(),
      })
      const cursor = createMockCursor()

      const { container } = render(
        <ParticipantCursor
          participants={[{ participant, cursor }]}
          localParticipantId="different-id"
        />
      )

      const label = container.querySelector('.participant-cursor__label')
      expect(label).toHaveStyle({ backgroundColor: '#ff0000' })
    })

    it('should render selection indicator when cube is selected', () => {
      const cursor = createMockCursor({ selectedCubeId: 'cube-123' })
      const participant = createMockParticipant({
        cursor,
      })

      const { container } = render(
        <ParticipantCursor
          participants={[{ participant, cursor }]}
          localParticipantId="different-id"
        />
      )

      expect(container.querySelector('.participant-cursor__selection')).toBeInTheDocument()
      expect(screen.getByText('Selected: cube-123')).toBeInTheDocument()
    })
  })

  describe('Filtering', () => {
    it('should exclude local participant', () => {
      const localParticipant = createMockParticipant({
        id: 'local-id',
        cursor: createMockCursor(),
      })

      const { container } = render(
        <ParticipantCursor
          participants={[{ participant: localParticipant, cursor: createMockCursor() }]}
          localParticipantId="local-id"
        />
      )

      expect(container.querySelector('.participant-cursor')).not.toBeInTheDocument()
    })

    it('should exclude offline participants', () => {
      const offlineParticipant = createMockParticipant({
        status: 'offline',
        cursor: createMockCursor(),
      })

      const { container } = render(
        <ParticipantCursor
          participants={[{ participant: offlineParticipant, cursor: createMockCursor() }]}
          localParticipantId="different-id"
        />
      )

      expect(container.querySelector('.participant-cursor')).not.toBeInTheDocument()
    })

    it('should exclude participants without cursor data', () => {
      const participant = createMockParticipant()

      const { container } = render(
        <ParticipantCursor
          participants={[{ participant, cursor: null }]}
          localParticipantId="different-id"
        />
      )

      expect(container.querySelector('.participant-cursor')).not.toBeInTheDocument()
    })
  })

  describe('Props', () => {
    it('should show coordinates when showCoordinates is true', () => {
      const cursor = createMockCursor({ x: 1.5, y: 2.0, z: 0.5 })
      const participant = createMockParticipant({
        cursor,
      })

      render(
        <ParticipantCursor
          participants={[{ participant, cursor }]}
          localParticipantId="different-id"
          showCoordinates={true}
        />
      )

      expect(screen.getByText(/\(1\.5, 2\.0, 0\.5\)/)).toBeInTheDocument()
    })

    it('should apply custom className', () => {
      const participant = createMockParticipant({
        cursor: createMockCursor(),
      })

      const { container } = render(
        <ParticipantCursor
          participants={[{ participant, cursor: createMockCursor() }]}
          localParticipantId="different-id"
          className="custom-class"
        />
      )

      expect(container.querySelector('.participant-cursors.custom-class')).toBeInTheDocument()
    })
  })
})

describe('CursorList', () => {
  describe('Empty State', () => {
    it('should show empty message when no participants', () => {
      render(<CursorList participants={[]} />)

      expect(screen.getByText('No other participants online')).toBeInTheDocument()
    })

    it('should show empty message when only local participant', () => {
      const localParticipant = createMockParticipant({ id: 'local-id' })

      render(
        <CursorList
          participants={[{ participant: localParticipant, cursor: createMockCursor() }]}
          localParticipantId="local-id"
        />
      )

      expect(screen.getByText('No other participants online')).toBeInTheDocument()
    })
  })

  describe('Rendering', () => {
    it('should render participant list', () => {
      const participant = createMockParticipant({ name: 'Alice' })

      render(
        <CursorList
          participants={[{ participant, cursor: createMockCursor() }]}
          localParticipantId="different-id"
        />
      )

      expect(screen.getByText('Participants')).toBeInTheDocument()
      expect(screen.getByText('Alice')).toBeInTheDocument()
    })

    it('should show cursor position', () => {
      const cursor = createMockCursor({ x: 1.5, y: 2.0, z: 0.5 })
      const participant = createMockParticipant()

      render(
        <CursorList participants={[{ participant, cursor }]} localParticipantId="different-id" />
      )

      expect(screen.getByText(/x: 1\.5, y: 2\.0, z: 0\.5/)).toBeInTheDocument()
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

    it('should use participant color', () => {
      const participant = createMockParticipant({ color: '#ff0000' })

      const { container } = render(
        <CursorList
          participants={[{ participant, cursor: createMockCursor() }]}
          localParticipantId="different-id"
        />
      )

      const colorIndicator = container.querySelector('.cursor-list__color')
      expect(colorIndicator).toHaveStyle({ backgroundColor: '#ff0000' })
    })
  })

  describe('Click Handler', () => {
    it('should call onCursorClick when item clicked', () => {
      const onCursorClick = vi.fn()
      const cursor = createMockCursor()
      const participant = createMockParticipant()

      render(
        <CursorList
          participants={[{ participant, cursor }]}
          localParticipantId="different-id"
          onCursorClick={onCursorClick}
        />
      )

      fireEvent.click(screen.getByRole('button'))

      expect(onCursorClick).toHaveBeenCalledWith(cursor, participant)
    })

    it('should disable button when cursor is null', () => {
      const onCursorClick = vi.fn()
      const participant = createMockParticipant()

      render(
        <CursorList
          participants={[{ participant, cursor: null }]}
          localParticipantId="different-id"
          onCursorClick={onCursorClick}
        />
      )

      expect(screen.getByRole('button')).toBeDisabled()
    })
  })

  describe('Status Indicator', () => {
    it('should show green for online status', () => {
      const participant = createMockParticipant({ status: 'online' })

      const { container } = render(
        <CursorList
          participants={[{ participant, cursor: createMockCursor() }]}
          localParticipantId="different-id"
        />
      )

      const status = container.querySelector('.cursor-list__status')
      expect(status).toHaveStyle({ backgroundColor: 'rgb(76, 175, 80)' })
    })

    it('should show orange for away status', () => {
      const participant = createMockParticipant({ status: 'away' })

      const { container } = render(
        <CursorList
          participants={[{ participant, cursor: createMockCursor() }]}
          localParticipantId="different-id"
        />
      )

      const status = container.querySelector('.cursor-list__status')
      expect(status).toHaveStyle({ backgroundColor: 'rgb(255, 152, 0)' })
    })
  })

  describe('Props', () => {
    it('should apply custom className', () => {
      const { container } = render(<CursorList participants={[]} className="custom-class" />)

      expect(container.querySelector('.cursor-list.custom-class')).toBeInTheDocument()
    })
  })
})
