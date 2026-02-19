[![Gitpod ready-to-code](https://img.shields.io/badge/Gitpod-ready--to--code-blue?logo=gitpod)](https://gitpod.io/#https://github.com/netkeep80/isocubic)

# isocubic

Веб-редактор параметрических кубиков для создания изометрических 3D-миров.

## О проекте

**isocubic** — это веб-приложение для создания и редактирования параметрических воксельных кубиков. Проект вдохновлён классическими играми Diablo 1 и X-COM: UFO, но использует современный стек технологий для работы в браузере.

### Ключевые особенности

- **Параметрическое описание** — кубики хранятся как компактные JSON-конфиги, а не как тяжёлые текстуры
- **Процедурная генерация** — градиенты, шум Perlin/Worley и другие эффекты создаются в реальном времени
- **ИИ-генерация** — создание кубиков по текстовому описанию с помощью TinyLLM
- **Бесшовная сшивка** — соседние кубики плавно соединяются без видимых границ
- **Высокая производительность** — 60 FPS на мобильных устройствах
- **Работает offline** — PWA-приложение работает без интернета после первой загрузки

## Архитектура

isocubic использует **параметрический подход** для описания кубиков:

```
┌─────────────────────────────────────────────────────────────┐
│                     JSON-конфиг кубика                      │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │ Base Color  │  │  Gradients  │  │   Procedural Noise  │ │
│  │ [R, G, B]   │  │  axis, shift │  │  type, scale, mask  │ │
│  └─────────────┘  └─────────────┘  └─────────────────────┘ │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                    GLSL-шейдер (GPU)                        │
│  • Расчёт цвета по параметрам                               │
│  • Генерация шума в реальном времени                        │
│  • Интерполяция на границах                                 │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                  Three.js / WebGL рендеринг                 │
│  • Изометрическая камера                                    │
│  • Освещение и тени                                         │
│  • Интерактивное управление                                 │
└─────────────────────────────────────────────────────────────┘
```

### Формат конфигурации кубика

```json
{
  "id": "stone_moss_001",
  "prompt": "каменная кладка с мхом",
  "base": {
    "color": [0.65, 0.55, 0.45],
    "roughness": 0.8,
    "transparency": 1.0
  },
  "gradients": [
    {
      "axis": "y",
      "factor": 0.3,
      "color_shift": [0.2, 0.35, 0.15]
    }
  ],
  "noise": {
    "type": "perlin",
    "scale": 8.0,
    "octaves": 4,
    "persistence": 0.6,
    "mask": "bottom_40%"
  },
  "physics": {
    "material": "stone",
    "density": 2.5,
    "break_pattern": "crumble"
  }
}
```

## Технологический стек

| Технология      | Назначение                      |
| --------------- | ------------------------------- |
| Vue.js 3.0      | UI-компоненты                   |
| TypeScript      | Типизация                       |
| Three.js        | 3D-рендеринг                    |
| TresJS          | Vue-обёртка для Three.js        |
| @tresjs/cientos | Готовые компоненты для Three.js |
| Pinia           | Управление состоянием           |
| Tailwind CSS    | Стилизация                      |
| TensorFlow.js   | Клиентский ИИ (TinyLLM)         |
| Vite            | Сборка                          |
| Vitest          | Тестирование                    |
| @vue/test-utils | Тестирование Vue-компонентов    |

## Быстрый старт

### Требования

- Node.js >= 18
- npm >= 9

### Установка

```bash
# Клонирование репозитория
git clone https://github.com/netkeep80/isocubic.git
cd isocubic

# Установка зависимостей
npm install

# Запуск в режиме разработки
npm run dev
```

### Команды

| Команда           | Описание                       |
| ----------------- | ------------------------------ |
| `npm run dev`     | Запуск dev-сервера             |
| `npm run build`   | Сборка для production          |
| `npm run preview` | Предпросмотр production-сборки |
| `npm run test`    | Запуск тестов                  |
| `npm run lint`    | Проверка кода                  |

## Структура проекта

```
isocubic/
├── src/
│   ├── components/        # Vue SFC-компоненты
│   │   ├── ParametricCube.vue   # Параметрический куб с шейдером (TresJS, TASK 62)
│   │   ├── EnergyCube.vue       # Энергетический куб с FFT визуализацией (TresJS, TASK 62)
│   │   ├── CubePreview.vue      # 3D-превью куба с интерактивным управлением (TresJS, TASK 62)
│   │   ├── CubeGrid.vue         # Сетка кубов с бесшовной сшивкой (TresJS, TASK 62)
│   │   ├── CubeStack.vue        # Вертикальные стопки кубов с плавными переходами (TresJS, TASK 62)
│   │   ├── CubeStackGrid.vue    # Сетка стопок кубов (TresJS, TASK 62)
│   │   ├── LODCubeGrid.vue      # Сетка кубов с автоматическим LOD управлением (TresJS, TASK 62)
│   │   ├── MagicCubeDemo.vue    # Демо магического куба с энергетической физикой (TresJS, TASK 62)
│   │   ├── LODStatisticsDisplay.vue # Статистика LOD-системы (Vue SFC, TASK 62)
│   │   ├── UnifiedEditor.vue    # Основной редактор с табами и lazy loading (Vue SFC, TASK 63)
│   │   ├── ParamEditor.vue      # Редактор параметров куба (Vue SFC, TASK 63)
│   │   ├── FFTParamEditor.vue   # Редактор FFT параметров (Vue SFC, TASK 63)
│   │   ├── FFTChannelEditor.vue # Редактор FFT каналов (Vue SFC, TASK 63)
│   │   ├── EnergyVisualizationEditor.vue # Редактор энергетической визуализации (Vue SFC, TASK 63)
│   │   ├── LODConfigEditor.vue  # Редактор LOD конфигурации (Vue SFC, TASK 63)
│   │   ├── StackEditor.vue      # Редактор стопок кубиков (Vue SFC, TASK 63)
│   │   ├── StackPresetPicker.vue # Выбор шаблонов стопок (Vue SFC, TASK 63)
│   │   ├── PromptGenerator.vue  # Генерация по промпту с расширенными режимами (Vue SFC, TASK 63)
│   │   ├── Gallery.vue          # Галерея примеров (Vue SFC, TASK 64)
│   │   ├── CommunityGallery.vue # Галерея сообщества (Vue SFC, TASK 64)
│   │   ├── ExportPanel.vue      # Экспорт/импорт (Vue SFC, TASK 64)
│   │   ├── SharePanel.vue       # Шаринг кубиков с QR-кодами (Vue SFC, TASK 64)
│   │   ├── CommentsSection.vue  # Секция комментариев (Vue SFC, TASK 64)
│   │   ├── SubscriptionButton.vue # Кнопка подписки (Vue SFC, TASK 64)
│   │   ├── NotificationPanel.vue # Панель уведомлений (Vue SFC, TASK 64)
│   │   ├── ActionHistory.vue    # История действий (Vue SFC, TASK 64)
│   │   ├── AuthForms.vue        # Формы авторизации (Vue SFC, TASK 65)
│   │   ├── UserProfile.vue      # Профиль пользователя и аватар (Vue SFC, TASK 65)
│   │   ├── SessionPanel.vue     # Панель сессий коллаборации (Vue SFC, TASK 65)
│   │   ├── CollaborativeParamEditor.vue # Совместное редактирование (Vue SFC, TASK 65)
│   │   ├── ParticipantCursor.vue # Курсоры участников (Vue SFC, TASK 65)
│   │   ├── MetaModeQueryPanel.vue # AI-запросы в MetaMode (Vue SFC, TASK 66, 72)
│   │   ├── ComponentContextPanel.vue # AI-контекст для компонентов в MetaMode (Vue SFC, TASK 66, 72)
│   │   ├── ExtendedSearchPanel.vue # Расширенный AI-поиск компонентов (Vue SFC, TASK 66, 72)
│   │   ├── ComponentInfo.vue    # MetaMode индикатор компонентов (Vue SFC, TASK 66, 72)
│   │   ├── MetaModeWindow.vue   # Единое окно MetaMode (Vue SFC, TASK 66, 72)
│   │   ├── MetaModeIndicator.vue # Индикатор режима MetaMode (Vue SFC, TASK 72)
│   │   ├── ConversationPanel.vue # AI-диалог для MetaMode (Vue SFC, TASK 66, 72)
│   │   ├── IssueDraftPanel.vue  # Генератор черновиков issues (Vue SFC, TASK 66)
│   │   ├── GitHubAuthButton.vue # Авторизация GitHub (Vue SFC, TASK 66)
│   │   └── AnnotationCanvas.vue # Аннотирование скриншотов (Vue SFC, TASK 66)
│   ├── composables/       # Vue composables (TASK 67, 70, 75)
│   │   ├── useDeviceType.ts    # Определение типа устройства (desktop/tablet/mobile)
│   │   ├── useCubeEditor.ts    # Централизованное управление состоянием куба
│   │   ├── useLODStatistics.ts # Статистика LOD-системы
│   │   ├── useWindowManager.ts # Управление состоянием окон (Phase 11, TASK 70)
│   │   ├── useTouchGestures.ts # Touch-жесты: swipe, pinch, long-press (Phase 11, TASK 75)
│   │   └── useResponsiveLayout.ts # Адаптивный layout для устройств (Phase 11, TASK 75)
│   ├── shaders/           # GLSL-шейдеры
│   │   ├── parametric-cube.glsl  # Исходный GLSL код
│   │   ├── parametric-cube.ts    # TypeScript модуль для Three.js
│   │   ├── energy-cube.glsl      # Энергетический шейдер
│   │   └── energy-cube.ts        # TypeScript модуль для энергетических кубов
│   ├── lib/               # Утилиты (framework-agnostic + Pinia stores)
│   │   ├── metamode-store.ts # MetaMode Pinia store (Phase 10, 12 — TASK 72)
│   │   ├── auth.ts           # Auth Pinia store (мигрирован с React Context — Phase 10)
│   │   ├── shader-utils.ts    # Утилиты для шейдеров (с поддержкой LOD)
│   │   ├── lod-system.ts      # LOD-система для оптимизации рендеринга
│   │   ├── webgpu-compute.ts  # WebGPU compute-шейдеры для параллельной генерации текстур
│   │   ├── tinyLLM.ts         # ИИ-генератор с расширенными функциями
│   │   ├── ai-metadata-processor.ts # Обработчик метаданных для AI-запросов
│   │   ├── extended-search.ts    # Расширенный поиск компонентов с автодополнением
│   │   ├── conversation-agent.ts # AI-агент для диалогов в GOD MODE (Phase 9)
│   │   ├── issue-generator.ts   # Генератор черновиков issues (Phase 9)
│   │   ├── github-api.ts        # GitHub API клиент (Phase 9)
│   │   ├── screen-capture.ts   # Захват экрана и аннотации (Phase 9)
│   │   ├── storage.ts         # Работа с хранилищем
│   │   ├── validation.ts      # Валидация схемы
│   │   ├── fft-wasm.ts        # FFT модуль (WASM + JS fallback)
│   │   ├── energyPhysics.ts   # Физика энергии для магических объектов
│   │   ├── stack-presets.ts   # Готовые шаблоны стопок кубиков
│   │   ├── collaboration.ts   # Модуль коллаборативного редактирования
│   │   ├── community-gallery.ts # Сервис галереи сообщества
│   │   ├── share-links.ts     # Сервис share-ссылок и QR-кодов
│   │   ├── publishing-api.ts  # REST API для публикации кубиков
│   │   ├── command-registry.ts # Реестр расширенных команд (Phase 11, TASK 77)
│   │   ├── command-macros.ts  # Система записи/воспроизведения макросов (Phase 11, TASK 77)
│   │   ├── command-plugins.ts # Система плагинов для динамических команд (Phase 11, TASK 77)
│   │   ├── window-layout-manager.ts # Менеджер раскладки окон (Phase 11, TASK 77)
│   │   └── window-performance.ts # Утилиты мониторинга производительности (Phase 11, TASK 78)
│   ├── types/             # TypeScript-типы
│   │   ├── cube.ts
│   │   ├── lod.ts             # Типы для LOD-системы
│   │   ├── stack.ts           # Типы для системы стопок кубиков
│   │   ├── collaboration.ts   # Типы для коллаборации и мультиплеера
│   │   ├── community.ts       # Типы для галереи сообщества
│   │   ├── share.ts           # Типы для share-ссылок
│   │   ├── publishing-api.ts  # Типы для REST API публикации
│   │   ├── ai-query.ts        # Типы для AI-запросов в MetaMode
│   │   ├── metamode.ts        # Типы для MetaMode (Phase 9, 12 — TASK 72)
│   │   └── issue-generator.ts # Типы для генератора issues (Phase 9)
│   └── App.vue            # Корневой компонент с адаптивным layout (TASK 67)
├── wasm-fft/              # Rust WASM модуль для FFT
│   ├── Cargo.toml             # Rust конфигурация
│   ├── src/lib.rs             # Реализация 3D FFT
│   └── README.md              # Документация WASM модуля
├── public/
│   └── model/             # Модель TinyLLM
├── packages/              # Выделенные npm-пакеты
│   └── metamode/          # @isocubic/metamode — библиотека MetaMode (Vue.js 3.0, Phase 9-10, 12 — TASK 72)
├── examples/              # Примеры конфигов
├── ANALYSIS.md            # Анализ подходов
└── README.md
```

## Использование

### Создание кубика по промпту

1. Введите описание в текстовое поле: _"каменная стена с трещинами и мхом"_
2. Нажмите "Создать по описанию"
3. ИИ сгенерирует параметры автоматически

### Ручное редактирование

1. Выберите кубик из галереи или создайте новый
2. Настройте параметры в панели справа:
   - **Базовый цвет** — основной цвет материала
   - **Градиенты** — изменение цвета по осям
   - **Шум** — текстура поверхности
   - **Физика** — свойства материала
3. Сохраните или экспортируйте результат

### Экспорт

- **JSON** — для использования в других проектах
- **PNG** — скриншот превью
- **LocalStorage** — автосохранение в браузере

## MetaMode

MetaMode — это унифицированная система метаинформации проекта, объединяющая функциональность DevMode и GodMode в единую компактную систему, оптимизированную для работы с AI-агентами.

### Возможности MetaMode

- **Режим разработчика** — отображение метаданных компонентов при наведении
- **Окно MetaMode** — панель с AI-запросами, деревом метаданных и генератором issues
- **AI-оптимизация** — компактный формат JSON для минимизации токенов
- **Inline-метаданные** — возможность хранить метаинформацию прямо в Vue-компонентах

### Активация MetaMode

MetaMode активируется клавиатурной комбинацией **Ctrl+Shift+M** или через UI-переключатель.

```typescript
// Программное управление MetaMode
import { useMetaModeStore } from '@/lib/metamode-store'

const store = useMetaModeStore()
store.toggleMetaMode() // Включить/выключить
```

### Формат metamode.json

Каждый каталог может содержать файл `metamode.json` с метаинформацией:

```json
{
  "$schema": "./metamode.schema.json",
  "name": "components",
  "description": "Vue UI components",
  "tags": ["vue", "ui"],
  "files": {
    "ParamEditor.vue": { "description": "Parameter editor", "status": "stable" }
  },
  "directories": {
    "windows": {
      "description": "Window-wrapped components",
      "metamode": "windows/metamode.json"
    }
  }
}
```

### Inline-метаданные в компонентах

MetaMode поддерживает inline-метаданные через JSDoc `@metamode`:

```vue
<script setup lang="ts">
/**
 * @metamode
 * desc: Parameter editor for cube properties
 * status: stable
 * phase: 5
 * tags: [editor, params, ui]
 */
</script>
```

### MetaMode v2.0: Inline-аннотации (Phase 13)

MetaMode v2.0 вводит новый формат метаданных — `@mm:` аннотации прямо в исходном коде:

```typescript
/**
 * @mm:id=param_editor
 * @mm:name=ParametricEditor
 * @mm:desc=Visual editor for parametric cube properties
 * @mm:tags=ui,stable
 * @mm:deps=runtime:lib/shader-utils,build:types/cube
 * @mm:visibility=public
 * @mm:phase=5
 */
export function ParametricEditor() { ... }
```

Runtime API доступен через `virtual:metamode/v2/db`:

```typescript
import mm from 'virtual:metamode/v2/db'

// Поиск
const editor = mm.findById('param_editor')
const stableUI = mm.findAll({ tags: ['ui'], status: 'stable' })

// Зависимости
const deps = mm.getDependencies('param_editor', { type: 'runtime' })
const dependents = mm.getDependents('shader_utils')

// Граф
const cycles = mm.findAllCycles()
const dotGraph = mm.exportGraph({ format: 'dot' })

// Для AI-агентов
const context = mm.exportForLLM({ scope: ['ui'], format: 'compact' })
```

### Команды MetaMode

| Команда                          | Описание                                      |
| -------------------------------- | --------------------------------------------- |
| `npm run metamode:validate`       | Валидация всех metamode.json файлов           |
| `npm run metamode:compile`        | Компиляция в единое дерево                    |
| `npm run metamode:ai`             | Генерация AI-оптимизированного формата        |
| `npm run metamode:parse`          | Парсинг @mm: аннотаций (v2.0)                |
| `npm run metamode:validate:semantic` | Семантическая валидация аннотаций (v2.0)  |
| `npm run metamode:migrate`        | Предпросмотр миграции metamode.json → @mm:    |
| `npm run metamode:migrate:apply`  | Применить миграцию metamode.json → @mm:       |
| `npm run metamode:db:compile`     | Компиляция v2.0 БД со статистикой             |
| `npm run metamode:db:graph`       | Экспорт графа зависимостей (v2.0)            |
| `npm run metamode:generate-tests` | Генерация тестов для аннотированных модулей (v2.0, Phase 2) |
| `npm run metamode:generate-tests:dry` | Предпросмотр генерации тестов (без записи файлов) |
| `npm run metamode:context`        | Сборка AI-контекста из v2.0 БД (Phase 3)      |
| `npm run metamode:ai:context`     | AI-контекст для codegen-агента (Phase 3)       |
| `npm run metamode:prod:optimize`  | Анализ production-оптимизации (Phase 4)        |
| `npm run metamode:prod:analyze`   | Генерация production БД в файл (Phase 4)       |
| `npm run metamode:status`         | Обзор состояния MetaMode в проекте (Phase 5)   |
| `npm run metamode:cli`            | Единый CLI MetaMode v2.0 (Phase 5)             |

### MetaMode v2.0: Валидация схемы и генерация тестов (Phase 2)

MetaMode v2.0 Phase 2 добавляет расширенную валидацию аннотаций и автоматическую генерацию тестов.

#### JSON Schema для аннотаций

Файл `schemas/mm-annotation.schema.json` описывает полный формат `@mm:` аннотаций. Правило `schema-validates` проверяет соответствие при каждой сборке.

#### Генератор тестов

Инструмент `scripts/metamode-test-generator.ts` генерирует Vitest-тесты для всех модулей с `@mm:id`:

```bash
# Сгенерировать тесты для всех аннотированных модулей
npm run metamode:generate-tests

# Предпросмотр без записи файлов
npm run metamode:generate-tests:dry

# Генерация для конкретного модуля
npx tsx scripts/metamode-test-generator.ts --module param_editor
```

Для каждого аннотированного модуля генерируются тесты:
1. **Полнота аннотации** — проверка наличия обязательных полей `@mm:id`, `@mm:desc`
2. **Соответствие схеме** — проверка всех полей на соответствие JSON Schema
3. **Существование зависимостей** — проверка, что все `@mm:deps` указывают на реальные `@mm:id`
4. **Контракт видимости** — проверка, что публичные модули не зависят от внутренних

### MetaMode v2.0: Контекст-билдер для AI-агентов (Phase 3)

MetaMode v2.0 Phase 3 добавляет специализированный контекст-билдер, который формирует точные, токен-эффективные промпты для AI-агентов из v2.0 БД.

#### Типы AI-агентов

Контекст-билдер поддерживает 5 типов агентов с настраиваемыми промпт-шаблонами:
- **codegen** — генерация кода с учётом зависимостей и AI-подсказок
- **refactor** — рефакторинг с сохранением контрактов видимости
- **docgen** — генерация документации на основе `@mm:desc` и `@mm:ai`
- **review** — ревью кода на нарушения архитектурных контрактов
- **generic** — общий AI-помощник

#### Использование

```typescript
import { buildContext, buildContextForAgent, suggestAnnotation, runPreCommitCheck } from './scripts/metamode-context-builder'
import { compileV2Database } from './scripts/metamode-db-compiler'

const db = compileV2Database(process.cwd())

// Собрать контекст для codegen-агента
const ctx = buildContext(db, {
  agentType: 'codegen',
  scope: ['ui', 'lib'],    // фильтр по тегам
  format: 'markdown',       // 'markdown' | 'json' | 'text'
  tokenBudget: 4000,        // лимит токенов (авто-обрезка)
  includeDeps: true,        // включить транзитивные зависимости
})
console.log(ctx.prompt)     // готовый промпт для LLM

// Convenience обёртка
const refactorCtx = buildContextForAgent('refactor', db, { ids: ['param_editor'] })
```

#### CLI использование

```bash
# Сборка контекста для generic-агента (все аннотации)
npm run metamode:context

# Codegen-агент
npm run metamode:ai:context

# С фильтром по тегам
npx tsx scripts/metamode-context-builder.ts --agent docgen --scope ui lib

# Сохранить в файл
npx tsx scripts/metamode-context-builder.ts --agent review --output context.md

# Pre-commit проверка
npx tsx scripts/metamode-context-builder.ts --pre-commit src/lib/new-module.ts
```

#### Pre-commit поддержка

```typescript
// Предложить @mm: аннотацию для нового файла
const suggestion = suggestAnnotation('/project/src/lib/new-module.ts', db)
// /**
//  * @mm:id new_module
//  * @mm:desc TODO: Add description
//  * @mm:tags lib
//  * @mm:status draft
//  */

// Проверить все staged файлы
const missing = runPreCommitCheck(stagedFiles, db)
// Возвращает файлы без @mm:id + предложения аннотаций
```

### MetaMode v2.0: Production-оптимизация (Phase 4)

MetaMode v2.0 Phase 4 добавляет tree-shaking для production-сборок: `internal`-записи удаляются из бандла, dev-only поля (filePath, line, source) вырезаются.

#### Автоматическое применение

Vite-плагин автоматически применяет оптимизацию при production-сборке:

```typescript
// Оба импорта работают в любом режиме:
import mm from 'virtual:metamode/v2/db'        // dev: полные данные; prod: stripped
import mmProd from 'virtual:metamode/v2/db/prod' // всегда production-stripped
```

#### Ручная оптимизация

```typescript
import { optimizeForProduction, analyzeBundleSize } from './scripts/metamode-prod-optimizer'
import { compileV2Database } from './scripts/metamode-db-compiler'

const devDb = compileV2Database(process.cwd())
const prodDb = optimizeForProduction(devDb)

const report = analyzeBundleSize(devDb, prodDb)
console.log(`Сэкономлено ${report.savedBytes} байт (${report.reductionPercent.toFixed(1)}%)`)
```

#### CLI использование

```bash
# Анализ размеров dev vs prod базы
npm run metamode:prod:optimize

# Генерация production БД в файл
npm run metamode:prod:analyze
```

### MetaMode v2.0: Единый CLI и полная миграция (Phase 5)

MetaMode v2.0 Phase 5 предоставляет единый CLI-инструмент для управления всей системой MetaMode, верифицирует полную миграцию v1→v2 и обеспечивает dual-mode работу обеих версий.

#### Единый CLI MetaMode v2.0

Все команды доступны через единый инструмент:

```bash
npx tsx scripts/metamode-cli.ts [command] [options]
```

| Команда | Описание |
|---------|---------|
| `status` | Обзор состояния MetaMode в проекте |
| `parse [path]` | Парсинг `@mm:` аннотаций |
| `validate` | Семантическая и схемная валидация |
| `migrate [--apply]` | Миграция `metamode.json` → `@mm:` |
| `compile [--stats]` | Компиляция v2.0 БД |
| `context [--agent ...]` | Построение AI-контекста |
| `optimize [--stats]` | Production-оптимизация |
| `generate-tests` | Генерация тестов |
| `help` | Справка по командам |

#### Быстрый старт

```bash
# Проверить состояние MetaMode в проекте
npm run metamode:status

# Просмотр плана миграции v1 → v2
npm run metamode:migrate

# Применить миграцию
npm run metamode:migrate:apply

# Скомпилировать v2.0 БД
npm run metamode:db:compile
```

#### Dual-Mode (v1.x и v2.0 параллельно)

MetaMode поддерживает **dual-mode**: оба формата работают одновременно без конфликтов.

```typescript
// v1.x API (metamode.json файлы)
import metamode from 'virtual:metamode'
import metamodeTree from 'virtual:metamode/tree'
import metamodeDB from 'virtual:metamode/db'

// v2.0 API (@mm: аннотации)
import mm from 'virtual:metamode/v2/db'
import mmProd from 'virtual:metamode/v2/db/prod'
```

#### Руководство по миграции

Полная документация по миграции v1→v2: [docs/metamode-v2-migration.md](docs/metamode-v2-migration.md)

### Встроенная база данных (TASK 80)

MetaMode компилирует все метаданные в единую базу данных, доступную в runtime:

```typescript
import { useMetamodeDatabase } from '@/composables/useMetamodeDatabase'

const { search, getByPath, stats, allTags } = useMetamodeDatabase()

// Поиск по метаданным
const results = search('component', { status: 'stable', limit: 10 })

// Получение по пути
const file = getByPath('src/components/ParamEditor.vue')
```

Подробная документация: [metamode.md](metamode.md)

## Roadmap

**Фазы разработки:**

| Фаза | Название                                                        | Статус        |
| ---- | --------------------------------------------------------------- | ------------- |
| 1    | [MVP](docs/phase-1.md)                                          | ✅ Завершена  |
| 2    | [FFT для магических объектов](docs/phase-2.md)                  | ✅ Завершена  |
| 3    | [Оптимизация](docs/phase-3.md)                                  | ✅ Завершена  |
| 4    | [Мультиплеер](docs/phase-4.md)                                  | ✅ Завершена  |
| 5    | [Расширение редактора](docs/phase-5.md)                         | ✅ Завершена  |
| 6    | [DX улучшения](docs/phase-6.md)                                 | ✅ Завершена  |
| 7    | [Публикация и шаринг](docs/phase-7.md)                          | ✅ Завершена  |
| 8    | [AI + Metadata](docs/phase-8.md)                                | ✅ Завершена  |
| 9    | [GOD MODE — Автоматизация разработки](docs/phase-9.md)          | ✅ Завершена  |
| 10   | [Переход на Vue.js 3.0 + TypeScript](docs/phase-10.md)          | ✅ Завершена  |
| 11   | [Новый пользовательский интерфейс isocubic](docs/phase-11.md)   | ✅ Завершена  |
| 12   | [MetaMode — Унификация систем метаинформации](docs/phase-12.md) | ✅ Завершена  |
| 13   | [MetaMode v2.0 — Семантические метаданные с встроенным AI](docs/phase-13.md) | ✅ Завершена  |

## Деплой

### GitHub Pages

Приложение автоматически развёртывается на GitHub Pages при пуше в ветку `main`.

**Публичный URL**: [https://netkeep80.github.io/isocubic/](https://netkeep80.github.io/isocubic/)

Workflow для деплоя:

1. Push в `main` запускает GitHub Actions
2. Выполняется сборка и тестирование
3. Собранные файлы публикуются на GitHub Pages

### Ручной деплой

Для ручной сборки и деплоя:

```bash
# Сборка для production
npm run build

# Предпросмотр production-сборки локально
npm run preview
```

Собранные файлы находятся в папке `dist/`.

## Документация

- [API Reference](docs/API.md) — полное описание компонентов и модулей
- [MetaMode](metamode.md) — унифицированная система метаинформации v1.x и v2.0 (Phase 12-13, TASK 70-87)
- [MetaMode v2.0 Migration Guide](docs/metamode-v2-migration.md) — руководство по миграции с v1.x на v2.0
- [ANALYSIS.md](ANALYSIS.md) — анализ подходов к реализации

## Тестирование

Проект покрыт тестами с использованием Vitest:

```bash
# Запуск тестов
npm test

# Запуск тестов в watch-режиме
npm run test:watch

# Запуск с покрытием
npm run test:coverage
```

**Текущее покрытие:**

- 3939+ тестов (116+ тестовых файлов, все компоненты на @vue/test-utils)
- Тесты 3D-компонентов Vue.js (ParametricCube, EnergyCube, CubePreview, CubeGrid, CubeStack, LODCubeGrid, LODStatisticsDisplay, MagicCubeDemo — TASK 62)
- Тесты UI-компонентов редактора Vue.js (UnifiedEditor, ParamEditor, FFTParamEditor, FFTChannelEditor, EnergyVisualizationEditor, LODConfigEditor, StackEditor, StackPresetPicker, PromptGenerator — TASK 63)
- Тесты компонентов галереи, экспорта и шаринга Vue.js (Gallery, CommunityGallery, ExportPanel, SharePanel, CommentsSection, SubscriptionButton, NotificationPanel, ActionHistory — TASK 64)
- Тесты компонентов аутентификации и коллаборации Vue.js (AuthForms, UserProfile, SessionPanel, CollaborativeParamEditor, ParticipantCursor — TASK 65)
- Unit-тесты для типов, валидации, хранилища, производительности, физики энергии
- Тесты модуля коллаборации (сессии, участники, синхронизация, конфликты)
- Тесты WebSocket клиента (подключение, сообщения, реконнект, fallback на polling)
- Интеграционные тесты для компонентов Gallery, ExportPanel, StackEditor, StackPresetPicker
- Тесты коллаборативного редактора (CollaborativeParamEditor, индикаторы, конфликты)
- Тесты шаблонов стопок (presets, search, export/import)
- Тесты расширенной ИИ-модели (пакетная генерация, группы, fine-tuning)
- Тесты системы аутентификации (AuthProvider, AuthForms, UserProfile, валидация)
- Тесты галереи сообщества (CommunityGallery, поиск, фильтрация, сортировка, пагинация)
- Тесты share-ссылок (SharePanel, QR-коды, защита паролем, аналитика)
- Тесты социальных функций (комментарии, подписки, уведомления, избранное)
- Тесты AI-контекста для компонентов (ComponentContextPanel)
- Тесты расширенного поиска компонентов (ExtendedSearchPanel, семантический поиск, автодополнение)
- Тесты интеграции TinyLLM с метаданными (metadata query mode, кеширование, fallback)
- Тесты MetaMode (MetaModeWindow, типы, localStorage persistence, drag/resize — TASK 72)
- Тесты AI Conversation Agent (ConversationPanel, intent detection, session management, multi-language support)
- Тесты Issue Draft Generator (IssueDraftPanel, генерация черновиков, шаблоны, валидация)
- Тесты GitHub Integration (GitHub API клиент, авторизация PAT/OAuth, создание issues, метки)
- Тесты Screen Capture & Annotation (захват экрана, Canvas API, аннотации, ScreenCaptureManager)
- Тесты библиотеки @isocubic/metamode (типы, утилиты, хранилище, MetaModeProvider, useMetaMode — TASK 72)
- Тесты MetaMode компонентов Vue.js (MetaModeQueryPanel, ComponentContextPanel, ExtendedSearchPanel, ComponentInfo, AnnotationCanvas — TASK 66, 72)
- Тесты компонентов оконной системы Vue.js (DraggableWindow, WindowTaskbar, CommandBar — TASK 70-73)
- Тесты touch-жестов и адаптивного layout (useTouchGestures, useResponsiveLayout — TASK 75)
- Тесты расширенных команд (command-registry, window-layout-manager, command-macros, command-plugins — TASK 77)
- E2E тесты оконной системы (window-manager, command-bar, responsive — TASK 78)
- Тесты производительности и утилит (window-performance, debounce, safe storage, state validation — TASK 78)
- E2E тесты для полных workflow редактирования (мигрированы на Vue — TASK 68)
- Тесты MetaMode AI-оптимизатора (генерация AI summary, сокращённые поля, экономия токенов — TASK 74)
- Тесты inline metamode извлечения (JSDoc @metamode, объект const metamode, нормализация, слияние — TASK 75)
- Тесты MetaMode терминологии (миграция DevMode/GodMode → MetaMode во всех тестах — TASK 77)
- Тесты MetaMode LLM интеграции (Ollama, llama.cpp, OpenAI-compatible бэкенды, контекст-билдер, fallback — TASK 81)
- Тесты MetaMode v2.0 DB Compiler (findById, findAll, findByTag, getDependencies, getDependents, detectCycle, findAllCycles, validate, exportForLLM, exportGraph — TASK 82)
- Тесты MetaMode v2.0 Production Optimizer (stripEntry, rebuildGraph, computeProdStats, optimizeForProduction, analyzeBundleSize, integration — TASK 85)
- Тесты MetaMode v2.0 CLI Integration (parse, validate, migrate, compile, context, optimize, generate-tests, dual-mode, migration workflow — TASK 86)
- Примеры MetaMode v2.0 (inline-аннотации @mm:, runtime API, context-builder, dual-mode — TASK 87)

## Вклад в проект

Мы приветствуем вклад в развитие isocubic!

1. Форкните репозиторий
2. Создайте ветку для фичи: `git checkout -b feature/amazing-feature`
3. Закоммитьте изменения: `git commit -m 'Add amazing feature'`
4. Запушьте в ветку: `git push origin feature/amazing-feature`
5. Откройте Pull Request

### Правила

- Следуйте code style (ESLint + Prettier)
- Покрывайте новый код тестами
- Обновляйте документацию при необходимости
- Пишите понятные commit messages

## Лицензия

Unlicense license — см. файл [LICENSE](LICENSE)

## Связь

- **GitHub Issues** — для багов и предложений
- **Discussions** — для вопросов и обсуждений

---

_Создано с использованием современных веб-технологий для работы в любом браузере._
