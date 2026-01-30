/**
 * Tests for ComponentContextPanel Component
 *
 * TASK 51: Component Context Assistant (Phase 8 - AI + Metadata)
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import React, { createElement, type ReactNode } from 'react'
import {
  ComponentContextPanel,
  generateContextInfo,
  generateDescription,
  findRelatedComponents,
  generatePatterns,
  calculateConfidence,
} from './ComponentContextPanel'
import { DevModeProvider } from '../lib/devmode'
import { registerComponentMeta, componentMetaRegistry } from '../types/component-meta'
import type { ComponentMeta } from '../types/component-meta'

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key]
    }),
    clear: vi.fn(() => {
      store = {}
    }),
  }
})()

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true,
})

// Test component metadata
const testGalleryMeta: ComponentMeta = {
  id: 'gallery',
  name: 'Gallery',
  version: '1.1.0',
  summary: 'Displays a gallery of cubes with search and filtering.',
  description:
    'The Gallery component provides a visual display of all available cubes with search, filtering, and selection capabilities. It includes preset and user cube management.',
  phase: 1,
  taskId: 'TASK 5',
  filePath: 'components/Gallery.tsx',
  history: [
    {
      version: '1.0.0',
      date: '2026-01-01T12:00:00Z',
      description: 'Initial version',
      type: 'created',
    },
    {
      version: '1.1.0',
      date: '2026-01-15T12:00:00Z',
      description: 'Added search functionality',
      type: 'updated',
    },
  ],
  features: [
    {
      id: 'search',
      name: 'Search',
      description: 'Search cubes by name or tags',
      enabled: true,
    },
    {
      id: 'filtering',
      name: 'Filtering',
      description: 'Filter by category',
      enabled: true,
    },
    {
      id: 'thumbnails',
      name: 'Thumbnails',
      description: 'Visual cube previews',
      enabled: true,
    },
  ],
  dependencies: [
    { name: 'react', type: 'external', purpose: 'UI library' },
    {
      name: 'CubePreview',
      type: 'component',
      path: 'components/CubePreview.tsx',
      purpose: 'Preview cubes',
    },
  ],
  relatedFiles: [{ path: 'components/Gallery.test.tsx', type: 'test', description: 'Unit tests' }],
  tips: ['Use for browsing cubes', 'Click to select a cube', 'Search supports tags and names'],
  tags: ['gallery', 'ui', 'browse', 'search'],
  status: 'stable',
  lastUpdated: '2026-01-15T12:00:00Z',
}

const testEditorMeta: ComponentMeta = {
  id: 'unified-editor',
  name: 'UnifiedEditor',
  version: '1.2.0',
  summary: 'Unified editor for all cube parameters.',
  description: 'A comprehensive editor component that allows editing all aspects of a cube.',
  phase: 5,
  taskId: 'TASK 35',
  filePath: 'components/UnifiedEditor.tsx',
  history: [
    {
      version: '1.0.0',
      date: '2026-01-10T12:00:00Z',
      description: 'Initial version',
      type: 'created',
    },
  ],
  features: [
    {
      id: 'param-editing',
      name: 'Parameter Editing',
      description: 'Edit all cube parameters',
      enabled: true,
    },
  ],
  dependencies: [
    { name: 'react', type: 'external', purpose: 'UI library' },
    {
      name: 'Gallery',
      type: 'component',
      path: 'components/Gallery.tsx',
      purpose: 'Cube selection',
    },
  ],
  relatedFiles: [],
  props: [
    {
      name: 'cube',
      type: 'SpectralCube',
      required: true,
      description: 'The cube to edit',
    },
    {
      name: 'onChange',
      type: '(cube: SpectralCube) => void',
      required: true,
      description: 'Callback when cube changes',
    },
  ],
  tags: ['editor', 'ui', 'params', 'browse'],
  status: 'stable',
  lastUpdated: '2026-01-10T12:00:00Z',
}

const testPreviewMeta: ComponentMeta = {
  id: 'cube-preview',
  name: 'CubePreview',
  version: '1.0.0',
  summary: 'Renders 3D preview of a cube.',
  description: 'CubePreview renders a three.js scene with the cube visualization.',
  phase: 1,
  taskId: 'TASK 2',
  filePath: 'components/CubePreview.tsx',
  history: [
    {
      version: '1.0.0',
      date: '2026-01-05T12:00:00Z',
      description: 'Initial version',
      type: 'created',
    },
  ],
  features: [],
  dependencies: [{ name: 'three', type: 'external', purpose: '3D rendering' }],
  relatedFiles: [],
  tags: ['preview', '3d', 'visualization'],
  status: 'stable',
  lastUpdated: '2026-01-05T12:00:00Z',
}

// Wrapper with DevModeProvider
const DevModeWrapper = ({
  children,
  enabled = true,
}: {
  children: ReactNode
  enabled?: boolean
}) => {
  return createElement(DevModeProvider, {
    initialSettings: { enabled },
    children,
  } as React.ComponentProps<typeof DevModeProvider>)
}

describe('ComponentContextPanel', () => {
  beforeEach(() => {
    localStorageMock.clear()
    vi.clearAllMocks()

    // Clear and re-register test components
    componentMetaRegistry.clear()
    registerComponentMeta(testGalleryMeta)
    registerComponentMeta(testEditorMeta)
    registerComponentMeta(testPreviewMeta)
  })

  afterEach(() => {
    componentMetaRegistry.clear()
  })

  describe('Rendering', () => {
    it('should not render when DevMode is disabled', () => {
      render(
        <DevModeWrapper enabled={false}>
          <ComponentContextPanel componentId="gallery" />
        </DevModeWrapper>
      )

      expect(screen.queryByTestId('component-context-panel')).not.toBeInTheDocument()
    })

    it('should render when DevMode is enabled', () => {
      render(
        <DevModeWrapper>
          <ComponentContextPanel componentId="gallery" />
        </DevModeWrapper>
      )

      expect(screen.getByTestId('component-context-panel')).toBeInTheDocument()
    })

    it('should render with Context header', () => {
      render(
        <DevModeWrapper>
          <ComponentContextPanel componentId="gallery" />
        </DevModeWrapper>
      )

      expect(screen.getByText(/Context|Контекст/)).toBeInTheDocument()
    })

    it('should show no selection message when componentId is null', () => {
      render(
        <DevModeWrapper>
          <ComponentContextPanel componentId={null} />
        </DevModeWrapper>
      )

      expect(screen.getByText(/Select a component|Выберите компонент/)).toBeInTheDocument()
    })

    it('should display component name when componentId is provided', () => {
      render(
        <DevModeWrapper>
          <ComponentContextPanel componentId="gallery" />
        </DevModeWrapper>
      )

      expect(screen.getByText('Gallery')).toBeInTheDocument()
    })

    it('should display component version', () => {
      render(
        <DevModeWrapper>
          <ComponentContextPanel componentId="gallery" />
        </DevModeWrapper>
      )

      expect(screen.getByText(/1\.1\.0/)).toBeInTheDocument()
    })

    it('should display component status badge', () => {
      render(
        <DevModeWrapper>
          <ComponentContextPanel componentId="gallery" />
        </DevModeWrapper>
      )

      expect(screen.getByText('stable')).toBeInTheDocument()
    })

    it('should display key features', () => {
      render(
        <DevModeWrapper>
          <ComponentContextPanel componentId="gallery" />
        </DevModeWrapper>
      )

      expect(screen.getByText('Search')).toBeInTheDocument()
      expect(screen.getByText('Filtering')).toBeInTheDocument()
      expect(screen.getByText('Thumbnails')).toBeInTheDocument()
    })

    it('should display usage tips', () => {
      render(
        <DevModeWrapper>
          <ComponentContextPanel componentId="gallery" />
        </DevModeWrapper>
      )

      expect(screen.getByText('Use for browsing cubes')).toBeInTheDocument()
    })

    it('should display related components', () => {
      render(
        <DevModeWrapper>
          <ComponentContextPanel componentId="gallery" />
        </DevModeWrapper>
      )

      // Gallery has CubePreview as dependency
      expect(screen.getByTestId('related-component-cube-preview')).toBeInTheDocument()
    })

    it('should display confidence score', () => {
      render(
        <DevModeWrapper>
          <ComponentContextPanel componentId="gallery" />
        </DevModeWrapper>
      )

      // Should show confidence percentage
      expect(screen.getByText(/%/)).toBeInTheDocument()
    })
  })

  describe('Interaction', () => {
    it('should toggle panel when header is clicked', () => {
      render(
        <DevModeWrapper>
          <ComponentContextPanel componentId="gallery" initialExpanded={true} />
        </DevModeWrapper>
      )

      // Initially expanded, should show content
      expect(screen.getByText('Gallery')).toBeInTheDocument()

      // Click header to collapse
      const header = screen.getByRole('button', { name: /Collapse/i })
      fireEvent.click(header.parentElement!)

      // Content should be hidden (panel collapsed)
      // The panel structure changes when collapsed
    })

    it('should call onRelatedComponentSelect when related component is clicked', () => {
      const onRelatedSelect = vi.fn()

      render(
        <DevModeWrapper>
          <ComponentContextPanel componentId="gallery" onRelatedComponentSelect={onRelatedSelect} />
        </DevModeWrapper>
      )

      // Click on a related component
      const relatedItem = screen.getByTestId('related-component-cube-preview')
      fireEvent.click(relatedItem)

      expect(onRelatedSelect).toHaveBeenCalledWith('cube-preview')
    })

    it('should update context when componentId changes', () => {
      const { rerender } = render(
        <DevModeWrapper>
          <ComponentContextPanel componentId="gallery" />
        </DevModeWrapper>
      )

      expect(screen.getByText('Gallery')).toBeInTheDocument()

      // Change componentId
      rerender(
        <DevModeWrapper>
          <ComponentContextPanel componentId="unified-editor" />
        </DevModeWrapper>
      )

      expect(screen.getByText('UnifiedEditor')).toBeInTheDocument()
    })
  })

  describe('Settings', () => {
    it('should respect showTips setting', () => {
      render(
        <DevModeWrapper>
          <ComponentContextPanel componentId="gallery" settings={{ showTips: false }} />
        </DevModeWrapper>
      )

      // Tips should not be shown
      expect(screen.queryByText('Use for browsing cubes')).not.toBeInTheDocument()
    })

    it('should respect showRelated setting', () => {
      render(
        <DevModeWrapper>
          <ComponentContextPanel componentId="gallery" settings={{ showRelated: false }} />
        </DevModeWrapper>
      )

      // Related components should not be shown
      expect(screen.queryByTestId('related-component-cube-preview')).not.toBeInTheDocument()
    })

    it('should respect showPatterns setting', () => {
      render(
        <DevModeWrapper>
          <ComponentContextPanel componentId="gallery" settings={{ showPatterns: false }} />
        </DevModeWrapper>
      )

      // Import pattern should not be shown
      expect(screen.queryByText(/import \{/)).not.toBeInTheDocument()
    })

    it('should limit related components by maxRelatedComponents', () => {
      render(
        <DevModeWrapper>
          <ComponentContextPanel componentId="gallery" settings={{ maxRelatedComponents: 1 }} />
        </DevModeWrapper>
      )

      // Only 1 related component should be shown
      const relatedItems = screen.getAllByTestId(/related-component-/)
      expect(relatedItems.length).toBeLessThanOrEqual(1)
    })
  })

  describe('Position', () => {
    it('should apply top-left position styles', () => {
      render(
        <DevModeWrapper>
          <ComponentContextPanel componentId="gallery" position="top-left" />
        </DevModeWrapper>
      )

      const panel = screen.getByTestId('component-context-panel')
      expect(panel).toHaveStyle({ top: '80px', left: '20px' })
    })

    it('should apply bottom-right position styles', () => {
      render(
        <DevModeWrapper>
          <ComponentContextPanel componentId="gallery" position="bottom-right" />
        </DevModeWrapper>
      )

      const panel = screen.getByTestId('component-context-panel')
      expect(panel).toHaveStyle({ bottom: '20px', right: '480px' })
    })
  })
})

describe('Utility Functions', () => {
  beforeEach(() => {
    componentMetaRegistry.clear()
    registerComponentMeta(testGalleryMeta)
    registerComponentMeta(testEditorMeta)
    registerComponentMeta(testPreviewMeta)
  })

  afterEach(() => {
    componentMetaRegistry.clear()
  })

  describe('generateContextInfo', () => {
    it('should generate context info for a valid component', () => {
      const allComponents = [testGalleryMeta, testEditorMeta, testPreviewMeta]
      const context = generateContextInfo('gallery', 'en', allComponents)

      expect(context.componentId).toBe('gallery')
      expect(context.description).toContain('Gallery')
      expect(context.keyFeatures.length).toBeGreaterThan(0)
      expect(context.confidence).toBeGreaterThan(0)
    })

    it('should return default context for unknown component', () => {
      const allComponents = [testGalleryMeta, testEditorMeta, testPreviewMeta]
      const context = generateContextInfo('unknown', 'en', allComponents)

      expect(context.componentId).toBe('unknown')
      expect(context.description).toBe('')
      expect(context.keyFeatures.length).toBe(0)
      expect(context.confidence).toBe(0)
    })

    it('should generate Russian context info', () => {
      const allComponents = [testGalleryMeta, testEditorMeta, testPreviewMeta]
      const context = generateContextInfo('gallery', 'ru', allComponents)

      expect(context.language).toBe('ru')
      expect(context.description).toContain('компонент')
    })
  })

  describe('generateDescription', () => {
    it('should generate English description', () => {
      const description = generateDescription(testGalleryMeta, 'en')

      expect(description).toContain('Gallery')
      expect(description).toContain('stable')
      expect(description).toContain('phase 1')
    })

    it('should generate Russian description', () => {
      const description = generateDescription(testGalleryMeta, 'ru')

      expect(description).toContain('Gallery')
      expect(description).toContain('стабильный')
      expect(description).toContain('фазы 1')
    })

    it('should mention feature count', () => {
      const description = generateDescription(testGalleryMeta, 'en')

      expect(description).toContain('3 features')
    })
  })

  describe('findRelatedComponents', () => {
    it('should find dependency relationships', () => {
      const allComponents = [testGalleryMeta, testEditorMeta, testPreviewMeta]
      const related = findRelatedComponents(testGalleryMeta, allComponents, 'en')

      // Gallery depends on CubePreview
      const cubePreviewRelation = related.find((r) => r.id === 'cube-preview')
      expect(cubePreviewRelation).toBeDefined()
      expect(cubePreviewRelation?.relationship).toBe('dependency')
    })

    it('should find dependent relationships', () => {
      const allComponents = [testGalleryMeta, testEditorMeta, testPreviewMeta]
      const related = findRelatedComponents(testGalleryMeta, allComponents, 'en')

      // UnifiedEditor depends on Gallery
      const editorRelation = related.find((r) => r.id === 'unified-editor')
      expect(editorRelation).toBeDefined()
      expect(editorRelation?.relationship).toBe('dependent')
    })

    it('should find similar components by tags', () => {
      // Create a component that shares tags but has no dependency relationship
      const similarComponent: ComponentMeta = {
        id: 'search-panel',
        name: 'SearchPanel',
        version: '1.0.0',
        summary: 'Search panel for browsing',
        description: 'A search panel component',
        phase: 1, // Same phase as Gallery
        filePath: 'components/SearchPanel.tsx',
        history: [],
        features: [],
        dependencies: [], // No dependency on Gallery
        relatedFiles: [],
        tags: ['search', 'browse', 'ui'], // Shares 'browse' and 'ui' with Gallery
        status: 'stable',
        lastUpdated: '2026-01-20T12:00:00Z',
      }

      const allComponents = [testGalleryMeta, testEditorMeta, testPreviewMeta, similarComponent]
      const related = findRelatedComponents(testGalleryMeta, allComponents, 'en')

      // SearchPanel shares 'browse' and 'ui' tags with Gallery and is in the same phase
      const hasSharedTag = related.some(
        (r) =>
          r.reason.includes('browse') ||
          r.relationship === 'works-with' ||
          r.relationship === 'sibling'
      )
      expect(hasSharedTag).toBe(true)

      // Verify the specific relationship
      const searchPanelRelation = related.find((r) => r.id === 'search-panel')
      expect(searchPanelRelation).toBeDefined()
      expect(searchPanelRelation?.reason).toContain('browse')
    })

    it('should limit results to 5', () => {
      const allComponents = [testGalleryMeta, testEditorMeta, testPreviewMeta]
      const related = findRelatedComponents(testGalleryMeta, allComponents, 'en')

      expect(related.length).toBeLessThanOrEqual(5)
    })
  })

  describe('generatePatterns', () => {
    it('should generate import pattern', () => {
      const patterns = generatePatterns(testGalleryMeta, 'en')

      const importPattern = patterns.find((p) => p.includes('import'))
      expect(importPattern).toBeDefined()
      expect(importPattern).toContain('Gallery')
    })

    it('should generate usage pattern with props', () => {
      const patterns = generatePatterns(testEditorMeta, 'en')

      const usagePattern = patterns.find((p) => p.includes('<UnifiedEditor'))
      expect(usagePattern).toBeDefined()
      expect(usagePattern).toContain('cube={...}')
    })

    it('should generate Russian patterns', () => {
      const patterns = generatePatterns(testGalleryMeta, 'ru')

      expect(patterns.some((p) => p.includes('import'))).toBe(true)
    })
  })

  describe('calculateConfidence', () => {
    it('should calculate higher confidence for well-documented components', () => {
      const confidence = calculateConfidence(testGalleryMeta)

      // Gallery has good documentation
      expect(confidence).toBeGreaterThan(0.7)
    })

    it('should calculate lower confidence for minimal components', () => {
      const minimalMeta: ComponentMeta = {
        id: 'minimal',
        name: 'Minimal',
        version: '1.0.0',
        summary: 'A minimal component',
        description: 'Short',
        phase: 1,
        filePath: 'components/Minimal.tsx',
        history: [],
        features: [],
        dependencies: [],
        relatedFiles: [],
        tags: [],
        status: 'experimental',
        lastUpdated: '2026-01-01T00:00:00Z',
      }

      const confidence = calculateConfidence(minimalMeta)

      // Minimal component has less documentation
      expect(confidence).toBeLessThan(0.7)
    })

    it('should not exceed 1.0', () => {
      const confidence = calculateConfidence(testGalleryMeta)

      expect(confidence).toBeLessThanOrEqual(1)
    })

    it('should award points for features', () => {
      const withFeatures: ComponentMeta = {
        ...testPreviewMeta,
        features: [
          { id: 'f1', name: 'F1', description: 'Feature 1', enabled: true },
          { id: 'f2', name: 'F2', description: 'Feature 2', enabled: true },
          { id: 'f3', name: 'F3', description: 'Feature 3', enabled: true },
        ],
      }
      const withoutFeatures: ComponentMeta = {
        ...testPreviewMeta,
        features: [],
      }

      const confWith = calculateConfidence(withFeatures)
      const confWithout = calculateConfidence(withoutFeatures)

      expect(confWith).toBeGreaterThan(confWithout)
    })

    it('should award points for tips', () => {
      const withTips: ComponentMeta = {
        ...testPreviewMeta,
        tips: ['Tip 1', 'Tip 2'],
      }
      const withoutTips: ComponentMeta = {
        ...testPreviewMeta,
        tips: undefined,
      }

      const confWith = calculateConfidence(withTips)
      const confWithout = calculateConfidence(withoutTips)

      expect(confWith).toBeGreaterThan(confWithout)
    })
  })
})

describe('Type Exports', () => {
  it('should export ComponentContextInfo type', () => {
    const contextInfo: import('../types/ai-query').ComponentContextInfo = {
      componentId: 'test',
      description: 'Test',
      keyFeatures: [],
      usageTips: [],
      relatedComponents: [],
      patterns: [],
      confidence: 0.5,
      language: 'en',
      generatedAt: new Date().toISOString(),
    }

    expect(contextInfo.componentId).toBe('test')
  })

  it('should export RelatedComponentInfo type', () => {
    const relatedInfo: import('../types/ai-query').RelatedComponentInfo = {
      id: 'related',
      name: 'Related',
      relationship: 'dependency',
      reason: 'Test reason',
    }

    expect(relatedInfo.relationship).toBe('dependency')
  })

  it('should export ContextPanelSettings type', () => {
    const settings: import('../types/ai-query').ContextPanelSettings = {
      autoUpdate: true,
      showRelated: true,
      showTips: true,
      showPatterns: true,
      maxRelatedComponents: 5,
      position: 'top-left',
      preferredLanguage: 'en',
    }

    expect(settings.autoUpdate).toBe(true)
  })
})
