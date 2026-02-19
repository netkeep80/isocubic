# Фаза 13: MetaMode v2.0 — Семантические метаданные с встроенным AI

Данный документ описывает планируемые задачи по реализации MetaMode v2.0 — системы семантических метаданных нового поколения с полноценным встроенным AI.

**Статус**: ✅ Завершена (TASK 82, 83, 84, 85, 86, 87 завершены)

---

## Обзор

**Цель**: Трансформировать MetaMode из файловой системы `metamode.json` в систему **inline-аннотаций** `@mm:`, где метаданные живут прямо в исходном коде — рядом с описываемыми сущностями.

**Проблема**: MetaMode v1.x использует параллельные файлы `metamode.json`, которые:
- Легко устаревают (дрейф документации)
- Не связаны с конкретными функциями/классами
- Дублируют информацию
- Требуют ручного поддержания

**Решение**: MetaMode v2.0 с системой `@mm:` аннотаций:

1. Метаданные встроены в JSDoc-комментарии (`@mm:key=value`) или runtime-свойства (`__mm`)
2. Компилятор извлекает их при сборке и создаёт единую БД
3. Семантическая валидация проверяет целостность при CI/CD
4. Runtime API предоставляет богатый интерфейс запросов
5. AI получает компактный контекст через `exportForLLM`

---

## Критические приоритеты MetaMode v2.0

1. **Онтологическая близость** — метаданные живут рядом с кодом
2. **Компиляция как гарантия** — сборка проверяет семантическую целостность
3. **AI как first-class citizen** — богатый API для экспорта в LLM
4. **Граф зависимостей** — явные типизированные связи между сущностями
5. **Постепенная миграция** — dual-mode: v1.x и v2.0 сосуществуют

---

## Архитектура MetaMode v2.0

### Фазы разработки

| Фаза | Срок | Результат | Статус |
|------|------|-----------|--------|
| **Phase 0: Парсер** | Неделя 1 | Парсер `@mm:`, семантический валидатор, инструмент миграции | ✅ Завершена (PR #272) |
| **Phase 1: Компилятор БД** | Неделя 2-3 | Компилятор `virtual:metamode/v2/db`, полный runtime API | ✅ Завершена (TASK 82) |
| **Phase 2: Валидация и тесты** | Неделя 4 | Схема + расширенные правила + генерация тестов | ✅ Завершена (TASK 83) |
| **Phase 3: AI-интеграция** | Неделя 5 | Промпты, контекст-билдер, pre-commit hook | ✅ Завершена (TASK 84) |
| **Phase 4: Prod-оптимизация** | Неделя 6 | Tree-shaking, условные импорты | ✅ Завершена (TASK 85) |
| **Phase 5: CLI и миграция** | Неделя 7 | Полный набор CLI, конвертер v1→v2 | ✅ Завершена (TASK 86) |
| **Phase 6: Документация** | Неделя 8 | Гайды, примеры, migration guide | ✅ Завершена (TASK 87) |

### Компоненты системы

```
scripts/
├── metamode-annotation-parser.ts    # Phase 0: Парсер @mm: аннотаций
├── metamode-semantic-validator.ts   # Phase 0+2: Семантическая валидация + schema-validates ✅
├── metamode-migrate.ts              # Phase 0: Инструмент миграции v1→v2
├── metamode-db-compiler.ts          # Phase 1: Компилятор и runtime API ✅
├── metamode-test-generator.ts       # Phase 2: AI-генерация тестов аннотаций ✅
├── metamode-context-builder.ts      # Phase 3: Контекст-билдер для AI-агентов ✅
└── metamode-prod-optimizer.ts       # Phase 4: Production оптимизатор (tree-shaking) ✅
schemas/
└── mm-annotation.schema.json        # Phase 2: JSON Schema для @mm: аннотаций ✅
```

### Virtual modules

| Модуль | Описание | Версия |
|--------|----------|--------|
| `virtual:metamode` | Плоская карта metamode.json (v1.x) | v1 |
| `virtual:metamode/tree` | Иерархическое дерево (v1.x) | v1 |
| `virtual:metamode/ai` | AI-оптимизированный формат (v1.x) | v1 |
| `virtual:metamode/db` | Единая БД (v1.x, TASK 80) | v1 |
| `virtual:metamode/annotations` | Индекс @mm: аннотаций (v2.0, Phase 0) | v2 |
| `virtual:metamode/v2/db` | Полная v2.0 БД с runtime API (Phase 1, dev); stripped в prod (Phase 4) | **v2** ✅ |
| `virtual:metamode/v2/db/prod` | Всегда production-stripped БД без internal записей (Phase 4) | **v2** ✅ |

---

## Планируемые TASK

### TASK 82: Компилятор MetaMode v2.0 DB ✅

**Заголовок**: `MetaMode v2.0 Phase 1 — DB Compiler и полный Runtime API`

**Приоритет**: Критический

**Статус**: ✅ Завершена

**Описание**:
Реализовать компилятор, который берёт все `@mm:` аннотации (из Phase 0) и компилирует их в единую типизированную базу данных с полным runtime API.

**Задачи**:

- [x] Создать `scripts/metamode-db-compiler.ts` с компилятором БД
- [x] Реализовать `MmRuntimeApi` с полным API из спецификации MetaMode v2.0
- [x] Добавить `virtual:metamode/v2/db` в Vite плагин
- [x] Обновить `env.d.ts` с TypeScript типами для нового virtual модуля
- [x] Добавить CLI команды в `package.json`
- [x] Написать тесты (75 тестов)
- [x] Обновить документацию

**API реализованного `MmRuntimeApi`**:

```typescript
import mm from 'virtual:metamode/v2/db'

// Поиск по ID
const component = mm.findById('param_editor')

// Поиск с фильтрами
const stableUI = mm.findAll({ tags: ['ui'], status: 'stable' })
const byTag = mm.findByTag('utils', { visibility: 'public' })

// Зависимости
const runtimeDeps = mm.getDependencies('param_editor', { type: 'runtime' })
const allDeps = mm.getDependencies('param_editor', { type: 'all', recursive: true })
const dependents = mm.getDependents('shader_utils')

// Циклы зависимостей
const cycle = mm.detectCycle('param_editor')
const allCycles = mm.findAllCycles()

// Валидация (в dev-режиме)
const { valid, errors, warnings } = mm.validate()

// Экспорт для AI/LLM
const aiContext = mm.exportForLLM({
  scope: ['ui', 'lib'],
  format: 'compact',
  limit: 50
})

// Граф зависимостей
const graph = mm.getGraph()
const dotGraph = mm.exportGraph({ format: 'dot' })
const jsonGraph = mm.exportGraph({ format: 'json', edgeType: 'runtime' })

// Статистика и метаданные
console.log(mm.stats.totalAnnotations)
console.log(mm.buildInfo.version) // '2.0.0'
```

**Созданные файлы**:

- `scripts/metamode-db-compiler.ts` — компилятор и runtime API (383 строки)
- `src/lib/metamode-db-compiler.test.ts` — 75 тестов

**Изменённые файлы**:

- `scripts/vite-plugin-metamode.ts` — добавлен `virtual:metamode/v2/db` модуль
- `env.d.ts` — добавлены TypeScript типы для v2.0 API
- `package.json` — добавлены npm скрипты `metamode:db:compile`, `metamode:db:graph`

**Критерии приёмки**:

- ✅ `virtual:metamode/v2/db` доступен в приложении
- ✅ Полный runtime API реализован (`findById`, `findAll`, `findByTag`, `getDependencies`, `getDependents`, `detectCycle`, `findAllCycles`, `validate`, `exportForLLM`, `getGraph`, `exportGraph`)
- ✅ 75 тестов проходят
- ✅ Обратная совместимость с v1.x API сохранена

**Метки**: `metamode`, `v2.0`, `compiler`, `runtime-api`, `critical`

---

### TASK 83: Валидация и генерация тестов (Phase 2) ✅

**Заголовок**: `MetaMode v2.0 Phase 2 — Расширенная схемная валидация и AI-генерация тестов`

**Приоритет**: Высокий

**Статус**: ✅ Завершена

**Описание**:
Расширена система валидации: добавлена JSON Schema для `@mm:` аннотаций, добавлено правило `schema-validates`, реализован генератор тестов для аннотированных модулей.

**Задачи**:

- [x] Создать `schemas/mm-annotation.schema.json` для полной валидации `@mm:` формата
- [x] Добавить правило `schema-validates` в семантический валидатор
- [x] Реализовать `scripts/metamode-test-generator.ts` для AI-генерации тестов
- [x] Добавить `metamode:generate-tests` в npm скрипты
- [x] Обновить Vite плагин для запуска валидации при сборке
- [x] Написать тесты для схемного валидатора

**Созданные файлы**:

- `schemas/mm-annotation.schema.json` — JSON Schema для `@mm:` аннотаций (Draft-07)
- `scripts/metamode-test-generator.ts` — генератор тестов для аннотированных модулей
- `src/lib/metamode-schema-validator.test.ts` — тесты для схемного валидатора и генератора тестов

**Изменённые файлы**:

- `scripts/metamode-semantic-validator.ts` — добавлено правило `schema-validates`, экспортированы новые функции
- `scripts/vite-plugin-metamode.ts` — добавлен `buildStart` хук для запуска валидации при сборке
- `package.json` — добавлены npm скрипты `metamode:generate-tests`, `metamode:generate-tests:dry`

**Критерии приёмки**:

- ✅ `schemas/mm-annotation.schema.json` полностью описывает формат `@mm:` аннотаций
- ✅ Правило `schema-validates` запускается как часть полной валидации
- ✅ `metamode-test-generator.ts` генерирует тесты для любого модуля с `@mm:id`
- ✅ Vite плагин запускает семантическую валидацию при каждой сборке
- ✅ Тесты для схемного валидатора написаны и покрывают: valid/invalid annotations, checkSchemaValidates, generateTestSuites, renderTestFile
- ✅ CI/CD сборка проходит

**Метки**: `metamode`, `v2.0`, `validation`, `testing`, `high`

---

### TASK 84: AI-интеграция (Phase 3) ✅

**Заголовок**: `MetaMode v2.0 Phase 3 — Контекст-билдер для AI-агентов`

**Приоритет**: Высокий

**Статус**: ✅ Завершена

**Описание**:
Создан специализированный контекст-билдер для AI-агентов (CodeGen, Refactor, DocGen) на основе v2.0 БД. Разработаны промпт-шаблоны и pre-commit hook поддержка.

**Задачи**:

- [x] Создать `scripts/metamode-context-builder.ts` для формирования AI-контекста
- [x] Разработать промпт-шаблоны для разных типов AI-агентов
- [x] Реализовать pre-commit hook для добавления `@mm:` при создании файлов
- [x] Добавить команды `metamode:context` и `metamode:ai:context`
- [x] Написать тесты для контекст-билдера

**Созданные файлы**:

- `scripts/metamode-context-builder.ts` — контекст-билдер и pre-commit поддержка (400+ строк)
- `src/lib/metamode-context-builder.test.ts` — тесты (100+ тестов)

**Изменённые файлы**:

- `package.json` — добавлены npm скрипты `metamode:context`, `metamode:ai:context`

**API реализованного контекст-билдера**:

```typescript
import { buildContext, buildContextForAgent, suggestAnnotation, runPreCommitCheck } from './metamode-context-builder'

// Build context for a specific agent type
const ctx = buildContext(db, {
  agentType: 'codegen',   // 'codegen' | 'refactor' | 'docgen' | 'review' | 'generic'
  scope: ['ui', 'lib'],   // filter by tags
  ids: ['param_editor'],  // or by explicit IDs
  format: 'markdown',     // 'markdown' | 'json' | 'text'
  tokenBudget: 4000,      // max tokens (auto-trims if exceeded)
  includeDeps: true,      // expand runtime dependencies
})
console.log(ctx.prompt)   // ready-to-use LLM prompt

// Convenience wrapper
const refactorCtx = buildContextForAgent('refactor', db, { ids: ['shader_utils'] })

// Pre-commit: suggest annotation for a new file
const suggestion = suggestAnnotation('/project/src/lib/new-module.ts', db)

// Pre-commit hook: check all staged files
const missing = runPreCommitCheck(stagedFiles, db)
```

**Критерии приёмки**:

- ✅ `buildContext` собирает AI-контекст из v2.0 БД с поддержкой scope, ids, filePaths фильтров
- ✅ 5 промпт-шаблонов для агентов: codegen, refactor, docgen, review, generic
- ✅ Token budget enforcement — автоматическая обрезка при превышении лимита
- ✅ Pre-commit поддержка: `suggestAnnotation` и `runPreCommitCheck`
- ✅ 3 формата вывода: markdown, json, text
- ✅ Тесты написаны и покрывают: шаблоны, выборку, buildContext, suggestAnnotation, pre-commit

**Метки**: `metamode`, `v2.0`, `ai`, `context-builder`, `high`

---

### TASK 85: Production оптимизация (Phase 4) ✅

**Заголовок**: `MetaMode v2.0 Phase 4 — Tree-shaking и production-оптимизация`

**Приоритет**: Средний

**Статус**: ✅ Завершена

**Описание**:
Реализована production-оптимизация: удаление `internal`-записей, условный импорт, компактная сериализация, новый virtual module.

**Задачи**:

- [x] Добавить tree-shaking для `visibility: 'internal'` в production
- [x] Реализовать условный импорт (dev vs prod database)
- [x] Оптимизировать JSON сериализацию для минимального размера
- [x] Убедиться, что оверхед бандла ≤ +2%

**Созданные файлы**:

- `scripts/metamode-prod-optimizer.ts` — production оптимизатор с tree-shaking (stripEntry, rebuildGraph, optimizeForProduction, analyzeBundleSize)
- `src/lib/metamode-prod-optimizer.test.ts` — 39 тестов

**Изменённые файлы**:

- `scripts/vite-plugin-metamode.ts` — автоматическое применение оптимизатора в production (`isProduction`); добавлен `virtual:metamode/v2/db/prod`
- `env.d.ts` — TypeScript типы для `virtual:metamode/v2/db/prod` и `MmProdEntry`
- `package.json` — npm скрипты `metamode:prod:optimize`, `metamode:prod:analyze`

**API**:

```typescript
import { optimizeForProduction, analyzeBundleSize } from './scripts/metamode-prod-optimizer'
import { compileV2Database } from './scripts/metamode-db-compiler'

const devDb = compileV2Database(process.cwd())
const prodDb = optimizeForProduction(devDb)
// prodDb: internal entries removed, dev-only fields stripped, AI objects collapsed

const report = analyzeBundleSize(devDb, prodDb)
console.log(`Saved ${report.savedBytes} bytes (${report.reductionPercent.toFixed(1)}%)`)
console.log(`Removed ${report.internalEntriesRemoved} internal entries`)
```

```typescript
// In application code:
// Dev builds — includes ALL entries (full metadata for devtools)
import mm from 'virtual:metamode/v2/db'

// Always production-stripped (safe for any build mode):
import mmProd from 'virtual:metamode/v2/db/prod'
```

**Критерии приёмки**:

- ✅ `visibility: 'internal'` записи удаляются из production бандла
- ✅ Dev-only поля (filePath, line, source, entityName) не попадают в prod
- ✅ AI objects (.summary) коллапсируются до строк в prod
- ✅ `virtual:metamode/v2/db` автоматически stripped в production build
- ✅ `virtual:metamode/v2/db/prod` всегда возвращает stripped базу
- ✅ Граф зависимостей обновляется (рёбра к internal записям удаляются)
- ✅ 39 тестов проходят
- ✅ CLI: `npm run metamode:prod:optimize` и `npm run metamode:prod:analyze`

**Метки**: `metamode`, `v2.0`, `optimization`, `production`, `medium`

---

### TASK 86: CLI и полная миграция (Phase 5) ✅

**Заголовок**: `MetaMode v2.0 Phase 5 — Полный CLI и миграция v1→v2`

**Приоритет**: Средний

**Статус**: ✅ Завершена

**Описание**:
Завершить набор CLI команд и убедиться в полной миграции проекта isocubic с v1 на v2 без потерь.

**Задачи**:

- [x] Убедиться во всех CLI командах по спецификации
- [x] Запустить и верифицировать полную миграцию isocubic
- [x] Добавить dual-mode (v1 и v2 работают параллельно)
- [x] Написать migration guide

**Результаты**:

- Создан единый CLI инструмент `scripts/metamode-cli.ts` с командами:
  - `status` — обзор состояния MetaMode в проекте
  - `parse [path]` — парсинг `@mm:` аннотаций
  - `validate` — семантическая и схемная валидация
  - `migrate [--apply]` — миграция v1.x → v2.0
  - `compile [--stats] [--graph]` — компиляция БД
  - `context [--agent <type>]` — построение AI-контекста
  - `optimize [--stats]` — production-оптимизация
  - `generate-tests [--dry-run]` — генерация тестов
  - `help` — справка по командам
- Верифицирована полная миграция isocubic (32 файла `metamode.json`, 374 аннотации)
- Dual-mode активен: обе версии работают параллельно
  - v1.x: `virtual:metamode`, `virtual:metamode/tree`, `virtual:metamode/db`
  - v2.0: `virtual:metamode/v2/db`, `virtual:metamode/v2/db/prod`
- Создан migration guide `docs/metamode-v2-migration.md`
- Добавлены npm скрипты: `metamode`, `metamode:status`, `metamode:cli`
- Написано 31 тест в `src/lib/metamode-cli.test.ts`

**Созданные файлы**:

- `scripts/metamode-cli.ts` — унифицированный CLI инструмент
- `docs/metamode-v2-migration.md` — руководство по миграции
- `src/lib/metamode-cli.test.ts` — 31 тест

**Изменённые файлы**:

- `package.json` — добавлены npm скрипты `metamode`, `metamode:status`, `metamode:cli`
- `docs/phase-13.md` — обновлён статус TASK 86

**Критерии приёмки**:

- ✅ Единый CLI с 8 командами (parse, validate, migrate, compile, context, optimize, generate-tests, status)
- ✅ Migration guide создан (`docs/metamode-v2-migration.md`)
- ✅ Dual-mode верифицирован: v1.x и v2.0 работают параллельно без конфликтов
- ✅ 31 тест проходят
- ✅ Все 3939 тестов проходят
- ✅ CI/CD сборка проходит

**Метки**: `metamode`, `v2.0`, `cli`, `migration`, `medium`

---

### TASK 87: Документация и релиз (Phase 6) ✅

**Заголовок**: `MetaMode v2.0 Phase 6 — Финальная документация и релиз`

**Приоритет**: Низкий

**Статус**: ✅ Завершена

**Описание**:
Создана полная документация для MetaMode v2.0: спецификация inline-аннотаций, примеры использования, migration guide, обновлённый README.

**Задачи**:

- [x] Обновить `metamode.md` с полной спецификацией v2.0 (раздел 14: inline-аннотации, runtime API, production-оптимизация, CLI, контекст-билдер, dual-mode)
- [x] Создать `docs/metamode-v2-migration.md` (выполнено в TASK 86)
- [x] Добавить примеры в `examples/` (`examples/metamode-v2-usage.ts` — 9 примеров использования v2.0 API)
- [x] Финально обновить `README.md` (тест-каунт, статус Phase 13, ссылки на документацию, migration guide)

**Созданные файлы**:

- `examples/metamode-v2-usage.ts` — 9 подробных примеров использования MetaMode v2.0

**Изменённые файлы**:

- `metamode.md` — добавлен раздел 14 (MetaMode v2.0 inline-аннотации) и обновлён раздел 15 (дальнейшее развитие)
- `README.md` — обновлён счётчик тестов, статус Phase 13, раздел документации
- `docs/phase-13.md` — обновлён статус TASK 87 и Phase 6

**Критерии приёмки**:

- ✅ `metamode.md` содержит полную спецификацию v2.0 (@mm: аннотации, runtime API, production-оптимизация, CLI, контекст-билдер, dual-mode)
- ✅ `examples/metamode-v2-usage.ts` демонстрирует все ключевые возможности v2.0
- ✅ `README.md` обновлён: Phase 13 завершена, ссылки на migration guide добавлены
- ✅ `docs/metamode-v2-migration.md` существует (создан в TASK 86)

**Метки**: `metamode`, `v2.0`, `documentation`, `low`

---

## Порядок выполнения TASK

1. **TASK 82**: Компилятор DB ✅
2. **TASK 83**: Валидация и тесты (Phase 2) ✅
3. **TASK 84**: AI-интеграция (Phase 3) ✅
4. **TASK 85**: Production оптимизация (Phase 4) ✅
5. **TASK 86**: CLI и миграция (Phase 5) ✅
6. **TASK 87**: Документация и релиз (Phase 6) ✅

---

## Оценка объёма работ

| TASK | Сложность | Приоритет | Статус |
|------|-----------|-----------|--------|
| 82. Компилятор DB (Phase 1) | Высокая | Критический | ✅ Завершена |
| 83. Валидация и тесты (Phase 2) | Средняя | Высокий | ✅ Завершена |
| 84. AI-интеграция (Phase 3) | Средняя | Высокий | ✅ Завершена |
| 85. Production оптимизация (Phase 4) | Средняя | Средний | ✅ Завершена |
| 86. CLI и миграция (Phase 5) | Средняя | Средний | ✅ Завершена |
| 87. Документация (Phase 6) | Низкая | Низкий | ✅ Завершена |

---

## Важные принципы

1. **Обратная совместимость** — v1.x API (`virtual:metamode`, `virtual:metamode/db`) остаётся рабочим
2. **Постепенная миграция** — аннотации `@mm:` можно добавлять в файлы постепенно
3. **AI как гражданин первого класса** — все решения принимаются с учётом AI-потребления
4. **Семантическая целостность** — сборка гарантирует корректность метаданных

---

**Назад к [README](../README.md)**
