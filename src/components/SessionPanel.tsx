/**
 * SessionPanel component for collaborative editing mode
 * Provides UI for creating/joining sessions, viewing participants, and managing session settings
 */

import { useState, useCallback, useEffect, useMemo } from 'react'
import type {
  Session,
  Participant,
  SessionSettings,
  ParticipantRole,
  ConnectionState,
} from '../types/collaboration'
import {
  CollaborationManager,
  createCollaborationManager,
  formatSessionCode,
  parseSessionCode,
  canEdit,
  isOwner,
} from '../lib/collaboration'

/**
 * Props for SessionPanel component
 */
export interface SessionPanelProps {
  /** Collaboration manager instance (optional - will create one if not provided) */
  collaborationManager?: CollaborationManager
  /** Callback when session state changes */
  onSessionChange?: (session: Session | null) => void
  /** Callback when connection state changes */
  onConnectionStateChange?: (state: ConnectionState) => void
  /** Custom class name */
  className?: string
}

/**
 * View mode for the session panel
 */
type ViewMode = 'idle' | 'create' | 'join' | 'active'

/**
 * SessionPanel component
 * Handles session creation, joining, and participant management
 */
export function SessionPanel({
  collaborationManager: externalManager,
  onSessionChange,
  onConnectionStateChange,
  className = '',
}: SessionPanelProps) {
  // Create or use provided collaboration manager
  const [manager] = useState<CollaborationManager>(
    () => externalManager ?? createCollaborationManager()
  )

  // UI state
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    const session = manager.getSession()
    return session ? 'active' : 'idle'
  })
  const [participantName, setParticipantName] = useState('')
  const [sessionCode, setSessionCode] = useState('')
  const [sessionName, setSessionName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [connectionState, setConnectionState] = useState<ConnectionState>(
    () => manager.getState().connectionState
  )

  // Session state
  const [session, setSession] = useState<Session | null>(() => manager.getSession())
  const [participants, setParticipants] = useState<Participant[]>(() => manager.getParticipants())
  const [localParticipant, setLocalParticipant] = useState<Participant | null>(() =>
    manager.getLocalParticipant()
  )

  // Derived state
  const isSessionOwner = useMemo(() => isOwner(localParticipant), [localParticipant])
  const canEditCubes = useMemo(() => canEdit(localParticipant), [localParticipant])

  // Clear messages after timeout
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000)
      return () => clearTimeout(timer)
    }
  }, [error])

  useEffect(() => {
    if (statusMessage) {
      const timer = setTimeout(() => setStatusMessage(null), 3000)
      return () => clearTimeout(timer)
    }
  }, [statusMessage])

  // Subscribe to collaboration manager events
  useEffect(() => {
    const handleSessionCreated = () => {
      setSession(manager.getSession())
      setParticipants(manager.getParticipants())
      setLocalParticipant(manager.getLocalParticipant())
      setViewMode('active')
      setStatusMessage('Session created successfully')
      onSessionChange?.(manager.getSession())
    }

    const handleSessionJoined = () => {
      setSession(manager.getSession())
      setParticipants(manager.getParticipants())
      setLocalParticipant(manager.getLocalParticipant())
      setViewMode('active')
      setStatusMessage('Joined session successfully')
      onSessionChange?.(manager.getSession())
    }

    const handleSessionLeft = () => {
      setSession(null)
      setParticipants([])
      setLocalParticipant(null)
      setViewMode('idle')
      setStatusMessage('Left session')
      onSessionChange?.(null)
    }

    const handleSessionUpdated = () => {
      setSession(manager.getSession())
    }

    const handleParticipantJoined = () => {
      setParticipants(manager.getParticipants())
    }

    const handleParticipantLeft = () => {
      setParticipants(manager.getParticipants())
    }

    const handleParticipantUpdated = () => {
      setParticipants(manager.getParticipants())
      setLocalParticipant(manager.getLocalParticipant())
    }

    const handleConnectionChanged = (event: { data: unknown }) => {
      const data = event.data as { currentState: ConnectionState }
      setConnectionState(data.currentState)
      onConnectionStateChange?.(data.currentState)
    }

    const handleError = (event: { data: unknown }) => {
      const data = event.data as { message?: string }
      setError(data.message ?? 'An error occurred')
    }

    manager.on('session_created', handleSessionCreated)
    manager.on('session_joined', handleSessionJoined)
    manager.on('session_left', handleSessionLeft)
    manager.on('session_updated', handleSessionUpdated)
    manager.on('participant_joined', handleParticipantJoined)
    manager.on('participant_left', handleParticipantLeft)
    manager.on('participant_updated', handleParticipantUpdated)
    manager.on('connection_changed', handleConnectionChanged)
    manager.on('error', handleError)

    return () => {
      manager.off('session_created', handleSessionCreated)
      manager.off('session_joined', handleSessionJoined)
      manager.off('session_left', handleSessionLeft)
      manager.off('session_updated', handleSessionUpdated)
      manager.off('participant_joined', handleParticipantJoined)
      manager.off('participant_left', handleParticipantLeft)
      manager.off('participant_updated', handleParticipantUpdated)
      manager.off('connection_changed', handleConnectionChanged)
      manager.off('error', handleError)
    }
  }, [manager, onSessionChange, onConnectionStateChange])

  // Handle create session
  const handleCreateSession = useCallback(() => {
    if (!participantName.trim()) {
      setError('Please enter your name')
      return
    }

    const settings: Partial<SessionSettings> = sessionName.trim()
      ? { name: sessionName.trim() }
      : undefined

    const result = manager.createSession(participantName.trim(), settings)

    if (!result.success) {
      setError(result.error ?? 'Failed to create session')
    }
  }, [manager, participantName, sessionName])

  // Handle join session
  const handleJoinSession = useCallback(() => {
    if (!participantName.trim()) {
      setError('Please enter your name')
      return
    }

    if (!sessionCode.trim()) {
      setError('Please enter session code')
      return
    }

    // Parse the session code (validates format)
    const parsedCode = parseSessionCode(sessionCode)

    // Note: In a real implementation, this would fetch the session from a server
    // For now, we'll show an error since we don't have a server
    // The parsedCode would be used to connect to the session
    console.debug('Attempting to join session with code:', parsedCode)
    setError('Session joining requires a server. Use "Create Session" to start a new session.')
  }, [participantName, sessionCode])

  // Handle leave session
  const handleLeaveSession = useCallback(() => {
    manager.leaveSession()
  }, [manager])

  // Handle copy session code
  const handleCopySessionCode = useCallback(async () => {
    if (!session) return

    try {
      await navigator.clipboard.writeText(session.code)
      setStatusMessage('Session code copied!')
    } catch {
      // Fallback for browsers without clipboard API
      setStatusMessage(`Code: ${session.code}`)
    }
  }, [session])

  // Handle role change
  const handleRoleChange = useCallback(
    (participantId: string, newRole: ParticipantRole) => {
      if (!isSessionOwner || newRole === 'owner') return

      const success = manager.updateParticipantRole(participantId, newRole)
      if (success) {
        setStatusMessage('Role updated')
      } else {
        setError('Failed to update role')
      }
    },
    [manager, isSessionOwner]
  )

  // Handle kick participant
  const handleKickParticipant = useCallback(
    (participantId: string) => {
      if (!isSessionOwner) return

      const success = manager.kickParticipant(participantId)
      if (success) {
        setStatusMessage('Participant removed')
      } else {
        setError('Failed to remove participant')
      }
    },
    [manager, isSessionOwner]
  )

  // Get status indicator color
  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'online':
        return '#4caf50'
      case 'away':
        return '#ff9800'
      case 'offline':
        return '#888'
      default:
        return '#888'
    }
  }

  // Get connection status text
  const getConnectionStatusText = (): string => {
    switch (connectionState) {
      case 'connected':
        return 'Connected'
      case 'connecting':
        return 'Connecting...'
      case 'reconnecting':
        return 'Reconnecting...'
      case 'disconnected':
        return 'Offline'
      default:
        return 'Unknown'
    }
  }

  // Render idle view (no session)
  if (viewMode === 'idle') {
    return (
      <div className={`session-panel ${className}`}>
        <div className="session-panel__header">
          <h2 className="session-panel__title">Collaboration</h2>
        </div>

        <div className="session-panel__welcome">
          <p>Work together in real-time with other users.</p>
        </div>

        <div className="session-panel__actions">
          <button
            type="button"
            className="session-panel__button session-panel__button--primary"
            onClick={() => setViewMode('create')}
          >
            Create Session
          </button>
          <button
            type="button"
            className="session-panel__button session-panel__button--secondary"
            onClick={() => setViewMode('join')}
          >
            Join Session
          </button>
        </div>
      </div>
    )
  }

  // Render create session view
  if (viewMode === 'create') {
    return (
      <div className={`session-panel ${className}`}>
        <div className="session-panel__header">
          <h2 className="session-panel__title">Create Session</h2>
          <button
            type="button"
            className="session-panel__back-btn"
            onClick={() => setViewMode('idle')}
            aria-label="Back"
          >
            &larr;
          </button>
        </div>

        {error && (
          <div className="session-panel__message session-panel__message--error" role="alert">
            {error}
          </div>
        )}

        <div className="session-panel__form">
          <div className="session-panel__field">
            <label className="session-panel__label" htmlFor="create-name">
              Your Name *
            </label>
            <input
              id="create-name"
              type="text"
              className="session-panel__input"
              placeholder="Enter your name"
              value={participantName}
              onChange={(e) => setParticipantName(e.target.value)}
              maxLength={30}
            />
          </div>

          <div className="session-panel__field">
            <label className="session-panel__label" htmlFor="session-name">
              Session Name (optional)
            </label>
            <input
              id="session-name"
              type="text"
              className="session-panel__input"
              placeholder="My Cube Project"
              value={sessionName}
              onChange={(e) => setSessionName(e.target.value)}
              maxLength={50}
            />
          </div>

          <button
            type="button"
            className="session-panel__button session-panel__button--primary session-panel__button--full"
            onClick={handleCreateSession}
          >
            Create Session
          </button>
        </div>
      </div>
    )
  }

  // Render join session view
  if (viewMode === 'join') {
    return (
      <div className={`session-panel ${className}`}>
        <div className="session-panel__header">
          <h2 className="session-panel__title">Join Session</h2>
          <button
            type="button"
            className="session-panel__back-btn"
            onClick={() => setViewMode('idle')}
            aria-label="Back"
          >
            &larr;
          </button>
        </div>

        {error && (
          <div className="session-panel__message session-panel__message--error" role="alert">
            {error}
          </div>
        )}

        <div className="session-panel__form">
          <div className="session-panel__field">
            <label className="session-panel__label" htmlFor="join-name">
              Your Name *
            </label>
            <input
              id="join-name"
              type="text"
              className="session-panel__input"
              placeholder="Enter your name"
              value={participantName}
              onChange={(e) => setParticipantName(e.target.value)}
              maxLength={30}
            />
          </div>

          <div className="session-panel__field">
            <label className="session-panel__label" htmlFor="session-code">
              Session Code *
            </label>
            <input
              id="session-code"
              type="text"
              className="session-panel__input session-panel__input--code"
              placeholder="ABC-123"
              value={sessionCode}
              onChange={(e) => setSessionCode(e.target.value.toUpperCase())}
              maxLength={7}
            />
          </div>

          <button
            type="button"
            className="session-panel__button session-panel__button--primary session-panel__button--full"
            onClick={handleJoinSession}
          >
            Join Session
          </button>
        </div>
      </div>
    )
  }

  // Render active session view
  return (
    <div className={`session-panel ${className}`}>
      <div className="session-panel__header">
        <h2 className="session-panel__title">{session?.settings.name || 'Session'}</h2>
        <div className="session-panel__connection-status">
          <span
            className="session-panel__status-dot"
            style={{ backgroundColor: connectionState === 'connected' ? '#4caf50' : '#ff9800' }}
          />
          <span className="session-panel__status-text">{getConnectionStatusText()}</span>
        </div>
      </div>

      {error && (
        <div className="session-panel__message session-panel__message--error" role="alert">
          {error}
        </div>
      )}

      {statusMessage && (
        <div className="session-panel__message session-panel__message--success" role="status">
          {statusMessage}
        </div>
      )}

      {/* Session code */}
      <div className="session-panel__code-section">
        <span className="session-panel__code-label">Session Code:</span>
        <button
          type="button"
          className="session-panel__code-value"
          onClick={handleCopySessionCode}
          title="Click to copy"
        >
          {session ? formatSessionCode(session.code) : '---'}
        </button>
      </div>

      {/* Participants list */}
      <div className="session-panel__participants">
        <h3 className="session-panel__participants-title">Participants ({participants.length})</h3>
        <ul className="session-panel__participants-list">
          {participants.map((participant) => (
            <li key={participant.id} className="session-panel__participant">
              <div className="session-panel__participant-info">
                {/* Avatar/Color indicator */}
                <div
                  className="session-panel__participant-avatar"
                  style={{ backgroundColor: participant.color }}
                >
                  {participant.name.charAt(0).toUpperCase()}
                </div>

                {/* Name and status */}
                <div className="session-panel__participant-details">
                  <span className="session-panel__participant-name">
                    {participant.name}
                    {participant.id === localParticipant?.id && (
                      <span className="session-panel__participant-you"> (you)</span>
                    )}
                  </span>
                  <span className="session-panel__participant-role">{participant.role}</span>
                </div>

                {/* Status indicator */}
                <span
                  className="session-panel__participant-status"
                  style={{ backgroundColor: getStatusColor(participant.status) }}
                  title={participant.status}
                />
              </div>

              {/* Actions for owner */}
              {isSessionOwner && participant.id !== localParticipant?.id && (
                <div className="session-panel__participant-actions">
                  <select
                    className="session-panel__role-select"
                    value={participant.role}
                    onChange={(e) =>
                      handleRoleChange(participant.id, e.target.value as ParticipantRole)
                    }
                    aria-label={`Change role for ${participant.name}`}
                  >
                    <option value="editor">Editor</option>
                    <option value="viewer">Viewer</option>
                  </select>
                  <button
                    type="button"
                    className="session-panel__kick-btn"
                    onClick={() => handleKickParticipant(participant.id)}
                    title={`Remove ${participant.name}`}
                    aria-label={`Remove ${participant.name}`}
                  >
                    &times;
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      </div>

      {/* Your role info */}
      <div className="session-panel__role-info">
        <span className="session-panel__role-label">Your role:</span>
        <span className="session-panel__role-value">{localParticipant?.role || 'unknown'}</span>
        {canEditCubes && (
          <span className="session-panel__role-badge session-panel__role-badge--edit">
            Can edit
          </span>
        )}
      </div>

      {/* Leave session */}
      <button
        type="button"
        className="session-panel__button session-panel__button--danger session-panel__button--full"
        onClick={handleLeaveSession}
      >
        Leave Session
      </button>
    </div>
  )
}

export default SessionPanel
