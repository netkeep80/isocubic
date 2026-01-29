/**
 * ParticipantCursor component for displaying other participants' cursors in 3D space
 * Shows cursor position, name label, and selection highlighting
 */

import { useMemo } from 'react'
import type { Participant, CursorPosition } from '../types/collaboration'

/**
 * Props for single cursor display
 */
export interface CursorDisplayProps {
  /** Participant info */
  participant: Participant
  /** Whether to show cursor position as tooltip */
  showCoordinates?: boolean
  /** Animation duration in ms */
  animationDuration?: number
}

/**
 * Props for ParticipantCursor component (multiple cursors overlay)
 */
export interface ParticipantCursorProps {
  /** List of participants with their cursor positions */
  participants: Array<{
    participant: Participant
    cursor: CursorPosition | null
  }>
  /** Local participant ID to exclude from display */
  localParticipantId?: string
  /** Whether to show coordinates on hover */
  showCoordinates?: boolean
  /** Animation duration for cursor movement */
  animationDuration?: number
  /** Custom class name */
  className?: string
}

/**
 * Single cursor display component
 * Renders a single participant's cursor with color, name, and optional selection
 */
function CursorDisplay({
  participant,
  showCoordinates = false,
  animationDuration = 100,
}: CursorDisplayProps) {
  const cursor = participant.cursor

  const cursorStyle = useMemo(
    () => ({
      '--cursor-color': participant.color,
      '--animation-duration': `${animationDuration}ms`,
    }),
    [participant.color, animationDuration]
  )

  // Don't render if no cursor position
  if (!cursor) {
    return null
  }

  return (
    <div
      className="participant-cursor"
      style={cursorStyle as React.CSSProperties}
      data-participant-id={participant.id}
      data-selected-cube={cursor.selectedCubeId || ''}
    >
      {/* Cursor icon */}
      <svg
        className="participant-cursor__icon"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M5.5 3.21V20.8c0 .45.54.67.85.35l4.86-4.86a.5.5 0 0 1 .35-.15h6.87a.5.5 0 0 0 .35-.85L6.35 2.86a.5.5 0 0 0-.85.35z"
          fill={participant.color}
          stroke="#000"
          strokeWidth="1"
        />
      </svg>

      {/* Name label */}
      <div className="participant-cursor__label" style={{ backgroundColor: participant.color }}>
        <span className="participant-cursor__name">{participant.name}</span>
        {showCoordinates && cursor && (
          <span className="participant-cursor__coords">
            ({cursor.x.toFixed(1)}, {cursor.y.toFixed(1)}, {cursor.z.toFixed(1)})
          </span>
        )}
      </div>

      {/* Selection indicator (if participant has selected a cube) */}
      {cursor.selectedCubeId && (
        <div className="participant-cursor__selection" style={{ borderColor: participant.color }}>
          <span className="participant-cursor__selection-label">
            Selected: {cursor.selectedCubeId}
          </span>
        </div>
      )}
    </div>
  )
}

/**
 * ParticipantCursors overlay component
 * Displays all remote participants' cursors in the 3D viewport
 */
export function ParticipantCursor({
  participants,
  localParticipantId,
  showCoordinates = false,
  animationDuration = 100,
  className = '',
}: ParticipantCursorProps) {
  // Filter out local participant and those without cursor positions
  const remoteCursors = useMemo(() => {
    return participants.filter(({ participant, cursor }) => {
      // Exclude local participant
      if (localParticipantId && participant.id === localParticipantId) {
        return false
      }
      // Exclude if no cursor data
      if (!cursor && !participant.cursor) {
        return false
      }
      // Exclude offline participants
      if (participant.status === 'offline') {
        return false
      }
      return true
    })
  }, [participants, localParticipantId])

  // If no remote cursors, render nothing
  if (remoteCursors.length === 0) {
    return null
  }

  return (
    <div className={`participant-cursors ${className}`}>
      {remoteCursors.map(({ participant }) => (
        <CursorDisplay
          key={participant.id}
          participant={participant}
          showCoordinates={showCoordinates}
          animationDuration={animationDuration}
        />
      ))}
    </div>
  )
}

/**
 * Cursor list component for displaying cursors in a sidebar/panel format
 * Shows participant names with their current positions
 */
export interface CursorListProps {
  /** List of participants with their cursor positions */
  participants: Array<{
    participant: Participant
    cursor: CursorPosition | null
  }>
  /** Local participant ID to exclude from display */
  localParticipantId?: string
  /** Callback when clicking on a cursor entry (to focus that position) */
  onCursorClick?: (cursor: CursorPosition, participant: Participant) => void
  /** Custom class name */
  className?: string
}

/**
 * CursorList component
 * Displays cursors in a list format for sidebar/panel
 */
export function CursorList({
  participants,
  localParticipantId,
  onCursorClick,
  className = '',
}: CursorListProps) {
  // Filter and prepare cursor data
  const cursors = useMemo(() => {
    return participants
      .filter(({ participant }) => {
        if (localParticipantId && participant.id === localParticipantId) {
          return false
        }
        return participant.status !== 'offline'
      })
      .map(({ participant, cursor }) => ({
        participant,
        cursor: cursor ?? participant.cursor ?? null,
      }))
  }, [participants, localParticipantId])

  if (cursors.length === 0) {
    return (
      <div className={`cursor-list cursor-list--empty ${className}`}>
        <p className="cursor-list__empty-text">No other participants online</p>
      </div>
    )
  }

  return (
    <div className={`cursor-list ${className}`}>
      <h4 className="cursor-list__title">Participants</h4>
      <ul className="cursor-list__items">
        {cursors.map(({ participant, cursor }) => (
          <li key={participant.id} className="cursor-list__item">
            <button
              type="button"
              className="cursor-list__button"
              onClick={() => cursor && onCursorClick?.(cursor, participant)}
              disabled={!cursor}
            >
              {/* Color indicator */}
              <span className="cursor-list__color" style={{ backgroundColor: participant.color }} />

              {/* Info */}
              <div className="cursor-list__info">
                <span className="cursor-list__name">{participant.name}</span>
                {cursor ? (
                  <span className="cursor-list__position">
                    x: {cursor.x.toFixed(1)}, y: {cursor.y.toFixed(1)}, z: {cursor.z.toFixed(1)}
                  </span>
                ) : (
                  <span className="cursor-list__position cursor-list__position--inactive">
                    No position
                  </span>
                )}
              </div>

              {/* Status */}
              <span
                className="cursor-list__status"
                style={{
                  backgroundColor:
                    participant.status === 'online'
                      ? '#4caf50'
                      : participant.status === 'away'
                        ? '#ff9800'
                        : '#888',
                }}
                title={participant.status}
              />
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default ParticipantCursor
