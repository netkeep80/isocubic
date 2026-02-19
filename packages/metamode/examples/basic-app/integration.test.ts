/**
 * Integration test for @isocubic/metamode
 *
 * TASK 91: @isocubic/metamode Phase 4 — Интеграционный тест использования пакета
 * Phase 14: @isocubic/metamode NPM Package — Build System & Publishing Infrastructure
 *
 * Tests that the built dist/ artifact exports work correctly,
 * simulating real-world usage of the published npm package.
 *
 * Imports from dist/ (not src/) to validate the built package.
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect } from 'vitest'

// Import from built dist/ artifact — simulates `import from '@isocubic/metamode'`
// after the package is installed from npm
import {
  // Core composables
  provideMetaMode,
  useMetaMode,
  METAMODE_KEY,
  // Utility functions
  detectLanguage,
  DEFAULT_COMPONENT_REGISTRY,
  // MetaMode window/tab utilities
  METAMODE_TABS,
  DEFAULT_METAMODE_CONFIG,
  DEFAULT_WINDOW_STATE,
  isValidTab,
  getTabInfo,
  getAvailableTabs,
  clamp,
  constrainPosition,
  constrainSize,
  parseShortcut,
  matchesShortcut,
  // Storage utilities
  loadMetaModeState,
  saveMetaModeState,
  // Conversation utilities
  createMessage,
  createSession,
  // Issue draft utilities
  createIssueDraft,
  validateIssueDraft,
  getDefaultLabels,
  BUILTIN_ISSUE_TEMPLATES,
  DEFAULT_ISSUE_DRAFT_SETTINGS,
} from '../../dist/metamode.js'

// ============================================================================
// Integration tests: verify dist/ exports are functional
// ============================================================================

describe('@isocubic/metamode — integration tests (dist/ build)', () => {
  describe('package exports', () => {
    it('should export provideMetaMode function', () => {
      expect(typeof provideMetaMode).toBe('function')
    })

    it('should export useMetaMode function', () => {
      expect(typeof useMetaMode).toBe('function')
    })

    it('should export METAMODE_KEY symbol', () => {
      expect(typeof METAMODE_KEY).toBe('symbol')
    })

    it('should export detectLanguage function', () => {
      expect(typeof detectLanguage).toBe('function')
    })

    it('should export DEFAULT_COMPONENT_REGISTRY object', () => {
      expect(typeof DEFAULT_COMPONENT_REGISTRY).toBe('object')
      expect(typeof DEFAULT_COMPONENT_REGISTRY.getAllComponents).toBe('function')
      expect(typeof DEFAULT_COMPONENT_REGISTRY.searchComponents).toBe('function')
    })

    it('should export METAMODE_TABS array', () => {
      expect(Array.isArray(METAMODE_TABS)).toBe(true)
      expect(METAMODE_TABS.length).toBeGreaterThan(0)
    })

    it('should export DEFAULT_METAMODE_CONFIG object', () => {
      expect(typeof DEFAULT_METAMODE_CONFIG).toBe('object')
      expect(DEFAULT_METAMODE_CONFIG).not.toBeNull()
    })

    it('should export DEFAULT_WINDOW_STATE object', () => {
      expect(typeof DEFAULT_WINDOW_STATE).toBe('object')
      expect(DEFAULT_WINDOW_STATE).not.toBeNull()
    })

    it('should export BUILTIN_ISSUE_TEMPLATES array', () => {
      expect(Array.isArray(BUILTIN_ISSUE_TEMPLATES)).toBe(true)
      expect(BUILTIN_ISSUE_TEMPLATES.length).toBeGreaterThan(0)
    })

    it('should export DEFAULT_ISSUE_DRAFT_SETTINGS object', () => {
      expect(typeof DEFAULT_ISSUE_DRAFT_SETTINGS).toBe('object')
      expect(DEFAULT_ISSUE_DRAFT_SETTINGS).not.toBeNull()
    })
  })

  describe('language detection (from dist/)', () => {
    it('should detect Russian text', () => {
      expect(detectLanguage('Привет мир')).toBe('ru')
    })

    it('should detect English text', () => {
      expect(detectLanguage('Hello world')).toBe('en')
    })

    it('should return "en" for empty string', () => {
      expect(detectLanguage('')).toBe('en')
    })
  })

  describe('tab utilities (from dist/)', () => {
    it('should validate known tabs', () => {
      expect(isValidTab('conversation')).toBe(true)
      expect(isValidTab('issues')).toBe(true)
      expect(isValidTab('search')).toBe(true)
    })

    it('should reject unknown tabs', () => {
      expect(isValidTab('unknown-tab')).toBe(false)
      expect(isValidTab('')).toBe(false)
    })

    it('should return tab info for known tabs', () => {
      const info = getTabInfo('conversation')
      expect(info).not.toBeNull()
      expect(typeof info).toBe('object')
    })

    it('should return undefined for unknown tabs', () => {
      expect(getTabInfo('unknown')).toBeUndefined()
    })

    it('should return all available tabs', () => {
      const tabs = getAvailableTabs()
      expect(Array.isArray(tabs)).toBe(true)
      expect(tabs.length).toBeGreaterThan(0)
    })
  })

  describe('window utilities (from dist/)', () => {
    it('should clamp values to range', () => {
      expect(clamp(150, 0, 100)).toBe(100)
      expect(clamp(-10, 0, 100)).toBe(0)
      expect(clamp(50, 0, 100)).toBe(50)
    })

    it('should constrain position object', () => {
      const pos = { x: -10, y: 200, anchor: 'top-left' }
      const size = { width: 400, height: 300, minWidth: 300, minHeight: 200 }
      const constrained = constrainPosition(pos, size)
      expect(typeof constrained).toBe('object')
      expect(typeof constrained.x).toBe('number')
      expect(typeof constrained.y).toBe('number')
    })

    it('should constrain size object', () => {
      const size = { width: 100, height: 100, minWidth: 300, minHeight: 200 }
      const constrained = constrainSize(size)
      expect(typeof constrained).toBe('object')
      expect(constrained.width).toBeGreaterThanOrEqual(constrained.minWidth)
      expect(constrained.height).toBeGreaterThanOrEqual(constrained.minHeight)
    })
  })

  describe('keyboard shortcuts (from dist/)', () => {
    it('should parse shortcut string', () => {
      const parsed = parseShortcut('Ctrl+Shift+M')
      expect(typeof parsed).toBe('object')
      expect(parsed.ctrl).toBe(true)
      expect(parsed.shift).toBe(true)
      expect(parsed.alt).toBe(false)
      expect(parsed.key).toBe('m')
    })

    it('should match keyboard event to shortcut', () => {
      const mockEvent = {
        ctrlKey: true,
        shiftKey: true,
        altKey: false,
        metaKey: false,
        key: 'M',
        preventDefault: () => {},
      } as unknown as KeyboardEvent

      expect(matchesShortcut(mockEvent, 'Ctrl+Shift+M')).toBe(true)
      expect(matchesShortcut(mockEvent, 'Ctrl+M')).toBe(false)
    })
  })

  describe('state persistence (from dist/)', () => {
    it('should load default state when localStorage is empty', () => {
      const state = loadMetaModeState('test_integration')
      expect(typeof state).toBe('object')
      expect(state).not.toBeNull()
    })

    it('should save and load state from localStorage', () => {
      const storagePrefix = 'test_integration_save'
      const initialState = loadMetaModeState(storagePrefix)
      saveMetaModeState(initialState, storagePrefix)
      const loadedState = loadMetaModeState(storagePrefix)
      expect(loadedState).toEqual(initialState)
    })
  })

  describe('conversation utilities (from dist/)', () => {
    it('should create a new conversation session', () => {
      const session = createSession('en')
      expect(typeof session).toBe('object')
      expect(session.language).toBe('en')
      expect(Array.isArray(session.messages)).toBe(true)
      expect(session.messages.length).toBe(0)
    })

    it('should create a conversation message', () => {
      const message = createMessage('user', 'Hello from dist!')
      expect(typeof message).toBe('object')
      expect(message.role).toBe('user')
      expect(message.content).toBe('Hello from dist!')
      expect(typeof message.id).toBe('string')
      expect(typeof message.timestamp).toBe('string')
    })

    it('should create assistant messages', () => {
      const message = createMessage('assistant', 'Response from assistant')
      expect(message.role).toBe('assistant')
      expect(message.content).toBe('Response from assistant')
    })
  })

  describe('issue draft utilities (from dist/)', () => {
    it('should create an issue draft', () => {
      const draft = createIssueDraft({
        type: 'bug',
        priority: 'high',
        title: 'Integration test issue',
        description: 'Testing createIssueDraft from dist/',
      })
      expect(typeof draft).toBe('object')
      expect(draft.type).toBe('bug')
      expect(draft.priority).toBe('high')
      expect(draft.title).toBe('Integration test issue')
      expect(typeof draft.id).toBe('string')
    })

    it('should validate a valid issue draft', () => {
      const draft = createIssueDraft({
        type: 'feature',
        priority: 'medium',
        title: 'New feature request',
        description: 'Description of the feature',
      })
      const result = validateIssueDraft(draft)
      expect(typeof result).toBe('object')
      expect(typeof result.isValid).toBe('boolean')
    })

    it('should return default labels for issue type and priority', () => {
      const labels = getDefaultLabels('bug', 'high')
      expect(Array.isArray(labels)).toBe(true)
    })
  })

  describe('DEFAULT_COMPONENT_REGISTRY (from dist/)', () => {
    it('should return empty arrays for all methods', () => {
      expect(DEFAULT_COMPONENT_REGISTRY.getAllComponents()).toEqual([])
      expect(DEFAULT_COMPONENT_REGISTRY.searchComponents('anything')).toEqual([])
    })
  })

  describe('DEFAULT_METAMODE_CONFIG (from dist/)', () => {
    it('should have github configuration as optional (can be undefined)', () => {
      // github is an optional field in MetaModeConfig
      expect(DEFAULT_METAMODE_CONFIG.github === undefined || typeof DEFAULT_METAMODE_CONFIG.github === 'object').toBe(true)
    })

    it('should have tabs array', () => {
      expect(Array.isArray(DEFAULT_METAMODE_CONFIG.tabs)).toBe(true)
    })

    it('should have persistState boolean', () => {
      expect(typeof DEFAULT_METAMODE_CONFIG.persistState).toBe('boolean')
    })
  })
})
