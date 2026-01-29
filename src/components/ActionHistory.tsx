/**
 * ActionHistory component for displaying collaborative action history
 * Shows recent actions with participant info, timestamps, and action details
 */

import { useState, useMemo, useCallback, useEffect } from 'react'
import type { CollaborativeAction, ActionType, Participant } from '../types/collaboration'

/**
 * Extended action with resolved participant info
 */
export interface ResolvedAction extends CollaborativeAction {
  /** Resolved participant info (if available) */
  participant?: Participant
}

/**
 * Props for ActionHistory component
 */
export interface ActionHistoryProps {
  /** List of actions to display */
  actions: CollaborativeAction[]
  /** Map of participant IDs to participant info for resolving names/colors */
  participants?: Map<string, Participant>
  /** Maximum number of actions to display */
  maxActions?: number
  /** Whether to group actions by participant */
  groupByParticipant?: boolean
  /** Filter to show only specific action types */
  filterTypes?: ActionType[]
  /** Callback when an action is clicked (for undo/details) */
  onActionClick?: (action: CollaborativeAction) => void
  /** Callback when undo is requested */
  onUndoAction?: (action: CollaborativeAction) => void
  /** Local participant ID (to highlight own actions) */
  localParticipantId?: string
  /** Custom class name */
  className?: string
}

/**
 * Available action type filters
 */
const ACTION_TYPE_LABELS: Record<ActionType, string> = {
  add_cube: 'Add',
  remove_cube: 'Remove',
  modify_cube: 'Modify',
  select_cube: 'Select',
  deselect_cube: 'Deselect',
  move_cube: 'Move',
  rotate_cube: 'Rotate',
  scale_cube: 'Scale',
  change_color: 'Color',
  change_material: 'Material',
  batch: 'Batch',
  cursor_move: 'Cursor',
  presence_update: 'Status',
}

/**
 * Get icon for action type
 */
function getActionIcon(type: ActionType): string {
  switch (type) {
    case 'add_cube':
      return '+'
    case 'remove_cube':
      return '-'
    case 'modify_cube':
      return '~'
    case 'select_cube':
      return '[]'
    case 'deselect_cube':
      return '[ ]'
    case 'move_cube':
      return '\u2194' // ↔
    case 'rotate_cube':
      return '\u21BB' // ↻
    case 'scale_cube':
      return '\u2922' // ⤢
    case 'change_color':
      return '\u25CF' // ●
    case 'change_material':
      return '\u2726' // ✦
    case 'batch':
      return '#'
    case 'cursor_move':
      return '\u2197' // ↗
    case 'presence_update':
      return '\u25C9' // ◉
    default:
      return '?'
  }
}

/**
 * Format action description
 */
function formatActionDescription(action: CollaborativeAction): string {
  switch (action.type) {
    case 'add_cube':
      return `Added cube${action.targetId ? ` "${action.targetId}"` : ''}`
    case 'remove_cube':
      return `Removed cube${action.targetId ? ` "${action.targetId}"` : ''}`
    case 'modify_cube':
      return `Modified cube${action.targetId ? ` "${action.targetId}"` : ''}`
    case 'select_cube':
      return `Selected${action.targetId ? ` "${action.targetId}"` : ' cube'}`
    case 'deselect_cube':
      return `Deselected${action.targetId ? ` "${action.targetId}"` : ' cube'}`
    case 'move_cube':
      return `Moved cube${action.targetId ? ` "${action.targetId}"` : ''}`
    case 'rotate_cube':
      return `Rotated cube${action.targetId ? ` "${action.targetId}"` : ''}`
    case 'scale_cube':
      return `Scaled cube${action.targetId ? ` "${action.targetId}"` : ''}`
    case 'change_color':
      return `Changed color${action.targetId ? ` of "${action.targetId}"` : ''}`
    case 'change_material':
      return `Changed material${action.targetId ? ` of "${action.targetId}"` : ''}`
    case 'batch':
      return 'Batch operation'
    case 'cursor_move':
      return 'Moved cursor'
    case 'presence_update':
      return 'Updated status'
    default:
      return 'Unknown action'
  }
}

/**
 * Format relative time
 */
function formatRelativeTime(timestamp: string): string {
  const now = Date.now()
  const actionTime = new Date(timestamp).getTime()
  const diff = now - actionTime

  if (diff < 5000) return 'just now'
  if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
  return new Date(timestamp).toLocaleDateString()
}

/**
 * ActionHistory component
 * Displays a timeline of collaborative actions
 */
export function ActionHistory({
  actions,
  participants,
  maxActions = 50,
  groupByParticipant = false,
  filterTypes,
  onActionClick,
  onUndoAction,
  localParticipantId,
  className = '',
}: ActionHistoryProps) {
  // State for expanded action details
  const [expandedActionId, setExpandedActionId] = useState<string | null>(null)

  // State for filter
  const [activeFilters, setActiveFilters] = useState<Set<ActionType>>(
    () => new Set(filterTypes ?? [])
  )

  // Force re-render for relative times
  const [, setTick] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 10000)
    return () => clearInterval(interval)
  }, [])

  // Resolve participant info for actions
  const resolvedActions = useMemo<ResolvedAction[]>(() => {
    return actions.map((action) => ({
      ...action,
      participant: participants?.get(action.participantId),
    }))
  }, [actions, participants])

  // Filter and limit actions
  const displayActions = useMemo(() => {
    let filtered = resolvedActions

    // Apply type filter
    if (activeFilters.size > 0) {
      filtered = filtered.filter((action) => activeFilters.has(action.type))
    }

    // Exclude cursor and presence updates by default (too noisy)
    if (activeFilters.size === 0) {
      filtered = filtered.filter(
        (action) => action.type !== 'cursor_move' && action.type !== 'presence_update'
      )
    }

    // Limit and reverse (newest first)
    return filtered.slice(-maxActions).reverse()
  }, [resolvedActions, activeFilters, maxActions])

  // Group by participant if requested
  const groupedActions = useMemo(() => {
    if (!groupByParticipant) return null

    const groups = new Map<string, ResolvedAction[]>()
    for (const action of displayActions) {
      const key = action.participantId
      if (!groups.has(key)) {
        groups.set(key, [])
      }
      groups.get(key)!.push(action)
    }
    return groups
  }, [displayActions, groupByParticipant])

  // Handle filter toggle
  const handleFilterToggle = useCallback((type: ActionType) => {
    setActiveFilters((prev) => {
      const next = new Set(prev)
      if (next.has(type)) {
        next.delete(type)
      } else {
        next.add(type)
      }
      return next
    })
  }, [])

  // Handle clear filters
  const handleClearFilters = useCallback(() => {
    setActiveFilters(new Set())
  }, [])

  // Handle action click
  const handleActionClick = useCallback(
    (action: CollaborativeAction) => {
      if (expandedActionId === action.id) {
        setExpandedActionId(null)
      } else {
        setExpandedActionId(action.id)
      }
      onActionClick?.(action)
    },
    [expandedActionId, onActionClick]
  )

  // Render single action item
  const renderActionItem = (action: ResolvedAction, showParticipant = true) => {
    const isLocal = action.participantId === localParticipantId
    const isExpanded = expandedActionId === action.id
    const participant = action.participant
    const participantColor = participant?.color ?? '#888'
    const participantName = participant?.name ?? 'Unknown'

    return (
      <li
        key={action.id}
        className={`action-history__item ${isLocal ? 'action-history__item--local' : ''} ${
          isExpanded ? 'action-history__item--expanded' : ''
        }`}
      >
        <button
          type="button"
          className="action-history__item-button"
          onClick={() => handleActionClick(action)}
        >
          {/* Action icon */}
          <span
            className="action-history__icon"
            style={{ backgroundColor: participantColor }}
            title={ACTION_TYPE_LABELS[action.type]}
          >
            {getActionIcon(action.type)}
          </span>

          {/* Action content */}
          <div className="action-history__content">
            {/* Participant name (if showing) */}
            {showParticipant && (
              <span className="action-history__participant">
                {participantName}
                {isLocal && <span className="action-history__local-badge">(you)</span>}
              </span>
            )}

            {/* Action description */}
            <span className="action-history__description">{formatActionDescription(action)}</span>

            {/* Timestamp */}
            <span className="action-history__time">{formatRelativeTime(action.timestamp)}</span>
          </div>
        </button>

        {/* Expanded details */}
        {isExpanded && (
          <div className="action-history__details">
            {/* Action ID */}
            <div className="action-history__detail-row">
              <span className="action-history__detail-label">ID:</span>
              <span className="action-history__detail-value action-history__detail-value--mono">
                {action.id.slice(0, 8)}...
              </span>
            </div>

            {/* Type */}
            <div className="action-history__detail-row">
              <span className="action-history__detail-label">Type:</span>
              <span className="action-history__detail-value">{action.type}</span>
            </div>

            {/* Target */}
            {action.targetId && (
              <div className="action-history__detail-row">
                <span className="action-history__detail-label">Target:</span>
                <span className="action-history__detail-value">{action.targetId}</span>
              </div>
            )}

            {/* Timestamp */}
            <div className="action-history__detail-row">
              <span className="action-history__detail-label">Time:</span>
              <span className="action-history__detail-value">
                {new Date(action.timestamp).toLocaleString()}
              </span>
            </div>

            {/* Undo button (only for local actions that can be undone) */}
            {isLocal && onUndoAction && (
              <button
                type="button"
                className="action-history__undo-btn"
                onClick={(e) => {
                  e.stopPropagation()
                  onUndoAction(action)
                }}
              >
                Undo
              </button>
            )}
          </div>
        )}
      </li>
    )
  }

  // Render empty state
  if (displayActions.length === 0 && activeFilters.size === 0) {
    return (
      <div className={`action-history action-history--empty ${className}`}>
        <p className="action-history__empty-text">No actions yet</p>
        <p className="action-history__empty-hint">
          Actions will appear here as participants make changes
        </p>
      </div>
    )
  }

  return (
    <div className={`action-history ${className}`}>
      {/* Header with filters */}
      <div className="action-history__header">
        <h3 className="action-history__title">Action History</h3>
        <span className="action-history__count">{displayActions.length} actions</span>
      </div>

      {/* Filter chips */}
      <div className="action-history__filters">
        {Object.entries(ACTION_TYPE_LABELS)
          .filter(([type]) => type !== 'cursor_move' && type !== 'presence_update')
          .map(([type, label]) => (
            <button
              key={type}
              type="button"
              className={`action-history__filter ${
                activeFilters.has(type as ActionType) ? 'action-history__filter--active' : ''
              }`}
              onClick={() => handleFilterToggle(type as ActionType)}
            >
              {label}
            </button>
          ))}
        {activeFilters.size > 0 && (
          <button
            type="button"
            className="action-history__filter action-history__filter--clear"
            onClick={handleClearFilters}
          >
            Clear
          </button>
        )}
      </div>

      {/* Actions list */}
      {groupedActions ? (
        // Grouped view
        <div className="action-history__groups">
          {Array.from(groupedActions.entries()).map(([participantId, groupActions]) => {
            const participant = groupActions[0]?.participant
            return (
              <div key={participantId} className="action-history__group">
                <div
                  className="action-history__group-header"
                  style={{ borderColor: participant?.color ?? '#888' }}
                >
                  <span
                    className="action-history__group-color"
                    style={{ backgroundColor: participant?.color ?? '#888' }}
                  />
                  <span className="action-history__group-name">
                    {participant?.name ?? 'Unknown'}
                    {participantId === localParticipantId && (
                      <span className="action-history__local-badge">(you)</span>
                    )}
                  </span>
                  <span className="action-history__group-count">{groupActions.length} actions</span>
                </div>
                <ul className="action-history__list">
                  {groupActions.map((action) => renderActionItem(action, false))}
                </ul>
              </div>
            )
          })}
        </div>
      ) : (
        // Flat view
        <ul className="action-history__list">
          {displayActions.map((action) => renderActionItem(action, true))}
        </ul>
      )}

      {/* No results for filter */}
      {displayActions.length === 0 && activeFilters.size > 0 && (
        <div className="action-history__no-results">
          <p>No actions match the selected filters</p>
          <button type="button" className="action-history__clear-btn" onClick={handleClearFilters}>
            Clear filters
          </button>
        </div>
      )}
    </div>
  )
}

export default ActionHistory
