/**
 * Unit tests for command-macros
 * Tests recording, playback, persistence, and management of command macros
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createMacroManager } from './command-macros'

describe('createMacroManager', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  describe('Recording', () => {
    it('should not be recording initially', () => {
      const mm = createMacroManager()
      expect(mm.isRecording()).toBe(false)
    })

    it('should start recording', () => {
      const mm = createMacroManager()
      mm.startRecording()
      expect(mm.isRecording()).toBe(true)
    })

    it('should record steps while recording', () => {
      const mm = createMacroManager()
      mm.startRecording()
      mm.recordStep('cmd1')
      mm.recordStep('cmd2')
      expect(mm.getRecordingStepCount()).toBe(2)
    })

    it('should not record steps when not recording', () => {
      const mm = createMacroManager()
      mm.recordStep('cmd1')
      expect(mm.getRecordingStepCount()).toBe(0)
    })

    it('should stop recording and save macro', () => {
      const mm = createMacroManager()
      mm.startRecording()
      mm.recordStep('cmd1')
      mm.recordStep('cmd2')
      const macro = mm.stopRecording('Test Macro', 'A test')
      expect(macro).not.toBeNull()
      expect(macro!.name).toBe('Test Macro')
      expect(macro!.description).toBe('A test')
      expect(macro!.steps).toHaveLength(2)
      expect(mm.isRecording()).toBe(false)
    })

    it('should return null when stopping with no steps', () => {
      const mm = createMacroManager()
      mm.startRecording()
      const macro = mm.stopRecording('Empty')
      expect(macro).toBeNull()
    })

    it('should cancel recording', () => {
      const mm = createMacroManager()
      mm.startRecording()
      mm.recordStep('cmd1')
      mm.cancelRecording()
      expect(mm.isRecording()).toBe(false)
      expect(mm.getMacros()).toHaveLength(0)
    })
  })

  describe('Macro Management', () => {
    it('should list saved macros', () => {
      const mm = createMacroManager()
      mm.startRecording()
      mm.recordStep('cmd1')
      mm.stopRecording('Macro 1')

      mm.startRecording()
      mm.recordStep('cmd2')
      mm.stopRecording('Macro 2')

      expect(mm.getMacros()).toHaveLength(2)
    })

    it('should get macro by id', () => {
      const mm = createMacroManager()
      mm.startRecording()
      mm.recordStep('cmd1')
      const macro = mm.stopRecording('Test')
      expect(mm.getMacro(macro!.id)).toBeDefined()
      expect(mm.getMacro(macro!.id)!.name).toBe('Test')
    })

    it('should return undefined for non-existent macro', () => {
      const mm = createMacroManager()
      expect(mm.getMacro('nonexistent')).toBeUndefined()
    })

    it('should delete a macro', () => {
      const mm = createMacroManager()
      mm.startRecording()
      mm.recordStep('cmd1')
      const macro = mm.stopRecording('Test')
      expect(mm.deleteMacro(macro!.id)).toBe(true)
      expect(mm.getMacros()).toHaveLength(0)
    })

    it('should return false when deleting non-existent macro', () => {
      const mm = createMacroManager()
      expect(mm.deleteMacro('nonexistent')).toBe(false)
    })

    it('should rename a macro', () => {
      const mm = createMacroManager()
      mm.startRecording()
      mm.recordStep('cmd1')
      const macro = mm.stopRecording('Old Name')
      expect(mm.renameMacro(macro!.id, 'New Name')).toBe(true)
      expect(mm.getMacro(macro!.id)!.name).toBe('New Name')
    })

    it('should return false when renaming non-existent macro', () => {
      const mm = createMacroManager()
      expect(mm.renameMacro('nonexistent', 'Name')).toBe(false)
    })

    it('should clear all macros', () => {
      const mm = createMacroManager()
      mm.startRecording()
      mm.recordStep('cmd1')
      mm.stopRecording('M1')
      mm.startRecording()
      mm.recordStep('cmd2')
      mm.stopRecording('M2')
      mm.clearAllMacros()
      expect(mm.getMacros()).toHaveLength(0)
    })
  })

  describe('Playback', () => {
    it('should play a macro by executing its steps', () => {
      const mm = createMacroManager()
      mm.startRecording()
      mm.recordStep('cmd1')
      mm.recordStep('cmd2')
      mm.recordStep('cmd3')
      const macro = mm.stopRecording('Test')

      const executedCommands: string[] = []
      const result = mm.playMacro(macro!.id, (cmdId) => executedCommands.push(cmdId))
      expect(result).toBe(true)
      expect(executedCommands).toEqual(['cmd1', 'cmd2', 'cmd3'])
    })

    it('should return false for non-existent macro playback', () => {
      const mm = createMacroManager()
      const result = mm.playMacro('nonexistent', vi.fn())
      expect(result).toBe(false)
    })
  })

  describe('localStorage Persistence', () => {
    it('should persist macros to localStorage', () => {
      const mm = createMacroManager()
      mm.startRecording()
      mm.recordStep('cmd1')
      mm.stopRecording('Persistent Macro')

      const stored = localStorage.getItem('isocubic-command-macros')
      expect(stored).not.toBeNull()
      const parsed = JSON.parse(stored!)
      expect(parsed).toHaveLength(1)
      expect(parsed[0].name).toBe('Persistent Macro')
    })

    it('should load macros from localStorage', () => {
      const data = [
        {
          id: 'macro-1',
          name: 'Saved Macro',
          description: '',
          steps: [{ commandId: 'cmd1', timestamp: 0 }],
          createdAt: Date.now(),
        },
      ]
      localStorage.setItem('isocubic-command-macros', JSON.stringify(data))

      const mm = createMacroManager()
      expect(mm.getMacros()).toHaveLength(1)
      expect(mm.getMacros()[0].name).toBe('Saved Macro')
    })

    it('should handle corrupted localStorage gracefully', () => {
      localStorage.setItem('isocubic-command-macros', 'not-json')
      const mm = createMacroManager()
      expect(mm.getMacros()).toHaveLength(0)
    })
  })
})
