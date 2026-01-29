/**
 * FFTParamEditor component for editing FFT-based magical/energy cube configurations
 *
 * This component provides UI for editing FFTCubeConfig properties including:
 * - Energy Settings: is_magical, fft_size, energy_capacity, current_energy indicator
 * - FFT Physics: coherence_loss, fracture_threshold, stress level indicator
 * - Integration with energy physics functions for real-time status display
 *
 * Can be used standalone or as an extension to ParamEditor with mode switching
 * between SpectralCube and FFTCubeConfig types.
 */

import { useState, useCallback, useEffect, useMemo } from 'react'
import type {
  FFTCubeConfig,
  FFTCubePhysics,
  FFTSize,
  MaterialType,
  BreakPattern,
  BoundaryMode,
  CubeBoundary,
} from '../types/cube'
import { FFT_CUBE_DEFAULTS, createDefaultFFTCube } from '../types/cube'
import {
  calculateTotalEnergy,
  getNormalizedEnergy,
  isNearFracture,
  checkFracture,
  type FractureCheckResult,
} from '../lib/energyPhysics'

/**
 * Editor mode - determines which type of cube is being edited
 */
export type EditorMode = 'spectral' | 'fft'

/**
 * Props for FFTParamEditor component
 */
export interface FFTParamEditorProps {
  /** Current FFT cube configuration */
  currentCube: FFTCubeConfig | null
  /** Callback when cube is updated */
  onCubeUpdate?: (cube: FFTCubeConfig) => void
  /** Custom class name */
  className?: string
  /** Whether to show the mode switcher (for integration with unified editor) */
  showModeSwitcher?: boolean
  /** Current editor mode when mode switcher is shown */
  editorMode?: EditorMode
  /** Callback when editor mode changes */
  onModeChange?: (mode: EditorMode) => void
}

/** Available FFT sizes */
const FFT_SIZES: FFTSize[] = [8, 16, 32]

/** Available material types */
const MATERIAL_TYPES: MaterialType[] = [
  'stone',
  'wood',
  'metal',
  'glass',
  'organic',
  'crystal',
  'liquid',
]

/** Available break patterns */
const BREAK_PATTERNS: BreakPattern[] = ['crumble', 'shatter', 'splinter', 'melt', 'dissolve']

/** Available boundary modes */
const BOUNDARY_MODES: BoundaryMode[] = ['none', 'smooth', 'hard']

/**
 * Get stress level class for visual indication
 */
function getStressLevelClass(stressLevel: number): string {
  if (stressLevel >= 1.0) return 'fft-editor__stress-indicator--critical'
  if (stressLevel >= 0.8) return 'fft-editor__stress-indicator--warning'
  if (stressLevel >= 0.5) return 'fft-editor__stress-indicator--moderate'
  return 'fft-editor__stress-indicator--safe'
}

/**
 * Get stress level label for display
 */
function getStressLevelLabel(stressLevel: number): string {
  if (stressLevel >= 1.0) return 'CRITICAL - Fracture Imminent!'
  if (stressLevel >= 0.8) return 'Warning - High Stress'
  if (stressLevel >= 0.5) return 'Moderate Stress'
  return 'Stable'
}

/**
 * FFTParamEditor component
 * Provides a comprehensive UI for editing FFT cube parameters
 */
export function FFTParamEditor({
  currentCube,
  onCubeUpdate,
  className = '',
  showModeSwitcher = false,
  editorMode = 'fft',
  onModeChange,
}: FFTParamEditorProps) {
  // Use local state for editing
  const [localCube, setLocalCube] = useState<FFTCubeConfig | null>(currentCube)
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['energy', 'physics', 'boundary'])
  )

  // Sync local state with prop
  useEffect(() => {
    setLocalCube(currentCube)
  }, [currentCube])

  // Calculate energy-related values
  const energyInfo = useMemo(() => {
    if (!localCube) {
      return {
        totalEnergy: 0,
        normalizedEnergy: 0,
        fractureResult: null as FractureCheckResult | null,
        nearFracture: false,
      }
    }

    const totalEnergy = calculateTotalEnergy(localCube)
    const normalizedEnergy = getNormalizedEnergy(localCube)
    const fractureResult = checkFracture(localCube)
    const nearFracture = isNearFracture(localCube)

    return {
      totalEnergy,
      normalizedEnergy,
      fractureResult,
      nearFracture,
    }
  }, [localCube])

  // Toggle section expansion
  const toggleSection = useCallback((section: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev)
      if (next.has(section)) {
        next.delete(section)
      } else {
        next.add(section)
      }
      return next
    })
  }, [])

  // Update cube and notify parent
  const updateCube = useCallback(
    (updates: Partial<FFTCubeConfig>) => {
      if (!localCube) return

      const updatedCube: FFTCubeConfig = {
        ...localCube,
        ...updates,
        meta: {
          ...localCube.meta,
          ...updates.meta,
          modified: new Date().toISOString(),
        },
      }

      // Recalculate current energy if channels changed
      if (updates.channels) {
        updatedCube.current_energy = calculateTotalEnergy(updatedCube)
      }

      setLocalCube(updatedCube)
      onCubeUpdate?.(updatedCube)
    },
    [localCube, onCubeUpdate]
  )

  // Update physics properties
  const updatePhysics = useCallback(
    (updates: Partial<FFTCubePhysics>) => {
      if (!localCube) return
      updateCube({
        physics: {
          ...localCube.physics,
          ...updates,
        },
      })
    },
    [localCube, updateCube]
  )

  // Update boundary properties
  const updateBoundary = useCallback(
    (updates: Partial<CubeBoundary>) => {
      if (!localCube) return
      updateCube({
        boundary: {
          ...localCube.boundary,
          ...updates,
        },
      })
    },
    [localCube, updateCube]
  )

  // Handle name update
  const handleNameUpdate = useCallback(
    (name: string) => {
      if (!localCube) return
      updateCube({
        meta: {
          ...localCube.meta,
          name,
          modified: new Date().toISOString(),
        },
      })
    },
    [localCube, updateCube]
  )

  // Reset to default values
  const handleReset = useCallback(() => {
    const id = localCube?.id || `fft_cube_${Date.now()}`
    const defaultCube = createDefaultFFTCube(id)
    setLocalCube(defaultCube)
    onCubeUpdate?.(defaultCube)
  }, [localCube?.id, onCubeUpdate])

  // Empty state
  if (!localCube) {
    return (
      <div className={`fft-editor ${className}`}>
        <div className="fft-editor__empty">
          <p>No FFT cube selected</p>
          <p>Select a magical cube from the gallery or create a new one</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`fft-editor ${className}`}>
      <div className="fft-editor__header">
        <h2 className="fft-editor__title">FFT Cube Editor</h2>
        <button
          type="button"
          className="fft-editor__reset-btn"
          onClick={handleReset}
          title="Reset to default values"
        >
          Reset
        </button>
      </div>

      {/* Mode Switcher (optional) */}
      {showModeSwitcher && (
        <div className="fft-editor__mode-switcher">
          <label className="fft-editor__label">Cube Type</label>
          <div className="fft-editor__mode-buttons">
            <button
              type="button"
              className={`fft-editor__mode-btn ${editorMode === 'spectral' ? 'fft-editor__mode-btn--active' : ''}`}
              onClick={() => onModeChange?.('spectral')}
            >
              SpectralCube
            </button>
            <button
              type="button"
              className={`fft-editor__mode-btn ${editorMode === 'fft' ? 'fft-editor__mode-btn--active' : ''}`}
              onClick={() => onModeChange?.('fft')}
            >
              FFTCubeConfig
            </button>
          </div>
        </div>
      )}

      {/* Name field */}
      <div className="fft-editor__name-field">
        <label htmlFor="fft-cube-name" className="fft-editor__label">
          Name
        </label>
        <input
          id="fft-cube-name"
          type="text"
          className="fft-editor__input"
          value={localCube.meta?.name || ''}
          onChange={(e) => handleNameUpdate(e.target.value)}
          placeholder="Enter cube name..."
        />
      </div>

      {/* Energy Settings Section */}
      <section className="fft-editor__section">
        <button
          type="button"
          className={`fft-editor__section-header ${expandedSections.has('energy') ? 'fft-editor__section-header--expanded' : ''}`}
          onClick={() => toggleSection('energy')}
          aria-expanded={expandedSections.has('energy')}
        >
          <span>Energy Settings</span>
          <span className="fft-editor__chevron">{expandedSections.has('energy') ? '▼' : '▶'}</span>
        </button>

        {expandedSections.has('energy') && (
          <div className="fft-editor__section-content">
            {/* Is Magical checkbox */}
            <div className="fft-editor__field">
              <label className="fft-editor__checkbox-label">
                <input
                  type="checkbox"
                  className="fft-editor__checkbox"
                  checked={localCube.is_magical}
                  onChange={(e) => updateCube({ is_magical: e.target.checked })}
                />
                <span>Is Magical</span>
              </label>
              <p className="fft-editor__description">
                Enable energy-based visualization and physics for this cube.
              </p>
            </div>

            {/* FFT Size dropdown */}
            <div className="fft-editor__field">
              <label htmlFor="fft-size" className="fft-editor__label">
                FFT Size
              </label>
              <select
                id="fft-size"
                className="fft-editor__select"
                value={localCube.fft_size}
                onChange={(e) => updateCube({ fft_size: parseInt(e.target.value, 10) as FFTSize })}
              >
                {FFT_SIZES.map((size) => (
                  <option key={size} value={size}>
                    {size}x{size}x{size}
                  </option>
                ))}
              </select>
              <p className="fft-editor__description">
                Size of the FFT grid. Higher values provide more detail but use more memory.
              </p>
            </div>

            {/* Energy Capacity */}
            <div className="fft-editor__field">
              <label htmlFor="energy-capacity" className="fft-editor__label">
                Energy Capacity
                <span className="fft-editor__value">{localCube.energy_capacity.toFixed(1)}</span>
              </label>
              <input
                id="energy-capacity"
                type="number"
                className="fft-editor__number-input"
                min="1"
                max="1000"
                step="1"
                value={localCube.energy_capacity}
                onChange={(e) => updateCube({ energy_capacity: parseFloat(e.target.value) || 1 })}
              />
              <p className="fft-editor__description">
                Maximum energy the cube can hold. Used for normalization and physics calculations.
              </p>
            </div>

            {/* Current Energy (read-only indicator) */}
            <div className="fft-editor__field">
              <label className="fft-editor__label">
                Current Energy
                <span className="fft-editor__value">{energyInfo.totalEnergy.toFixed(2)}</span>
              </label>
              <div className="fft-editor__progress-bar">
                <div
                  className="fft-editor__progress-fill"
                  style={{ width: `${Math.min(energyInfo.normalizedEnergy * 100, 100)}%` }}
                />
              </div>
              <div className="fft-editor__progress-labels">
                <span>0</span>
                <span>{(energyInfo.normalizedEnergy * 100).toFixed(1)}%</span>
                <span>{localCube.energy_capacity}</span>
              </div>
              <p className="fft-editor__description">
                Current energy level calculated from FFT coefficients (read-only).
              </p>
            </div>
          </div>
        )}
      </section>

      {/* FFT Physics Section */}
      <section className="fft-editor__section">
        <button
          type="button"
          className={`fft-editor__section-header ${expandedSections.has('physics') ? 'fft-editor__section-header--expanded' : ''}`}
          onClick={() => toggleSection('physics')}
          aria-expanded={expandedSections.has('physics')}
        >
          <span>FFT Physics</span>
          <span className="fft-editor__chevron">{expandedSections.has('physics') ? '▼' : '▶'}</span>
        </button>

        {expandedSections.has('physics') && (
          <div className="fft-editor__section-content">
            {/* Material type selector */}
            <div className="fft-editor__field">
              <label htmlFor="fft-physics-material" className="fft-editor__label">
                Material
              </label>
              <select
                id="fft-physics-material"
                className="fft-editor__select"
                value={localCube.physics?.material ?? FFT_CUBE_DEFAULTS.physics.material}
                onChange={(e) => updatePhysics({ material: e.target.value as MaterialType })}
              >
                {MATERIAL_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            {/* Density slider */}
            <div className="fft-editor__field">
              <label htmlFor="fft-physics-density" className="fft-editor__label">
                Density (g/cm³)
                <span className="fft-editor__value">
                  {(localCube.physics?.density ?? FFT_CUBE_DEFAULTS.physics.density).toFixed(2)}
                </span>
              </label>
              <input
                id="fft-physics-density"
                type="range"
                className="fft-editor__slider"
                min="0.1"
                max="10"
                step="0.1"
                value={localCube.physics?.density ?? FFT_CUBE_DEFAULTS.physics.density}
                onChange={(e) => updatePhysics({ density: parseFloat(e.target.value) })}
              />
            </div>

            {/* Break pattern selector */}
            <div className="fft-editor__field">
              <label htmlFor="fft-physics-break-pattern" className="fft-editor__label">
                Break Pattern
              </label>
              <select
                id="fft-physics-break-pattern"
                className="fft-editor__select"
                value={localCube.physics?.break_pattern ?? FFT_CUBE_DEFAULTS.physics.break_pattern}
                onChange={(e) => updatePhysics({ break_pattern: e.target.value as BreakPattern })}
              >
                {BREAK_PATTERNS.map((pattern) => (
                  <option key={pattern} value={pattern}>
                    {pattern.charAt(0).toUpperCase() + pattern.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            {/* Coherence Loss slider */}
            <div className="fft-editor__field">
              <label htmlFor="coherence-loss" className="fft-editor__label">
                Coherence Loss
                <span className="fft-editor__value">
                  {(
                    localCube.physics?.coherence_loss ?? FFT_CUBE_DEFAULTS.physics.coherence_loss
                  ).toFixed(3)}
                </span>
              </label>
              <input
                id="coherence-loss"
                type="range"
                className="fft-editor__slider"
                min="0"
                max="0.1"
                step="0.001"
                value={
                  localCube.physics?.coherence_loss ?? FFT_CUBE_DEFAULTS.physics.coherence_loss
                }
                onChange={(e) => updatePhysics({ coherence_loss: parseFloat(e.target.value) })}
              />
              <div className="fft-editor__slider-labels">
                <span>No decay</span>
                <span>Fast decay</span>
              </div>
              <p className="fft-editor__description">
                Rate at which energy naturally decays over time. Higher values = faster energy loss.
              </p>
            </div>

            {/* Fracture Threshold slider */}
            <div className="fft-editor__field">
              <label htmlFor="fracture-threshold" className="fft-editor__label">
                Fracture Threshold
                <span className="fft-editor__value">
                  {(
                    localCube.physics?.fracture_threshold ??
                    FFT_CUBE_DEFAULTS.physics.fracture_threshold
                  ).toFixed(1)}
                </span>
              </label>
              <input
                id="fracture-threshold"
                type="range"
                className="fft-editor__slider"
                min="0"
                max="200"
                step="1"
                value={
                  localCube.physics?.fracture_threshold ??
                  FFT_CUBE_DEFAULTS.physics.fracture_threshold
                }
                onChange={(e) => updatePhysics({ fracture_threshold: parseFloat(e.target.value) })}
              />
              <div className="fft-editor__slider-labels">
                <span>Fragile</span>
                <span>Durable</span>
              </div>
              <p className="fft-editor__description">
                Energy level at which the cube fractures/breaks. Set to 0 to disable fracturing.
              </p>
            </div>

            {/* Stress Level Indicator */}
            {energyInfo.fractureResult && energyInfo.fractureResult.threshold > 0 && (
              <div className="fft-editor__field">
                <label className="fft-editor__label">Stress Level</label>
                <div
                  className={`fft-editor__stress-indicator ${getStressLevelClass(energyInfo.fractureResult.stressLevel)}`}
                >
                  <div className="fft-editor__stress-bar">
                    <div
                      className="fft-editor__stress-fill"
                      style={{
                        width: `${Math.min(energyInfo.fractureResult.stressLevel * 100, 100)}%`,
                      }}
                    />
                    <div className="fft-editor__stress-threshold" style={{ left: '80%' }} />
                  </div>
                  <div className="fft-editor__stress-info">
                    <span className="fft-editor__stress-value">
                      {(energyInfo.fractureResult.stressLevel * 100).toFixed(1)}%
                    </span>
                    <span className="fft-editor__stress-label">
                      {getStressLevelLabel(energyInfo.fractureResult.stressLevel)}
                    </span>
                  </div>
                </div>
                {energyInfo.nearFracture && (
                  <div className="fft-editor__warning" role="alert">
                    Warning: Energy approaching fracture threshold!
                  </div>
                )}
                {energyInfo.fractureResult.fractured && (
                  <div className="fft-editor__error" role="alert">
                    CRITICAL: Fracture threshold exceeded! Cube is unstable.
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </section>

      {/* Boundary Settings Section */}
      <section className="fft-editor__section">
        <button
          type="button"
          className={`fft-editor__section-header ${expandedSections.has('boundary') ? 'fft-editor__section-header--expanded' : ''}`}
          onClick={() => toggleSection('boundary')}
          aria-expanded={expandedSections.has('boundary')}
        >
          <span>Boundary Settings</span>
          <span className="fft-editor__chevron">
            {expandedSections.has('boundary') ? '▼' : '▶'}
          </span>
        </button>

        {expandedSections.has('boundary') && (
          <div className="fft-editor__section-content">
            <p className="fft-editor__hint">
              Controls how this cube blends with neighboring cubes in a grid.
            </p>

            {/* Boundary mode selector */}
            <div className="fft-editor__field">
              <label htmlFor="fft-boundary-mode" className="fft-editor__label">
                Mode
              </label>
              <select
                id="fft-boundary-mode"
                className="fft-editor__select"
                value={localCube.boundary?.mode ?? FFT_CUBE_DEFAULTS.boundary.mode}
                onChange={(e) => updateBoundary({ mode: e.target.value as BoundaryMode })}
              >
                {BOUNDARY_MODES.map((mode) => (
                  <option key={mode} value={mode}>
                    {mode.charAt(0).toUpperCase() + mode.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            {/* Neighbor influence slider */}
            <div className="fft-editor__field">
              <label htmlFor="fft-boundary-neighbor-influence" className="fft-editor__label">
                Neighbor Influence
                <span className="fft-editor__value">
                  {(
                    localCube.boundary?.neighbor_influence ??
                    FFT_CUBE_DEFAULTS.boundary.neighbor_influence
                  ).toFixed(2)}
                </span>
              </label>
              <input
                id="fft-boundary-neighbor-influence"
                type="range"
                className="fft-editor__slider"
                min="0"
                max="1"
                step="0.01"
                value={
                  localCube.boundary?.neighbor_influence ??
                  FFT_CUBE_DEFAULTS.boundary.neighbor_influence
                }
                onChange={(e) => updateBoundary({ neighbor_influence: parseFloat(e.target.value) })}
              />
              <div className="fft-editor__slider-labels">
                <span>None</span>
                <span>Full</span>
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  )
}

export default FFTParamEditor
