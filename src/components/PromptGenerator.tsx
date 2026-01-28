/**
 * PromptGenerator component for generating cube configurations from text descriptions
 *
 * Provides a user-friendly interface for:
 * - Text input for custom prompts
 * - Quick template selection for common materials
 * - Random generation fallback
 * - Real-time generation status feedback
 */

import { useState, useCallback } from 'react'
import type { SpectralCube } from '../types/cube'
import {
  generateFromPrompt,
  generateFromTemplate,
  generateRandom,
  getAvailableTemplates,
  isReady,
  type GenerationResult,
} from '../lib/tinyLLM'

/**
 * Props for PromptGenerator component
 */
export interface PromptGeneratorProps {
  /** Callback when a cube is generated */
  onCubeGenerated?: (cube: SpectralCube) => void
  /** Custom class name */
  className?: string
}

/** Generation status states */
type GenerationStatus = 'idle' | 'generating' | 'success' | 'error'

/** Preset template categories for organized display */
const TEMPLATE_CATEGORIES: Record<string, string[]> = {
  Natural: ['stone', 'rock', 'grass', 'moss', 'dirt', 'sand'],
  Wood: ['wood', 'oak', 'birch', 'bark'],
  Stone: ['granite', 'marble', 'cobblestone', 'brick', 'concrete'],
  Metal: ['metal', 'iron', 'steel', 'gold', 'copper', 'rust'],
  Crystal: ['crystal', 'glass', 'ice', 'gem'],
  Fantasy: ['magic', 'lava', 'water'],
}

/** Example prompts for user guidance */
const EXAMPLE_PROMPTS = [
  'dark weathered stone with moss',
  'polished gold with scratches',
  'ancient rusted iron',
  'bright crystal glowing purple',
  'smooth wet marble',
  'каменная кладка с мхом',
  'ржавый металл',
  'магический кристалл',
]

/**
 * PromptGenerator component
 * Provides UI for generating cube configurations from text prompts
 */
export function PromptGenerator({ onCubeGenerated, className = '' }: PromptGeneratorProps) {
  // Input state
  const [prompt, setPrompt] = useState('')
  const [status, setStatus] = useState<GenerationStatus>('idle')
  const [result, setResult] = useState<GenerationResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showTemplates, setShowTemplates] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  // Initialize llmReady with the actual value immediately
  const [llmReady] = useState(() => isReady())

  // Handle prompt generation
  const handleGenerate = useCallback(async () => {
    if (!prompt.trim()) {
      setError('Please enter a description')
      return
    }

    setStatus('generating')
    setError(null)
    setResult(null)

    try {
      const generationResult = await generateFromPrompt(prompt.trim())

      if (generationResult.success && generationResult.cube) {
        setResult(generationResult)
        setStatus('success')
        onCubeGenerated?.(generationResult.cube)
      } else {
        setError('Generation failed. Try a different description.')
        setStatus('error')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred')
      setStatus('error')
    }
  }, [prompt, onCubeGenerated])

  // Handle template selection
  const handleTemplateSelect = useCallback(
    async (templateName: string) => {
      setStatus('generating')
      setError(null)
      setResult(null)
      setPrompt(templateName)

      try {
        const generationResult = await generateFromTemplate(templateName)

        if (generationResult.success && generationResult.cube) {
          setResult(generationResult)
          setStatus('success')
          onCubeGenerated?.(generationResult.cube)
        } else {
          setError(generationResult.warnings.join(', ') || 'Template not found')
          setStatus('error')
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error occurred')
        setStatus('error')
      }

      setShowTemplates(false)
    },
    [onCubeGenerated]
  )

  // Handle random generation
  const handleRandom = useCallback(async () => {
    setStatus('generating')
    setError(null)
    setResult(null)
    setPrompt('')

    try {
      const generationResult = await generateRandom()

      if (generationResult.success && generationResult.cube) {
        setResult(generationResult)
        setStatus('success')
        onCubeGenerated?.(generationResult.cube)
      } else {
        setError('Random generation failed')
        setStatus('error')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred')
      setStatus('error')
    }
  }, [onCubeGenerated])

  // Handle example prompt click
  const handleExampleClick = useCallback((example: string) => {
    setPrompt(example)
    setError(null)
    setResult(null)
    setStatus('idle')
  }, [])

  // Handle Enter key press
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        handleGenerate()
      }
    },
    [handleGenerate]
  )

  // Format confidence as percentage
  const formatConfidence = (confidence: number): string => {
    return `${Math.round(confidence * 100)}%`
  }

  // Get method display name
  const getMethodName = (method: string): string => {
    switch (method) {
      case 'keyword':
        return 'Keyword Match'
      case 'template':
        return 'Template'
      case 'random':
        return 'Random'
      case 'hybrid':
        return 'Hybrid'
      default:
        return method
    }
  }

  const availableTemplates = getAvailableTemplates()

  return (
    <div className={`prompt-generator ${className}`}>
      <div className="prompt-generator__header">
        <h2 className="prompt-generator__title">Generate by Description</h2>
        <div className="prompt-generator__status-indicator">
          <span
            className={`prompt-generator__status-dot ${llmReady ? 'prompt-generator__status-dot--ready' : 'prompt-generator__status-dot--loading'}`}
          />
          <span className="prompt-generator__status-text">{llmReady ? 'Ready' : 'Loading...'}</span>
        </div>
      </div>

      {/* Prompt input */}
      <div className="prompt-generator__input-section">
        <label htmlFor="prompt-input" className="prompt-generator__label">
          Describe your cube
        </label>
        <div className="prompt-generator__input-wrapper">
          <input
            id="prompt-input"
            type="text"
            className="prompt-generator__input"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="e.g., dark stone with moss..."
            disabled={status === 'generating'}
          />
          <button
            type="button"
            className="prompt-generator__generate-btn"
            onClick={handleGenerate}
            disabled={status === 'generating' || !prompt.trim()}
            aria-label="Generate cube"
          >
            {status === 'generating' ? (
              <span className="prompt-generator__spinner" />
            ) : (
              <span className="prompt-generator__generate-icon">✨</span>
            )}
          </button>
        </div>
      </div>

      {/* Example prompts */}
      <div className="prompt-generator__examples">
        <span className="prompt-generator__examples-label">Try:</span>
        <div className="prompt-generator__examples-list">
          {EXAMPLE_PROMPTS.slice(0, 4).map((example) => (
            <button
              key={example}
              type="button"
              className="prompt-generator__example-btn"
              onClick={() => handleExampleClick(example)}
            >
              {example.length > 25 ? example.slice(0, 25) + '...' : example}
            </button>
          ))}
        </div>
      </div>

      {/* Action buttons */}
      <div className="prompt-generator__actions">
        <button
          type="button"
          className="prompt-generator__action-btn prompt-generator__action-btn--template"
          onClick={() => setShowTemplates(!showTemplates)}
        >
          {showTemplates ? '× Close' : '📋 Templates'}
        </button>
        <button
          type="button"
          className="prompt-generator__action-btn prompt-generator__action-btn--random"
          onClick={handleRandom}
          disabled={status === 'generating'}
        >
          🎲 Random
        </button>
      </div>

      {/* Template selector */}
      {showTemplates && (
        <div className="prompt-generator__templates">
          <div className="prompt-generator__template-categories">
            {Object.keys(TEMPLATE_CATEGORIES).map((category) => (
              <button
                key={category}
                type="button"
                className={`prompt-generator__category-btn ${selectedCategory === category ? 'prompt-generator__category-btn--active' : ''}`}
                onClick={() => setSelectedCategory(selectedCategory === category ? null : category)}
              >
                {category}
              </button>
            ))}
          </div>

          <div className="prompt-generator__template-list">
            {(selectedCategory
              ? TEMPLATE_CATEGORIES[selectedCategory]
              : availableTemplates.slice(0, 12)
            ).map((template) => (
              <button
                key={template}
                type="button"
                className="prompt-generator__template-btn"
                onClick={() => handleTemplateSelect(template)}
              >
                {template.charAt(0).toUpperCase() + template.slice(1)}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="prompt-generator__message prompt-generator__message--error" role="alert">
          {error}
        </div>
      )}

      {/* Success result */}
      {status === 'success' && result && (
        <div className="prompt-generator__result">
          <div className="prompt-generator__result-header">
            <span className="prompt-generator__result-icon">✓</span>
            <span className="prompt-generator__result-title">Generated!</span>
          </div>
          <div className="prompt-generator__result-details">
            <div className="prompt-generator__result-row">
              <span className="prompt-generator__result-label">Method:</span>
              <span className="prompt-generator__result-value">{getMethodName(result.method)}</span>
            </div>
            <div className="prompt-generator__result-row">
              <span className="prompt-generator__result-label">Confidence:</span>
              <span className="prompt-generator__result-value">
                <span
                  className={`prompt-generator__confidence-bar ${
                    result.confidence >= 0.7
                      ? 'prompt-generator__confidence-bar--high'
                      : result.confidence >= 0.4
                        ? 'prompt-generator__confidence-bar--medium'
                        : 'prompt-generator__confidence-bar--low'
                  }`}
                  style={{ width: `${result.confidence * 100}%` }}
                />
                {formatConfidence(result.confidence)}
              </span>
            </div>
            {result.warnings.length > 0 && (
              <div className="prompt-generator__result-warnings">
                {result.warnings.map((warning, i) => (
                  <span key={i} className="prompt-generator__warning">
                    ⚠️ {warning}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Loading overlay */}
      {status === 'generating' && (
        <div className="prompt-generator__loading" aria-live="polite">
          <div className="prompt-generator__loading-spinner" />
          <span className="prompt-generator__loading-text">Generating...</span>
        </div>
      )}
    </div>
  )
}

export default PromptGenerator
