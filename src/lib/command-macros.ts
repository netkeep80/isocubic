/**
 * Command Macros system for isocubic
 * Allows recording, saving, and replaying sequences of commands
 *
 * Phase 11, TASK 77: Extended command bar functionality
 */

/** A single step in a macro */
export interface MacroStep {
  commandId: string
  timestamp: number
}

/** A saved macro (sequence of command steps) */
export interface Macro {
  id: string
  name: string
  description: string
  steps: MacroStep[]
  createdAt: number
}

const MACROS_STORAGE_KEY = 'isocubic-command-macros'

/** Load macros from localStorage */
function loadMacros(): Macro[] {
  try {
    const raw = localStorage.getItem(MACROS_STORAGE_KEY)
    if (!raw) return []
    return JSON.parse(raw) as Macro[]
  } catch {
    return []
  }
}

/** Save macros to localStorage */
function saveMacros(macros: Macro[]): void {
  try {
    localStorage.setItem(MACROS_STORAGE_KEY, JSON.stringify(macros))
  } catch {
    // localStorage may be unavailable
  }
}

/**
 * Create a macro manager for recording and playing back command sequences
 */
export function createMacroManager() {
  let macros: Macro[] = loadMacros()
  let recording = false
  let currentRecording: MacroStep[] = []
  let recordingStartTime = 0

  /** Start recording a new macro */
  function startRecording(): void {
    recording = true
    currentRecording = []
    recordingStartTime = Date.now()
  }

  /** Record a command execution while recording is active */
  function recordStep(commandId: string): void {
    if (!recording) return
    currentRecording.push({
      commandId,
      timestamp: Date.now() - recordingStartTime,
    })
  }

  /** Stop recording and save the macro */
  function stopRecording(name: string, description: string = ''): Macro | null {
    if (!recording || currentRecording.length === 0) {
      recording = false
      currentRecording = []
      return null
    }

    const macro: Macro = {
      id: `macro-${Date.now()}`,
      name,
      description,
      steps: [...currentRecording],
      createdAt: Date.now(),
    }

    macros.push(macro)
    saveMacros(macros)

    recording = false
    currentRecording = []
    return macro
  }

  /** Cancel current recording without saving */
  function cancelRecording(): void {
    recording = false
    currentRecording = []
  }

  /** Check if currently recording */
  function isRecording(): boolean {
    return recording
  }

  /** Get current recording step count */
  function getRecordingStepCount(): number {
    return currentRecording.length
  }

  /** Play back a macro by executing its commands */
  function playMacro(macroId: string, executeCommand: (commandId: string) => void): boolean {
    const macro = macros.find((m) => m.id === macroId)
    if (!macro || macro.steps.length === 0) return false

    // Execute all steps immediately (sequential)
    for (const step of macro.steps) {
      executeCommand(step.commandId)
    }
    return true
  }

  /** Get all saved macros */
  function getMacros(): Macro[] {
    return [...macros]
  }

  /** Get a macro by id */
  function getMacro(macroId: string): Macro | undefined {
    return macros.find((m) => m.id === macroId)
  }

  /** Delete a saved macro */
  function deleteMacro(macroId: string): boolean {
    const index = macros.findIndex((m) => m.id === macroId)
    if (index === -1) return false
    macros.splice(index, 1)
    saveMacros(macros)
    return true
  }

  /** Rename a macro */
  function renameMacro(macroId: string, newName: string): boolean {
    const macro = macros.find((m) => m.id === macroId)
    if (!macro) return false
    macro.name = newName
    saveMacros(macros)
    return true
  }

  /** Clear all macros */
  function clearAllMacros(): void {
    macros = []
    saveMacros(macros)
  }

  return {
    startRecording,
    recordStep,
    stopRecording,
    cancelRecording,
    isRecording,
    getRecordingStepCount,
    playMacro,
    getMacros,
    getMacro,
    deleteMacro,
    renameMacro,
    clearAllMacros,
  }
}
