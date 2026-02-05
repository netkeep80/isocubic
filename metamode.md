# MetaMode: Унифицированная система метаинформации

## 1. Назначение

MetaMode — это унифицированная система метаинформации проекта, оптимизированную для работы с AI-агентами.

**Ключевые приоритеты:**

1. **Помощь AI-агентам в devtime** — метаинформация легко доступна и парсима
2. **Помощь разработчикам с AI-агентами** — интеграция с инструментами разработки
3. **Помощь в runtime** — ориентирование в приложении через окно MetaMode
4. **Компиляция в артефакт** — все метаданные встраиваются в сборку как единая БД
5. **Подключение к tinyLLM** — возможность локальных AI-запросов к метаданным

---

## 2. Принципы

1. **AI-first** — формат оптимизирован для минимизации токенов при работе с LLM
2. **Компактность** — сокращённые имена полей (`desc` вместо `description`)
3. **Инферирование** — автоматический вывод путей и связей где возможно
4. **Локальность** — информация о каталоге находится в самом каталоге (`metamode.json`)
5. **Inline-поддержка** — метаданные можно хранить прямо в Vue-компонентах
6. **Обратная совместимость** — формат конвертируется из/в metanet.json

---

## 3. Сравнение с MetaNet

| Аспект              | MetaNet (старый)                         | MetaMode (новый)               |
| ------------------- | ---------------------------------------- | ------------------------------ |
| Имена полей         | Полные (`description`, `directories`)    | Сокращённые (`desc`, `dirs`)   |
| Статусы             | 4 слова (`experimental`, `deprecated`)   | 4 аббревиатуры (`exp`, `dep`)  |
| Путь к subdirectory | Явный (`"metanet": "path/metanet.json"`) | Авто-инферируется              |
| AI-оптимизация      | Нет                                      | Поле `ai` для краткого summary |
| Inline метаданные   | Нет                                      | Поддерживается в Vue SFC       |
| Средний размер      | 100%                                     | 60-70% (экономия 30-40%)       |

---

## 4. Формат `metamode.json`

### 4.1 Обязательные поля

| Поле   | Тип    | Описание                     |
| ------ | ------ | ---------------------------- |
| `name` | string | Имя каталога или модуля      |
| `desc` | string | Описание назначения каталога |

### 4.2 Необязательные поля

| Поле      | Тип      | Описание                                |
| --------- | -------- | --------------------------------------- |
| `$schema` | string   | Путь к `metamode.schema.json`           |
| `ver`     | string   | Семантическая версия (только для корня) |
| `lang`    | string[] | Языки программирования                  |
| `tags`    | string[] | Теги для категоризации                  |
| `ai`      | string   | AI-summary (макс. 200 символов)         |
| `files`   | object   | Описания файлов                         |
| `dirs`    | object   | Описания подкаталогов                   |

### 4.3 Описание файла (`File`)

| Поле     | Тип      | Обязательное | Описание                        |
| -------- | -------- | :----------: | ------------------------------- |
| `desc`   | string   |      ✓       | Описание файла                  |
| `tags`   | string[] |              | Теги                            |
| `phase`  | integer  |              | Фаза разработки                 |
| `status` | string   |              | `stable`, `beta`, `exp`, `dep`  |
| `deps`   | string[] |              | Зависимости                     |
| `ai`     | string   |              | AI-summary (макс. 100 символов) |

### 4.4 Описание подкаталога (`Dir`)

Два варианта записи:

**Короткий формат** (только описание):

```json
{
  "dirs": {
    "components": "Vue UI components"
  }
}
```

**Полный формат** (с дополнительными полями):

```json
{
  "dirs": {
    "components": {
      "desc": "Vue UI components",
      "tags": ["vue", "ui"],
      "ai": "All Vue SFC components"
    }
  }
}
```

Путь к `metamode.json` подкаталога **автоматически инферируется** как `{dirname}/metamode.json`.

---

## 5. Примеры

### 5.1 Корневой `metamode.json`

```json
{
  "$schema": "./metamode.schema.json",
  "name": "isocubic",
  "ver": "0.1.0",
  "desc": "Редактор параметрических воксельных кубиков",
  "lang": ["typescript", "vue", "glsl"],
  "ai": "3D voxel cube editor with parametric generation",
  "files": {
    "package.json": { "desc": "NPM manifest" },
    "vite.config.ts": { "desc": "Vite build config" }
  },
  "dirs": {
    "src": "Main application source code",
    "docs": "Phase-based documentation",
    "packages": { "desc": "Standalone packages", "tags": ["npm"] }
  }
}
```

### 5.2 `metamode.json` подкаталога

```json
{
  "$schema": "../metamode.schema.json",
  "name": "components",
  "desc": "Vue UI components",
  "tags": ["vue", "ui"],
  "ai": "All Vue SFC for editor, preview, panels",
  "files": {
    "ParamEditor.vue": { "desc": "Parameter editor", "status": "stable" },
    "ParamEditor.vue.test.ts": { "desc": "Tests for ParamEditor" }
  },
  "dirs": {
    "windows": "Window-wrapped components"
  }
}
```

---

## 6. Inline MetaMode атрибуты (TASK 75)

MetaMode поддерживает хранение метаинформации прямо в Vue-компонентах.
Это позволяет держать документацию близко к коду и упрощает синхронизацию.

### 6.1 JSDoc формат (@metamode)

Рекомендуемый формат — JSDoc комментарий с тегом `@metamode`:

```vue
<script setup lang="ts">
/**
 * @metamode
 * desc: Parameter editor for cube properties
 * status: stable
 * phase: 5
 * tags: [editor, params, ui]
 * ai: Edits base color, gradients, noise
 */

import { ref } from 'vue'
// ... component code
</script>
```

### 6.2 Альтернативный формат (объект)

Альтернативный формат — объект `const metamode`:

```vue
<script setup lang="ts">
const metamode = {
  desc: 'Parameter editor for cube properties',
  status: 'stable',
  phase: 5,
  tags: ['editor', 'params', 'ui'],
  ai: 'Edits base color, gradients, noise',
}

import { ref } from 'vue'
// ... component code
</script>
```

### 6.3 Поддерживаемые поля

| Поле           | Алиасы         | Тип      | Описание                                |
| -------------- | -------------- | -------- | --------------------------------------- |
| `desc`         | `description`  | string   | Описание компонента                     |
| `status`       | —              | string   | `stable`, `beta`, `exp`, `dep`          |
| `phase`        | —              | integer  | Фаза разработки (1-12)                  |
| `tags`         | —              | string[] | Теги для категоризации                  |
| `deps`         | `dependencies` | string[] | Зависимости от других компонентов       |
| `ai`           | —              | string   | AI-summary (макс. 100 символов)         |

Алиасы автоматически нормализуются при обработке:
- `description` → `desc`
- `dependencies` → `deps`
- `experimental` → `exp`
- `deprecated` → `dep`

### 6.4 Приоритет

При компиляции inline-метаданные имеют **приоритет** над файловыми `metamode.json`:

1. Inline `@metamode` JSDoc (высший приоритет)
2. Объект `const metamode = {...}` в компоненте
3. Запись в `files` секции `metamode.json` (низший приоритет)

При конфликте полей inline-значения перезаписывают файловые.

### 6.5 Автоматическое извлечение

Inline-метаданные извлекаются автоматически во время:
- Сборки Vite (`vite build`)
- Валидации (`npm run metamode:validate`)
- Компиляции дерева (`npm run metamode:compile`)

Извлечение происходит из `<script setup>` и `<script>` блоков Vue SFC файлов.

---

## 7. Валидация

### 7.1 JSON Schema

Проект содержит две JSON Schema (draft-07):

**Стандартная схема** (`metamode.schema.json`):
- Используется для файлов `metamode.json` в репозитории
- Полные имена полей: `name`, `description`, `directories`, `dependencies`
- Обязательные поля: `name`, `description`

**Компактная схема** (`metamode-compact.schema.json`):
- Используется для AI-оптимизированного вывода
- Сокращённые имена полей: `name`, `desc`, `dirs`, `deps`, `ai`
- Генерируется автоматически при сборке через `virtual:metamode/ai`

Обе схемы включают:
- Проверку типов и enum-значений
- Ограничение допустимых полей (`additionalProperties: false`)
- Валидацию семантической версии

### 7.2 Команды

```bash
# Валидация (для CI/CD)
npm run metamode:validate

# Валидация с предупреждениями
npm run metamode:validate:verbose

# Компиляция в единый файл
npm run metamode:compile
```

---

## 8. Миграция с MetaNet

### 8.1 Автоматическая конвертация

Утилита `scripts/metamode-converter.ts` конвертирует metanet.json → metamode.json:

```bash
npx tsx scripts/metamode-converter.ts --input metanet.json --output metamode.json
```

### 8.2 Маппинг полей

| MetaNet        | MetaMode |
| -------------- | -------- |
| `description`  | `desc`   |
| `version`      | `ver`    |
| `languages`    | `lang`   |
| `directories`  | `dirs`   |
| `dependencies` | `deps`   |
| `experimental` | `exp`    |
| `deprecated`   | `dep`    |

### 8.3 Удаляемые поля

При конвертации автоматически удаляются:

- `directories.*.metanet` — путь инферируется
- Избыточные описания (длиннее 150 символов обрезаются)

---

## 9. Компиляция

### 9.1 Форматы компиляции

MetaMode компилируется в два формата:

**Плоская карта** (`Record<string, MetamodeEntry>`):

```json
{
  "metamode.json": { "name": "isocubic", "desc": "...", "files": {...} },
  "src/metamode.json": { "name": "src", "desc": "..." }
}
```

**Дерево** (`MetamodeTreeNode`):

```json
{
  "name": "isocubic",
  "desc": "...",
  "files": { "package.json": { "desc": "..." } },
  "children": {
    "src": { "name": "src", "desc": "...", "children": {...} }
  }
}
```

### 9.2 Виртуальные модули

При сборке Vite предоставляет доступ к метаданным:

```typescript
// Плоская карта
import metamode from 'virtual:metamode'
console.log(metamode['src/metamode.json'].desc)

// Дерево
import metamodeTree from 'virtual:metamode/tree'
console.log(metamodeTree.children?.src?.desc)
```

---

## 10. TypeScript типы

```typescript
interface MetamodeFile {
  desc: string
  tags?: string[]
  phase?: number
  status?: 'stable' | 'beta' | 'exp' | 'dep'
  deps?: string[]
  ai?: string
}

interface MetamodeDir {
  desc: string
  tags?: string[]
  ai?: string
}

interface MetamodeEntry {
  name: string
  ver?: string
  desc: string
  lang?: string[]
  tags?: string[]
  ai?: string
  files?: Record<string, MetamodeFile>
  dirs?: Record<string, string | MetamodeDir>
}

interface MetamodeTreeNode {
  name: string
  desc: string
  ver?: string
  lang?: string[]
  tags?: string[]
  ai?: string
  files?: Record<string, MetamodeFile>
  children?: Record<string, MetamodeTreeNode>
}
```

---

## 11. Оценка компактности

Пример сравнения размеров:

**MetaNet (исходный):**

```json
{
  "$schema": "../metanet.schema.json",
  "name": "components",
  "description": "Vue UI components for the isocubic application",
  "directories": {
    "windows": {
      "description": "Window-wrapped components",
      "metanet": "windows/metanet.json"
    }
  }
}
```

**Размер: 247 байт**

**MetaMode (новый):**

```json
{
  "$schema": "../metamode.schema.json",
  "name": "components",
  "desc": "Vue UI components",
  "dirs": {
    "windows": "Window-wrapped components"
  }
}
```

**Размер: 141 байт (экономия 43%)**

---

## 12. Встроенная база данных (TASK 80)

MetaMode поддерживает компиляцию всех метаданных в единую встроенную базу данных для использования в runtime.

### 12.1 Виртуальный модуль базы данных

```typescript
import metamodeDB from 'virtual:metamode/db'

// Структура базы данных:
// - root: MetamodeTreeNode - корень дерева метаданных
// - index: Record<string, ...> - плоский индекс для быстрого поиска по пути
// - allTags: string[] - все уникальные теги
// - allLanguages: string[] - все языки программирования
// - stats: MetamodeDatabaseStats - статистика
// - buildTimestamp: string - время сборки (ISO 8601)
// - formatVersion: string - версия формата БД
```

### 12.2 API для запросов

```typescript
import { useMetamodeDatabase } from '@/composables/useMetamodeDatabase'

const {
  client,      // MetamodeDatabaseClient - клиент для запросов
  search,      // (query, options?) => SearchResult[] - поиск
  getByPath,   // (path) => Entry | undefined - получение по пути
  getFile,     // (path) => FileEntry | undefined - получение файла
  getDirectory,// (path) => DirEntry | undefined - получение директории
  stats,       // ComputedRef<Stats> - статистика (реактивная)
  allTags,     // ComputedRef<string[]> - все теги (реактивные)
  allLanguages,// ComputedRef<string[]> - все языки (реактивные)
} = useMetamodeDatabase()

// Поиск с фильтрами
const results = search('component', {
  status: 'stable',       // Фильтр по статусу
  phase: [1, 2],          // Фильтр по фазе
  tags: ['ui', 'vue'],    // Фильтр по тегам (любой из)
  filesOnly: true,        // Только файлы
  limit: 10,              // Ограничение результатов
})

// Получение по пути
const file = getFile('src/components/ParamEditor.vue')
const dir = getDirectory('src/components')

// Получение файлов по критериям
const stableFiles = client.getFilesByStatus('stable')
const phase2Files = client.getFilesByPhase(2)
const uiFiles = client.getFilesByTags(['ui'])
```

### 12.3 Статистика базы данных

```typescript
const { stats } = useMetamodeDatabase()

console.log(stats.value.totalFiles)       // Общее количество файлов
console.log(stats.value.totalDirectories) // Общее количество директорий
console.log(stats.value.filesByStatus)    // Файлы по статусам
console.log(stats.value.filesByPhase)     // Файлы по фазам
console.log(stats.value.sizeBytes)        // Размер БД в байтах
```

### 12.4 Обход дерева

```typescript
const { client } = useMetamodeDatabase()

// Обход всех записей
client.traverse((entry, path, type) => {
  console.log(`${type}: ${path}`)
  // return false для раннего прекращения
})

// Только файлы
client.traverse(
  (entry, path) => { /* ... */ },
  { includeFiles: true, includeDirectories: false }
)
```

---

## 13. Интеграция с локальными LLM (TASK 81)

MetaMode поддерживает интеграцию с локальными LLM для natural language запросов к метаданным проекта.

### 13.1 Поддерживаемые бэкенды

| Бэкенд | URL по умолчанию | Рекомендация |
| ------ | ---------------- | ------------ |
| **Ollama** | `http://localhost:11434` | Рекомендуется для простоты установки |
| **llama.cpp** | `http://localhost:8080` | Для продвинутых пользователей |
| **OpenAI-compatible** | `http://localhost:1234/v1` | Универсальный вариант |

### 13.2 Использование

```typescript
import { createMetaModeLLMIntegration } from '@/lib/metamode-llm-integration'
import metamodeDB from 'virtual:metamode/db'

// Создание интеграции
const llm = createMetaModeLLMIntegration(metamodeDB)

// Проверка доступности LLM
const available = await llm.isLLMAvailable()
console.log('LLM available:', available)

// Запрос на естественном языке
const response = await llm.query({
  query: 'Какие компоненты есть в проекте?',
  language: 'ru',
})

console.log(response.answer)
console.log('Related:', response.relatedPaths)
console.log('Confidence:', response.confidence)
```

### 13.3 Настройка бэкендов

```typescript
import {
  createMetaModeLLMIntegration,
  OllamaBackend,
  LlamaCppBackend,
} from '@/lib/metamode-llm-integration'

// С кастомной конфигурацией
const llm = createMetaModeLLMIntegration(db, {
  ollama: {
    baseUrl: 'http://custom:11434',
    model: 'llama3.2:3b',
    temperature: 0.7,
  },
})

// Или ручная регистрация бэкендов
llm.registerBackends([
  new OllamaBackend({ model: 'mistral' }),
  new LlamaCppBackend({ baseUrl: 'http://gpu-server:8080' }),
])
```

### 13.4 Фильтрация контекста

```typescript
// По статусу
const response = await llm.query({
  query: 'Show stable components',
  language: 'en',
  statusFilter: ['stable'],
})

// По фазе разработки
const response = await llm.query({
  query: 'Что реализовано в фазе 12?',
  language: 'ru',
  phaseFilter: [12],
})

// По тегам
const response = await llm.query({
  query: 'MetaMode files',
  language: 'en',
  tagFilter: ['metamode'],
})

// Конкретные пути
const response = await llm.query({
  query: 'Tell me about these',
  language: 'en',
  contextPaths: ['src/components', 'src/lib'],
})
```

### 13.5 Промпт-шаблоны

Интеграция использует оптимизированные промпт-шаблоны для русского и английского языков:

- **System prompt** — объясняет LLM её роль как помощника по проекту
- **Query template** — структурирует контекст и вопрос пользователя
- **Context builder** — формирует компактное представление метаданных

### 13.6 Fallback режим

При недоступности LLM система автоматически переключается на fallback:

- Поиск релевантных файлов по ключевым словам
- Базовые ответы на основе метаданных
- Информирование о необходимости LLM для детального анализа

### 13.7 Установка Ollama (рекомендуется)

```bash
# macOS
brew install ollama

# Linux
curl -fsSL https://ollama.com/install.sh | sh

# Запуск сервера
ollama serve

# Загрузка модели
ollama pull llama3.2:3b
```

После установки MetaMode автоматически подключится к Ollama.

---

## 14. Дальнейшее развитие

1. **TASK 71**: Рефакторинг именования metanet → metamode ✅
2. **TASK 72**: Унификация DevMode + GodMode → MetaMode ✅
3. **TASK 74**: Оптимизация формата для AI-агентов ✅
4. **TASK 75**: Реализация inline metamode атрибутов ✅
5. **TASK 80**: Компиляция в встроенную БД ✅
6. **TASK 81**: Интеграция с локальными LLM ✅

---

**Назад к [README](README.md)** | **Фаза 12: [phase-12.md](docs/phase-12.md)**
