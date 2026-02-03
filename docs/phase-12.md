# Фаза 12: MetaMode — Унификация систем метаинформации

Данный документ описывает планируемые задачи по унификации систем metanet, DevMode, god-mode и VueDevMode в единую систему MetaMode.

**Статус**: ✅ Завершена (TASK 70-81 завершены)

---

## Обзор

**Цель**: Объединить и упростить все существующие системы метаинформации в единую систему MetaMode, подготовленную к выделению в отдельный пакет.

**Проблема**: В проекте существуют несколько пересекающихся систем:

- **MetaMode** — система структурированных метаданных проекта (`metamode.json`)
- **DevMode** — режим разработчика с метаинформацией компонентов
- **VueDevMode** — Vue 3 реализация DevMode (Pinia store)
- **God-Mode** — окно разработчика с вкладками (query, context, search, conversation, issues, metamode)

**Решение**: Создать единую систему **MetaMode** которая:

1. Объединяет функциональность всех систем
2. Имеет компактный JSON-формат метаинформации
3. Не содержит дублирующейся информации
4. Оптимизирована для работы с AI-агентами (минимизация токенов)
5. Готова к выделению в отдельный NPM-пакет (но само выделение — позже)

---

## Критические приоритеты MetaMode

1. **Помощь AI-агентам в devtime** — метаинформация должна быть легко доступна и парсима AI-агентами
2. **Помощь разработчикам с AI-агентами в devtime** — интеграция с инструментами разработки
3. **Помощь в runtime** — ориентирование в приложении и подготовка issue через окно MetaMode
4. **Компиляция в артефакт** — все метаданные встраиваются в сборку как единая БД
5. **Подключение к tinyLLM** — возможность локальных AI-запросов к метаданным

---

## Текущая структура (для анализа)

### Файлы MetaMode (31 файл)

```
metamode.json (корень)
metamode.schema.json
metamode.md
+ 28 файлов metamode.json в подкаталогах
```

### Файлы MetaMode (после TASK 72)

```
src/lib/metamode-store.ts (306 строк) — Pinia store
src/types/metamode.ts (704 строки) — типы и утилиты
src/types/ai-query.ts — типы AI-запросов
src/types/component-meta.ts — типы метаданных компонентов
src/types/issue-generator.ts — типы для генерации issue
```

### Компоненты MetaMode (после TASK 72)

```
src/components/MetaModeWindow.vue — главное окно
src/components/MetaModeIndicator.vue — индикатор режима
src/components/MetaModeQueryPanel.vue — панель AI-запросов
src/components/MetamodeTreePanel.vue — дерево метаданных
src/components/MetamodeTreeNode.vue — узел дерева
```

### Пакет metamode (после TASK 72)

```
packages/metamode/ — выделенный пакет с типами и провайдером
```

---

## Планируемые TASK

### TASK 70: Проектирование формата metamode.json ✅

**Заголовок**: `Проектирование нового компактного формата metamode.json`

**Приоритет**: Критический

**Статус**: ✅ Завершена

**Описание**:
Создать новый формат `metamode.json` который заменит `metanet.json` и будет:

- Более компактным
- Оптимизированным для AI-агентов
- Содержать только полезную информацию

**Задачи**:

- [x] Проанализировать все поля текущего metanet.json на полезность
- [x] Определить минимальный набор обязательных полей
- [x] Добавить поддержку inline-метаданных в атрибутах metamode компонентов
- [x] Создать новую JSON Schema (metamode.schema.json)
- [x] Документировать формат в metamode.md

**Результаты**:

- Новый формат на **30-43%** компактнее текущего (подтверждено на примерах)
- Сокращённые имена полей: `desc`, `ver`, `lang`, `dirs`, `deps`, `exp`, `dep`
- Добавлено поле `ai` для AI-summary (макс. 200 символов)
- Поддержка short-формата для директорий: `"dirname": "description"`
- Автоматическое инферирование путей к `metamode.json` подкаталогов
- Inline-метаданные: JSDoc `@metamode` и объект `const metamode = {...}`

**Созданные файлы**:

- `metamode.schema.json` — JSON Schema для валидации
- `metamode.md` — спецификация нового формата

**Критерии приёмки**:

- ✅ Новый формат на 30-50% компактнее текущего
- ✅ Все поля имеют чёткое обоснование полезности
- ✅ Формат легко читается AI-агентами
- ✅ CI/CD сборка проходит

**Метки**: `metamode`, `schema`, `critical`

---

### TASK 71: Рефакторинг именования: metanet → metamode ✅

**Заголовок**: `Переименование системы metanet в metamode`

**Приоритет**: Критический

**Статус**: ✅ Завершена

**Описание**:
Переименовать все упоминания metanet в metamode:

- Файлы: metanet.json → metamode.json
- Переменные и типы: metanet → metamode
- Команды npm: metanet:validate → metamode:validate
- Виртуальные модули: virtual:metanet → virtual:metamode

**Задачи**:

- [x] Переименовать все файлы metanet.json → metamode.json (31 файл)
- [x] Обновить metanet.schema.json → metamode.schema.json
- [x] Обновить metanet.md → metamode.md (уже существовала в TASK 70)
- [x] Обновить scripts/metanet-preprocessor.ts → scripts/metamode-preprocessor.ts
- [x] Обновить scripts/vite-plugin-metanet.ts → scripts/vite-plugin-metamode.ts
- [x] Обновить package.json (npm scripts)
- [x] Обновить типы в env.d.ts (Metanet* → Metamode*)
- [x] Обновить все импорты virtual:metanet → virtual:metamode
- [x] Обновить компоненты MetanetTreePanel → MetamodeTreePanel
- [x] Обновить компоненты MetanetTreeNode → MetamodeTreeNode
- [x] Обновить вкладку god-mode "metanet" → "metamode"

**Результаты**:

- 31 файл metanet.json переименованы в metamode.json
- Все типы MetanetJson, MetanetFileDescriptor и др. переименованы в Metamode*
- Виртуальные модули virtual:metamode и virtual:metamode/tree работают
- npm scripts обновлены: metamode:validate, metamode:compile
- Вкладка God Mode переименована: 'metanet' → 'metamode'
- Все ссылки на файлы в metamode.json обновлены

**Критерии приёмки**:

- ✅ Нет упоминаний "metanet" в коде (кроме git history и метаданных TASK 70)
- ✅ Все тесты проходят
- ✅ CI/CD сборка проходит
- ✅ npm run metamode:validate проходит

**Метки**: `metamode`, `refactoring`, `critical`

---

### TASK 72: Унификация DevMode и GodMode в MetaMode ✅

**Заголовок**: `Объединение DevMode и GodMode под именем MetaMode`

**Приоритет**: Критический

**Статус**: ✅ Завершена

**Описание**:
Объединить devmode.ts и god-mode.ts в единый модуль metamode:

- Переименовать DevMode → MetaMode
- Переименовать GodModeWindow → MetaModeWindow
- Переименовать все связанные типы и компоненты

**Задачи**:

- [x] Создать src/lib/metamode-store.ts (переименование devmode.ts)
- [x] Создать src/types/metamode.ts (переименование god-mode.ts)
- [x] Переименовать GodModeWindow.vue → MetaModeWindow.vue
- [x] Переименовать DevModeIndicator.vue → MetaModeIndicator.vue
- [x] Переименовать DevModeQueryPanel.vue → MetaModeQueryPanel.vue
- [x] Обновить все импорты и ссылки
- [x] Переименовать пакет packages/god-mode → packages/metamode
- [x] Обновить localStorage ключи (миграция данных с обратной совместимостью)
- [x] Обновить клавиатурную комбинацию Ctrl+Shift+G → Ctrl+Shift+M
- [x] Предоставить алиасы обратной совместимости с @deprecated аннотациями

**Результаты**:

- Все файлы и типы переименованы с DevMode/GodMode на MetaMode
- Пакет packages/god-mode переименован в packages/metamode
- localStorage ключи обновлены с миграцией: isocubic_devmode_settings → isocubic_metamode_settings
- Клавиатурная комбинация обновлена: Ctrl+Shift+G → Ctrl+Shift+M
- Предоставлены алиасы обратной совместимости: useDevModeStore, useDevMode, useIsDevModeEnabled, useDevModeSettings
- Все 3391 тестов проходят
- CI/CD сборка проходит

**Критерии приёмки**:

- ✅ Нет активных упоминаний "DevMode", "GodMode", "god-mode" в коде (только в алиасах совместимости)
- ✅ Функциональность полностью сохранена
- ✅ Все тесты проходят
- ✅ CI/CD сборка проходит

**Метки**: `metamode`, `refactoring`, `critical`

---

### TASK 73: Удаление VueDevMode terminology ✅

**Заголовок**: `Удаление терминологии VueDevMode`

**Приоритет**: Высокий

**Статус**: ✅ Завершена

**Описание**:
Удалить все упоминания VueDevMode в пользу единого термина MetaMode.

**Задачи**:

- [x] Заменить VueDevMode → MetaMode в комментариях
- [x] Обновить useDevModeStore → useMetaModeStore (уже выполнено в TASK 72, оставлены deprecated алиасы)
- [x] Обновить useDevModeKeyboard → useMetaModeKeyboard (уже выполнено в TASK 72, оставлены deprecated алиасы)
- [x] Обновить useIsDevModeEnabled → useIsMetaModeEnabled (уже выполнено в TASK 72, оставлены deprecated алиасы)
- [x] Обновить все остальные хуки и функции
- [x] Обновить документацию

**Результаты**:

- Заменён заголовок окна "VueDevMode" → "MetaMode" в MetaModeWindow.vue
- Обновлены комментарии в issue-generator.ts
- Обновлена документация metamode.md (удалено упоминание VueDevMode)
- Обновлены метаданные ComponentContextPanel.vue (devmode → metamode)
- Deprecated алиасы сохранены для обратной совместимости (как в TASK 72)
- Обновлены тесты MetaModeWindow.vue.test.ts

**Критерии приёмки**:

- ✅ Нет активных упоминаний "VueDevMode" в коде (кроме deprecated алиасов)
- ✅ Все тесты проходят
- ✅ CI/CD сборка проходит

**Метки**: `metamode`, `cleanup`, `high`

---

### TASK 74: Оптимизация metamode.json для AI ✅

**Заголовок**: `Оптимизация формата для работы с AI-агентами`

**Приоритет**: Высокий

**Статус**: ✅ Завершена

**Описание**:
Оптимизировать формат metamode.json для минимизации токенов при передаче AI-агентам:

- Сократить имена полей
- Удалить избыточную информацию
- Добавить предкомпилированные summary

**Задачи**:

- [x] Анализ использования токенов текущим форматом
- [x] Определение оптимального формата для AI
- [x] Реализация сокращённых имён полей (опционально)
- [x] Добавление поля `ai_summary` для краткого описания
- [x] Создание утилиты для генерации AI-оптимизированного представления

**Результаты**:

- Создан новый AI-оптимизированный формат с сокращёнными полями:
  - `description` → `desc`
  - `version` → `ver`
  - `languages` → `lang`
  - `directories` → `dirs`
  - `dependencies` → `deps`
  - `experimental` → `exp`
  - `deprecated` → `dep`
- Добавлено поле `ai` для автоматически генерируемого краткого описания
- Создан скрипт `scripts/metamode-ai-optimizer.ts` для конвертации и анализа
- Обновлён `scripts/metamode-preprocessor.ts` с опцией `--ai`
- Обновлён `scripts/vite-plugin-metamode.ts` с виртуальным модулем `virtual:metamode/ai`
- Добавлены типы в `env.d.ts`: `AIMetamodeFileDescriptor`, `AIMetamodeTreeNode`
- Добавлены npm скрипты: `metamode:ai`, `metamode:ai:analyze`
- Написаны тесты: 20 тестов для AI-оптимизатора

**Критерии приёмки**:

- ✅ AI-формат использует сокращённые имена полей (экономия ~20% на именах)
- ✅ AI-агенты получают обогащённый контекст через поле `ai`
- ✅ Все тесты проходят
- ✅ CI/CD сборка проходит

**Метки**: `metamode`, `ai`, `optimization`, `high`

---

### TASK 75: Inline metamode атрибуты ✅

**Заголовок**: `Поддержка inline metamode атрибутов в компонентах`

**Приоритет**: Средний

**Статус**: ✅ Завершена

**Описание**:
Добавить возможность хранить метаинформацию прямо в компонентах через специальный атрибут `metamode`:

```vue
<script setup>
const metamode = {
  description: 'Компонент редактора параметров',
  status: 'stable',
}
</script>
```

**Задачи**:

- [x] Определить формат inline metamode атрибутов
- [x] Обновить Vite плагин для извлечения inline метаданных
- [x] Объединить inline метаданные с файловыми metamode.json
- [x] Документировать использование

**Результаты**:

- Создан `scripts/metamode-inline-extractor.ts` для извлечения inline метаданных
- Поддерживаются два формата: JSDoc `@metamode` и объект `const metamode = {...}`
- Обновлён `scripts/vite-plugin-metamode.ts` с интеграцией inline извлечения
- Добавлена нормализация алиасов полей (`description` → `desc`, `dependencies` → `deps`)
- Обновлена документация `metamode.md` с детальным описанием формата
- Написано 33 теста в `src/lib/metamode-inline-extractor.test.ts`

**Критерии приёмки**:

- ✅ Inline метаданные корректно извлекаются при сборке
- ✅ Приоритет: inline > файловые metamode.json
- ✅ Все тесты проходят
- ✅ CI/CD сборка проходит

**Метки**: `metamode`, `components`, `medium`

---

### TASK 76: Обновление окна MetaMode ✅

**Заголовок**: `Обновление MetaModeWindow с новым интерфейсом`

**Приоритет**: Средний

**Статус**: ✅ Завершена

**Описание**:
Обновить интерфейс окна MetaMode с учётом новой архитектуры:

- Переименовать вкладку "MetaMode" → "Tree" (Дерево)
- Улучшить вкладку Issues для подготовки GitHub issues
- Добавить preview режим для AI-оптимизированного формата

**Задачи**:

- [x] Обновить вкладки окна MetaMode (переименована вкладка 'metamode' → 'tree')
- [x] Улучшить UX создания issues (добавлены кнопки быстрого создания)
- [x] Добавить preview режим для AI-оптимизированного формата
- [x] Обновить документацию

**Результаты**:

- Вкладка "MetaMode" переименована в "Tree" / "Дерево" для ясности
- Тип MetaModeTab обновлён: 'metamode' → 'tree'
- В MetamodeTreePanel добавлена кнопка "AI" для переключения между стандартным и AI-оптимизированным форматом
- Добавлена кнопка "Copy" для копирования AI JSON в буфер обмена
- В IssueDraftPanel добавлены кнопки быстрого создания: Bug, Feature, Improvement, Question
- Все 3444 теста проходят
- CI/CD сборка проходит

**Критерии приёмки**:

- ✅ Окно MetaMode работает с новой архитектурой
- ✅ UX создания issues улучшен
- ✅ Preview режим для AI-формата работает
- ✅ Все тесты проходят
- ✅ CI/CD сборка проходит

**Метки**: `metamode`, `ui`, `medium`

---

### TASK 77: Миграция тестов на MetaMode ✅

**Заголовок**: `Обновление всех тестов на новую терминологию MetaMode`

**Приоритет**: Высокий

**Статус**: ✅ Завершена

**Описание**:
Обновить все тесты с терминологии DevMode/GodMode/metanet на MetaMode/metamode.

**Задачи**:

- [x] Обновить тесты devmode.test.ts → metamode.test.ts (уже выполнено в TASK 72)
- [x] Обновить тесты компонентов
- [x] Обновить тесты metanet-preprocessor → metamode-preprocessor (уже выполнено в TASK 71)
- [x] Проверить coverage

**Результаты**:

- Обновлены комментарии в файле `src/types/metamode.test.ts` (добавлен TASK 77)
- Обновлены комментарии в файле `src/lib/metamode-store.test.ts` (добавлен TASK 77)
- Обновлены комментарии в файле `src/components/MetaModeProvider.test.ts` (добавлен TASK 77)
- Обновлены тестовые описания в `src/components/MetaModeWindow.vue.test.ts`:
  - "DevMode" → "MetaMode" в описаниях тестов
  - "godWindow" → "metamodeWindow" в переменных
- Обновлены тестовые описания в `src/components/ExtendedSearchPanel.vue.test.ts`:
  - "DevMode" → "MetaMode" в describe блоках и тестовых описаниях
- Обновлены тестовые описания в `src/components/ComponentContextPanel.vue.test.ts`:
  - "DevMode" → "MetaMode" в тестовых описаниях
- Все 3444 теста проходят
- CI/CD сборка проходит

**Критерии приёмки**:

- ✅ Все тесты обновлены и проходят
- ✅ Coverage не уменьшился
- ✅ CI/CD сборка проходит

**Метки**: `metamode`, `testing`, `high`

---

### TASK 78: Документация MetaMode ✅

**Заголовок**: `Создание документации MetaMode`

**Приоритет**: Средний

**Статус**: ✅ Завершена

**Описание**:
Создать полную документацию системы MetaMode:

- metamode.md — спецификация формата
- README обновления
- Примеры использования

**Задачи**:

- [x] Создать metamode.md (новая спецификация) — уже существует с TASK 70
- [x] Обновить README.md с описанием MetaMode
- [x] Добавить примеры в examples/
- [x] Обновить JSDoc комментарии — уже актуальны в metamode-store.ts

**Результаты**:

- Добавлен раздел "MetaMode" в README.md с описанием возможностей, примерами и командами
- Обновлён `examples/metamode.json` с добавлением тегов и нового файла примера
- Создан `examples/metamode-usage.ts` с 8 примерами использования MetaMode API
- Уточнена документация в `metamode.md` о двух схемах (стандартной и компактной)
- Все 3444+ тестов проходят
- CI/CD сборка проходит

**Критерии приёмки**:

- ✅ Документация полная и актуальная
- ✅ Примеры работают
- ✅ CI/CD сборка проходит

**Метки**: `metamode`, `documentation`, `medium`

---

### TASK 79: Подготовка пакета MetaMode к выделению ✅

**Заголовок**: `Подготовка packages/metamode к выделению в отдельный NPM-пакет`

**Приоритет**: Низкий (выделение будет позже)

**Статус**: ✅ Завершена

**Описание**:
Подготовить структуру пакета metamode для будущего выделения:

- Чистые интерфейсы
- Минимум зависимостей
- Полная документация

**Задачи**:

- [x] Ревью зависимостей пакета
- [x] Выделить public API
- [x] Добавить README.md в пакет
- [x] Подготовить package.json для публикации
- [x] Добавить examples в пакет

**Результаты**:

- Обновлены комментарии в `src/types/common.ts` с GOD MODE на MetaMode
- Обновлён `examples/basic-usage.vue` с использованием MetaMode API
- Расширен `package.json` с metadata для NPM публикации:
  - Добавлены `author`, `homepage`, `bugs`, `publishConfig`, `engines`
  - Добавлены дополнительные `keywords` для улучшения поиска
  - Добавлен `sideEffects: false` для tree-shaking
  - Добавлен `examples` в `files`
- Расширен `README.md` с полной документацией public API:
  - Добавлены таблицы всех типов и функций
  - Документированы все utility functions
  - Добавлены примеры использования для всех API
  - Добавлен раздел Browser Support
- Создан `examples/advanced-usage.ts` с 10 примерами использования:
  - Custom Component Registry
  - Custom Configuration
  - Conversation Management
  - Issue Draft Creation
  - Window State Management
  - Keyboard Shortcut Handling
  - Language Detection
  - Tab Management
  - Templates and Colors
  - Utility Functions
- Обновлены все `metamode.json` файлы с терминологией MetaMode

**Критерии приёмки**:

- ✅ Пакет готов к выделению
- ✅ Чистый public API документирован
- ✅ CI/CD сборка проходит
- **Примечание**: Само выделение в отдельный NPM-пакет будет в следующей фазе

**Метки**: `metamode`, `package`, `low`

---

### TASK 80: Компиляция MetaMode в единую БД ✅

**Заголовок**: `Компиляция всей метаинформации в встроенную БД`

**Приоритет**: Средний

**Статус**: ✅ Завершена

**Описание**:
Реализовать компиляцию всех metamode.json + inline метаданных в единую встроенную базу данных для production сборки.

**Задачи**:

- [x] Определить формат встроенной БД (JSON, SQLite, IndexedDB)
- [x] Реализовать компиляцию в Vite плагине
- [x] Добавить API для доступа к БД в runtime
- [x] Оптимизировать размер БД

**Результаты**:

- Выбран формат JSON для встроенной БД (минимальные зависимости, синхронный доступ)
- Создан виртуальный модуль `virtual:metamode/db` в Vite плагине
- Реализован `MetamodeDatabaseClient` с полным API для запросов:
  - `search(query, options)` — поиск по имени, описанию, тегам с фильтрами
  - `getByPath(path)` — получение по пути
  - `getFile(path)` / `getDirectory(path)` — типизированное получение
  - `getFilesByStatus/Phase/Tags()` — фильтрация файлов
  - `traverse()` — обход дерева
  - `getStats()` — статистика БД
- Создан composable `useMetamodeDatabase()` для Vue-компонентов
- Добавлены типы в `env.d.ts` для `virtual:metamode/db`
- Написано 69 тестов в `src/lib/metamode-database.test.ts`
- Обновлена документация в `metamode.md` и `README.md`

**Созданные файлы**:

- `src/lib/metamode-database.ts` — клиент БД и утилиты
- `src/lib/metamode-database.test.ts` — 69 тестов
- `src/composables/useMetamodeDatabase.ts` — Vue composable

**Критерии приёмки**:

- ✅ MetaMode данные доступны в production через `virtual:metamode/db`
- ✅ Размер БД оптимизирован (JSON без лишних пробелов)
- ✅ Все 69 тестов проходят
- ✅ CI/CD сборка проходит

**Метки**: `metamode`, `compilation`, `medium`

---

### TASK 81: Интеграция с tinyLLM (исследование) ✅

**Заголовок**: `Исследование интеграции MetaMode с tinyLLM`

**Приоритет**: Низкий

**Статус**: ✅ Завершена

**Описание**:
Исследовать возможность подключения скомпилированной MetaMode БД к tinyLLM для локальных AI-запросов.

**Задачи**:

- [x] Исследовать варианты tinyLLM (llama.cpp, ollama, и т.д.)
- [x] Определить формат промптов для MetaMode данных
- [x] Создать прототип интеграции
- [x] Документировать результаты

**Результаты**:

- Исследованы три основных варианта локальных LLM:
  - **Ollama** — рекомендуется для простоты установки и использования
  - **llama.cpp** — для продвинутых пользователей с GPU ускорением
  - **OpenAI-compatible API** — универсальный вариант для любого LLM сервера
- Создан модуль `src/lib/metamode-llm-integration.ts` с полной реализацией:
  - `MetaModeLLMIntegration` — основной класс для запросов
  - `MetaModeContextBuilder` — построитель контекста из MetaMode БД
  - `OllamaBackend`, `LlamaCppBackend`, `OpenAICompatibleBackend` — бэкенды LLM
  - `MockLLMBackend` — мок для тестирования и fallback
- Оптимизированные промпт-шаблоны для русского и английского языков
- Поддержка фильтрации контекста по статусу, фазе, тегам и путям
- Кеширование ответов для повторных запросов
- Автоматический fallback при недоступности LLM
- Написано 64 теста в `src/lib/metamode-llm-integration.test.ts`
- Обновлена документация в `metamode.md` (раздел 13)

**Созданные файлы**:

- `src/lib/metamode-llm-integration.ts` — модуль интеграции
- `src/lib/metamode-llm-integration.test.ts` — 64 теста

**Критерии приёмки**:

- ✅ Документ с результатами исследования (metamode.md раздел 13)
- ✅ Прототип создан и протестирован
- ✅ CI/CD сборка проходит

**Метки**: `metamode`, `ai`, `research`, `low`

---

## Порядок выполнения TASK

Рекомендуемый порядок для обеспечения работоспособности после каждой задачи:

1. **TASK 70**: Проектирование формата (не ломает сборку)
2. **TASK 71**: Рефакторинг metanet → metamode (одно большое изменение)
3. **TASK 77**: Миграция тестов (сразу после рефакторинга)
4. **TASK 72**: Унификация DevMode + GodMode → MetaMode
5. **TASK 73**: Удаление VueDevMode терминологии
6. **TASK 74**: Оптимизация для AI
7. **TASK 75**: Inline metamode атрибуты
8. **TASK 76**: Обновление окна MetaMode
9. **TASK 78**: Документация
10. **TASK 79**: Подготовка пакета к выделению
11. **TASK 80**: Компиляция в БД
12. **TASK 81**: Исследование tinyLLM

---

## Оценка объёма работ

| TASK                               | Сложность | Приоритет   | Статус       |
| ---------------------------------- | --------- | ----------- | ------------ |
| 70. Проектирование формата         | Средняя   | Критический | ✅ Завершена |
| 71. Рефакторинг metanet → metamode | Высокая   | Критический | ✅ Завершена |
| 72. Унификация DevMode + GodMode   | Высокая   | Критический | ✅ Завершена |
| 73. Удаление VueDevMode            | Низкая    | Высокий     | ✅ Завершена |
| 74. Оптимизация для AI             | Средняя   | Высокий     | ✅ Завершена |
| 75. Inline metamode атрибуты       | Средняя   | Средний     | ✅ Завершена |
| 76. Обновление окна MetaMode       | Средняя   | Средний     | ✅ Завершена |
| 77. Миграция тестов                | Средняя   | Высокий     | ✅ Завершена |
| 78. Документация                   | Низкая    | Средний     | ✅ Завершена |
| 79. Подготовка пакета              | Средняя   | Низкий      | ✅ Завершена |
| 80. Компиляция в БД                | Высокая   | Средний     | ✅ Завершена |
| 81. tinyLLM исследование           | Низкая    | Низкий      | ✅ Завершена |

---

## Важные принципы

1. **Каждая задача должна оставлять проект в рабочем состоянии**
   - CI/CD проходит после каждого TASK
   - Все тесты зелёные
   - Приложение запускается и работает

2. **Минимизация breaking changes**
   - Обратная совместимость где возможно
   - Миграция localStorage данных
   - Deprecation warnings перед удалением

3. **Оптимизация для AI-агентов**
   - Компактный формат данных
   - Только полезная информация
   - Чёткая структура

4. **Подготовка к выделению пакета**
   - Чистые интерфейсы
   - Минимум зависимостей
   - Полная документация

---

**Назад к [README](../README.md)**
