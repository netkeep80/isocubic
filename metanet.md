# MetaNet: Мета-нервная система проекта

## 1. Назначение

MetaNet — это система структурированных метаданных проекта, одинаково доступная людям, ИИ-агентам и инструментам автоматизации. Она обеспечивает:

- **Описание** каждого файла и каталога проекта в машиночитаемом формате
- **Валидацию** метаданных по JSON Schema в CI/CD
- **Компиляцию** распределённых метаданных в единый артефакт для рантайма
- **Самоидентификацию** объектов, классов и компонентов через доступ к метаинформации в рантайме

MetaNet — не замена существующих инструментов (TypeScript типов, ESLint, CI), а **объединяющий слой**, делающий метаинформацию проекта доступной на всех уровнях: development time, compile time и runtime.

---

## 2. Принципы

1. **Языконезависимость** — формат JSON читаем любым языком программирования и любым инструментом
2. **Локальность** — информация о каталоге находится в самом каталоге (`metanet.json`)
3. **Иерархичность** — файлы `metanet.json` ссылаются на `metanet.json` в подкаталогах, образуя дерево
4. **Инкрементальность** — можно описывать проект постепенно, начиная с корня
5. **Конвенция над конфигурацией** — стандартное имя файла `metanet.json`, предсказуемая структура
6. **Человекочитаемость** — каждый `metanet.json` понятен без специальных инструментов
7. **Git-friendliness** — каждый `metanet.json` имеет собственную историю изменений

---

## 3. Структура проекта

В каждом каталоге проекта находится файл `metanet.json`, описывающий содержимое этого каталога. В корне проекта дополнительно находятся:

| Файл                  | Назначение                                    |
| --------------------- | --------------------------------------------- |
| `metanet.json`        | Корневой дескриптор проекта                   |
| `metanet.schema.json` | JSON Schema для валидации всех `metanet.json` |
| `metanet.md`          | Данный документ — спецификация MetaNet        |

---

## 4. Формат `metanet.json`

### 4.1 Обязательные поля

| Поле          | Тип    | Описание                                      |
| ------------- | ------ | --------------------------------------------- |
| `name`        | string | Имя каталога или модуля                       |
| `description` | string | Человекочитаемое описание назначения каталога |

### 4.2 Необязательные поля

| Поле          | Тип      | Описание                                                   |
| ------------- | -------- | ---------------------------------------------------------- |
| `$schema`     | string   | Относительный путь к `metanet.schema.json`                 |
| `version`     | string   | Семантическая версия (только для корневого `metanet.json`) |
| `languages`   | string[] | Языки программирования, используемые в каталоге            |
| `tags`        | string[] | Теги для категоризации и поиска                            |
| `files`       | object   | Описания файлов каталога (ключ — имя файла)                |
| `directories` | object   | Описания подкаталогов (ключ — имя подкаталога)             |

### 4.3 Описание файла (`FileDescriptor`)

| Поле           | Тип      | Обязательное | Описание                                               |
| -------------- | -------- | :----------: | ------------------------------------------------------ |
| `description`  | string   |      ✓       | Описание назначения файла                              |
| `tags`         | string[] |              | Теги для категоризации                                 |
| `phase`        | integer  |              | Фаза разработки                                        |
| `status`       | string   |              | Статус: `stable`, `beta`, `experimental`, `deprecated` |
| `dependencies` | string[] |              | Относительные пути к файлам-зависимостям               |

### 4.4 Описание подкаталога (`DirectoryDescriptor`)

| Поле          | Тип    | Обязательное | Описание                                        |
| ------------- | ------ | :----------: | ----------------------------------------------- |
| `description` | string |      ✓       | Описание назначения подкаталога                 |
| `metanet`     | string |      ✓       | Относительный путь к `metanet.json` подкаталога |

### 4.5 Пример корневого `metanet.json`

```json
{
  "$schema": "./metanet.schema.json",
  "name": "my-project",
  "version": "1.0.0",
  "description": "Описание проекта",
  "languages": ["typescript"],
  "files": {
    "package.json": {
      "description": "NPM package manifest"
    },
    "README.md": {
      "description": "Project documentation"
    }
  },
  "directories": {
    "src": {
      "description": "Source code",
      "metanet": "src/metanet.json"
    }
  }
}
```

### 4.6 Пример `metanet.json` подкаталога

```json
{
  "$schema": "../metanet.schema.json",
  "name": "src",
  "description": "Исходный код приложения",
  "languages": ["typescript"],
  "files": {
    "main.ts": {
      "description": "Entry point of the application",
      "status": "stable"
    }
  },
  "directories": {
    "components": {
      "description": "UI components",
      "metanet": "components/metanet.json"
    }
  }
}
```

---

## 5. Валидация

### 5.1 JSON Schema

Файл `metanet.schema.json` в корне проекта содержит JSON Schema (draft-07) для валидации всех `metanet.json`. Schema обеспечивает:

- Проверку обязательных полей (`name`, `description`)
- Проверку типов всех полей
- Ограничение допустимых значений (`status` — enum из 4 значений)
- Запрет дополнительных полей (`additionalProperties: false`)
- Валидацию формата версии (semver)

### 5.2 Препроцессор

Скрипт `scripts/metanet-preprocessor.ts` выполняет расширенную валидацию:

1. **Валидация по JSON Schema** — проверяет каждый `metanet.json` по схеме
2. **Проверка ссылок на файлы** — убеждается, что файлы из секции `files` существуют на диске
3. **Проверка ссылок на каталоги** — убеждается, что `metanet.json` подкаталогов из секции `directories` существуют
4. **Проверка полноты** — предупреждает о файлах и каталогах, не описанных в `metanet.json`
5. **Рекурсивный обход** — начинает с корневого `metanet.json` и обходит всё дерево по ссылкам

```bash
# Валидация (для CI/CD, только ошибки)
npm run metanet:validate

# Валидация с предупреждениями о неописанных файлах
npm run metanet:validate:verbose
```

### 5.3 CI/CD интеграция

В `.github/workflows/ci.yml` шаг валидации MetaNet запускается в составе lint-задачи:

```yaml
- name: Validate MetaNet
  run: npm run metanet:validate
```

При обнаружении ошибок (невалидный JSON, несуществующие ссылки) сборка завершается с ошибкой.

---

## 6. Хранение и потоки метаинформации

Структура метаинформации первична, а её раскладка по файлам `metanet.json` вторична. При компиляции описания файлов, каталогов, компонентов и объектов объединяются в единое дерево, в котором ссылки на файлы — дополнительная информация.

### 6.1 Места хранения метаинформации

| Фаза          | Хранилище                              | Формат                      | Назначение                                         |
| ------------- | -------------------------------------- | --------------------------- | -------------------------------------------------- |
| Development   | `metanet.json` в каждом каталоге       | JSON (по `metanet.schema.json`) | Локальные описания файлов и подкаталогов       |
| Development   | `metanet.schema.json` в корне          | JSON Schema (draft-07)      | Валидация структуры всех `metanet.json`            |
| Development   | `metanet.md` в корне                   | Markdown                    | Спецификация MetaNet (данный документ)             |
| Compilation   | `metanet.compiled.json`                | JSON (дерево)               | Скомпилированное дерево метаданных                 |
| Compilation   | Виртуальные модули Vite                | JS (в бандле)               | Метаданные, встроенные в production-сборку         |
| Runtime       | `virtual:metanet`                      | JS-объект (плоская карта)   | Доступ по пути файла: `metanet['src/metanet.json']` |
| Runtime       | `virtual:metanet/tree`                 | JS-объект (дерево)          | Иерархический обход: `tree.children.src`           |

### 6.2 Потоки данных

```
Development                    Compilation                   Runtime
───────────                    ───────────                   ───────

metanet.json (в каждом    ──┬── metanet-preprocessor.ts ──── metanet.compiled.json
каталоге)                   │   (--compile)                  (дерево, JSON-файл)
                            │
metanet.schema.json ────────┤── metanet-preprocessor.ts ──── CI/CD валидация
                            │   (--check)                    (ошибки → сборка не проходит)
                            │
                            └── vite-plugin-metanet.ts ──┬── virtual:metanet
                                (при сборке Vite)        │   (плоская карта в бандле)
                                                         │
                                                         └── virtual:metanet/tree
                                                             (дерево в бандле)
```

**Направления потоков:**

1. **Development → Compilation**: `metanet.json` файлы читаются препроцессором и Vite-плагином
2. **Development → CI/CD**: препроцессор валидирует `metanet.json` при каждом push/PR
3. **Compilation → Runtime**: скомпилированные данные доступны в приложении через виртуальные модули
4. **Compilation → Файловая система**: `metanet:compile` записывает дерево в `metanet.compiled.json`

---

## 7. Компиляция в артефакты

### 7.1 Два формата компиляции

MetaNet компилируется в два формата: **плоскую карту** и **дерево**.

**Плоская карта** (`Record<string, MetanetEntry>`) — обратно-совместимый формат, где ключи — относительные пути к `metanet.json` файлам:

```json
{
  "metanet.json": { "name": "isocubic", "description": "...", "files": {...}, "directories": {...} },
  "src/metanet.json": { "name": "src", "description": "...", "files": {...} }
}
```

**Дерево** (`MetanetTreeNode`) — иерархический формат, где структура метаданных первична, а ссылки на файлы — дополнительная информация:

```json
{
  "name": "isocubic",
  "description": "...",
  "files": { "package.json": { "description": "..." } },
  "children": {
    "src": {
      "name": "src",
      "description": "...",
      "files": { "main.ts": { "description": "..." } },
      "children": {
        "components": { "name": "components", "description": "..." }
      }
    }
  }
}
```

В дереве `directories` заменяется на `children`, а поле `metanet` (путь к файлу) убирается — структура дерева сама определяет иерархию.

### 7.2 Vite-плагин

Плагин `scripts/vite-plugin-metanet.ts` при сборке проекта:

1. Рекурсивно обходит все `metanet.json` файлы, начиная с корня
2. Удаляет поля `$schema` для экономии размера бандла
3. Предоставляет данные через два виртуальных модуля:
   - `virtual:metanet` — плоская карта `Record<string, MetanetEntry>`
   - `virtual:metanet/tree` — иерархическое дерево `MetanetTreeNode`

### 7.3 Компиляция в JSON-файл

Скрипт `metanet-preprocessor.ts --compile` записывает дерево в файл:

```bash
# Компиляция в metanet.compiled.json (по умолчанию)
npm run metanet:compile

# Компиляция в произвольный файл
npx tsx scripts/metanet-preprocessor.ts --compile dist/metanet.json
```

Этот файл может использоваться:
- Для поставки с проектом (npm-пакет, Docker-образ)
- Для загрузки метаданных в рантайме через HTTP
- Для анализа проекта внешними инструментами и ИИ-агентами

### 7.4 Использование в рантайме

**Плоская карта** (доступ по пути):

```typescript
import metanet from 'virtual:metanet'

// Получить описание проекта
console.log(metanet['metanet.json'].name) // "isocubic"
console.log(metanet['metanet.json'].description)

// Получить описание модуля
console.log(metanet['src/metanet.json'].description)

// Обход файлов каталога
const srcMeta = metanet['src/metanet.json']
for (const [filename, fileMeta] of Object.entries(srcMeta.files ?? {})) {
  console.log(`${filename}: ${fileMeta.description}`)
}
```

**Дерево** (иерархический обход):

```typescript
import metanetTree from 'virtual:metanet/tree'

// Обход дерева — структура метаданных первична
console.log(metanetTree.name) // "isocubic"
console.log(metanetTree.children?.src?.description)
console.log(metanetTree.children?.src?.children?.components?.description)

// Рекурсивный обход всех узлов
function walk(node: MetanetTreeNode, depth = 0) {
  console.log('  '.repeat(depth) + `${node.name}: ${node.description}`)
  for (const [name, child] of Object.entries(node.children ?? {})) {
    walk(child, depth + 1)
  }
}
walk(metanetTree)
```

TypeScript типы для виртуальных модулей объявлены в `env.d.ts`.

### 7.5 Самоидентификация компонентов

Объекты, классы и компоненты проекта могут в рантайме ссылаться на свою метаинформацию из MetaNet и идентифицировать себя:

```typescript
import metanet from 'virtual:metanet'

export default defineComponent({
  setup() {
    // Компонент знает свои метаданные
    const myMeta = metanet['src/components/metanet.json']?.files?.['MyComponent.vue']

    console.log(`Я: ${myMeta?.description}`)
    console.log(`Статус: ${myMeta?.status}`)
  },
})
```

---

## 8. Рабочий процесс

### 8.1 Генерация `metanet.json`

Генерацией и заполнением `metanet.json` занимается ИИ-агент по специальному заданию. Агент:

1. Анализирует содержимое каждого каталога
2. Создаёт `metanet.json` с описаниями файлов и подкаталогов
3. Устанавливает ссылки на `metanet.json` подкаталогов
4. Проставляет теги, статусы и зависимости

### 8.2 Проверка `metanet.json`

Проверкой занимается CI/CD:

1. При каждом push/PR запускается `npm run metanet:validate`
2. Препроцессор проверяет все `metanet.json` по схеме
3. Проверяет существование описанных файлов и каталогов
4. При ошибках сборка не проходит

### 8.3 Исправление `metanet.json`

По результатам CI/CD ИИ-агент исправляет ошибки в `metanet.json`:

1. Анализирует вывод препроцессора
2. Добавляет описания для новых файлов и каталогов
3. Удаляет ссылки на удалённые файлы
4. Фиксирует изменения в pull request

---

## 9. Утилиты

### 9.1 Утилита валидации (`metanet-preprocessor.ts --check`)

Проверяет, что `metanet.json` присутствует во всех каталогах и описывает все файлы и каталоги:

```bash
npm run metanet:validate          # Ошибки
npm run metanet:validate:verbose  # Ошибки + предупреждения
```

**Что проверяет:**

- `metanet.json` существует в каждом описанном каталоге
- Все описанные файлы существуют на диске
- Все описанные подкаталоги имеют свой `metanet.json`
- Структура соответствует `metanet.schema.json`

### 9.2 Утилита компиляции (`metanet-preprocessor.ts --compile`)

Собирает все распределённые `metanet.json` в единое дерево:

```bash
npm run metanet:compile                                      # → metanet.compiled.json
npx tsx scripts/metanet-preprocessor.ts --compile output.json # → output.json
```

### 9.3 Vite-плагин (`vite-plugin-metanet.ts`)

Собирает все распределённые `metanet.json` в виртуальные модули:

- `virtual:metanet` — плоская карта (`Record<string, MetanetEntry>`)
- `virtual:metanet/tree` — иерархическое дерево (`MetanetTreeNode`)
- Данные доступны в рантайме без дополнительных HTTP-запросов

---

## 10. Типы TypeScript

Типы для работы с MetaNet в рантайме объявлены в `env.d.ts`:

```typescript
// Общие типы (глобальные)
interface MetanetFileDescriptor {
  description: string
  tags?: string[]
  phase?: number
  status?: string
  dependencies?: string[]
}

interface MetanetDirectoryDescriptor {
  description: string
  metanet: string
}

// Тип для плоской карты (virtual:metanet)
interface MetanetEntry {
  name: string
  version?: string
  description: string
  languages?: string[]
  tags?: string[]
  files?: Record<string, MetanetFileDescriptor>
  directories?: Record<string, MetanetDirectoryDescriptor>
}

// Тип для дерева (virtual:metanet/tree)
interface MetanetTreeNode {
  name: string
  description: string
  version?: string
  languages?: string[]
  tags?: string[]
  files?: Record<string, MetanetFileDescriptor>
  children?: Record<string, MetanetTreeNode>
}
```

---

## 11. Дальнейшее развитие

1. **Расширение описаний** — добавить детальные описания всех файлов проекта (теги, фазы, зависимости)
2. **Обратная синхронизация** — генерация `metanet.json` из аннотаций `@metanet` в коде
3. **CLI-инструмент** — отдельный npm-пакет `metanet` для инициализации, валидации и компиляции в произвольных проектах
4. **IDE-плагины** — визуализация MetaNet в VS Code, JetBrains (навигация по дереву метаданных)
5. **Runtime-мониторинг** — API для health checks и AI-запросов к метаданным работающего приложения
