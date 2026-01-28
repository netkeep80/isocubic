/**
 * ExportPanel component for managing cube configuration export/import
 * Provides UI for downloading, uploading, and managing saved cube configurations
 */

import { useState, useCallback, useEffect } from 'react'
import type { SpectralCube } from '../types/cube'
import {
  exportCubeToFile,
  importCubeFromFile,
  saveCubeToStorage,
  getSavedCubesList,
  deleteCubeFromStorage,
  loadCubeFromStorage,
  triggerFileInput,
  undo,
  redo,
  canUndo,
  canRedo,
  type StoredConfig,
  type ImportResult,
} from '../lib/storage'

/**
 * Props for ExportPanel component
 */
export interface ExportPanelProps {
  /** Current cube configuration */
  currentCube: SpectralCube | null
  /** Callback when a cube is loaded/imported */
  onCubeLoad?: (cube: SpectralCube) => void
  /** Callback when cube changes (for undo/redo) */
  onCubeChange?: (cube: SpectralCube) => void
  /** Custom class name */
  className?: string
}

/**
 * ExportPanel component
 * Provides export/import and saved configs management UI
 */
export function ExportPanel({
  currentCube,
  onCubeLoad,
  onCubeChange,
  className = '',
}: ExportPanelProps) {
  // Use lazy initialization for initial state from localStorage
  const [savedConfigs, setSavedConfigs] = useState<StoredConfig[]>(() => getSavedCubesList())
  const [importError, setImportError] = useState<string | null>(null)
  const [importSuccess, setImportSuccess] = useState<string | null>(null)
  const [undoAvailable, setUndoAvailable] = useState(() => canUndo())
  const [redoAvailable, setRedoAvailable] = useState(() => canRedo())

  // Refresh saved configs
  const refreshSavedConfigs = useCallback(() => {
    setSavedConfigs(getSavedCubesList())
    setUndoAvailable(canUndo())
    setRedoAvailable(canRedo())
  }, [])

  // Clear messages after timeout
  useEffect(() => {
    if (importError) {
      const timer = setTimeout(() => setImportError(null), 5000)
      return () => clearTimeout(timer)
    }
  }, [importError])

  useEffect(() => {
    if (importSuccess) {
      const timer = setTimeout(() => setImportSuccess(null), 3000)
      return () => clearTimeout(timer)
    }
  }, [importSuccess])

  // Handle export to JSON file
  const handleExport = useCallback(() => {
    if (!currentCube) return
    exportCubeToFile(currentCube)
    setImportSuccess('Configuration exported successfully')
  }, [currentCube])

  // Handle save to LocalStorage
  const handleSave = useCallback(() => {
    if (!currentCube) return
    saveCubeToStorage(currentCube)
    refreshSavedConfigs()
    setImportSuccess('Configuration saved')
  }, [currentCube, refreshSavedConfigs])

  // Handle import from file
  const handleImport = useCallback(() => {
    setImportError(null)
    triggerFileInput(async (file: File) => {
      const result: ImportResult = await importCubeFromFile(file)
      if (result.success && result.cube) {
        onCubeLoad?.(result.cube)
        setImportSuccess(`Imported: ${result.cube.meta?.name || result.cube.id}`)
        refreshSavedConfigs()
      } else {
        setImportError(result.error || 'Failed to import')
      }
    })
  }, [onCubeLoad, refreshSavedConfigs])

  // Handle loading saved config
  const handleLoadSaved = useCallback(
    (id: string) => {
      const cube = loadCubeFromStorage(id)
      if (cube) {
        onCubeLoad?.(cube)
        setImportSuccess(`Loaded: ${cube.meta?.name || cube.id}`)
      }
    },
    [onCubeLoad]
  )

  // Handle deleting saved config
  const handleDeleteSaved = useCallback(
    (id: string) => {
      if (deleteCubeFromStorage(id)) {
        refreshSavedConfigs()
        setImportSuccess('Configuration deleted')
      }
    },
    [refreshSavedConfigs]
  )

  // Handle undo
  const handleUndo = useCallback(() => {
    const previousCube = undo()
    if (previousCube) {
      onCubeChange?.(previousCube)
      refreshSavedConfigs()
    }
  }, [onCubeChange, refreshSavedConfigs])

  // Handle redo
  const handleRedo = useCallback(() => {
    const nextCube = redo()
    if (nextCube) {
      onCubeChange?.(nextCube)
      refreshSavedConfigs()
    }
  }, [onCubeChange, refreshSavedConfigs])

  // Format date for display
  const formatDate = (isoDate: string): string => {
    try {
      return new Date(isoDate).toLocaleString()
    } catch {
      return isoDate
    }
  }

  return (
    <div className={`export-panel ${className}`}>
      {/* Undo/Redo controls */}
      <div className="export-panel__history">
        <button
          type="button"
          onClick={handleUndo}
          disabled={!undoAvailable}
          className="export-panel__button export-panel__button--history"
          title="Undo (Ctrl+Z)"
          aria-label="Undo"
        >
          Undo
        </button>
        <button
          type="button"
          onClick={handleRedo}
          disabled={!redoAvailable}
          className="export-panel__button export-panel__button--history"
          title="Redo (Ctrl+Shift+Z)"
          aria-label="Redo"
        >
          Redo
        </button>
      </div>

      {/* Export/Import actions */}
      <div className="export-panel__actions">
        <button
          type="button"
          onClick={handleExport}
          disabled={!currentCube}
          className="export-panel__button export-panel__button--primary"
          title="Download JSON file"
        >
          Download JSON
        </button>
        <button
          type="button"
          onClick={handleImport}
          className="export-panel__button export-panel__button--secondary"
          title="Upload JSON file"
        >
          Upload JSON
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={!currentCube}
          className="export-panel__button export-panel__button--save"
          title="Save to browser storage"
        >
          Save
        </button>
      </div>

      {/* Status messages */}
      {importError && (
        <div className="export-panel__message export-panel__message--error" role="alert">
          {importError}
        </div>
      )}
      {importSuccess && (
        <div className="export-panel__message export-panel__message--success" role="status">
          {importSuccess}
        </div>
      )}

      {/* Saved configs list */}
      {savedConfigs.length > 0 && (
        <div className="export-panel__saved">
          <h3 className="export-panel__saved-title">Saved Configurations</h3>
          <ul className="export-panel__saved-list">
            {savedConfigs.map((config) => (
              <li key={config.cube.id} className="export-panel__saved-item">
                <div className="export-panel__saved-info">
                  <span className="export-panel__saved-name">
                    {config.cube.meta?.name || config.cube.id}
                  </span>
                  <span className="export-panel__saved-date">{formatDate(config.savedAt)}</span>
                </div>
                <div className="export-panel__saved-actions">
                  <button
                    type="button"
                    onClick={() => handleLoadSaved(config.cube.id)}
                    className="export-panel__button export-panel__button--small"
                    title="Load this configuration"
                  >
                    Load
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteSaved(config.cube.id)}
                    className="export-panel__button export-panel__button--small export-panel__button--danger"
                    title="Delete this configuration"
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

export default ExportPanel
