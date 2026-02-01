# MetaNet: Универсальная мета-нервная система проекта

## Введение

Данный документ — результат анализа проекта **isocubic** и размышлений о создании универсальной мета-нервной системы, одинаково доступной как ИИ-агентам, так и людям. Цель — выработать подход, который легко интегрируется в любые языки программирования и обеспечивает структурированную метаинформацию на трёх уровнях: **development time**, **compile time** и **runtime**.

---

## 1. Анализ текущего состояния isocubic

### 1.1 Что уже существует

В isocubic уже заложена многоуровневая мета-инфраструктура:

| Уровень | Механизм | Файлы |
|---------|----------|-------|
| **Development time** | ComponentMeta — самодокументирующиеся компоненты с версионированием, историей, feature-флагами, зависимостями | `src/types/component-meta.ts` |
| **Development time** | Фазовая документация с задачами, критериями приёмки, файловыми зависимостями | `docs/phase-*.md` |
| **Development time** | JSON Schema для валидации структуры кубиков | `src/types/cube-schema.json` |
| **Compile time** | TypeScript типы + `validateComponentMeta()` type guard | `src/types/component-meta.ts` |
| **Compile time** | CI pipeline: lint, typecheck, file size check, build verification | `.github/workflows/ci.yml` |
| **Runtime** | DevMode Pinia store: вербозность, категории отображения, persistence | `src/lib/devmode.ts` |
| **Runtime** | AI Metadata Processor: TF-IDF индексация, семантический поиск | `src/lib/ai-metadata-processor.ts` |
| **Runtime** | Conversation Agent: классификация намерений, контекст компонентов | `src/lib/conversation-agent.ts` |
| **Runtime** | Issue Generator: автогенерация GitHub issues из диалогов | `src/lib/issue-generator.ts` |
| **Runtime** | GOD MODE: единое окно для AI-assisted development | `src/components/GodModeWindow.vue` |

### 1.2 Текущие ограничения

1. **Привязка к Vue/TypeScript** — метаданные определены через TS-интерфейсы и Vue composables, что делает систему специфичной для данного стека.
2. **Ручная регистрация** — каждый компонент вручную вызывает `registerComponentMeta()`, что может стать источником рассинхронизации.
3. **Отсутствие единого формата обмена** — нет стандартного формата, через который AI-агент или внешний инструмент может запросить полную карту проекта.
4. **Нет runtime-сигналов** — система не предоставляет "пульс" проекта в реальном времени (health checks, метрики, аномалии).
5. **Нет обратной связи от runtime к development** — информация из runtime (ошибки, паттерны использования) не возвращается автоматически в development-слой.

---

## 2. Концепция MetaNet

### 2.1 Метафора нервной системы

Биологическая нервная система обеспечивает:
- **Сенсорную функцию** — сбор сигналов из окружающей среды
- **Интегративную функцию** — анализ и принятие решений
- **Моторную функцию** — выполнение действий на основе анализа

По аналогии, MetaNet проекта:
- **Сенсоры** → сбор метаинформации (код, конфиги, логи, метрики)
- **Нервные узлы** → агрегация и анализ (индексы, графы зависимостей, health checks)
- **Эффекторы** → действия (автогенерация issues, рефакторинг, алерты)

### 2.2 Ключевые принципы

1. **Языконезависимый формат** — основа на JSON/YAML, читаемая любым языком
2. **Конвенция над конфигурацией** — стандартные пути файлов, предсказуемая структура
3. **Инкрементальность** — можно внедрять по частям, начиная с минимума
4. **Двунаправленность** — информация течёт как из development в runtime, так и обратно
5. **Человекочитаемость** — каждый узел MetaNet понятен и без инструментов

---

## 3. Архитектура MetaNet

### 3.1 Три уровня (три "нервных слоя")

```
┌─────────────────────────────────────────────────────────────────┐
│                    LAYER 1: DEVELOPMENT TIME                    │
│                     (Статическая метаинформация)                │
│                                                                 │
│  .metanet/                                                      │
│  ├── project.json          # Манифест проекта                   │
│  ├── components/           # Метаданные компонентов             │
│  │   ├── _index.json       # Реестр всех компонентов            │
│  │   ├── cube-editor.json  # Метаданные одного компонента       │
│  │   └── ...                                                    │
│  ├── graph.json            # Граф зависимостей                  │
│  ├── phases.json           # Фазы разработки                    │
│  └── schemas/              # JSON Schema для валидации           │
│      ├── component.schema.json                                  │
│      └── project.schema.json                                    │
├─────────────────────────────────────────────────────────────────┤
│                    LAYER 2: COMPILE TIME                        │
│                    (Проверки и трансформации)                    │
│                                                                 │
│  • JSON Schema валидация .metanet/ файлов                       │
│  • Генерация типов из .metanet/ (TS, Python, Rust, Go, ...)    │
│  • Проверка консистентности графа зависимостей                  │
│  • Генерация health check endpoint из метаданных                │
│  • CI pipeline интеграция (автоматические проверки)              │
├─────────────────────────────────────────────────────────────────┤
│                    LAYER 3: RUNTIME                              │
│                    (Живые сигналы)                               │
│                                                                 │
│  • Health endpoint: GET /.metanet/health                        │
│  • Метрики: /.metanet/metrics (использование, ошибки)           │
│  • Обратная связь: /.metanet/feedback (от runtime к dev)        │
│  • AI API: /.metanet/query (запросы к метаданным)               │
│  • Events: /.metanet/events (WebSocket/SSE стрим)               │
└─────────────────────────────────────────────────────────────────┘
```

### 3.2 Манифест проекта — `.metanet/project.json`

Единая точка входа для человека и AI-агента:

```json
{
  "$schema": "./schemas/project.schema.json",
  "name": "isocubic",
  "version": "0.1.0",
  "description": "Редактор параметрических воксельных кубиков для изометрических 3D миров",
  "languages": ["typescript", "vue", "glsl", "rust"],
  "entryPoints": {
    "app": "src/main.ts",
    "tests": "src/**/*.test.ts",
    "build": "vite.config.ts",
    "ci": ".github/workflows/ci.yml"
  },
  "conventions": {
    "components": "src/components/*.vue",
    "composables": "src/composables/use*.ts",
    "types": "src/types/*.ts",
    "libs": "src/lib/*.ts",
    "tests": "src/**/*.test.{ts,tsx}",
    "docs": "docs/phase-*.md"
  },
  "phases": {
    "current": 11,
    "total": 11,
    "ref": "./phases.json"
  },
  "capabilities": {
    "devmode": true,
    "godmode": true,
    "ai": true,
    "collaboration": true,
    "offline": true
  },
  "health": {
    "endpoint": "/.metanet/health",
    "checks": ["build", "tests", "lint", "typecheck"]
  }
}
```

### 3.3 Метаданные компонента — `.metanet/components/cube-editor.json`

Языконезависимая версия `ComponentMeta`:

```json
{
  "$schema": "../schemas/component.schema.json",
  "id": "cube-editor",
  "name": "UnifiedEditor",
  "version": "2.1.0",
  "status": "stable",
  "summary": "Unified cube parameter editor with tabs for basic params, FFT, LOD, and stacks",
  "file": "src/components/UnifiedEditor.vue",
  "phase": 5,
  "tags": ["editor", "core", "ui"],
  "dependencies": [
    { "id": "cube-preview", "type": "component", "purpose": "Live preview of edited cube" },
    { "id": "use-cube-editor", "type": "composable", "purpose": "Centralized cube state" },
    { "id": "pinia", "type": "external", "purpose": "State management" }
  ],
  "features": [
    { "id": "fft-editing", "enabled": true, "description": "Edit FFT coefficients" },
    { "id": "lod-config", "enabled": true, "description": "Configure LOD levels" },
    { "id": "ai-generation", "enabled": true, "description": "Generate cubes from text prompts" }
  ],
  "history": [
    { "version": "2.1.0", "date": "2025-04-15", "type": "updated", "description": "Added LOD tab" },
    { "version": "2.0.0", "date": "2025-03-01", "type": "updated", "description": "Unified editor from separate editors" },
    { "version": "1.0.0", "date": "2025-01-15", "type": "created", "description": "Initial param editor" }
  ],
  "tests": ["src/components/UnifiedEditor.test.ts"],
  "knownIssues": [],
  "tips": [
    "Use Ctrl+Z within the editor for undo/redo",
    "FFT tab shows real-time spectrum visualization"
  ]
}
```

### 3.4 Граф зависимостей — `.metanet/graph.json`

```json
{
  "nodes": [
    { "id": "cube-editor", "type": "component", "file": "src/components/UnifiedEditor.vue" },
    { "id": "cube-preview", "type": "component", "file": "src/components/CubePreview.vue" },
    { "id": "use-cube-editor", "type": "composable", "file": "src/composables/useCubeEditor.ts" },
    { "id": "shader-utils", "type": "lib", "file": "src/lib/shader-utils.ts" }
  ],
  "edges": [
    { "from": "cube-editor", "to": "cube-preview", "type": "uses" },
    { "from": "cube-editor", "to": "use-cube-editor", "type": "uses" },
    { "from": "cube-preview", "to": "shader-utils", "type": "uses" }
  ]
}
```

Этот граф может быть визуализирован (Mermaid, D3, Graphviz) и проанализирован (циклы, orphan-ноды, связность).

---

## 4. Варианты реализации

### 4.1 Вариант A: Файловая конвенция (минималистичный)

**Суть**: Стандартная структура `.metanet/` директории с JSON-файлами.

**Плюсы**:
- Нулевая зависимость от runtime — работает даже без запущенного проекта
- Любой AI-агент (Claude, GPT, Copilot) может прочитать файлы напрямую
- Любой язык может парсить JSON
- Git-friendly: история изменений, diff, code review
- Работает с существующими CI/CD системами

**Минусы**:
- Ручная синхронизация с кодом (может устареть)
- Нет runtime-сигналов

**Интеграция в isocubic**:
1. Создать `.metanet/` директорию с `project.json`
2. Написать скрипт `scripts/metanet-sync.ts` для генерации `.metanet/components/` из существующих `ComponentMeta`
3. Добавить CI-проверку: `.metanet/` файлы валидны и соответствуют коду

```
Сложность: ★★☆☆☆
Универсальность: ★★★★★
Поддержка AI: ★★★★★
```

### 4.2 Вариант B: Аннотации в коде + генератор (полуавтоматический)

**Суть**: Метаданные хранятся как аннотации/комментарии в самом коде, а скрипт генерирует `.metanet/` из них.

**Пример для TypeScript/Vue**:
```typescript
/**
 * @metanet
 * id: cube-editor
 * phase: 5
 * status: stable
 * tags: editor, core, ui
 * depends: cube-preview, use-cube-editor
 */
export default defineComponent({ ... })
```

**Пример для Python**:
```python
# @metanet
# id: cube-editor
# phase: 5
# status: stable
# tags: editor, core, ui
# depends: cube-preview, use-cube-editor

class CubeEditor:
    ...
```

**Пример для Rust**:
```rust
/// @metanet
/// id: cube-editor
/// phase: 5
/// status: stable
/// tags: editor, core, ui
/// depends: cube-preview, use-cube-editor
pub struct CubeEditor { ... }
```

**Плюсы**:
- Метаданные живут рядом с кодом → меньше рассинхронизации
- Универсальный формат аннотаций через комментарии — работает в любом языке
- Поддержка IDE через расширения

**Минусы**:
- Нужен парсер для каждого языка (но простой — ищет `@metanet` в комментариях)
- Загромождает код комментариями

```
Сложность: ★★★☆☆
Универсальность: ★★★★☆
Поддержка AI: ★★★★☆
```

### 4.3 Вариант C: Гибридный (рекомендуемый)

**Суть**: Комбинация вариантов A и B:
1. **Каноническая версия** — `.metanet/` директория с JSON (источник истины)
2. **Аннотации в коде** — лёгкие `@metanet id: ...` для привязки к каноническим записям
3. **Генератор/синхронизатор** — CLI-инструмент для синхронизации в обоих направлениях
4. **Runtime-слой** — опциональный эндпоинт для проектов с серверной частью

```
┌──────────────────────────────────────────────────────────┐
│                  Код с аннотациями                        │
│  /** @metanet id: cube-editor */                         │
│  export default defineComponent({ ... })                 │
└────────────┬─────────────────────────┬───────────────────┘
             │ metanet sync            │ metanet generate
             ▼                         ▼
┌──────────────────────┐  ┌───────────────────────────────┐
│  .metanet/            │  │  Runtime API (опционально)     │
│  ├── project.json     │  │  GET /.metanet/health          │
│  ├── components/      │→→│  GET /.metanet/query?q=...     │
│  ├── graph.json       │  │  WS  /.metanet/events          │
│  └── schemas/         │  └───────────────────────────────┘
└──────────────────────┘
             │
             ▼
┌──────────────────────────────────────────────────────────┐
│  CI/CD Pipeline                                          │
│  • Валидация .metanet/ по JSON Schema                    │
│  • Проверка аннотаций ↔ .metanet/ соответствия           │
│  • Генерация типов для целевого языка                    │
│  • Обновление графа зависимостей                         │
└──────────────────────────────────────────────────────────┘
```

**Плюсы**:
- Максимальная гибкость — работает на всех уровнях
- JSON как lingua franca — понятен и людям, и AI
- Аннотации минимизируют рассинхронизацию
- Runtime-слой добавляется по необходимости
- CLI-инструмент можно реализовать на любом языке

**Минусы**:
- Наибольшая сложность первоначальной настройки

```
Сложность: ★★★★☆
Универсальность: ★★★★★
Поддержка AI: ★★★★★
```

---

## 5. CLI-инструмент `metanet`

Ключевой элемент системы — CLI-инструмент для управления MetaNet:

```bash
# Инициализация MetaNet в проекте
metanet init

# Сканирование кода и генерация .metanet/ из аннотаций
metanet sync

# Валидация .metanet/ файлов
metanet validate

# Визуализация графа зависимостей
metanet graph --format mermaid

# Поиск по метаданным (для AI-агентов и людей)
metanet query "editor components in phase 5"

# Генерация типов для целевого языка
metanet codegen --lang typescript --output src/types/metanet.generated.ts
metanet codegen --lang python --output metanet_types.py
metanet codegen --lang rust --output src/metanet.rs

# Health check
metanet health

# Экспорт в разные форматы
metanet export --format markdown > PROJECT_MAP.md
metanet export --format mermaid > architecture.mmd
```

---

## 6. Применение к isocubic

### 6.1 Шаг 1: Инициализация `.metanet/`

Создать директорию `.metanet/` со следующей структурой:

```
.metanet/
├── project.json              # Манифест (см. раздел 3.2)
├── schemas/
│   ├── project.schema.json   # JSON Schema для project.json
│   └── component.schema.json # JSON Schema для компонентов
├── components/
│   ├── _index.json           # Реестр: массив ID → file
│   ├── cube-editor.json      # По одному файлу на компонент
│   ├── cube-preview.json
│   └── ...
├── graph.json                # Граф зависимостей
└── phases.json               # Фазы с прогрессом
```

### 6.2 Шаг 2: Миграция существующих ComponentMeta

Написать скрипт `scripts/migrate-to-metanet.ts`:
1. Прочитать все `ComponentMeta` из `componentMetaRegistry`
2. Сконвертировать каждый в JSON-файл в `.metanet/components/`
3. Построить `graph.json` из зависимостей
4. Сгенерировать `_index.json`

### 6.3 Шаг 3: Интеграция в CI

Добавить в `.github/workflows/ci.yml`:
```yaml
- name: Validate MetaNet
  run: npx metanet validate

- name: Check MetaNet sync
  run: npx metanet sync --check  # Проверяет, что .metanet/ актуален
```

### 6.4 Шаг 4: Обновление GOD MODE

Обновить AI Metadata Processor для чтения из `.metanet/` вместо (или в дополнение к) `componentMetaRegistry`. Это позволит:
- AI-агентам читать `.metanet/project.json` как "карту проекта"
- Поисковой системе индексировать JSON-файлы напрямую
- Внешним инструментам интегрироваться без запуска Vue-приложения

---

## 7. Сравнение с существующими подходами

| Аспект | package.json | JSDoc | TypeDoc | MetaNet |
|--------|-------------|-------|---------|---------|
| Языконезависимость | ❌ JS/Node only | ❌ JS/TS only | ❌ TS only | ✅ Любой язык |
| Структура проекта | Частично | ❌ | Частично | ✅ Полная |
| Граф зависимостей | ❌ npm deps only | ❌ | Частично | ✅ Внутренние |
| Фазы/roadmap | ❌ | ❌ | ❌ | ✅ |
| AI-доступность | Частично | Частично | Частично | ✅ Первоклассная |
| Runtime-сигналы | ❌ | ❌ | ❌ | ✅ Опционально |
| Человекочитаемость | ✅ | ✅ | Частично | ✅ |

---

## 8. Дальнейшие шаги

### Ближайшие

1. **Обсудить** данный документ и выбрать вариант реализации
2. **Прототип** `.metanet/project.json` и нескольких `.metanet/components/*.json` для isocubic
3. **Скрипт миграции** из текущих `ComponentMeta` в `.metanet/` формат

### Среднесрочные

4. **JSON Schema** для валидации `.metanet/` файлов
5. **CI-интеграция** валидации в GitHub Actions
6. **Обновление GOD MODE** для чтения `.metanet/`

### Долгосрочные

7. **CLI-инструмент** `metanet` как отдельный npm-пакет
8. **Плагины** для VS Code, JetBrains — визуализация MetaNet в IDE
9. **Runtime-слой** — API для мониторинга и AI-запросов
10. **Стандартизация** — RFC/спецификация для широкого применения

---

## 9. Заключение

MetaNet — это не замена существующих инструментов (TypeScript типов, ESLint, CI), а **объединяющий слой**, который делает метаинформацию проекта одинаково доступной для:
- **Человека** — через JSON/Markdown/визуализации
- **AI-агента** — через структурированные JSON-файлы и API
- **CI/CD** — через JSON Schema валидацию
- **IDE** — через плагины и Language Server Protocol

Ключевое отличие от существующих подходов — MetaNet специально проектируется как **двуязычный интерфейс** между человеком и AI, с одинаковыми возможностями для обоих. Это не документация для людей с AI-навигацией поверху и не конфиг для AI с human-readable обёрткой — это единый формат, нативный для обеих сторон.

Проект isocubic, с его существующей инфраструктурой ComponentMeta и GOD MODE, является идеальной площадкой для прототипирования MetaNet.
