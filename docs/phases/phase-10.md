# Фаза 10: Переход на Vue.js 3.0 + TypeScript

Данный документ содержит планирование задач для полного перехода проекта isocubic с React на Vue.js 3.0 с TypeScript.

**Статус**: ✅ Завершена

---

## Обзор

**Цель**: Перевести весь фронтенд проекта isocubic с React на Vue.js 3.0 + TypeScript, сохраняя всю существующую функциональность.

**Мотивация**: Автор проекта лучше понимает Vue.js 3.0 + TypeScript, чем React, что позволит более эффективно развивать проект в будущем.

**Ключевые решения**:
- **3D-рендеринг**: Переход с @react-three/fiber + @react-three/drei на [TresJS](https://tresjs.org/) (Vue-обёртка для Three.js) + [@tresjs/cientos](https://cientos.tresjs.org/) (аналог drei)
- **Управление состоянием**: Переход с React Context на [Pinia](https://pinia.vuejs.org/) (рекомендованный store для Vue.js 3)
- **Тестирование**: Переход с @testing-library/react на @vue/test-utils + @testing-library/vue
- **God Mode**: Использовать локальный код из `packages/god-mode/`, а не внешний npm-пакет; портировать GodModeProvider с React Context на Vue provide/inject
- **Стилизация**: Tailwind CSS остаётся без изменений (фреймворко-независим)
- **Сборка**: Vite остаётся, заменяется только плагин: `@vitejs/plugin-react` → `@vitejs/plugin-vue`
- **Тесты**: Vitest остаётся, меняется только setup и утилиты тестирования

**Принципы миграции**:
1. Типы и утилиты (src/types/, src/lib/) остаются практически без изменений — они framework-agnostic
2. Компоненты переписываются с JSX/TSX на Vue SFC (Single File Components) с `<script setup lang="ts">`
3. React hooks → Vue Composition API (ref, reactive, computed, watch, onMounted)
4. React Context → Vue provide/inject или Pinia stores
5. GLSL-шейдеры остаются без изменений
6. Rust WASM модуль (wasm-fft) остаётся без изменений
7. Серверная часть (server/) остаётся без изменений

---

## Маппинг React → Vue.js 3.0

| React | Vue.js 3.0 | Примечание |
|-------|------------|------------|
| `useState` | `ref()` / `reactive()` | Composition API |
| `useEffect` | `watch()` / `onMounted()` / `watchEffect()` | Lifecycle hooks |
| `useCallback` | Не требуется | Vue автоматически отслеживает зависимости |
| `useMemo` | `computed()` | Вычисляемые свойства |
| `useRef` | `ref()` / `useTemplateRef()` | Шаблонные ссылки |
| `React.createContext` + `useContext` | `provide()` / `inject()` | Dependency injection |
| `React.memo` | Не требуется | Vue автоматически оптимизирует рендеринг |
| JSX/TSX | SFC `<template>` + `<script setup>` | Single File Components |
| `@react-three/fiber` | `@tresjs/core` | Vue Three.js integration |
| `@react-three/drei` | `@tresjs/cientos` | Utility components |
| `@testing-library/react` | `@vue/test-utils` + `@testing-library/vue` | Testing |
| React Portal | `<Teleport>` | Встроено в Vue |
| React StrictMode | Нет аналога | Vue не требует |

---

## Планируемые TASK

### TASK 60: Настройка проекта Vue.js 3.0

**Заголовок**: `Инициализация Vue.js 3.0 и обновление конфигурации сборки`

**Описание**:
Обновить конфигурацию проекта для поддержки Vue.js 3.0 вместо React.

**Задачи**:
- [x] Обновить `package.json`: заменить React-зависимости на Vue.js 3.0
  - Удалить: `react`, `react-dom`, `@react-three/fiber`, `@react-three/drei`
  - Удалить dev: `@types/react`, `@types/react-dom`, `@vitejs/plugin-react`, `@testing-library/react`, `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh`
  - Добавить: `vue` (^3.5), `@tresjs/core` (^5), `@tresjs/cientos` (^5), `pinia` (^3), `three` (оставить)
  - Добавить dev: `@vitejs/plugin-vue` (^6), `@vue/test-utils`, `@testing-library/vue`, `vue-tsc`, `eslint-plugin-vue`
- [x] Обновить `vite.config.ts`: заменить `@vitejs/plugin-react` на `@vitejs/plugin-vue`
- [x] Обновить `tsconfig.app.json`: добавить поддержку Vue SFC (`"types": ["vite/client"]`, пути для .vue файлов)
- [x] Создать `env.d.ts` с декларацией типов для `.vue` файлов
- [x] Обновить `eslint.config.js`: заменить React-плагины на `eslint-plugin-vue`
- [x] Обновить `index.html`: обновить точку входа на `src/main.ts`
- [x] Создать `src/main.ts`: точка входа Vue приложения (`createApp` + Pinia)
- [x] Создать `src/App.vue`: корневой компонент Vue
- [x] Удалить `src/main.tsx` и `src/App.tsx`
- [x] Проверить что `npm run dev` запускает Vue.js приложение

**Критерии приёмки**:
- [x] Проект запускается с Vue.js 3.0
- [x] TypeScript компилируется без ошибок
- [x] Vite dev-сервер работает корректно
- [x] ESLint настроен для Vue.js

**Метки**: `migration`, `vue`, `setup`

---

### TASK 61: Миграция системы типов и утилит

**Заголовок**: `Адаптация типов и библиотек для Vue.js 3.0`

**Описание**:
Проверить и адаптировать все типы и утилиты в `src/types/` и `src/lib/` для работы с Vue.js 3.0. Большинство файлов framework-agnostic и не потребуют изменений.

**Задачи**:
- [x] Проверить все файлы в `src/types/` — убедиться в отсутствии React-специфичного кода
- [x] Проверить все файлы в `src/lib/` — убедиться в отсутствии React-импортов
- [x] Адаптировать `src/lib/devmode.tsx` → `src/lib/devmode.ts` (заменить React Context на Pinia store)
- [x] Адаптировать `src/lib/auth.tsx` → `src/lib/auth.ts` (заменить React Context на Pinia store)
- [x] Адаптировать `packages/god-mode/src/components/GodModeProvider.tsx` → `.ts` (заменить React Context на Vue provide/inject)
- [x] Обновить `src/test/setup.ts` для Vue.js (заменить `@testing-library/react` setup на `@vue/test-utils`)
- [x] Запустить все тесты для типов и утилит — убедиться что они проходят
- [x] Адаптировать `src/lib/god-mode-library.ts` — React-зависимостей нет, тесты проходят

**Критерии приёмки**:
- [x] Все файлы в `src/types/` компилируются без ошибок
- [x] Все файлы в `src/lib/` компилируются без ошибок
- [x] Тесты типов и утилит проходят

**Метки**: `migration`, `types`, `lib`

---

### TASK 62: Миграция 3D-компонентов (Three.js)

**Заголовок**: `Переход 3D-компонентов на TresJS`

**Описание**:
Перевести все 3D-компоненты с @react-three/fiber + @react-three/drei на TresJS (@tresjs/core + @tresjs/cientos).

**Компоненты для миграции**:
- [x] `ParametricCube.tsx` → `ParametricCube.vue` — параметрический куб с шейдером
- [x] `EnergyCube.tsx` → `EnergyCube.vue` — энергетический куб с FFT визуализацией
- [x] `CubePreview.tsx` → `CubePreview.vue` — 3D-превью с интерактивным управлением
- [x] `CubeGrid.tsx` → `CubeGrid.vue` — сетка кубов с бесшовной сшивкой
- [x] `CubeStack.tsx` → `CubeStack.vue` + `CubeStackGrid.vue` — вертикальные стопки кубов
- [x] `LODCubeGrid.tsx` → `LODCubeGrid.vue` — сетка с автоматическим LOD
- [x] `MagicCubeDemo.tsx` → `MagicCubeDemo.vue` — демо магического куба
- [x] `LODStatistics.tsx` → `LODStatisticsDisplay.vue` — статистика LOD-системы

**Ключевые изменения**:
- `<Canvas>` (react-three-fiber) → `<TresCanvas>` (tresjs)
- `useFrame()` → `useRenderLoop()` (tresjs composable)
- `useThree()` → `useTresContext()` (tresjs composable)
- `<OrbitControls>` (drei) → `<OrbitControls>` (cientos)
- `<mesh>`, `<boxGeometry>` и т.д. — синтаксис аналогичен в TresJS
- `ref={meshRef}` → `ref="meshRef"` (Vue template refs)
- ShaderMaterial с custom uniforms — использовать `shallowRef()` для Three.js объектов

**Критерии приёмки**:
- Все 3D-компоненты рендерятся корректно
- Интерактивное управление камерой работает
- Шейдеры (GLSL) работают без изменений
- LOD-система функционирует
- Тесты 3D-компонентов проходят

**Метки**: `migration`, `vue`, `threejs`, `tresjs`

---

### TASK 63: Миграция UI-компонентов редактора

**Заголовок**: `Перевод компонентов редактора на Vue.js SFC`

**Описание**:
Перевести все компоненты редактирования параметров на Vue.js Single File Components.

**Компоненты для миграции**:
- [x] `UnifiedEditor.tsx` → `UnifiedEditor.vue` — основной редактор
- [x] `ParamEditor.tsx` → `ParamEditor.vue` — редактор параметров куба
- [x] `FFTParamEditor.tsx` → `FFTParamEditor.vue` — редактор FFT параметров
- [x] `FFTChannelEditor.tsx` → `FFTChannelEditor.vue` — редактор FFT каналов
- [x] `EnergyVisualizationEditor.tsx` → `EnergyVisualizationEditor.vue` — редактор энергетической визуализации
- [x] `LODConfigEditor.tsx` → `LODConfigEditor.vue` — редактор LOD конфигурации
- [x] `StackEditor.tsx` → `StackEditor.vue` — редактор стопок
- [x] `StackPresetPicker.tsx` → `StackPresetPicker.vue` — выбор шаблонов стопок
- [x] `PromptGenerator.tsx` → `PromptGenerator.vue` — генератор по промпту

**Ключевые изменения**:
- `onChange` callbacks → `v-model` (двустороннее связывание) или `emit('update:...')`
- `className` → `class`
- `htmlFor` → `for`
- Conditional rendering: `{condition && ...}` → `v-if`
- List rendering: `.map()` → `v-for`
- Event handling: `onClick` → `@click`
- Input binding: `value={...} onChange={...}` → `v-model`
- `useCallback` → обычные функции (Vue оптимизирует автоматически)

**Критерии приёмки**:
- Все редакторы параметров работают
- Двустороннее связывание данных функционирует
- Тесты UI-компонентов проходят

**Метки**: `migration`, `vue`, `editor`, `ui`

---

### TASK 64: Миграция галереи, экспорта и шаринга

**Заголовок**: `Перевод компонентов галереи, экспорта и шаринга на Vue.js`

**Описание**:
Перевести компоненты галереи, экспорта и социальных функций на Vue.js SFC.

**Компоненты для миграции**:
- [x] `Gallery.tsx` → `Gallery.vue` — галерея примеров
- [x] `CommunityGallery.tsx` → `CommunityGallery.vue` — галерея сообщества
- [x] `ExportPanel.tsx` → `ExportPanel.vue` — экспорт/импорт
- [x] `SharePanel.tsx` → `SharePanel.vue` — шаринг с QR-кодами
- [x] `CommentsSection.tsx` → `CommentsSection.vue` — секция комментариев
- [x] `SubscriptionButton.tsx` → `SubscriptionButton.vue` — кнопка подписки
- [x] `NotificationPanel.tsx` → `NotificationPanel.vue` — панель уведомлений
- [x] `ActionHistory.tsx` → `ActionHistory.vue` — история действий (undo/redo)

**Критерии приёмки**:
- Галерея отображается и кубики можно выбирать
- Экспорт/импорт JSON работает
- Шаринг и QR-коды функционируют
- Тесты компонентов проходят

**Метки**: `migration`, `vue`, `gallery`, `export`

---

### TASK 65: Миграция системы аутентификации и коллаборации

**Заголовок**: `Перевод аутентификации и мультиплеера на Vue.js`

**Описание**:
Перевести компоненты аутентификации и коллаборативного редактирования на Vue.js.

**Компоненты для миграции**:
- [x] `AuthForms.tsx` → `AuthForms.vue` — формы авторизации
- [x] `UserProfile.tsx` → `UserProfile.vue` — профиль пользователя (включая UserAvatar)
- [x] `SessionPanel.tsx` → `SessionPanel.vue` — панель сессий
- [x] `CollaborativeParamEditor.tsx` → `CollaborativeParamEditor.vue` — совместное редактирование (включая EditingIndicator, ConflictIndicator)
- [x] `ParticipantCursor.tsx` → `ParticipantCursor.vue` — курсоры участников (включая CursorDisplay, CursorList)
- [x] Создать Pinia store для состояния аутентификации — уже существует в `src/lib/auth.ts` (useAuthStore, TASK 61)
- [x] Создать Pinia store для состояния коллаборации — используется `CollaborationManager` из `src/lib/collaboration.ts` (framework-agnostic)

**Ключевые изменения**:
- AuthProvider (React Context) → `useAuthStore()` (Pinia store)
- WebSocket hooks → Vue composables
- Session management → Pinia actions

**Критерии приёмки**:
- Авторизация работает (PAT, OAuth)
- Мультиплеер функционирует
- Курсоры других участников видны
- Тесты проходят

**Метки**: `migration`, `vue`, `auth`, `collaboration`

---

### TASK 66: Миграция GOD MODE (локальная версия)

**Заголовок**: `Перевод GOD MODE на Vue.js 3.0 (локальная версия)`

**Описание**:
Перевести компоненты GOD MODE на Vue.js 3.0, используя локальный код из `packages/god-mode/`. Не использовать внешний npm-пакет `@isocubic/god-mode`.

**Компоненты для миграции**:
- [x] `GodModeWindow.tsx` → `GodModeWindow.vue` — основное плавающее окно с вкладками
- [x] `ConversationPanel.tsx` → `ConversationPanel.vue` — AI-диалог
- [x] `IssueDraftPanel.tsx` → `IssueDraftPanel.vue` — генератор черновиков issues
- [x] `GitHubAuthButton.tsx` → `GitHubAuthButton.vue` — авторизация GitHub
- [x] `AnnotationCanvas.tsx` → `AnnotationCanvas.vue` — аннотирование скриншотов
- [x] `DevModeQueryPanel.tsx` → `DevModeQueryPanel.vue` — AI-запросы
- [x] `ComponentContextPanel.tsx` → `ComponentContextPanel.vue` — контекст компонентов
- [x] `ExtendedSearchPanel.tsx` → `ExtendedSearchPanel.vue` — расширенный поиск
- [x] `ComponentInfo.tsx` → `ComponentInfo.vue` — DevMode индикатор

**Изменения в god-mode пакете**:
- [x] `packages/god-mode/src/components/GodModeProvider.tsx` → переписать на Vue provide/inject
- [x] `useGodMode()` React hook → `useGodMode()` Vue composable
- [x] Убрать peer dependency на React, добавить Vue
- [x] Обновить `packages/god-mode/examples/basic-usage.tsx` → `basic-usage.vue`

**Ключевые изменения**:
- GodModeProvider (React Context) → Vue `provide()` / `inject()` или Pinia store
- Drag-and-drop → Vue директива `v-draggable` или composable `useDraggable`
- React Portal → `<Teleport to="body">`
- `useGodMode()` hook → composable function

**Критерии приёмки**:
- GOD MODE окно открывается по Ctrl+Shift+G
- Все 5 вкладок работают (Query, Context, Search, Conversation, Issues)
- Drag-and-drop и resize работают
- AI-диалог функционирует
- Создание issues через GitHub API работает
- Захват скриншотов и аннотации работают
- Тесты GOD MODE проходят

**Метки**: `migration`, `vue`, `god-mode`

---

### TASK 67: Миграция App.vue и маршрутизация

**Заголовок**: `Сборка приложения: App.vue, layout и адаптивный дизайн`

**Описание**:
Создать корневой компонент приложения с адаптивным layout (desktop/tablet/mobile) и интеграцией всех подсистем.

**Задачи**:
- [x] Создать `App.vue` с адаптивным layout (desktop, tablet, mobile)
- [x] Реализовать `useDeviceType()` как Vue composable
- [x] Реализовать touch swipe навигацию для мобильных как composable
- [x] Создать `src/composables/useDeviceType.ts`
- [x] Создать `src/composables/useCubeEditor.ts` (централизованное управление состоянием куба)
- [x] Интегрировать Pinia stores (auth, collaboration, god-mode)
- [x] Подключить все компоненты в App.vue
- [x] Обновить `src/main.ts` с инициализацией Pinia и router (если потребуется)
- [x] Обновить `src/App.css` если требуется (CSS framework-agnostic)

**Критерии приёмки**:
- [x] Приложение загружается и работает на desktop, tablet и mobile
- [x] Навигация между вкладками на мобильных работает
- [x] Все подсистемы интегрированы и функционируют
- [x] DevMode / GOD MODE доступны

**Метки**: `migration`, `vue`, `app`, `layout`

---

### TASK 68: Миграция тестов

**Заголовок**: `Перевод всех тестов на @vue/test-utils`

**Описание**:
Перевести все существующие тесты (2880+) с @testing-library/react на @vue/test-utils и @testing-library/vue.

**Задачи**:
- [x] Обновить `src/test/setup.ts` для Vue.js
- [x] Перевести тесты компонентов:
  - `render(<Component />)` → `mount(Component)` или `shallowMount(Component)`
  - `screen.getByText()` → `wrapper.find()` или `wrapper.findByText()`
  - `fireEvent` → `wrapper.trigger()`
  - `userEvent.click()` → `wrapper.trigger('click')`
  - `waitFor()` → `await nextTick()` или `flushPromises()`
- [x] Перевести тесты с моками:
  - `jest.mock()` / `vi.mock()` — остаются (Vitest)
  - Provider wrapper → `global.plugins` / `global.provide`
- [x] Обновить E2E тесты в `src/e2e/`
- [x] Убедиться что все 3000+ тестов проходят (82 Vue test files, 3044 tests)
- [x] Обновить конфигурацию coverage

**Примечания к миграции**:
- 32 файла тестов компонентов мигрированы с React (.test.tsx) на Vue (.vue.test.ts)
- Использован `@vue/test-utils` с `mount()`, `shallowMount()`, `flushPromises()`
- Для компонентов с `:value` + `@input` (не `v-model`) используется native `dispatchEvent` вместо VTU `trigger()`
- Для форм с `type="submit"` кнопками используется `wrapper.find('form').trigger('submit')` вместо `button.trigger('click')`
- Pinia stores инициализируются с `setActivePinia(createPinia())` в `beforeEach`
- Auth store требует вызова `initialize()` для перехода из состояния 'loading'
- Все старые React .test.tsx файлы удалены (34 файла)

**Критерии приёмки**:
- [x] Все существующие тесты переведены и проходят
- [x] Покрытие кода не уменьшилось
- [x] CI/CD pipeline работает

**Метки**: `migration`, `vue`, `testing`

---

### TASK 69: Финализация и очистка

**Заголовок**: `Финализация миграции, очистка и обновление документации`

**Описание**:
Финальная проверка, очистка устаревшего кода и обновление всей документации.

**Задачи**:
- [x] Удалить все оставшиеся `.tsx` файлы (заменённые на `.vue`) — удалены 41 файл (39 в src/components/, 2 в packages/god-mode/) + 1 React hook (src/hooks/useLODStatistics.ts)
- [x] Обновить `README.md`:
  - Технологический стек: убраны ссылки на миграцию (Фаза 10 завершена)
  - Структура проекта: `.tsx` → `.vue` (обновлено в предыдущих TASK)
  - Фаза 10 отмечена как ✅ Завершена
  - Тестовое покрытие обновлено: 3014+ тестов, 81 файл
- [x] Обновить `docs/API.md` с новым API компонентов Vue — все примеры переведены с React JSX на Vue SFC, добавлена документация composables
- [x] `ANALYSIS.md` не требует обновления (framework-agnostic анализ алгоритмов)
- [x] CI/CD workflows (`.github/workflows/`) не требуют обновления — уже настроены для Vue.js (vue-tsc, eslint-plugin-vue)
- [x] Деплой на GitHub Pages — workflow корректен, будет работать при мерже в main
- [x] Выполнен полный `npm run check:all` — 3014 тестов проходят, 81 тестовый файл
- [x] Обновить `packages/god-mode/README.md` — документация переведена с React на Vue.js 3.0 (provide/inject, composables, Vue SFC примеры)
- [x] Финальное ревью всех изменений — нет React-зависимостей, нет .tsx файлов, все тесты проходят

**Критерии приёмки**:
- Нет React-зависимостей в проекте
- Все тесты проходят
- Деплой на GitHub Pages работает
- Документация актуальна
- `npm run check:all` проходит без ошибок

**Метки**: `migration`, `vue`, `cleanup`, `docs`

---

## Архитектура после миграции

### Технологический стек Vue.js 3.0

| Было (React) | Стало (Vue.js 3.0) |
|---------------|---------------------|
| React ^19.2 | Vue ^3.5 |
| ReactDOM ^19.2 | (встроено в Vue) |
| @react-three/fiber ^9.5 | @tresjs/core ^5.3 |
| @react-three/drei ^10.7 | @tresjs/cientos ^5.2 |
| React Context | Pinia ^3 / provide-inject |
| @vitejs/plugin-react | @vitejs/plugin-vue ^6 |
| @testing-library/react | @vue/test-utils + @testing-library/vue |
| eslint-plugin-react-hooks | eslint-plugin-vue ^10 |
| .tsx компоненты | .vue SFC компоненты |

### Структура проекта после миграции

```
isocubic/
├── src/
│   ├── components/        # Vue SFC-компоненты (.vue)
│   ├── composables/       # Vue composables (аналог React hooks)
│   │   ├── useDeviceType.ts
│   │   ├── useCubeEditor.ts
│   │   ├── useDraggable.ts
│   │   └── useLODStatistics.ts
│   ├── stores/            # Pinia stores
│   │   ├── auth.ts
│   │   ├── collaboration.ts
│   │   └── godMode.ts
│   ├── shaders/           # GLSL-шейдеры (без изменений)
│   ├── lib/               # Утилиты (без изменений, framework-agnostic)
│   ├── types/             # TypeScript-типы (без изменений)
│   ├── test/              # Тест-утилиты
│   ├── e2e/               # E2E тесты
│   ├── App.vue            # Корневой компонент
│   ├── main.ts            # Точка входа
│   └── index.css          # Глобальные стили
├── packages/
│   └── god-mode/          # Локальный пакет GOD MODE (Vue.js 3.0)
├── server/                # WebSocket сервер (без изменений)
├── wasm-fft/              # Rust WASM модуль (без изменений)
├── examples/              # JSON-конфиги (без изменений)
└── ...
```

### Пример компонента до и после миграции

**React (до)**:
```tsx
// ParametricCube.tsx
import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

interface ParametricCubeProps {
  config: SpectralCube
  animate?: boolean
}

export function ParametricCube({ config, animate = false }: ParametricCubeProps) {
  const meshRef = useRef<THREE.Mesh>(null)

  const material = useMemo(() => {
    return new THREE.ShaderMaterial({ /* ... */ })
  }, [config])

  useFrame((_, delta) => {
    if (animate && meshRef.current) {
      meshRef.current.rotation.y += delta * 0.5
    }
  })

  return (
    <mesh ref={meshRef} material={material}>
      <boxGeometry args={[1, 1, 1]} />
    </mesh>
  )
}
```

**Vue.js 3.0 (после)**:
```vue
<!-- ParametricCube.vue -->
<script setup lang="ts">
import { shallowRef, computed } from 'vue'
import { useRenderLoop } from '@tresjs/core'
import * as THREE from 'three'

interface Props {
  config: SpectralCube
  animate?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  animate: false
})

const meshRef = shallowRef<THREE.Mesh | null>(null)

const material = computed(() => {
  return new THREE.ShaderMaterial({ /* ... */ })
})

const { onLoop } = useRenderLoop()

onLoop(({ delta }) => {
  if (props.animate && meshRef.value) {
    meshRef.value.rotation.y += delta * 0.5
  }
})
</script>

<template>
  <TresMesh ref="meshRef" :material="material">
    <TresBoxGeometry :args="[1, 1, 1]" />
  </TresMesh>
</template>
```

---

## Оценка объёма работ

| TASK | Название | Сложность | Приоритет | Зависимости |
|------|----------|-----------|-----------|-------------|
| 60 | Настройка проекта Vue.js 3.0 | Низкая | Критический | — |
| 61 | Миграция типов и утилит | Низкая | Критический | TASK 60 |
| 62 | Миграция 3D-компонентов | Высокая | Критический | TASK 61 |
| 63 | Миграция UI-компонентов редактора | Средняя | Критический | TASK 61 |
| 64 | Миграция галереи и экспорта | Средняя | Высокий | TASK 61 |
| 65 | Миграция аутентификации и коллаборации | Средняя | Высокий | TASK 61 |
| 66 | Миграция GOD MODE | Высокая | Высокий | TASK 61 |
| 67 | Сборка App.vue | Средняя | Критический | TASK 62-66 |
| 68 | Миграция тестов | Высокая | Критический | TASK 62-67 |
| 69 | Финализация и очистка | Средняя | Критический | TASK 60-68 |

**Порядок выполнения**:
1. TASK 60 (настройка) — фундамент
2. TASK 61 (типы и утилиты) — адаптация базы
3. TASK 62 + TASK 63 + TASK 64 + TASK 65 + TASK 66 (параллельно) — миграция компонентов
4. TASK 67 (App.vue) — сборка приложения
5. TASK 68 (тесты) — верификация
6. TASK 69 (финализация) — очистка и документация

---

## Что НЕ меняется

- **GLSL-шейдеры** (`src/shaders/`) — файлы .glsl остаются без изменений
- **TypeScript типы** (`src/types/`) — все типы framework-agnostic
- **Утилиты** (`src/lib/`) — большинство framework-agnostic (кроме devmode.tsx)
- **Rust WASM** (`wasm-fft/`) — модуль полностью framework-agnostic
- **Сервер** (`server/`) — Node.js сервер не зависит от фронтенда
- **JSON примеры** (`examples/`) — конфиги кубиков
- **Tailwind CSS** — работает одинаково с React и Vue
- **Vitest** — остаётся как test runner, меняются только утилиты тестирования
- **Vite** — остаётся как build tool, меняется только плагин

---

## Риски и митигации

| Риск | Вероятность | Влияние | Митигация |
|------|-------------|---------|-----------|
| TresJS API отличается от react-three-fiber | Высокая | Высокое | Изучить документацию TresJS, создать примеры-прототипы перед полной миграцией |
| Большое количество компонентов (36+) | Высокая | Среднее | Параллельная миграция по модулям, инкрементальный подход |
| Потеря тестового покрытия | Средняя | Высокое | Мигрировать тесты параллельно с компонентами, отслеживать coverage |
| Различия в reactivity (React vs Vue) | Средняя | Среднее | Vue reactivity system проще React, но нужно следить за shallowRef для Three.js объектов |
| God-mode пакет имеет React peer dependency | Низкая | Низкое | Перевести на Vue provide/inject, убрать React peer dependency |
| Производительность 3D-рендеринга с TresJS | Средняя | Высокое | Профилирование на ранних этапах (TASK 62), использование shallowRef для Three.js объектов |

---

## Зависимости

- **Фаза 9** (GOD MODE) — все задачи завершены, можно приступать
- **TresJS** — основная зависимость для 3D в Vue.js, активно развивается (v4+)
- **Pinia** — рекомендованный state manager для Vue.js 3
- **Vue.js 3.5+** — стабильная версия с Composition API и `<script setup>`

---

## Следующие шаги

После завершения Фазы 10:
- Все будущие фичи разрабатываются на Vue.js 3.0 + TypeScript
- Рассмотреть SSR с Nuxt.js если потребуется
- Рассмотреть Vue DevTools для отладки

---

**Назад к [README](../../README.md)**
