# Фаза 11: Новый пользовательский интерфейс isocubic

Данный документ содержит планирование задач для создания нового настраиваемого пользовательского интерфейса с оконным менеджером.

**Статус**: ✅ Завершена (TASK 70-78 завершены)

---

## Валидация реализации (1 февраля 2026)

### Результат валидации

Проведена сверка плана с фактически созданными файлами и функциональностью.
Все 3383 теста проходят (109 тестовых файлов). Основная функциональность реализована,
но ряд запланированных файлов и компонентов были реализованы иначе, чем предполагалось в плане.

### Отклонения от плана

**1. Типы определены inline, а не в отдельных файлах:**
- `WindowState`, `WindowDefinition` — определены в `src/composables/useWindowManager.ts` (вместо планировавшегося `src/types/window-manager.ts`)
- `CommandItem` — определён в `src/components/CommandBar.vue` (вместо планировавшегося `src/types/command.ts`)

**2. Drag/Resize логика встроена в компонент:**
- Логика drag-and-drop и resize реализована непосредственно в `DraggableWindow.vue` (вместо планировавшихся отдельных `src/composables/useDraggable.ts` и `src/composables/useResizable.ts`)

**3. TaskbarItem встроен в WindowTaskbar:**
- Компонент `TaskbarItem.vue` не был создан как отдельный файл; функциональность реализована внутри `WindowTaskbar.vue`

**4. Парсер команд не вынесен в отдельный модуль:**
- Файл `src/lib/command-parser.ts` не создан; логика парсинга команд реализована в `CommandBar.vue`

**5. Не реализованные компоненты TASK 76:**
- `AppLauncher.vue` — панель запуска приложений не создана (функциональность покрыта CommandBar)
- `WindowSettings.vue` — настройки оконной системы не созданы как отдельный компонент
- `WelcomeScreen.vue` — экран приветствия не создан

**6. Критерии приёмки TASK 76:**
- Критерии приёмки были не отмечены как выполненные, хотя в прогрессе задача помечена завершённой
- Фактически реализовано: App.vue обновлён с оконной системой, CommandBar и WindowTaskbar интегрированы
- Не реализовано: AppLauncher, WindowSettings, WelcomeScreen, туториал

### Рекомендации на будущее

Нереализованные компоненты (AppLauncher, WindowSettings, WelcomeScreen) можно добавить в следующих фазах:
- AppLauncher — функционально дублируется CommandBar (Ctrl+K), приоритет низкий
- WindowSettings — настройки можно добавить как команды в CommandBar
- WelcomeScreen — можно реализовать при необходимости onboarding новых пользователей

---

## Прогресс реализации (на 1 февраля 2026)

### ✅ Завершенные TASK

**TASK 70: Базовая система управления окнами** - ✅ ЗАВЕРШЕНА
- Создан `useWindowManager` composable с полной функциональностью
- Типы `WindowState` и `WindowDefinition` определены inline в composable
- Реализована регистрация/управление окнами
- Добавлено сохранение/загрузка состояния в localStorage
- Поддержка z-order, minimize/maximize, close
- Написаны 29 тестов

**TASK 71: Компонент перетаскиваемого окна** - ✅ ЗАВЕРШЕНА
- Создан `DraggableWindow.vue` компонент
- Реализован drag-and-drop по заголовку (логика встроена в компонент)
- Реализовано изменение размера (по углу, логика встроена в компонент)
- Добавлены кнопки управления (minimize, collapse, close)
- Написаны 14 тестов

**TASK 72: Панель задач для свёрнутых окон** - ✅ ЗАВЕРШЕНА
- Создан `WindowTaskbar.vue` компонент (TaskbarItem встроен в компонент)
- Отображение свёрнутых и закрытых окон
- Кнопка сброса layout
- Написаны 12 тестов

**TASK 73: Командная строка TinyLLM** - ✅ ЗАВЕРШЕНА
- Создан `CommandBar.vue` компонент
- Тип `CommandItem` определён inline в компоненте
- Поиск и фильтрация команд
- Навигация с клавиатуры (стрелки, Enter, Escape)
- Горячая клавиша Ctrl+K
- Написаны 16 тестов

**TASK 74: Интеграция компонентов** - ✅ ЗАВЕРШЕНА
- Созданы window wrapper компоненты для всех основных компонентов
- Созданы window wrapper для социальных компонентов
- Созданы window wrapper для GOD MODE компонентов
- Написаны тесты для всех window wrapper компонентов
- Все компоненты доступны как отдельные окна в оконной системе

**TASK 75: Адаптивность для устройств** - ✅ ЗАВЕРШЕНА
- Создан `useTouchGestures` composable для распознавания жестов (swipe, pinch, long-press)
- Создан `useResponsiveLayout` composable для адаптивных ограничений по типу устройства
- Добавлена поддержка touch-событий в DraggableWindow (drag и resize через touch)
- Адаптирован WindowTaskbar для touch-устройств (увеличены размеры элементов)
- Адаптирован CommandBar для мобильных устройств (полноэкранный overlay, увеличены элементы)
- Добавлены CSS media queries для `pointer: coarse` и `max-width: 768px`
- Написаны 44 теста (17 для useTouchGestures, 27 для useResponsiveLayout)

**TASK 76: Обновление App.vue** - ✅ ЗАВЕРШЕНА (частично)
- Полностью обновлен корневой компонент
- Интеграция оконной системы для desktop/tablet
- Адаптивный mobile layout с tabs
- Поддержка touch swipe для мобильных устройств
- ⚠️ Не реализованы: AppLauncher, WindowSettings, WelcomeScreen (см. раздел «Валидация»)

**TASK 77: Расширенные функции командной строки** - ✅ ЗАВЕРШЕНА
- Создан `window-layout-manager.ts` — менеджер раскладки окон (tile, cascade, horizontal, vertical)
- Создан `command-registry.ts` — реестр расширенных команд (layout, cube, export, settings)
- Создан `command-macros.ts` — система записи и воспроизведения макросов команд
- Создан `command-plugins.ts` — система плагинов для динамической регистрации команд
- Обновлён `CommandBar.vue` — расширены категории команд (layout, cube, export, settings, macro)
- Обновлён `App.vue` — интеграция расширенных команд и раскладки окон
- Написаны 76 тестов (22 для window-layout-manager, 19 для command-macros, 17 для command-plugins, 18 для command-registry)

**TASK 78: Тестирование и оптимизация** - ✅ ЗАВЕРШЕНА
- Созданы E2E тесты для оконной системы (window-manager.e2e.test.ts — 16 тестов)
- Созданы E2E тесты для командной строки (command-bar.e2e.test.ts — 20 тестов)
- Созданы E2E тесты для адаптивных переходов (responsive.e2e.test.ts — 22 теста)
- Создан модуль утилит для производительности (window-performance.ts):
  - Debounce с cancel/flush для оптимизации localStorage
  - Safe storage wrapper с обработкой ошибок и JSON fallback
  - WindowPerformanceMonitor для мониторинга метрик (active windows, save count, performance mode)
  - Валидация и восстановление повреждённых данных из localStorage
  - requestAnimationFrame обёртка с fallback
- Тесты производительности под нагрузкой (10+ окон, rapid minimize/restore, rapid move, z-index cycles)
- Тесты доступности (keyboard navigation, ARIA attributes, focus management в CommandBar)
- Написаны 91 тест (16 + 20 + 22 + 33 для window-performance)

---

## Обзор

**Цель**: Разработать новый настраиваемый пользовательский интерфейс с оконным менеджером, обеспечивающий удобный доступ ко всему функционалу приложения на всех устройствах.

**Проблема**: Текущий интерфейс приложения:
- Имеет фиксированный layout, который не позволяет пользователям настраивать рабочее пространство
- Не обеспечивает гибкого управления расположением компонентов на экране
- Не предоставляет единого способа доступа ко всем функциям через командную строку
- Требует навигации через меню для доступа к различным функциям

**Решение**: Оконный интерфейс с командной строкой:
- **Оконный менеджер** — каждый компонент в отдельном настраиваемом окне
- **Командная строка TinyLLM** — быстрый доступ к функциям через естественный язык
- **Адаптивность** — автоматическая адаптация под разные размеры экранов
- **Сохранение состояния** — запоминание позиций и размеров окон между сессиями

**Концепция**: Пользователь может организовать свое рабочее пространство как в оконной операционной системе — перетаскивать окна, изменять их размер, сворачивать ненужные компоненты, а также быстро открывать нужные функции через командную строку.

---

## Планируемые TASK

### TASK 70: Базовая система управления окнами

**Заголовок**: `Создание composable для управления состоянием окон`

**Описание**:
Создать основу для системы управления окнами — composable `useWindowManager`, который будет управлять состоянием всех окон в приложении.

**Задачи**:
- [x] Создать типы для WindowState, WindowPosition, WindowSize
- [x] Реализовать `useWindowManager` composable со следующими функциями:
  - Регистрация/дерегистрация окон
  - Управление позициями окон (moveWindow, centerWindow)
  - Управление размерами окон (resizeWindow, setDefaultSize)
  - Управление z-order (bringToFront, sendToBack)
  - Управление состоянием окон (minimize, maximize, restore, close, open)
- [x] Реализовать сохранение состояния в localStorage
- [x] Реализовать загрузку состояния из localStorage при инициализации
- [ ] Добавить поддержку разных профилей для разных размеров экрана (desktop/tablet/mobile)
- [ ] Реализовать автоматическую коррекцию позиций при изменении размера экрана
- [ ] Создать систему событий для отслеживания изменений окон
- [x] Написать тесты для всех функций

**Критерии приёмки**:
- [x] Composable позволяет регистрировать окна с уникальными ID
- [x] Состояние окон корректно сохраняется и загружается из localStorage
- [x] Z-order управляется корректно при клике на окна
- [ ] Позиции окон корректируются при изменении размера экрана
- [x] Все тесты проходят (29 тестов)

**Фактически созданные файлы**:
- `src/composables/useWindowManager.ts` — основной composable (типы `WindowState`, `WindowDefinition` определены здесь же)
- `src/composables/useWindowManager.test.ts` — тесты composable

> **Отклонение от плана**: Типы `WindowState` и `WindowDefinition` определены inline в `useWindowManager.ts`, а не в отдельном файле `src/types/window-manager.ts`. Отдельные файлы `src/types/window-manager.ts` и `src/types/window-manager.test.ts` не были созданы.

**Метки**: `ui`, `window-manager`, `composable`

---

### TASK 71: Компонент перетаскиваемого окна

**Заголовок**: `Создание компонента DraggableWindow`

**Описание**:
Создать универсальный компонент окна с поддержкой перетаскивания, изменения размера, сворачивания и других оконных операций.

**Задачи**:
- [x] Создать компонент `DraggableWindow.vue` с основной структурой (header, content, footer)
- [x] Реализовать drag-and-drop для перемещения окна за заголовок
- [x] Реализовать resize для изменения размера окна (по углу)
- [x] Добавить кнопки управления окном (minimize, collapse, close)
- [ ] Реализовать двойной клик на заголовке для maximize/restore
- [x] Добавить ограничения для минимального/максимального размера окна
- [x] Реализовать автоматическое выведение окна на передний план при клике
- [ ] Добавить анимации для minimize/maximize/restore
- [ ] Реализовать snap-to-edge при перетаскивании к краям экрана (опционально)
- [x] Адаптировать управление для touch-устройств (планшеты/телефоны)
- [ ] Добавить индикатор изменения размера (курсоры)
- [x] Создать тесты для всех интерактивных действий
- [ ] Добавить тесты для touch-событий
- [ ] Добавить keyboard shortcuts (Alt+F4 для закрытия, Win+Arrow для snap и т.д.)

**Критерии приёмки**:
- [x] Окно можно перетаскивать мышью
- [x] Размер окна изменяется (в текущей реализации - по углу)
- [x] Кнопки управления работают корректно
- [x] Окно автоматически выводится на передний план при клике
- [x] Работает на desktop, tablet и mobile устройствах (адаптивный layout)
- [x] Все тесты проходят (14 тестов)

**Фактически созданные файлы**:
- `src/components/DraggableWindow.vue` — компонент окна (drag/resize логика встроена)
- `src/components/DraggableWindow.test.ts` — тесты компонента
- `src/components/DraggableWindow.vue.test.ts` — дополнительные тесты

> **Отклонение от плана**: Отдельные composables `useDraggable.ts` и `useResizable.ts` не были созданы. Логика drag-and-drop и resize реализована непосредственно внутри компонента `DraggableWindow.vue`. Resize реализован только по углу (а не по 8 направлениям как планировалось).

**Метки**: `ui`, `window-manager`, `draggable`, `component`

---

### TASK 72: Панель задач для свёрнутых окон

**Заголовок**: `Создание компонента WindowTaskbar`

**Описание**:
Создать панель задач (taskbar) внизу экрана, отображающую свёрнутые окна и позволяющую быстро переключаться между ними.

**Задачи**:
- [x] Создать компонент `WindowTaskbar.vue`
- [x] Реализовать отображение иконок свёрнутых окон
- [ ] Добавить индикатор активного окна
- [x] Реализовать клик для восстановления свёрнутого окна
- [ ] Добавить tooltip с названием окна при наведении
- [ ] Реализовать контекстное меню для окон в taskbar (restore, close)
- [ ] Добавить группировку окон по типу (опционально)
- [ ] Реализовать перетаскивание для изменения порядка окон в taskbar
- [ ] Адаптировать для мобильных устройств (нижняя панель с иконками)
- [ ] Добавить анимации появления/исчезновения иконок
- [x] Создать тесты для всех функций taskbar

**Критерии приёмки**:
- [x] Панель задач отображается внизу экрана
- [x] Свёрнутые окна представлены иконками в taskbar
- [x] Клик по иконке восстанавливает окно
- [x] Закрытые окна доступны для повторного открытия
- [x] Все тесты проходят (12 тестов)

**Фактически созданные файлы**:
- `src/components/WindowTaskbar.vue` — панель задач (элемент taskbar встроен)
- `src/components/WindowTaskbar.test.ts` — тесты панели задач
- `src/components/WindowTaskbar.vue.test.ts` — дополнительные тесты

> **Отклонение от плана**: Компонент `TaskbarItem.vue` не был создан отдельно; функциональность элемента taskbar реализована внутри `WindowTaskbar.vue`.

**Метки**: `ui`, `window-manager`, `taskbar`, `component`

---

### TASK 73: Командная строка TinyLLM

**Заголовок**: `Создание компонента CommandBar с интеграцией TinyLLM`

**Описание**:
Создать командную строку для быстрого доступа к функциям приложения через естественный язык с помощью TinyLLM.

**Задачи**:
- [x] Создать компонент `CommandBar.vue` с input полем и dropdown результатов
- [x] Реализовать фильтрацию команд по label, description и id
- [x] Добавить встроенные команды для открытия окон компонентов
- [ ] Интегрировать TinyLLM для понимания естественного языка
- [x] Реализовать поиск команд с нечётким соответствием (string includes)
- [ ] Добавить историю команд (с сохранением в localStorage)
- [x] Реализовать автодополнение команд
- [x] Добавить keyboard shortcuts (Ctrl+K для открытия, Escape для закрытия)
- [x] Реализовать навигацию по результатам с клавиатуры (стрелки, Enter)
- [x] Добавить иконки для различных типов команд
- [ ] Реализовать подсказки (hints) для популярных команд
- [ ] Добавить поддержку параметров команд (например, "open gallery theme:dark")
- [x] Создать тесты для командной строки
- [ ] Добавить поддержку русского и английского языков

**Критерии приёмки**:
- [x] Командная строка открывается по Ctrl+K и по клику
- [x] Команды фильтруются по label, description и id
- [x] Поиск работает с нечётким соответствием (string includes)
- [x] Навигация с клавиатуры работает плавно (стрелки, Enter, Escape)
- [x] Все тесты проходят (16 тестов)

**Фактически созданные файлы**:
- `src/components/CommandBar.vue` — командная строка (тип `CommandItem` определён здесь же)
- `src/components/CommandBar.test.ts` — тесты командной строки
- `src/components/CommandBar.vue.test.ts` — дополнительные тесты
- `src/lib/command-registry.ts` — реестр команд (создан позже в TASK 77)

> **Отклонение от плана**: Файлы `src/types/command.ts`, `src/lib/command-parser.ts` и их тесты не были созданы. Тип `CommandItem` определён inline в `CommandBar.vue`. Парсинг команд реализован внутри компонента.

**Метки**: `ui`, `command-bar`, `tinyllm`, `component`

---

### TASK 74: Интеграция компонентов в оконную систему

**Заголовок**: `Обёртывание существующих компонентов в DraggableWindow`

**Описание**:
Интегрировать все существующие компоненты приложения в оконную систему, обернув их в `DraggableWindow`.

**Задачи**:
- [x] Создать window wrapper компоненты для основных компонентов:
  - `GalleryWindow.vue` — обёртка для Gallery
  - `CubePreviewWindow.vue` — обёртка для CubePreview
  - `UnifiedEditorWindow.vue` — обёртка для UnifiedEditor
  - `PromptGeneratorWindow.vue` — обёртка для PromptGenerator
  - `ExportPanelWindow.vue` — обёртка для ExportPanel
  - `ActionHistoryWindow.vue` — обёртка для ActionHistory
- [x] Создать window wrapper для социальных компонентов:
  - `CommunityGalleryWindow.vue` — обёртка для CommunityGallery
  - `SharePanelWindow.vue` — обёртка для SharePanel
  - `NotificationPanelWindow.vue` — обёртка для NotificationPanel
- [x] Создать window wrapper для GOD MODE компонентов:
  - `GodModeWindow.vue` уже существует, адаптирован под новую систему
  - `ConversationPanelWindow.vue` — обёртка для ConversationPanel
  - `ExtendedSearchPanelWindow.vue` — обёртка для ExtendedSearchPanel
- [x] Определить размеры по умолчанию для каждого типа окна
- [x] Определить позиции по умолчанию для каждого типа окна
- [x] Добавить иконки для каждого типа окна (для taskbar)
- [x] Создать тесты для window wrappers

**Критерии приёмки**:
- [x] Все основные компоненты доступны как окна
- [x] Размеры и позиции по умолчанию разумны и не перекрываются
- [x] Иконки отображаются корректно в taskbar
- [x] Все тесты проходят (11 тестовых файлов)

**Фактически созданные файлы**:
- `src/components/windows/GalleryWindow.vue` и `GalleryWindow.test.ts`
- `src/components/windows/CubePreviewWindow.vue` и `CubePreviewWindow.test.ts`
- `src/components/windows/UnifiedEditorWindow.vue` и `UnifiedEditorWindow.test.ts`
- `src/components/windows/PromptGeneratorWindow.vue` и `PromptGeneratorWindow.test.ts`
- `src/components/windows/ExportPanelWindow.vue` и `ExportPanelWindow.test.ts`
- `src/components/windows/ActionHistoryWindow.vue` и `ActionHistoryWindow.test.ts`
- `src/components/windows/CommunityGalleryWindow.vue` и `CommunityGalleryWindow.test.ts`
- `src/components/windows/SharePanelWindow.vue` и `SharePanelWindow.test.ts`
- `src/components/windows/NotificationPanelWindow.vue` и `NotificationPanelWindow.test.ts`
- `src/components/windows/ConversationPanelWindow.vue` и `ConversationPanelWindow.test.ts`
- `src/components/windows/ExtendedSearchPanelWindow.vue` и `ExtendedSearchPanelWindow.test.ts`
- `src/components/windows/test-utils.ts` — утилиты для тестирования window wrappers

> **Примечание**: Интеграция окон в App.vue выполнена напрямую через `DraggableWindow` с `v-for` по `windowManager.visibleWindows`, без использования отдельных window wrapper компонентов из каталога `windows/`. Window wrappers существуют как самостоятельные модули, но в App.vue используется единый шаблон с условными блоками `v-if/v-else-if`.

**Метки**: `ui`, `window-manager`, `integration`, `component`

---

### TASK 75: Адаптивность для разных устройств

**Заголовок**: `Адаптация оконного интерфейса для tablet и mobile`

**Описание**:
Адаптировать оконную систему для планшетов и мобильных телефонов, обеспечив удобное использование на устройствах с разными размерами экрана.

**Задачи**:
- [x] Определить breakpoints для desktop/tablet/mobile (>1024px / 768-1024px / <768px)
- [x] Реализовать адаптивную логику:
  - Desktop: полноценные окна с drag/resize
  - Tablet: окна с touch-оптимизацией
  - Mobile: tabbed interface с swipe-навигацией
- [x] Создать `useTouchGestures` composable для touch-взаимодействий:
  - Swipe для навигации между окнами на mobile
  - Pinch для изменения размера на tablet
  - Long press для контекстного меню
- [x] Адаптировать `DraggableWindow` для touch-устройств
- [x] Адаптировать `CommandBar` для mobile (полноэкранный overlay)
- [ ] Реализовать сохранение отдельных профилей layout для каждого размера экрана
- [ ] Добавить автоматическое переключение режима при изменении размера окна
- [x] Создать тесты для всех адаптивных сценариев

**Критерии приёмки**:
- [x] Интерфейс корректно адаптируется для разных устройств
- [x] Touch-жесты распознаются (swipe, pinch, long-press)
- [x] Окна не выходят за границы экрана на малых устройствах (clampPosition)
- [x] Профили layout идентифицируются по типу устройства (profileKey)
- [x] Все тесты проходят на разных размерах экрана (44 теста)

**Фактически созданные файлы**:
- `src/composables/useTouchGestures.ts` — composable для touch-жестов
- `src/composables/useResponsiveLayout.ts` — composable для адаптивного layout
- `src/composables/useTouchGestures.test.ts` — тесты touch-жестов (17 тестов)
- `src/composables/useResponsiveLayout.test.ts` — тесты адаптивного layout (27 тестов)

**Обновлённые файлы**:
- `src/components/DraggableWindow.vue` — добавлена поддержка touch-событий
- `src/components/WindowTaskbar.vue` — адаптация для touch-устройств
- `src/components/CommandBar.vue` — адаптация для mobile

**Метки**: `ui`, `responsive`, `mobile`, `tablet`, `touch`

---

### TASK 76: Обновление App.vue с оконным интерфейсом

**Заголовок**: `Интеграция оконной системы в главный компонент приложения`

**Описание**:
Обновить корневой компонент `App.vue` для использования новой оконной системы вместо фиксированного layout.

**Задачи**:
- [x] Обновить `App.vue` с новой структурой:
  - Область рабочего стола для окон
  - CommandBar в верхней части
  - WindowTaskbar в нижней части
- [x] Инициализировать `useWindowManager` в App.vue
- [ ] Создать меню/панель запуска приложений (App Launcher) для открытия окон
- [ ] Реализовать систему уведомлений в правом нижнем углу
- [ ] Добавить настройки оконной системы (snap-to-edge, темы, анимации)
- [x] Обновить `src/App.css` с новыми стилями для оконного интерфейса
- [x] Добавить загрузку дефолтных позиций окон при первом запуске
- [ ] Реализовать экран приветствия (welcome screen) для новых пользователей
- [ ] Создать туториал по использованию оконного интерфейса
- [x] Добавить тесты для App.vue с оконной системой

**Критерии приёмки**:
- [x] App.vue корректно инициализирует оконную систему
- [x] CommandBar и WindowTaskbar отображаются на своих местах
- [ ] App Launcher позволяет открывать окна (не реализован — функционал покрывается CommandBar)
- [ ] Настройки оконной системы работают (не реализован отдельный компонент)
- [ ] Welcome screen показывается новым пользователям (не реализован)
- [x] Все тесты проходят

**Обновлённые файлы**:
- `src/App.vue` — новая структура с оконным интерфейсом (desktop/tablet/mobile layouts)
- `src/App.css` — стили для оконной системы

> **Отклонение от плана**: Компоненты `AppLauncher.vue`, `WindowSettings.vue`, `WelcomeScreen.vue` не были созданы. Функциональность панели запуска приложений покрыта командной строкой CommandBar (Ctrl+K). Сброс layout доступен через WindowTaskbar и команды в CommandBar.

**Метки**: `ui`, `app`, `integration`, `layout`

---

### TASK 77: Расширенные функции командной строки

**Заголовок**: `Добавление расширенных команд и AI-ассистента`

**Описание**:
Расширить функционал командной строки дополнительными командами и улучшить интеграцию с TinyLLM для более умного понимания запросов пользователя.

**Задачи**:
- [x] Реализовать команды для управления окнами:
  - "tile windows" — мозаичная раскладка
  - "cascade windows" — каскадная раскладка
  - "minimize all" / "restore all"
- [x] Добавить команды для работы с кубами:
  - "randomize cube" — случайная генерация параметров
  - "reset cube" — сброс куба
  - "duplicate cube" — дублирование куба
- [x] Реализовать команды для экспорта/импорта:
  - "export json/glb/png" — экспорт в различных форматах
  - "share cube" — публикация куба в сообщество
- [x] Добавить команды для настроек:
  - "reset layout" — сброс layout
  - "clear storage" — очистка localStorage
- [ ] Улучшить TinyLLM интеграцию (контекстное понимание, предложения на основе истории)
- [x] Добавить макросы (последовательности команд)
- [ ] Реализовать калькулятор/конвертер в командной строке
- [ ] Добавить команды для работы с коллаборацией
- [x] Создать систему плагинов для командной строки
- [x] Добавить тесты для всех новых команд

**Критерии приёмки**:
- [x] Все новые команды работают корректно
- [x] Расширены категории команд (layout, cube, export, settings, macro)
- [x] Макросы можно записывать и воспроизводить
- [x] Система плагинов позволяет расширять команды
- [x] Все тесты проходят (76 новых тестов)

**Фактически созданные файлы**:
- `src/lib/window-layout-manager.ts` — менеджер раскладки окон (tile, cascade, horizontal, vertical)
- `src/lib/command-registry.ts` — реестр расширенных команд
- `src/lib/command-macros.ts` — система записи и воспроизведения макросов
- `src/lib/command-plugins.ts` — система плагинов для динамической регистрации команд
- `src/lib/window-layout-manager.test.ts` — тесты менеджера раскладки (22 теста)
- `src/lib/command-registry.test.ts` — тесты реестра команд (18 тестов)
- `src/lib/command-macros.test.ts` — тесты макросов (19 тестов)
- `src/lib/command-plugins.test.ts` — тесты плагинов (17 тестов)

**Обновлённые файлы**:
- `src/components/CommandBar.vue` — расширены категории команд
- `src/App.vue` — интеграция расширенных команд и раскладки окон

**Метки**: `ui`, `command-bar`, `tinyllm`, `commands`, `macros`

---

### TASK 78: Тестирование и оптимизация

**Заголовок**: `Комплексное тестирование оконной системы и оптимизация производительности`

**Описание**:
Провести тщательное тестирование всей оконной системы, написать E2E тесты и оптимизировать производительность.

**Задачи**:
- [x] Написать E2E тесты для основных сценариев:
  - Открытие/закрытие окон
  - Перетаскивание и изменение размера
  - Работа с командной строкой
  - Сворачивание и восстановление через taskbar
  - Адаптивные переходы между размерами экрана
- [x] Написать тесты производительности:
  - Тестирование с большим количеством окон (10+)
  - Rapid minimize/restore, rapid move, z-index cycles
- [x] Оптимизировать производительность:
  - Debounce для обновлений localStorage
  - requestAnimationFrame обёртка с fallback
  - Safe storage wrapper с обработкой ошибок
- [x] Добавить обработку ошибок:
  - Восстановление состояния при ошибках localStorage
  - JSON fallback при повреждённых данных
- [x] Тестирование доступности (a11y):
  - Keyboard navigation
  - ARIA атрибуты в CommandBar
  - Focus management
- [ ] Провести кросс-браузерное тестирование
- [ ] Создать документацию по производительности и best practices
- [x] Добавить метрики и мониторинг производительности

**Критерии приёмки**:
- [x] Все E2E тесты проходят (58 тестов в 3 файлах)
- [x] Производительность удовлетворительна даже с 10+ окнами (тесты под нагрузкой)
- [x] Доступность: keyboard navigation, ARIA attributes в CommandBar
- [x] Утилиты для мониторинга производительности созданы
- [x] Все 3383 теста проходят (109 тестовых файлов)

**Фактически созданные файлы**:
- `src/e2e/window-manager.e2e.test.ts` — E2E тесты оконной системы (16 тестов)
- `src/e2e/command-bar.e2e.test.ts` — E2E тесты командной строки (20 тестов)
- `src/e2e/responsive.e2e.test.ts` — E2E тесты адаптивности (22 теста)
- `src/lib/window-performance.ts` — утилиты для мониторинга производительности
- `src/lib/window-performance.test.ts` — тесты утилит производительности (33 теста)

**Метки**: `testing`, `e2e`, `performance`, `a11y`, `optimization`

---

## Архитектура после реализации

### Фактически созданные компоненты и модули

**Composables**:
```
src/composables/
├── useWindowManager.ts        # Управление состоянием окон (+ типы WindowState, WindowDefinition)
├── useTouchGestures.ts        # Touch-жесты для mobile/tablet
└── useResponsiveLayout.ts     # Адаптивный layout
```

> **Примечание**: Планировавшиеся `useDraggable.ts` и `useResizable.ts` не были созданы; логика drag/resize встроена в `DraggableWindow.vue`.

**Компоненты**:
```
src/components/
├── DraggableWindow.vue        # Универсальное окно (drag/resize логика встроена)
├── WindowTaskbar.vue          # Панель задач (элемент taskbar встроен)
├── CommandBar.vue             # Командная строка (+ тип CommandItem)
└── windows/                   # Window wrappers для компонентов
    ├── GalleryWindow.vue
    ├── CubePreviewWindow.vue
    ├── UnifiedEditorWindow.vue
    ├── PromptGeneratorWindow.vue
    ├── ExportPanelWindow.vue
    ├── ActionHistoryWindow.vue
    ├── CommunityGalleryWindow.vue
    ├── SharePanelWindow.vue
    ├── NotificationPanelWindow.vue
    ├── ConversationPanelWindow.vue
    ├── ExtendedSearchPanelWindow.vue
    └── test-utils.ts
```

> **Примечание**: Планировавшиеся `TaskbarItem.vue`, `AppLauncher.vue`, `WindowSettings.vue`, `WelcomeScreen.vue` не были созданы.

**Библиотеки и утилиты**:
```
src/lib/
├── command-registry.ts        # Реестр команд
├── command-macros.ts          # Система макросов
├── command-plugins.ts         # Система плагинов
├── window-layout-manager.ts   # Менеджер раскладки окон
└── window-performance.ts      # Мониторинг производительности
```

> **Примечание**: Планировавшийся `command-parser.ts` не был создан; парсинг команд реализован в `CommandBar.vue`.

### Структура App.vue (фактическая)

```vue
<template>
  <!-- Desktop Layout (Windowed) -->
  <div v-if="isDesktop" class="app app--desktop app--windowed">
    <header>
      <CommandBar :commands="commandItems" @execute="onCommandExecute" />
    </header>
    <main class="app__workspace">
      <DraggableWindow
        v-for="win in windowManager.visibleWindows.value"
        :key="win.id"
        ...window-props
      >
        <!-- Условное содержимое по win.id -->
      </DraggableWindow>
    </main>
    <WindowTaskbar ... />
  </div>

  <!-- Tablet Layout (аналогично desktop с touch-оптимизацией) -->
  <div v-else-if="isTablet" class="app app--tablet app--windowed">
    <!-- Аналогичная структура -->
  </div>

  <!-- Mobile Layout (tabbed interface) -->
  <div v-else class="app app--mobile app--windowed">
    <nav class="app__mobile-nav">
      <!-- Вкладки: Gallery, Preview, Editor, Tools, Social -->
    </nav>
    <div class="app__mobile-content">
      <!-- Содержимое по activeMobileTab -->
    </div>
  </div>
</template>
```

### Пример использования оконной системы

**Открытие окна через командную строку**:
```typescript
// Пользователь вводит: "open gallery" в CommandBar
// CommandBar фильтрует команды по label/description/id
// При выборе вызывается onCommandExecute('window:gallery')
// App.vue обрабатывает:
windowManager.openWindow('gallery')
```

**Программное управление окнами**:
```typescript
import { useWindowManager } from '@/composables/useWindowManager'
import type { WindowDefinition } from '@/composables/useWindowManager'

const windowManager = useWindowManager(windowDefinitions)

// Открыть окно
windowManager.openWindow('cube-preview')

// Свернуть окно
windowManager.minimizeWindow('gallery')

// Изменить размер
windowManager.resizeWindow('editor', newWidth, newHeight)

// Переместить окно
windowManager.moveWindow('gallery', newX, newY)

// Вывести на передний план
windowManager.bringToFront('cube-preview')
```

---

## Оценка объёма работ

| TASK | Название | Сложность | Приоритет | Зависимости |
|------|----------|-----------|-----------|-------------|
| 70 | Базовая система управления окнами | Средняя | Критический | — |
| 71 | Компонент перетаскиваемого окна | Высокая | Критический | TASK 70 |
| 72 | Панель задач | Низкая | Высокий | TASK 70, TASK 71 |
| 73 | Командная строка TinyLLM | Средняя | Критический | TASK 70 |
| 74 | Интеграция компонентов | Средняя | Критический | TASK 71 |
| 75 | Адаптивность для устройств | Высокая | Высокий | TASK 70, TASK 71 |
| 76 | Обновление App.vue | Средняя | Критический | TASK 70-74 |
| 77 | Расширенные функции командной строки | Средняя | Средний | TASK 73 |
| 78 | Тестирование и оптимизация | Высокая | Критический | TASK 70-77 |

**Порядок выполнения**:
1. TASK 70 (базовая система) — фундамент
2. TASK 71 (DraggableWindow) — основной компонент окна
3. TASK 72 + TASK 73 (параллельно) — taskbar и command bar
4. TASK 74 (интеграция компонентов) — обёртывание существующих компонентов
5. TASK 75 (адаптивность) — поддержка mobile/tablet
6. TASK 76 (App.vue) — финальная интеграция
7. TASK 77 (расширенные команды) — дополнительный функционал
8. TASK 78 (тестирование) — финальная верификация

---

## Совместимость с предыдущими фазами

- **Все компоненты из Фаз 1-10** интегрируются в оконную систему без изменения их внутренней логики
- **Vue.js 3.0 + TypeScript** (Фаза 10) — полная совместимость
- **TresJS для 3D** — CubePreview и другие 3D компоненты работают в окнах
- **GOD MODE** (Фаза 9) — адаптирован под новую оконную систему
- **Коллаборация** (Фаза 8) — все функции доступны через окна
- **Социальные функции** (Фаза 7) — галерея сообщества, шаринг в окнах
- **Сохранение состояния** — localStorage синхронизирован с оконной системой

---

## Риски и митигации

| Риск | Вероятность | Влияние | Митигация |
|------|-------------|---------|-----------|
| Производительность при большом количестве окон | Средняя | Высокое | Виртуализация неактивных окон, оптимизация рендеринга |
| Сложность управления на мобильных | Высокая | Среднее | Адаптивный режим с упрощённым интерфейсом для mobile |
| Конфликты при восстановлении layout | Средняя | Среднее | Валидация и коррекция позиций при загрузке из localStorage |
| Проблемы с доступностью (a11y) | Средняя | Высокое | Тщательное тестирование keyboard navigation и screen readers |
| Несовместимость с некоторыми браузерами | Низкая | Среднее | Кросс-браузерное тестирование, fallbacks для старых браузеров |

---

## Следующие шаги

После завершения Фазы 11:
- Все функции приложения доступны через оконный интерфейс
- Пользователи могут настраивать своё рабочее пространство
- Командная строка обеспечивает быстрый доступ к функциям
- Интерфейс работает на всех устройствах (desktop/tablet/mobile)

**Нереализованные элементы (могут быть добавлены в будущем)**:
- `AppLauncher.vue` — панель запуска приложений (сейчас покрывается CommandBar)
- `WindowSettings.vue` — настройки оконной системы (snap-to-edge, темы)
- `WelcomeScreen.vue` — экран приветствия для новых пользователей
- `command-parser.ts` — отдельный парсер команд с TinyLLM
- `useDraggable.ts` / `useResizable.ts` — вынесение drag/resize логики в composables
- Кросс-браузерное тестирование (Chrome, Firefox, Safari, Edge)
- Расширенная TinyLLM интеграция (контекстное понимание, обучение на истории)

**Возможные будущие улучшения**:
- Темы оформления для окон (custom window themes)
- Виджеты для рабочего стола (desktop widgets)
- Множественные рабочие столы (virtual desktops)
- Расширенные жесты для touch-устройств

---

**Назад к [README](../../README.md)**
