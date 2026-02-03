/**
 * Tests for MetaMode LLM Integration Module
 *
 * TASK 81: Интеграция с tinyLLM (Phase 12)
 *
 * Tests cover:
 * - LLM backend implementations
 * - Context builder functionality
 * - MetaMode query processing
 * - Prompt template generation
 * - Caching behavior
 * - Fallback responses
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
  MockLLMBackend,
  OllamaBackend,
  LlamaCppBackend,
  OpenAICompatibleBackend,
  MetaModeContextBuilder,
  MetaModeLLMIntegration,
  createDefaultBackends,
  createMetaModeLLMIntegration,
  PROMPT_TEMPLATES,
  DEFAULT_BACKEND_CONFIGS,
  type MetaModeQueryRequest,
} from './metamode-llm-integration'
import { buildDatabase, type MetamodeDirEntry, type MetamodeDatabase } from './metamode-database'

// ============================================================================
// Test Data
// ============================================================================

const createTestTree = (): MetamodeDirEntry => ({
  name: 'isocubic',
  description: 'Voxel cube editor project',
  version: '1.0.0',
  languages: ['typescript', 'vue', 'glsl'],
  tags: ['editor', 'voxel', '3d'],
  ai: 'Parametric 3D cube editor for isometric games',
  files: {
    'package.json': {
      description: 'NPM manifest',
      status: 'stable',
    },
    'vite.config.ts': {
      description: 'Vite build configuration',
      status: 'stable',
      phase: 1,
    },
  },
  children: {
    src: {
      name: 'src',
      description: 'Main application source code',
      languages: ['typescript', 'vue'],
      tags: ['source'],
      children: {
        components: {
          name: 'components',
          description: 'Vue UI components',
          tags: ['vue', 'ui'],
          files: {
            'ParamEditor.vue': {
              description: 'Parameter editor for cube properties',
              status: 'stable',
              phase: 5,
              tags: ['editor', 'ui'],
              ai: 'Edits cube base color, gradients, noise',
            },
            'CubePreview.vue': {
              description: '3D cube preview component',
              status: 'stable',
              phase: 2,
              tags: ['3d', 'preview'],
            },
            'MetaModeWindow.vue': {
              description: 'MetaMode main window',
              status: 'beta',
              phase: 12,
              tags: ['metamode', 'window'],
            },
          },
        },
        lib: {
          name: 'lib',
          description: 'Utility libraries',
          tags: ['utils', 'lib'],
          files: {
            'tinyLLM.ts': {
              description: 'Rule-based cube generator',
              status: 'stable',
              phase: 1,
              tags: ['ai', 'generator'],
            },
            'metamode-database.ts': {
              description: 'MetaMode embedded database',
              status: 'stable',
              phase: 12,
              tags: ['metamode', 'database'],
            },
          },
        },
      },
    },
    docs: {
      name: 'docs',
      description: 'Project documentation',
      tags: ['docs'],
      files: {
        'phase-12.md': {
          description: 'Phase 12 development plan',
          status: 'stable',
          phase: 12,
          tags: ['phase', 'docs'],
        },
      },
    },
  },
})

const createTestDatabase = (): MetamodeDatabase => {
  return buildDatabase(createTestTree())
}

// ============================================================================
// MockLLMBackend Tests
// ============================================================================

describe('MockLLMBackend', () => {
  let backend: MockLLMBackend

  beforeEach(() => {
    backend = new MockLLMBackend()
  })

  it('should have mock type', () => {
    expect(backend.type).toBe('mock')
  })

  it('should always be available', async () => {
    const available = await backend.isAvailable()
    expect(available).toBe(true)
  })

  it('should generate response for component query', async () => {
    const response = await backend.generate('system', 'What are the components?')
    expect(response).toContain('компонент')
  })

  it('should generate response for phase query', async () => {
    const response = await backend.generate('system', 'What phase is the project in?')
    expect(response).toContain('фаз')
  })

  it('should generate response for structure query', async () => {
    const response = await backend.generate('system', 'What is the structure?')
    expect(response).toContain('структур')
  })

  it('should handle Russian queries', async () => {
    const response = await backend.generate(
      'system',
      'ВОПРОС ПОЛЬЗОВАТЕЛЯ:\nКакие есть компоненты?'
    )
    expect(response).toBeTruthy()
  })

  it('should generate generic response for unknown queries', async () => {
    const response = await backend.generate('system', 'ВОПРОС ПОЛЬЗОВАТЕЛЯ:\nЧто-то случайное')
    expect(response).toContain('MetaMode')
  })
})

// ============================================================================
// OllamaBackend Tests
// ============================================================================

describe('OllamaBackend', () => {
  let backend: OllamaBackend

  beforeEach(() => {
    backend = new OllamaBackend()
  })

  it('should have ollama type', () => {
    expect(backend.type).toBe('ollama')
  })

  it('should use default config', () => {
    const config = DEFAULT_BACKEND_CONFIGS.ollama
    expect(config.baseUrl).toBe('http://localhost:11434')
    expect(config.model).toBe('llama3.2:3b')
  })

  it('should accept custom config', () => {
    const customBackend = new OllamaBackend({
      baseUrl: 'http://custom:1234',
      model: 'custom-model',
    })
    expect(customBackend.type).toBe('ollama')
  })

  it('should handle unavailable server', async () => {
    const unavailableBackend = new OllamaBackend({
      baseUrl: 'http://nonexistent:99999',
      timeout: 1000,
    })
    const available = await unavailableBackend.isAvailable()
    expect(available).toBe(false)
  })
})

// ============================================================================
// LlamaCppBackend Tests
// ============================================================================

describe('LlamaCppBackend', () => {
  let backend: LlamaCppBackend

  beforeEach(() => {
    backend = new LlamaCppBackend()
  })

  it('should have llamacpp type', () => {
    expect(backend.type).toBe('llamacpp')
  })

  it('should use default config', () => {
    const config = DEFAULT_BACKEND_CONFIGS.llamacpp
    expect(config.baseUrl).toBe('http://localhost:8080')
  })

  it('should handle unavailable server', async () => {
    const unavailableBackend = new LlamaCppBackend({
      baseUrl: 'http://nonexistent:99999',
      timeout: 1000,
    })
    const available = await unavailableBackend.isAvailable()
    expect(available).toBe(false)
  })
})

// ============================================================================
// OpenAICompatibleBackend Tests
// ============================================================================

describe('OpenAICompatibleBackend', () => {
  let backend: OpenAICompatibleBackend

  beforeEach(() => {
    backend = new OpenAICompatibleBackend()
  })

  it('should have openai-compatible type', () => {
    expect(backend.type).toBe('openai-compatible')
  })

  it('should use default config', () => {
    const config = DEFAULT_BACKEND_CONFIGS['openai-compatible']
    expect(config.baseUrl).toBe('http://localhost:1234/v1')
  })

  it('should accept API key', () => {
    const backendWithKey = new OpenAICompatibleBackend({
      apiKey: 'test-key',
    })
    expect(backendWithKey.type).toBe('openai-compatible')
  })

  it('should handle unavailable server', async () => {
    const unavailableBackend = new OpenAICompatibleBackend({
      baseUrl: 'http://nonexistent:99999',
      timeout: 1000,
    })
    const available = await unavailableBackend.isAvailable()
    expect(available).toBe(false)
  })
})

// ============================================================================
// MetaModeContextBuilder Tests
// ============================================================================

describe('MetaModeContextBuilder', () => {
  let builder: MetaModeContextBuilder
  let db: MetamodeDatabase

  beforeEach(() => {
    db = createTestDatabase()
    builder = new MetaModeContextBuilder(db)
  })

  it('should build context from search', () => {
    const context = builder.buildFromSearch('component', 8000)
    expect(context).toBeTruthy()
    expect(context.length).toBeGreaterThan(0)
  })

  it('should build context from paths', () => {
    const context = builder.buildFromPaths(['src/components', 'src/lib'], 8000)
    expect(context).toBeTruthy()
    expect(context).toContain('components')
  })

  it('should build overview context', () => {
    const context = builder.buildOverview(8000)
    expect(context).toBeTruthy()
    expect(context).toContain('isocubic')
    expect(context).toContain('Статистика')
  })

  it('should limit context to maxChars', () => {
    const shortContext = builder.buildOverview(100)
    expect(shortContext.length).toBeLessThanOrEqual(103) // 100 + '...'
  })

  it('should build context with status filter', () => {
    const context = builder.buildWithFilters(['stable'], undefined, undefined, 8000)
    expect(context).toBeTruthy()
  })

  it('should build context with phase filter', () => {
    const context = builder.buildWithFilters(undefined, [12], undefined, 8000)
    expect(context).toBeTruthy()
  })

  it('should build context with tag filter', () => {
    const context = builder.buildWithFilters(undefined, undefined, ['metamode'], 8000)
    expect(context).toBeTruthy()
  })

  it('should expose database client', () => {
    const client = builder.getClient()
    expect(client).toBeTruthy()
    expect(client.getRoot().name).toBe('isocubic')
  })

  it('should handle empty search results', () => {
    const context = builder.buildFromSearch('nonexistentxyz123', 8000)
    // Should return empty string or minimal content
    expect(typeof context).toBe('string')
  })

  it('should handle empty paths array', () => {
    const context = builder.buildFromPaths([], 8000)
    expect(context).toBe('')
  })

  it('should handle nonexistent paths gracefully', () => {
    const context = builder.buildFromPaths(['nonexistent/path'], 8000)
    expect(context).toBe('')
  })
})

// ============================================================================
// PROMPT_TEMPLATES Tests
// ============================================================================

describe('PROMPT_TEMPLATES', () => {
  it('should have Russian template', () => {
    expect(PROMPT_TEMPLATES.ru).toBeDefined()
    expect(PROMPT_TEMPLATES.ru.systemPrompt).toContain('AI-помощник')
    expect(PROMPT_TEMPLATES.ru.queryTemplate).toContain('{context}')
    expect(PROMPT_TEMPLATES.ru.queryTemplate).toContain('{query}')
  })

  it('should have English template', () => {
    expect(PROMPT_TEMPLATES.en).toBeDefined()
    expect(PROMPT_TEMPLATES.en.systemPrompt).toContain('AI assistant')
    expect(PROMPT_TEMPLATES.en.queryTemplate).toContain('{context}')
    expect(PROMPT_TEMPLATES.en.queryTemplate).toContain('{query}')
  })

  it('should have reasonable maxContextChars', () => {
    expect(PROMPT_TEMPLATES.ru.maxContextChars).toBeGreaterThan(1000)
    expect(PROMPT_TEMPLATES.en.maxContextChars).toBeGreaterThan(1000)
  })
})

// ============================================================================
// MetaModeLLMIntegration Tests
// ============================================================================

describe('MetaModeLLMIntegration', () => {
  let integration: MetaModeLLMIntegration
  let db: MetamodeDatabase

  beforeEach(() => {
    db = createTestDatabase()
    integration = new MetaModeLLMIntegration(db)
    integration.registerBackends([new MockLLMBackend()])
  })

  it('should register backends', () => {
    const mockBackend = new MockLLMBackend()
    integration.registerBackends([mockBackend])
    expect(integration.getActiveBackend()).toBeNull() // Not selected yet
  })

  it('should add backends', () => {
    const anotherBackend = new MockLLMBackend()
    integration.addBackend(anotherBackend)
    // Backend added but not selected
    expect(integration.getActiveBackend()).toBeNull()
  })

  it('should select available backend', async () => {
    const backend = await integration.selectBackend()
    expect(backend).toBeTruthy()
    expect(backend?.type).toBe('mock')
  })

  it('should check LLM availability', async () => {
    const available = await integration.isLLMAvailable()
    expect(available).toBe(true)
  })

  it('should process query successfully', async () => {
    const request: MetaModeQueryRequest = {
      query: 'Какие компоненты есть в проекте?',
      language: 'ru',
    }

    const response = await integration.query(request)

    expect(response.success).toBe(true)
    expect(response.answer).toBeTruthy()
    expect(response.backendUsed).toBe('mock')
    expect(response.processingTime).toBeGreaterThanOrEqual(0)
  })

  it('should return related paths', async () => {
    const request: MetaModeQueryRequest = {
      query: 'components',
      language: 'en',
    }

    const response = await integration.query(request)

    expect(response.relatedPaths).toBeDefined()
    expect(Array.isArray(response.relatedPaths)).toBe(true)
  })

  it('should calculate confidence score', async () => {
    const request: MetaModeQueryRequest = {
      query: 'What is MetaMode?',
      language: 'en',
    }

    const response = await integration.query(request)

    expect(response.confidence).toBeGreaterThan(0)
    expect(response.confidence).toBeLessThanOrEqual(1)
  })

  it('should use specific context paths', async () => {
    const request: MetaModeQueryRequest = {
      query: 'Tell me about this',
      language: 'en',
      contextPaths: ['src/components'],
    }

    const response = await integration.query(request)

    expect(response.success).toBe(true)
  })

  it('should apply status filter', async () => {
    const request: MetaModeQueryRequest = {
      query: 'Show stable files',
      language: 'en',
      statusFilter: ['stable'],
    }

    const response = await integration.query(request)

    expect(response.success).toBe(true)
  })

  it('should apply phase filter', async () => {
    const request: MetaModeQueryRequest = {
      query: 'Show phase 12 files',
      language: 'en',
      phaseFilter: [12],
    }

    const response = await integration.query(request)

    expect(response.success).toBe(true)
  })

  it('should apply tag filter', async () => {
    const request: MetaModeQueryRequest = {
      query: 'Show MetaMode files',
      language: 'en',
      tagFilter: ['metamode'],
    }

    const response = await integration.query(request)

    expect(response.success).toBe(true)
  })

  it('should configure caching', () => {
    integration.setCaching(true, 30000)
    // No error means success
    expect(true).toBe(true)
  })

  it('should clear cache', () => {
    integration.clearCache()
    // No error means success
    expect(true).toBe(true)
  })

  it('should cache responses', async () => {
    integration.setCaching(true, 60000)

    const request: MetaModeQueryRequest = {
      query: 'Test caching',
      language: 'en',
    }

    const response1 = await integration.query(request)
    const response2 = await integration.query(request)

    // Both should succeed (second from cache)
    expect(response1.success).toBe(true)
    expect(response2.success).toBe(true)
  })

  it('should expose context builder', () => {
    const builder = integration.getContextBuilder()
    expect(builder).toBeTruthy()
    expect(builder.getClient()).toBeTruthy()
  })
})

// ============================================================================
// Fallback Behavior Tests
// ============================================================================

describe('Fallback Behavior', () => {
  let integration: MetaModeLLMIntegration
  let db: MetamodeDatabase

  beforeEach(() => {
    db = createTestDatabase()
    integration = new MetaModeLLMIntegration(db)
    // Register no backends to trigger fallback
    integration.registerBackends([])
  })

  it('should use fallback when no backends available', async () => {
    const request: MetaModeQueryRequest = {
      query: 'Tell me about components',
      language: 'en',
    }

    const response = await integration.query(request)

    expect(response.success).toBe(true)
    expect(response.backendUsed).toBe('fallback')
    expect(response.warnings.length).toBeGreaterThan(0)
  })

  it('should generate fallback response in Russian', async () => {
    const request: MetaModeQueryRequest = {
      query: 'Расскажи о компонентах',
      language: 'ru',
    }

    const response = await integration.query(request)

    expect(response.success).toBe(true)
    expect(response.backendUsed).toBe('fallback')
  })

  it('should include related paths in fallback', async () => {
    const request: MetaModeQueryRequest = {
      query: 'component',
      language: 'en',
    }

    const response = await integration.query(request)

    expect(response.relatedPaths.length).toBeGreaterThan(0)
  })

  it('should handle no matches gracefully', async () => {
    const request: MetaModeQueryRequest = {
      query: 'xyznonexistent123',
      language: 'en',
    }

    const response = await integration.query(request)

    expect(response.success).toBe(true)
    expect(response.answer).toContain("couldn't find")
  })

  it('should handle no matches in Russian', async () => {
    const request: MetaModeQueryRequest = {
      query: 'xyzнесуществующее123',
      language: 'ru',
    }

    const response = await integration.query(request)

    expect(response.success).toBe(true)
    expect(response.answer).toContain('не нашёл')
  })
})

// ============================================================================
// Factory Function Tests
// ============================================================================

describe('Factory Functions', () => {
  it('should create default backends', () => {
    const backends = createDefaultBackends()

    expect(backends.length).toBe(4)
    expect(backends[0].type).toBe('ollama')
    expect(backends[1].type).toBe('llamacpp')
    expect(backends[2].type).toBe('openai-compatible')
    expect(backends[3].type).toBe('mock')
  })

  it('should create default backends with custom configs', () => {
    const backends = createDefaultBackends({
      ollama: { baseUrl: 'http://custom:1234' },
    })

    expect(backends.length).toBe(4)
    expect(backends[0].type).toBe('ollama')
  })

  it('should create integration with default configuration', () => {
    const db = createTestDatabase()
    const integration = createMetaModeLLMIntegration(db)

    expect(integration).toBeTruthy()
    expect(integration.getContextBuilder()).toBeTruthy()
  })

  it('should create integration with custom configs', () => {
    const db = createTestDatabase()
    const integration = createMetaModeLLMIntegration(db, {
      ollama: { model: 'custom-model' },
    })

    expect(integration).toBeTruthy()
  })
})

// ============================================================================
// DEFAULT_BACKEND_CONFIGS Tests
// ============================================================================

describe('DEFAULT_BACKEND_CONFIGS', () => {
  it('should have ollama config', () => {
    const config = DEFAULT_BACKEND_CONFIGS.ollama
    expect(config.baseUrl).toBeTruthy()
    expect(config.model).toBeTruthy()
    expect(config.timeout).toBeGreaterThan(0)
    expect(config.maxTokens).toBeGreaterThan(0)
    expect(config.temperature).toBeGreaterThanOrEqual(0)
    expect(config.temperature).toBeLessThanOrEqual(1)
  })

  it('should have llamacpp config', () => {
    const config = DEFAULT_BACKEND_CONFIGS.llamacpp
    expect(config.baseUrl).toBeTruthy()
    expect(config.timeout).toBeGreaterThan(0)
  })

  it('should have openai-compatible config', () => {
    const config = DEFAULT_BACKEND_CONFIGS['openai-compatible']
    expect(config.baseUrl).toBeTruthy()
    expect(config.model).toBeTruthy()
  })

  it('should have mock config', () => {
    const config = DEFAULT_BACKEND_CONFIGS.mock
    expect(config.timeout).toBeDefined()
    expect(config.temperature).toBe(0)
  })
})

// ============================================================================
// Error Handling Tests
// ============================================================================

describe('Error Handling', () => {
  let integration: MetaModeLLMIntegration
  let db: MetamodeDatabase

  beforeEach(() => {
    db = createTestDatabase()
    integration = new MetaModeLLMIntegration(db)
  })

  it('should handle backend errors gracefully', async () => {
    // Create a backend that throws errors
    const errorBackend = {
      type: 'mock' as const,
      isAvailable: async () => true,
      generate: async () => {
        throw new Error('Test error')
      },
    }

    integration.registerBackends([errorBackend])

    const request: MetaModeQueryRequest = {
      query: 'Test error handling',
      language: 'en',
    }

    const response = await integration.query(request)

    // Should fall back to fallback response
    expect(response.success).toBe(true)
    expect(response.backendUsed).toBe('fallback')
    expect(response.warnings.some((w) => w.includes('error'))).toBe(true)
  })

  it('should handle unavailable backends', async () => {
    // Create a backend that reports unavailable
    const unavailableBackend = {
      type: 'mock' as const,
      isAvailable: async () => false,
      generate: async () => '',
    }

    integration.registerBackends([unavailableBackend])

    const available = await integration.isLLMAvailable()
    expect(available).toBe(false)
  })
})

// ============================================================================
// Integration Tests
// ============================================================================

describe('Integration Tests', () => {
  it('should work end-to-end with mock backend', async () => {
    const db = createTestDatabase()
    const integration = createMetaModeLLMIntegration(db)

    // Select backend (will be mock since others are unavailable)
    const backend = await integration.selectBackend()
    expect(backend).toBeTruthy()

    // Make a query
    const response = await integration.query({
      query: 'Какие компоненты есть в проекте?',
      language: 'ru',
    })

    expect(response.success).toBe(true)
    expect(response.answer).toBeTruthy()
    expect(response.processingTime).toBeGreaterThanOrEqual(0)
  })

  it('should handle multiple queries', async () => {
    const db = createTestDatabase()
    const integration = createMetaModeLLMIntegration(db)

    const queries = [
      { query: 'What components exist?', language: 'en' as const },
      { query: 'Какая текущая фаза?', language: 'ru' as const },
      { query: 'Show MetaMode files', language: 'en' as const },
    ]

    for (const q of queries) {
      const response = await integration.query(q)
      expect(response.success).toBe(true)
    }
  })
})
