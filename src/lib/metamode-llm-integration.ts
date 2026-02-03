/**
 * MetaMode LLM Integration Module
 *
 * Provides integration between MetaMode metadata and local LLM systems.
 * Enables natural language queries about project structure, components,
 * and metadata using local AI models.
 *
 * TASK 81: Интеграция с tinyLLM (Phase 12)
 *
 * Supported LLM backends:
 * - Ollama (recommended for ease of use)
 * - llama.cpp server (for advanced users)
 * - OpenAI-compatible APIs (for cloud fallback)
 *
 * Features:
 * - Prompt generation optimized for MetaMode data
 * - Context window management for large metadata sets
 * - Response parsing and validation
 * - Caching for repeated queries
 * - Fallback to rule-based responses when LLM unavailable
 */

import type {
  MetamodeDatabase,
  MetamodeDirEntry,
  MetamodeFileEntry,
  MetamodeSearchResult,
} from './metamode-database'
import { MetamodeDatabaseClient } from './metamode-database'
import type { QueryLanguage } from '../types/ai-query'

// ============================================================================
// Types
// ============================================================================

/**
 * Supported LLM backend types
 */
export type LLMBackendType = 'ollama' | 'llamacpp' | 'openai-compatible' | 'mock'

/**
 * LLM backend configuration
 */
export interface LLMBackendConfig {
  /** Backend type */
  type: LLMBackendType
  /** Base URL for the LLM API */
  baseUrl: string
  /** Model name to use */
  model: string
  /** API key (optional, for OpenAI-compatible backends) */
  apiKey?: string
  /** Request timeout in milliseconds */
  timeout: number
  /** Maximum tokens to generate */
  maxTokens: number
  /** Temperature for generation (0-1) */
  temperature: number
}

/**
 * Default configurations for different backends
 */
export const DEFAULT_BACKEND_CONFIGS: Record<LLMBackendType, Omit<LLMBackendConfig, 'type'>> = {
  ollama: {
    baseUrl: 'http://localhost:11434',
    model: 'llama3.2:3b',
    timeout: 30000,
    maxTokens: 1024,
    temperature: 0.7,
  },
  llamacpp: {
    baseUrl: 'http://localhost:8080',
    model: 'default',
    timeout: 30000,
    maxTokens: 1024,
    temperature: 0.7,
  },
  'openai-compatible': {
    baseUrl: 'http://localhost:1234/v1',
    model: 'local-model',
    timeout: 30000,
    maxTokens: 1024,
    temperature: 0.7,
  },
  mock: {
    baseUrl: '',
    model: 'mock',
    timeout: 100,
    maxTokens: 512,
    temperature: 0,
  },
}

/**
 * MetaMode query request
 */
export interface MetaModeQueryRequest {
  /** Natural language query */
  query: string
  /** Detected or specified language */
  language: QueryLanguage
  /** Maximum context tokens to include */
  maxContextTokens?: number
  /** Specific paths to include in context */
  contextPaths?: string[]
  /** Filter by status */
  statusFilter?: string[]
  /** Filter by phase */
  phaseFilter?: number[]
  /** Filter by tags */
  tagFilter?: string[]
}

/**
 * MetaMode query response
 */
export interface MetaModeQueryResponse {
  /** Whether the query was successful */
  success: boolean
  /** Generated answer */
  answer: string
  /** Confidence score (0-1) */
  confidence: number
  /** Related metadata paths found */
  relatedPaths: string[]
  /** Processing time in milliseconds */
  processingTime: number
  /** Backend used */
  backendUsed: LLMBackendType | 'fallback'
  /** Any warnings or notes */
  warnings: string[]
  /** Error message if failed */
  error?: string
}

/**
 * Prompt template configuration
 */
export interface PromptTemplate {
  /** System prompt for the LLM */
  systemPrompt: string
  /** Template for user query with context */
  queryTemplate: string
  /** Maximum context characters */
  maxContextChars: number
}

/**
 * Prompt templates for different languages
 */
export const PROMPT_TEMPLATES: Record<QueryLanguage, PromptTemplate> = {
  ru: {
    systemPrompt: `Ты - AI-помощник для разработки проекта isocubic.
Твоя задача - отвечать на вопросы о структуре проекта, компонентах и метаданных.
Используй только информацию из предоставленного контекста.
Если информации недостаточно, скажи об этом честно.
Отвечай кратко и по делу на русском языке.`,
    queryTemplate: `КОНТЕКСТ ПРОЕКТА (MetaMode метаданные):
{context}

ВОПРОС ПОЛЬЗОВАТЕЛЯ:
{query}

Ответь на вопрос, используя информацию из контекста. Если точного ответа нет в контексте, укажи это.`,
    maxContextChars: 8000,
  },
  en: {
    systemPrompt: `You are an AI assistant for the isocubic project development.
Your task is to answer questions about project structure, components, and metadata.
Use only information from the provided context.
If information is insufficient, say so honestly.
Answer briefly and to the point in English.`,
    queryTemplate: `PROJECT CONTEXT (MetaMode metadata):
{context}

USER QUESTION:
{query}

Answer the question using information from the context. If the exact answer is not in the context, indicate this.`,
    maxContextChars: 8000,
  },
}

// ============================================================================
// LLM Backend Interface
// ============================================================================

/**
 * Interface for LLM backend implementations
 */
export interface LLMBackend {
  /** Backend type */
  readonly type: LLMBackendType
  /** Check if backend is available */
  isAvailable(): Promise<boolean>
  /** Generate a completion */
  generate(systemPrompt: string, userPrompt: string): Promise<string>
}

/**
 * Mock LLM backend for testing and fallback
 */
export class MockLLMBackend implements LLMBackend {
  readonly type: LLMBackendType = 'mock'

  async isAvailable(): Promise<boolean> {
    return true
  }

  async generate(_systemPrompt: string, userPrompt: string): Promise<string> {
    // Extract query from the template
    const queryMatch = userPrompt.match(/(?:ВОПРОС ПОЛЬЗОВАТЕЛЯ|USER QUESTION):\s*(.+?)(?:\n|$)/s)
    const query = queryMatch?.[1]?.trim() || userPrompt

    // Generate a mock response based on keywords
    const lowerQuery = query.toLowerCase()

    if (
      lowerQuery.includes('компонент') ||
      lowerQuery.includes('component') ||
      lowerQuery.includes('file')
    ) {
      return 'На основе контекста проекта, компоненты находятся в директории src/components/. Каждый компонент имеет свой файл .vue и соответствующий тестовый файл.'
    }

    if (lowerQuery.includes('фаза') || lowerQuery.includes('phase')) {
      return 'Проект организован по фазам разработки. Текущая фаза 12 посвящена унификации MetaMode. Предыдущие фазы включали MVP, FFT, оптимизацию и мультиплеер.'
    }

    if (lowerQuery.includes('структур') || lowerQuery.includes('structure')) {
      return 'Проект isocubic имеет стандартную структуру Vue.js: src/ содержит исходный код, docs/ - документацию, packages/ - выделенные пакеты.'
    }

    return 'Я проанализировал предоставленный контекст MetaMode. Пожалуйста, уточните ваш вопрос для более точного ответа.'
  }
}

/**
 * Ollama LLM backend implementation
 */
export class OllamaBackend implements LLMBackend {
  readonly type: LLMBackendType = 'ollama'
  private config: LLMBackendConfig

  constructor(config: Partial<LLMBackendConfig> = {}) {
    this.config = {
      type: 'ollama',
      ...DEFAULT_BACKEND_CONFIGS.ollama,
      ...config,
    }
  }

  async isAvailable(): Promise<boolean> {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 5000)

      const response = await fetch(`${this.config.baseUrl}/api/tags`, {
        signal: controller.signal,
      })

      clearTimeout(timeoutId)
      return response.ok
    } catch {
      return false
    }
  }

  async generate(systemPrompt: string, userPrompt: string): Promise<string> {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout)

    try {
      const response = await fetch(`${this.config.baseUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.config.model,
          prompt: userPrompt,
          system: systemPrompt,
          stream: false,
          options: {
            temperature: this.config.temperature,
            num_predict: this.config.maxTokens,
          },
        }),
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.status}`)
      }

      const data = (await response.json()) as { response: string }
      return data.response
    } catch (error) {
      clearTimeout(timeoutId)
      throw error
    }
  }
}

/**
 * llama.cpp server backend implementation
 */
export class LlamaCppBackend implements LLMBackend {
  readonly type: LLMBackendType = 'llamacpp'
  private config: LLMBackendConfig

  constructor(config: Partial<LLMBackendConfig> = {}) {
    this.config = {
      type: 'llamacpp',
      ...DEFAULT_BACKEND_CONFIGS.llamacpp,
      ...config,
    }
  }

  async isAvailable(): Promise<boolean> {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 5000)

      const response = await fetch(`${this.config.baseUrl}/health`, {
        signal: controller.signal,
      })

      clearTimeout(timeoutId)
      return response.ok
    } catch {
      return false
    }
  }

  async generate(systemPrompt: string, userPrompt: string): Promise<string> {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout)

    try {
      const response = await fetch(`${this.config.baseUrl}/completion`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: `${systemPrompt}\n\n${userPrompt}`,
          n_predict: this.config.maxTokens,
          temperature: this.config.temperature,
          stop: ['</s>', '\n\n\n'],
        }),
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        throw new Error(`llama.cpp API error: ${response.status}`)
      }

      const data = (await response.json()) as { content: string }
      return data.content
    } catch (error) {
      clearTimeout(timeoutId)
      throw error
    }
  }
}

/**
 * OpenAI-compatible API backend implementation
 */
export class OpenAICompatibleBackend implements LLMBackend {
  readonly type: LLMBackendType = 'openai-compatible'
  private config: LLMBackendConfig

  constructor(config: Partial<LLMBackendConfig> = {}) {
    this.config = {
      type: 'openai-compatible',
      ...DEFAULT_BACKEND_CONFIGS['openai-compatible'],
      ...config,
    }
  }

  async isAvailable(): Promise<boolean> {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 5000)

      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (this.config.apiKey) {
        headers['Authorization'] = `Bearer ${this.config.apiKey}`
      }

      const response = await fetch(`${this.config.baseUrl}/models`, {
        headers,
        signal: controller.signal,
      })

      clearTimeout(timeoutId)
      return response.ok
    } catch {
      return false
    }
  }

  async generate(systemPrompt: string, userPrompt: string): Promise<string> {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout)

    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (this.config.apiKey) {
      headers['Authorization'] = `Bearer ${this.config.apiKey}`
    }

    try {
      const response = await fetch(`${this.config.baseUrl}/chat/completions`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: this.config.model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          max_tokens: this.config.maxTokens,
          temperature: this.config.temperature,
        }),
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`)
      }

      const data = (await response.json()) as {
        choices: Array<{ message: { content: string } }>
      }
      return data.choices[0]?.message?.content || ''
    } catch (error) {
      clearTimeout(timeoutId)
      throw error
    }
  }
}

// ============================================================================
// Context Builder
// ============================================================================

/**
 * Builds context string from MetaMode database for LLM prompts
 */
export class MetaModeContextBuilder {
  private client: MetamodeDatabaseClient

  constructor(database: MetamodeDatabase) {
    this.client = new MetamodeDatabaseClient(database)
  }

  /**
   * Build context from search results
   */
  buildFromSearch(query: string, maxChars: number): string {
    const results = this.client.search(query, { limit: 20 })
    return this.formatResults(results, maxChars)
  }

  /**
   * Build context from specific paths
   */
  buildFromPaths(paths: string[], maxChars: number): string {
    const entries: Array<{ path: string; entry: MetamodeDirEntry | MetamodeFileEntry }> = []

    for (const path of paths) {
      const entry = this.client.getByPath(path)
      if (entry) {
        entries.push({ path, entry })
      }
    }

    return this.formatEntries(entries, maxChars)
  }

  /**
   * Build context with filters
   */
  buildWithFilters(
    statusFilter?: string[],
    phaseFilter?: number[],
    tagFilter?: string[],
    maxChars: number = 8000
  ): string {
    const results = this.client.search('', {
      status: statusFilter as Array<'stable' | 'beta' | 'experimental' | 'deprecated'>,
      phase: phaseFilter,
      tags: tagFilter,
      limit: 30,
    })
    return this.formatResults(results, maxChars)
  }

  /**
   * Build overview context (project summary)
   */
  buildOverview(maxChars: number): string {
    const root = this.client.getRoot()
    const stats = this.client.getStats()
    const tags = this.client.getAllTags()
    const languages = this.client.getAllLanguages()

    const lines: string[] = [
      `# Проект: ${root.name}`,
      `Описание: ${root.description}`,
      '',
      `## Статистика`,
      `- Директорий: ${stats.totalDirectories}`,
      `- Файлов: ${stats.totalFiles}`,
      `- Языки: ${languages.join(', ')}`,
      `- Теги: ${tags.slice(0, 20).join(', ')}${tags.length > 20 ? '...' : ''}`,
      '',
      `## Статусы файлов`,
      `- Stable: ${stats.filesByStatus.stable || 0}`,
      `- Beta: ${stats.filesByStatus.beta || 0}`,
      `- Experimental: ${stats.filesByStatus.experimental || 0}`,
      `- Deprecated: ${stats.filesByStatus.deprecated || 0}`,
      '',
    ]

    // Add root directories
    if (root.children) {
      lines.push('## Структура')
      for (const [name, child] of Object.entries(root.children)) {
        lines.push(`- ${name}/: ${child.description}`)
      }
    }

    let context = lines.join('\n')
    if (context.length > maxChars) {
      context = context.substring(0, maxChars - 3) + '...'
    }

    return context
  }

  /**
   * Format search results as context string
   */
  private formatResults(results: MetamodeSearchResult[], maxChars: number): string {
    const lines: string[] = []
    let totalChars = 0

    for (const result of results) {
      const entryLines = this.formatEntry(result.path, result.entry, result.type)
      const entryText = entryLines.join('\n') + '\n'

      if (totalChars + entryText.length > maxChars) {
        break
      }

      lines.push(entryText)
      totalChars += entryText.length
    }

    return lines.join('\n')
  }

  /**
   * Format entries as context string
   */
  private formatEntries(
    entries: Array<{ path: string; entry: MetamodeDirEntry | MetamodeFileEntry }>,
    maxChars: number
  ): string {
    const lines: string[] = []
    let totalChars = 0

    for (const { path, entry } of entries) {
      const isDir = 'name' in entry
      const entryLines = this.formatEntry(path, entry, isDir ? 'directory' : 'file')
      const entryText = entryLines.join('\n') + '\n'

      if (totalChars + entryText.length > maxChars) {
        break
      }

      lines.push(entryText)
      totalChars += entryText.length
    }

    return lines.join('\n')
  }

  /**
   * Format a single entry
   */
  private formatEntry(
    path: string,
    entry: MetamodeDirEntry | MetamodeFileEntry,
    type: 'file' | 'directory'
  ): string[] {
    const lines: string[] = []

    if (type === 'directory') {
      const dirEntry = entry as MetamodeDirEntry
      lines.push(`## ${dirEntry.name}/ (${path})`)
      lines.push(`Описание: ${dirEntry.description}`)
      if (dirEntry.languages?.length) {
        lines.push(`Языки: ${dirEntry.languages.join(', ')}`)
      }
      if (dirEntry.tags?.length) {
        lines.push(`Теги: ${dirEntry.tags.join(', ')}`)
      }
      if (dirEntry.ai) {
        lines.push(`AI-summary: ${dirEntry.ai}`)
      }
    } else {
      const fileEntry = entry as MetamodeFileEntry
      const fileName = path.split('/').pop() || path
      lines.push(`### ${fileName}`)
      lines.push(`Путь: ${path}`)
      lines.push(`Описание: ${fileEntry.description}`)
      if (fileEntry.status) {
        lines.push(`Статус: ${fileEntry.status}`)
      }
      if (fileEntry.phase !== undefined) {
        lines.push(`Фаза: ${fileEntry.phase}`)
      }
      if (fileEntry.tags?.length) {
        lines.push(`Теги: ${fileEntry.tags.join(', ')}`)
      }
      if (fileEntry.dependencies?.length) {
        lines.push(`Зависимости: ${fileEntry.dependencies.join(', ')}`)
      }
      if (fileEntry.ai) {
        lines.push(`AI-summary: ${fileEntry.ai}`)
      }
    }

    return lines
  }

  /**
   * Get the underlying database client
   */
  getClient(): MetamodeDatabaseClient {
    return this.client
  }
}

// ============================================================================
// Main Integration Class
// ============================================================================

/**
 * MetaMode LLM Integration
 *
 * Main class for querying MetaMode data using local LLM models.
 */
export class MetaModeLLMIntegration {
  private backends: LLMBackend[] = []
  private activeBackend: LLMBackend | null = null
  private contextBuilder: MetaModeContextBuilder
  private cache: Map<string, MetaModeQueryResponse> = new Map()
  private cacheEnabled: boolean = true
  private cacheTTL: number = 60000 // 1 minute

  constructor(database: MetamodeDatabase) {
    this.contextBuilder = new MetaModeContextBuilder(database)
  }

  /**
   * Register LLM backends in priority order
   */
  registerBackends(backends: LLMBackend[]): void {
    this.backends = backends
    this.activeBackend = null
  }

  /**
   * Add a backend
   */
  addBackend(backend: LLMBackend): void {
    this.backends.push(backend)
    this.activeBackend = null
  }

  /**
   * Check and select available backend
   */
  async selectBackend(): Promise<LLMBackend | null> {
    for (const backend of this.backends) {
      if (await backend.isAvailable()) {
        this.activeBackend = backend
        return backend
      }
    }
    return null
  }

  /**
   * Get the currently active backend
   */
  getActiveBackend(): LLMBackend | null {
    return this.activeBackend
  }

  /**
   * Check if any LLM backend is available
   */
  async isLLMAvailable(): Promise<boolean> {
    const backend = await this.selectBackend()
    return backend !== null
  }

  /**
   * Configure caching
   */
  setCaching(enabled: boolean, ttl?: number): void {
    this.cacheEnabled = enabled
    if (ttl !== undefined) {
      this.cacheTTL = ttl
    }
  }

  /**
   * Clear the response cache
   */
  clearCache(): void {
    this.cache.clear()
  }

  /**
   * Process a natural language query about MetaMode data
   */
  async query(request: MetaModeQueryRequest): Promise<MetaModeQueryResponse> {
    const startTime = Date.now()
    const warnings: string[] = []

    // Check cache
    const cacheKey = this.getCacheKey(request)
    if (this.cacheEnabled) {
      const cached = this.cache.get(cacheKey)
      if (cached && Date.now() - cached.processingTime < this.cacheTTL) {
        return { ...cached, processingTime: Date.now() - startTime }
      }
    }

    try {
      // Build context
      const template = PROMPT_TEMPLATES[request.language]
      let context: string

      if (request.contextPaths && request.contextPaths.length > 0) {
        context = this.contextBuilder.buildFromPaths(
          request.contextPaths,
          request.maxContextTokens || template.maxContextChars
        )
      } else if (request.statusFilter || request.phaseFilter || request.tagFilter) {
        context = this.contextBuilder.buildWithFilters(
          request.statusFilter,
          request.phaseFilter,
          request.tagFilter,
          request.maxContextTokens || template.maxContextChars
        )
      } else {
        // Build context from search + overview
        const searchContext = this.contextBuilder.buildFromSearch(
          request.query,
          (request.maxContextTokens || template.maxContextChars) / 2
        )
        const overviewContext = this.contextBuilder.buildOverview(
          (request.maxContextTokens || template.maxContextChars) / 2
        )
        context = overviewContext + '\n\n' + searchContext
      }

      // Prepare prompt
      const userPrompt = template.queryTemplate
        .replace('{context}', context)
        .replace('{query}', request.query)

      // Try LLM backend
      let answer: string
      let backendUsed: LLMBackendType | 'fallback'

      const backend = await this.selectBackend()
      if (backend) {
        try {
          answer = await backend.generate(template.systemPrompt, userPrompt)
          backendUsed = backend.type
        } catch (error) {
          warnings.push(`LLM backend error: ${error instanceof Error ? error.message : 'unknown'}`)
          answer = this.generateFallbackResponse(request)
          backendUsed = 'fallback'
        }
      } else {
        warnings.push('No LLM backend available, using fallback')
        answer = this.generateFallbackResponse(request)
        backendUsed = 'fallback'
      }

      // Find related paths from search
      const searchResults = this.contextBuilder.getClient().search(request.query, { limit: 5 })
      const relatedPaths = searchResults.map((r) => r.path)

      // Calculate confidence
      const confidence = this.calculateConfidence(backendUsed, answer, relatedPaths.length)

      const response: MetaModeQueryResponse = {
        success: true,
        answer,
        confidence,
        relatedPaths,
        processingTime: Date.now() - startTime,
        backendUsed,
        warnings,
      }

      // Cache response
      if (this.cacheEnabled) {
        this.cache.set(cacheKey, response)
      }

      return response
    } catch (error) {
      return {
        success: false,
        answer: '',
        confidence: 0,
        relatedPaths: [],
        processingTime: Date.now() - startTime,
        backendUsed: 'fallback',
        warnings,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * Generate fallback response when LLM is not available
   */
  private generateFallbackResponse(request: MetaModeQueryRequest): string {
    const client = this.contextBuilder.getClient()
    const results = client.search(request.query, { limit: 5 })

    if (request.language === 'ru') {
      if (results.length === 0) {
        return 'К сожалению, я не нашёл информации по вашему запросу в метаданных проекта. Попробуйте переформулировать вопрос.'
      }

      const paths = results.map((r) => r.path).join(', ')
      return `На основе метаданных проекта, ваш запрос может относиться к: ${paths}. Для более подробного анализа требуется подключение к локальной LLM модели (Ollama, llama.cpp).`
    } else {
      if (results.length === 0) {
        return "Unfortunately, I couldn't find information for your query in the project metadata. Try rephrasing your question."
      }

      const paths = results.map((r) => r.path).join(', ')
      return `Based on project metadata, your query may relate to: ${paths}. For more detailed analysis, a local LLM model connection (Ollama, llama.cpp) is required.`
    }
  }

  /**
   * Calculate confidence score
   */
  private calculateConfidence(
    backendUsed: LLMBackendType | 'fallback',
    answer: string,
    relatedCount: number
  ): number {
    let confidence = 0.5

    // Backend type contributes to confidence
    if (backendUsed === 'ollama' || backendUsed === 'openai-compatible') {
      confidence += 0.3
    } else if (backendUsed === 'llamacpp') {
      confidence += 0.25
    } else if (backendUsed === 'mock') {
      confidence += 0.1
    }

    // Related results contribute to confidence
    confidence += Math.min(relatedCount * 0.05, 0.2)

    // Answer length contributes (longer = more detailed = higher confidence)
    if (answer.length > 200) {
      confidence += 0.1
    }

    return Math.min(confidence, 1.0)
  }

  /**
   * Generate cache key
   */
  private getCacheKey(request: MetaModeQueryRequest): string {
    return `${request.query}|${request.language}|${request.contextPaths?.join(',')}|${request.statusFilter?.join(',')}|${request.phaseFilter?.join(',')}|${request.tagFilter?.join(',')}`
  }

  /**
   * Get the context builder for direct access
   */
  getContextBuilder(): MetaModeContextBuilder {
    return this.contextBuilder
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create default LLM backends in priority order
 */
export function createDefaultBackends(
  configs?: Partial<Record<LLMBackendType, Partial<LLMBackendConfig>>>
): LLMBackend[] {
  return [
    new OllamaBackend(configs?.ollama),
    new LlamaCppBackend(configs?.llamacpp),
    new OpenAICompatibleBackend(configs?.['openai-compatible']),
    new MockLLMBackend(),
  ]
}

/**
 * Create MetaMode LLM integration with default configuration
 */
export function createMetaModeLLMIntegration(
  database: MetamodeDatabase,
  configs?: Partial<Record<LLMBackendType, Partial<LLMBackendConfig>>>
): MetaModeLLMIntegration {
  const integration = new MetaModeLLMIntegration(database)
  integration.registerBackends(createDefaultBackends(configs))
  return integration
}

// ============================================================================
// Exports
// ============================================================================

export { MetamodeDatabaseClient } from './metamode-database'
