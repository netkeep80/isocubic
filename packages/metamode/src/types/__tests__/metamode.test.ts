/**
 * Unit tests for @isocubic/metamode — metamode types and utilities
 *
 * Tests: storage helpers, tab utilities, constraints, keyboard shortcuts,
 *        conversation utilities
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
  getStorageKey,
  loadMetaModeState,
  saveMetaModeState,
  isValidTab,
  getTabInfo,
  getAvailableTabs,
  clamp,
  constrainPosition,
  constrainSize,
  parseShortcut,
  matchesShortcut,
  getConversationStorageKey,
  generateMessageId,
  generateSessionId,
  createMessage,
  createSession,
  loadConversationSession,
  saveConversationSession,
  clearConversationSession,
  DEFAULT_WINDOW_STATE,
  DEFAULT_WINDOW_SIZE,
  DEFAULT_WINDOW_POSITION,
  METAMODE_TABS,
  DEFAULT_METAMODE_CONFIG,
} from '../metamode'

// ============================================================
// Storage Key Helpers
// ============================================================

describe('getStorageKey', () => {
  it('should return default key when no prefix provided', () => {
    expect(getStorageKey()).toBe('metamode_state')
  })

  it('should return prefixed key when prefix provided', () => {
    expect(getStorageKey('my_app')).toBe('my_app_state')
  })

  it('should fall back to default key for empty string prefix (falsy value)', () => {
    // Empty string is falsy, so the implementation falls back to 'metamode'
    expect(getStorageKey('')).toBe('metamode_state')
  })
})

describe('getConversationStorageKey', () => {
  it('should return default key when no prefix provided', () => {
    expect(getConversationStorageKey()).toBe('metamode_conversation')
  })

  it('should return prefixed key when prefix provided', () => {
    expect(getConversationStorageKey('my_app')).toBe('my_app_conversation')
  })
})

// ============================================================
// localStorage Persistence
// ============================================================

describe('loadMetaModeState', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('should return DEFAULT_WINDOW_STATE when localStorage is empty', () => {
    const state = loadMetaModeState()
    expect(state.state).toBe(DEFAULT_WINDOW_STATE.state)
    expect(state.activeTab).toBe(DEFAULT_WINDOW_STATE.activeTab)
  })

  it('should load state from localStorage', () => {
    const stored = {
      state: 'open',
      activeTab: 'issues',
      position: { x: 100, y: 200 },
      isPinned: true,
    }
    localStorage.setItem('metamode_state', JSON.stringify(stored))
    const state = loadMetaModeState()
    expect(state.state).toBe('open')
    expect(state.activeTab).toBe('issues')
    expect(state.isPinned).toBe(true)
  })

  it('should merge loaded position with defaults', () => {
    const stored = { position: { x: 50 } }
    localStorage.setItem('metamode_state', JSON.stringify(stored))
    const state = loadMetaModeState()
    expect(state.position.x).toBe(50)
    expect(state.position.y).toBe(DEFAULT_WINDOW_POSITION.y)
  })

  it('should merge loaded size with defaults', () => {
    const stored = { size: { width: 700 } }
    localStorage.setItem('metamode_state', JSON.stringify(stored))
    const state = loadMetaModeState()
    expect(state.size.width).toBe(700)
    expect(state.size.height).toBe(DEFAULT_WINDOW_SIZE.height)
  })

  it('should handle corrupted localStorage gracefully', () => {
    localStorage.setItem('metamode_state', 'invalid-json')
    const state = loadMetaModeState()
    expect(state).toEqual(DEFAULT_WINDOW_STATE)
  })

  it('should use custom prefix', () => {
    const stored = { state: 'open', activeTab: 'search' }
    localStorage.setItem('custom_state', JSON.stringify(stored))
    const state = loadMetaModeState('custom')
    expect(state.state).toBe('open')
  })
})

describe('saveMetaModeState', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('should save state to localStorage', () => {
    saveMetaModeState({ ...DEFAULT_WINDOW_STATE, state: 'open' })
    const stored = localStorage.getItem('metamode_state')
    expect(stored).not.toBeNull()
    const parsed = JSON.parse(stored!)
    expect(parsed.state).toBe('open')
  })

  it('should use custom prefix when saving', () => {
    saveMetaModeState({ ...DEFAULT_WINDOW_STATE }, 'custom')
    expect(localStorage.getItem('custom_state')).not.toBeNull()
    expect(localStorage.getItem('metamode_state')).toBeNull()
  })
})

// ============================================================
// Tab Utilities
// ============================================================

describe('isValidTab', () => {
  it('should return true for valid tabs', () => {
    expect(isValidTab('query')).toBe(true)
    expect(isValidTab('context')).toBe(true)
    expect(isValidTab('search')).toBe(true)
    expect(isValidTab('conversation')).toBe(true)
    expect(isValidTab('issues')).toBe(true)
  })

  it('should return false for invalid tabs', () => {
    expect(isValidTab('invalid')).toBe(false)
    expect(isValidTab('')).toBe(false)
    expect(isValidTab('Query')).toBe(false) // case-sensitive
  })
})

describe('getTabInfo', () => {
  it('should return tab info for valid tab', () => {
    const info = getTabInfo('query')
    expect(info).toBeDefined()
    expect(info!.id).toBe('query')
    expect(info!.available).toBe(true)
  })

  it('should return all METAMODE_TABS tabs', () => {
    for (const tab of METAMODE_TABS) {
      expect(getTabInfo(tab.id)).toBeDefined()
    }
  })

  it('should return tab info with expected fields', () => {
    const info = getTabInfo('issues')
    expect(info).toHaveProperty('id')
    expect(info).toHaveProperty('labelRu')
    expect(info).toHaveProperty('labelEn')
    expect(info).toHaveProperty('icon')
    expect(info).toHaveProperty('available')
    expect(info).toHaveProperty('descriptionRu')
    expect(info).toHaveProperty('descriptionEn')
  })
})

describe('getAvailableTabs', () => {
  it('should return available tabs based on default config', () => {
    const tabs = getAvailableTabs(DEFAULT_METAMODE_CONFIG)
    expect(tabs.length).toBeGreaterThan(0)
    tabs.forEach((tab) => expect(tab.available).toBe(true))
  })

  it('should filter tabs based on config.tabs', () => {
    const tabs = getAvailableTabs({ tabs: ['query', 'search'] })
    const ids = tabs.map((t) => t.id)
    expect(ids).toContain('query')
    expect(ids).toContain('search')
    expect(ids).not.toContain('context')
  })

  it('should return only default config tabs when no config provided', () => {
    // When no config is provided, getAvailableTabs uses DEFAULT_METAMODE_CONFIG.tabs
    // which has ['query', 'context', 'search'] — not all available tabs
    const tabs = getAvailableTabs()
    expect(tabs.length).toBeGreaterThan(0)
    tabs.forEach((tab) => expect(tab.available).toBe(true))
  })
})

// ============================================================
// Math / Position Utilities
// ============================================================

describe('clamp', () => {
  it('should return value when within bounds', () => {
    expect(clamp(5, 0, 10)).toBe(5)
  })

  it('should return min when value is below min', () => {
    expect(clamp(-5, 0, 10)).toBe(0)
  })

  it('should return max when value is above max', () => {
    expect(clamp(15, 0, 10)).toBe(10)
  })

  it('should return value equal to min (boundary)', () => {
    expect(clamp(0, 0, 10)).toBe(0)
  })

  it('should return value equal to max (boundary)', () => {
    expect(clamp(10, 0, 10)).toBe(10)
  })
})

describe('constrainPosition', () => {
  const size = { ...DEFAULT_WINDOW_SIZE }

  it('should keep position unchanged when within viewport', () => {
    const position = { x: 100, y: 100 }
    const result = constrainPosition(position, size, 1920, 1080)
    expect(result.x).toBe(100)
    expect(result.y).toBe(100)
  })

  it('should constrain position to padding minimum (20px)', () => {
    const position = { x: 0, y: 0 }
    const result = constrainPosition(position, size, 1920, 1080)
    expect(result.x).toBe(20)
    expect(result.y).toBe(20)
  })

  it('should constrain position within viewport bounds', () => {
    const position = { x: 10000, y: 10000 }
    const result = constrainPosition(position, size, 1920, 1080)
    expect(result.x).toBeLessThan(10000)
    expect(result.y).toBeLessThan(10000)
  })

  it('should preserve anchor from original position', () => {
    const position = { x: 100, y: 100, anchor: 'top-right' as const }
    const result = constrainPosition(position, size, 1920, 1080)
    expect(result.anchor).toBe('top-right')
  })
})

describe('constrainSize', () => {
  it('should use default size when no overrides provided', () => {
    const size = constrainSize({})
    expect(size.width).toBe(DEFAULT_WINDOW_SIZE.width)
    expect(size.height).toBe(DEFAULT_WINDOW_SIZE.height)
  })

  it('should clamp width to minWidth when too small', () => {
    const size = constrainSize({ width: 10, minWidth: 380 })
    expect(size.width).toBe(380)
  })

  it('should clamp width to maxWidth when too large', () => {
    const size = constrainSize({ width: 99999, maxWidth: 900 })
    expect(size.width).toBe(900)
  })

  it('should clamp height to minHeight when too small', () => {
    const size = constrainSize({ height: 10, minHeight: 400 })
    expect(size.height).toBe(400)
  })

  it('should apply valid dimensions without clamping', () => {
    const size = constrainSize({ width: 600, height: 700 })
    expect(size.width).toBe(600)
    expect(size.height).toBe(700)
  })
})

// ============================================================
// Keyboard Shortcut Utilities
// ============================================================

describe('parseShortcut', () => {
  it('should parse Ctrl+Shift+M', () => {
    const parsed = parseShortcut('Ctrl+Shift+M')
    expect(parsed.ctrl).toBe(true)
    expect(parsed.shift).toBe(true)
    expect(parsed.alt).toBe(false)
    expect(parsed.meta).toBe(false)
    expect(parsed.key).toBe('m')
  })

  it('should parse simple key', () => {
    const parsed = parseShortcut('Escape')
    expect(parsed.ctrl).toBe(false)
    expect(parsed.shift).toBe(false)
    expect(parsed.key).toBe('escape')
  })

  it('should parse Alt+F4', () => {
    const parsed = parseShortcut('Alt+F4')
    expect(parsed.alt).toBe(true)
    expect(parsed.ctrl).toBe(false)
    expect(parsed.key).toBe('f4')
  })

  it('should parse Meta/Cmd shortcuts', () => {
    const parsed = parseShortcut('Meta+K')
    expect(parsed.meta).toBe(true)
    expect(parsed.key).toBe('k')
  })
})

describe('matchesShortcut', () => {
  function makeKeyEvent(overrides: Partial<KeyboardEvent>): KeyboardEvent {
    return {
      key: 'M',
      ctrlKey: false,
      shiftKey: false,
      altKey: false,
      metaKey: false,
      ...overrides,
    } as KeyboardEvent
  }

  it('should match Ctrl+Shift+M', () => {
    const event = makeKeyEvent({ key: 'm', ctrlKey: true, shiftKey: true })
    expect(matchesShortcut(event, 'Ctrl+Shift+M')).toBe(true)
  })

  it('should not match when ctrl key is missing', () => {
    const event = makeKeyEvent({ key: 'm', shiftKey: true })
    expect(matchesShortcut(event, 'Ctrl+Shift+M')).toBe(false)
  })

  it('should not match when shift key is missing', () => {
    const event = makeKeyEvent({ key: 'm', ctrlKey: true })
    expect(matchesShortcut(event, 'Ctrl+Shift+M')).toBe(false)
  })

  it('should match single Escape key', () => {
    const event = makeKeyEvent({ key: 'escape' })
    expect(matchesShortcut(event, 'Escape')).toBe(true)
  })

  it('should not match when wrong key', () => {
    const event = makeKeyEvent({ key: 'k', ctrlKey: true, shiftKey: true })
    expect(matchesShortcut(event, 'Ctrl+Shift+M')).toBe(false)
  })

  it('should treat metaKey as ctrl equivalent', () => {
    const event = makeKeyEvent({ key: 'm', metaKey: true, shiftKey: true })
    expect(matchesShortcut(event, 'Ctrl+Shift+M')).toBe(true)
  })
})

// ============================================================
// Conversation Utilities
// ============================================================

describe('generateMessageId', () => {
  it('should generate a string ID', () => {
    const id = generateMessageId()
    expect(typeof id).toBe('string')
  })

  it('should start with "msg_" prefix', () => {
    const id = generateMessageId()
    expect(id).toMatch(/^msg_/)
  })

  it('should generate unique IDs', () => {
    const ids = new Set(Array.from({ length: 100 }, () => generateMessageId()))
    expect(ids.size).toBe(100)
  })
})

describe('generateSessionId', () => {
  it('should generate a string ID', () => {
    const id = generateSessionId()
    expect(typeof id).toBe('string')
  })

  it('should start with "session_" prefix', () => {
    const id = generateSessionId()
    expect(id).toMatch(/^session_/)
  })

  it('should generate unique IDs', () => {
    const ids = new Set(Array.from({ length: 100 }, () => generateSessionId()))
    expect(ids.size).toBe(100)
  })
})

describe('createMessage', () => {
  it('should create a user message', () => {
    const msg = createMessage('user', 'Hello')
    expect(msg.role).toBe('user')
    expect(msg.content).toBe('Hello')
    expect(msg.isStreaming).toBe(false)
    expect(msg.id).toMatch(/^msg_/)
    expect(msg.timestamp).toBeTruthy()
  })

  it('should create an assistant message', () => {
    const msg = createMessage('assistant', 'How can I help?')
    expect(msg.role).toBe('assistant')
    expect(msg.content).toBe('How can I help?')
  })

  it('should include context when provided', () => {
    const context = { componentId: 'MyButton', currentView: 'editor' }
    const msg = createMessage('user', 'What is this?', context)
    expect(msg.context).toEqual(context)
  })

  it('should not include context when not provided', () => {
    const msg = createMessage('user', 'Hello')
    expect(msg.context).toBeUndefined()
  })

  it('should have a valid ISO timestamp', () => {
    const msg = createMessage('user', 'Test')
    expect(() => new Date(msg.timestamp)).not.toThrow()
    expect(isNaN(new Date(msg.timestamp).getTime())).toBe(false)
  })
})

describe('createSession', () => {
  it('should create a session with default Russian language', () => {
    const session = createSession()
    expect(session.language).toBe('ru')
    expect(session.title).toBe('Новый диалог')
  })

  it('should create an English session when requested', () => {
    const session = createSession('en')
    expect(session.language).toBe('en')
    expect(session.title).toBe('New conversation')
  })

  it('should initialize with empty messages', () => {
    const session = createSession()
    expect(session.messages).toEqual([])
  })

  it('should have idle status', () => {
    const session = createSession()
    expect(session.status).toBe('idle')
  })

  it('should generate unique session IDs', () => {
    const s1 = createSession()
    const s2 = createSession()
    expect(s1.id).not.toBe(s2.id)
  })

  it('should have valid timestamps', () => {
    const session = createSession()
    expect(() => new Date(session.createdAt)).not.toThrow()
    expect(() => new Date(session.updatedAt)).not.toThrow()
  })
})

describe('loadConversationSession / saveConversationSession / clearConversationSession', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('should return null when no session stored', () => {
    expect(loadConversationSession()).toBeNull()
  })

  it('should save and load a conversation session', () => {
    const session = createSession('en')
    saveConversationSession(session)
    const loaded = loadConversationSession()
    expect(loaded).not.toBeNull()
    expect(loaded!.id).toBe(session.id)
    expect(loaded!.language).toBe('en')
  })

  it('should use custom prefix', () => {
    const session = createSession()
    saveConversationSession(session, 'app')
    expect(loadConversationSession('app')).not.toBeNull()
    expect(loadConversationSession()).toBeNull() // different key
  })

  it('should clear conversation session', () => {
    const session = createSession()
    saveConversationSession(session)
    clearConversationSession()
    expect(loadConversationSession()).toBeNull()
  })

  it('should clear session with custom prefix', () => {
    const session = createSession()
    saveConversationSession(session, 'app')
    clearConversationSession('app')
    expect(loadConversationSession('app')).toBeNull()
  })

  it('should handle corrupted session data gracefully', () => {
    localStorage.setItem('metamode_conversation', 'broken-json')
    expect(loadConversationSession()).toBeNull()
  })
})
