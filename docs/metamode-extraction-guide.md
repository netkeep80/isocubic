# Инструкция по ручному выделению `@netkeep80/metamode` в GitHub-репозиторий

Данная инструкция описывает процесс ручного выделения пакета `@netkeep80/metamode` из монорепозитория [`netkeep80/isocubic`](https://github.com/netkeep80/isocubic) в отдельный GitHub-репозиторий с последующей публикацией через GitHub Packages и подключением обратно в `isocubic` как внешней зависимости.

**TASK 92**: `@netkeep80/metamode Phase 5 — Инструкция по ручному выделению и подключению пакета`

---

## Содержание

1. [Что будет сделано](#что-будет-сделано)
2. [Предварительные требования](#предварительные-требования)
3. [Шаг 1: Создание нового GitHub-репозитория](#шаг-1-создание-нового-github-репозитория)
4. [Шаг 2: Перенос файлов в новый репозиторий](#шаг-2-перенос-файлов-в-новый-репозиторий)
5. [Шаг 3: Настройка пакета в новом репозитории](#шаг-3-настройка-пакета-в-новом-репозитории)
6. [Шаг 4: Настройка GitHub Actions для публикации](#шаг-4-настройка-github-actions-для-публикации)
7. [Шаг 5: Первая публикация пакета в GitHub Packages](#шаг-5-первая-публикация-пакета-в-github-packages)
8. [Шаг 6: Подключение пакета обратно в isocubic](#шаг-6-подключение-пакета-обратно-в-isocubic)
9. [Шаг 7: Проверка интеграции](#шаг-7-проверка-интеграции)
10. [Управление версиями и обновления](#управление-версиями-и-обновления)
11. [Устранение неполадок](#устранение-неполадок)

---

## Что будет сделано

После выполнения этой инструкции:

- Пакет `@netkeep80/metamode` будет жить в отдельном репозитории `https://github.com/netkeep80/metamode`
- Пакет будет публиковаться в GitHub Packages (`https://npm.pkg.github.com/@netkeep80/metamode`)
- Репозиторий `isocubic` будет использовать пакет как внешнюю зависимость через `.npmrc`
- Директория `packages/metamode/` в `isocubic` будет удалена (или сохранена как архив)

---

## Предварительные требования

- Аккаунт GitHub с правами владельца репозитория `netkeep80/isocubic`
- Установленный [Git](https://git-scm.com/) и [Node.js 18+](https://nodejs.org/)
- [GitHub CLI (`gh`)](https://cli.github.com/) (опционально, для удобства)
- Доступ к настройкам аккаунта GitHub (`netkeep80`)

---

## Шаг 1: Создание нового GitHub-репозитория

### 1.1 Через веб-интерфейс GitHub

1. Перейдите на https://github.com/new
2. Заполните форму:
   - **Owner**: `netkeep80`
   - **Repository name**: `metamode`
   - **Description**: `MetaMode — unified floating development window for Vue.js 3.0 apps`
   - **Visibility**: Public (для GitHub Packages с публичным доступом)
   - **Initialize repository**: оставьте НЕ отмеченным (мы загрузим содержимое вручную)
3. Нажмите **Create repository**

### 1.2 Через GitHub CLI

```bash
gh repo create netkeep80/metamode \
  --description "MetaMode — unified floating development window for Vue.js 3.0 apps" \
  --public \
  --clone=false
```

---

## Шаг 2: Перенос файлов в новый репозиторий

### 2.1 Создание нового локального репозитория из содержимого packages/metamode

```bash
# Перейдите в рабочую директорию
cd ~/projects   # или любая другая директория

# Создайте новую директорию для пакета
mkdir metamode-repo
cd metamode-repo

# Инициализируйте git
git init

# Скопируйте содержимое packages/metamode из isocubic
# (путь к isocubic замените на ваш локальный путь)
cp -r /path/to/isocubic/packages/metamode/. .

# Убедитесь что все нужные файлы скопированы
ls -la
# Должны быть: package.json, src/, examples/, vitest.config.ts,
# vitest.integration.config.ts, vite.config.ts, README.md
```

### 2.2 Альтернативный способ: с сохранением истории git

Если важно сохранить историю коммитов `packages/metamode` из `isocubic`:

```bash
# Клонируйте основной репозиторий
git clone https://github.com/netkeep80/isocubic.git
cd isocubic

# Извлеките поддиректорию в отдельную ветку (git subtree split)
git subtree split --prefix packages/metamode --branch metamode-only

# Создайте новый репозиторий на основе этой ветки
cd ..
mkdir metamode-repo
cd metamode-repo
git init
git pull /path/to/isocubic metamode-only

# Проверьте историю
git log --oneline | head -10
```

### 2.3 Связать с удалённым репозиторием и запушить

```bash
# Добавьте remote
git remote add origin https://github.com/netkeep80/metamode.git

# Создайте первый коммит (если новый репозиторий без истории)
git add .
git commit -m "feat: initial extraction of @netkeep80/metamode from isocubic"

# Или, если история уже есть (subtree split):
# git branch -M main

# Запушьте
git push -u origin main
```

---

## Шаг 3: Настройка пакета в новом репозитории

### 3.1 Проверка package.json

Убедитесь, что `package.json` содержит корректные данные:

```json
{
  "name": "@netkeep80/metamode",
  "version": "0.1.0",
  "repository": {
    "type": "git",
    "url": "https://github.com/netkeep80/metamode.git"
  },
  "homepage": "https://github.com/netkeep80/metamode#readme",
  "bugs": {
    "url": "https://github.com/netkeep80/metamode/issues"
  },
  "publishConfig": {
    "registry": "https://npm.pkg.github.com",
    "access": "public"
  }
}
```

Если какие-то поля отличаются, исправьте их.

### 3.2 Создание .npmrc в новом репозитории (опционально)

Для удобства разработки создайте `.npmrc` в корне нового репозитория:

```
@netkeep80:registry=https://npm.pkg.github.com
```

> **Важно**: Добавьте `.npmrc` в `.gitignore` если в нём есть токены аутентификации.

### 3.3 Проверка сборки

```bash
cd metamode-repo

# Установите зависимости
npm install

# Соберите пакет
npm run build

# Проверьте dist/
ls dist/
# Ожидаемо: metamode.js, metamode.cjs, index.d.ts

# Запустите тесты
npm run test

# Запустите интеграционные тесты (требует build)
npm run test:integration
```

---

## Шаг 4: Настройка GitHub Actions для публикации

### 4.1 Создание файла workflow

В новом репозитории создайте файл `.github/workflows/publish.yml`:

```bash
mkdir -p .github/workflows
```

Содержимое `.github/workflows/publish.yml`:

```yaml
# CI/CD для публикации @netkeep80/metamode в GitHub Packages
name: Publish @netkeep80/metamode

on:
  push:
    tags:
      - 'v*'
  release:
    types: [published]

concurrency:
  group: publish
  cancel-in-progress: false

jobs:
  build-and-test:
    name: Build & Test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'npm'

      - name: Install dependencies
        run: npm install

      - name: Build
        run: npm run build

      - name: Test
        run: npm run test

      - name: Integration test
        run: npm run test:integration

      - name: Verify build output
        run: |
          test -f dist/metamode.js   && echo "✓ dist/metamode.js"
          test -f dist/metamode.cjs  && echo "✓ dist/metamode.cjs"
          test -f dist/index.d.ts    && echo "✓ dist/index.d.ts"

  publish:
    name: Publish to GitHub Packages
    runs-on: ubuntu-latest
    needs: [build-and-test]
    permissions:
      contents: read
      packages: write
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js with GitHub Packages registry
        uses: actions/setup-node@v4
        with:
          node-version: '22'
          registry-url: 'https://npm.pkg.github.com'
          scope: '@netkeep80'
          cache: 'npm'

      - name: Install dependencies
        run: npm install

      - name: Build
        run: npm run build

      - name: Extract version from tag
        id: version
        run: |
          TAG="${{ github.ref_name }}"
          VERSION="${TAG#v}"
          echo "version=$VERSION" >> "$GITHUB_OUTPUT"
          echo "Publishing version: $VERSION"

      - name: Verify version matches tag
        run: |
          PKG_VERSION=$(node -p "require('./package.json').version")
          TAG_VERSION="${{ steps.version.outputs.version }}"
          if [ "$PKG_VERSION" != "$TAG_VERSION" ]; then
            echo "::error::Version mismatch! package.json=$PKG_VERSION, tag=$TAG_VERSION"
            exit 1
          fi
          echo "✓ Version: $PKG_VERSION"

      - name: Publish to GitHub Packages
        run: npm publish --access public
        env:
          NODE_AUTH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

### 4.2 Закоммитить workflow

```bash
git add .github/
git commit -m "ci: add GitHub Packages publishing workflow"
git push origin main
```

---

## Шаг 5: Первая публикация пакета в GitHub Packages

### 5.1 Проверка текущей версии

```bash
cat package.json | grep '"version"'
# Например: "version": "0.1.0"
```

### 5.2 Создание тега для публикации

```bash
# Убедитесь что все изменения закоммичены
git status

# Создайте тег (версия должна совпадать с package.json)
git tag v0.1.0

# Запушьте тег — это автоматически запустит workflow публикации
git push origin v0.1.0
```

### 5.3 Проверка публикации

1. Перейдите в репозиторий: https://github.com/netkeep80/metamode
2. Нажмите на вкладку **Actions** и дождитесь успешного завершения workflow
3. После успеха перейдите в **Packages** или https://github.com/netkeep80/metamode/pkgs/npm/metamode
4. Убедитесь, что пакет `@netkeep80/metamode@0.1.0` присутствует

### 5.4 Ручная публикация (если нет CI/CD)

```bash
cd metamode-repo

# Настройте npm на использование GitHub Packages
echo "@netkeep80:registry=https://npm.pkg.github.com" >> ~/.npmrc

# Аутентификация (нужен Personal Access Token с правами read:packages и write:packages)
echo "//npm.pkg.github.com/:_authToken=YOUR_GITHUB_TOKEN" >> ~/.npmrc

# Сборка и публикация
npm run build
npm publish --access public
```

---

## Шаг 6: Подключение пакета обратно в isocubic

### 6.1 Настройка .npmrc в isocubic

В корне репозитория `isocubic` создайте или обновите файл `.npmrc`:

```
@netkeep80:registry=https://npm.pkg.github.com
```

> **Важно**: Этот файл можно закоммитить в репозиторий — в нём нет секретов.
> Секретный токен (если нужен для CI) добавляется через переменные окружения.

### 6.2 Настройка аутентификации для разработчиков

Каждый разработчик, работающий с `isocubic`, должен создать Personal Access Token (PAT):

1. Перейдите в [GitHub Settings → Developer settings → Personal access tokens](https://github.com/settings/tokens)
2. Создайте токен с правами: `read:packages`
3. Добавьте в `~/.npmrc` (глобальный файл, НЕ в репозитории):
   ```
   //npm.pkg.github.com/:_authToken=YOUR_GITHUB_PAT
   ```

### 6.3 Настройка аутентификации для GitHub Actions в isocubic

В файл `.github/workflows/ci.yml` (и другие workflows) добавьте:

```yaml
- name: Setup Node.js
  uses: actions/setup-node@v4
  with:
    node-version: '22'
    registry-url: 'https://npm.pkg.github.com'
    scope: '@netkeep80'

- name: Install dependencies
  run: npm ci
  env:
    NODE_AUTH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

### 6.4 Удаление packages/metamode из isocubic

После успешной публикации пакета замените локальный пакет на внешнюю зависимость:

```bash
cd /path/to/isocubic

# Удалите локальную директорию пакета
rm -rf packages/metamode/

# Обновите package.json — удалите скрипты package:build, package:test
# Добавьте @netkeep80/metamode как зависимость (или devDependency)
npm install @netkeep80/metamode --registry=https://npm.pkg.github.com

# Обновите импорты в исходном коде isocubic
# Если используется локальный путь вместо имени пакета — замените на имя
```

### 6.5 Обновление импортов в коде isocubic

Найдите все импорты, которые ссылаются на `packages/metamode`:

```bash
grep -rn "from '.*packages/metamode" src/
grep -rn "from '.*metamode'" src/
```

Замените локальные импорты на импорты из пакета:

```typescript
// Было (локальный импорт):
import { provideMetaMode } from '../../packages/metamode/src'

// Стало (внешняя зависимость):
import { provideMetaMode } from '@netkeep80/metamode'
```

---

## Шаг 7: Проверка интеграции

### 7.1 Локальная проверка

```bash
cd /path/to/isocubic

# Установите зависимости (включая @netkeep80/metamode из GitHub Packages)
npm install

# Запустите тесты
npm run test

# Проверьте сборку
npm run build
```

### 7.2 Проверка CI/CD

1. Запушьте изменения в ветку
2. Дождитесь завершения CI в GitHub Actions
3. Убедитесь, что тесты проходят и сборка успешна

---

## Управление версиями и обновления

### Публикация новой версии @netkeep80/metamode

```bash
cd metamode-repo

# 1. Внесите изменения в код
# 2. Обновите версию в package.json
npm version patch  # или minor, или major

# 3. Запушьте изменения
git push origin main

# 4. Создайте тег (workflow запустится автоматически)
git push origin --tags
```

### Обновление версии в isocubic

```bash
cd /path/to/isocubic

# Установите новую версию
npm install @netkeep80/metamode@0.2.0 --registry=https://npm.pkg.github.com

# Зафиксируйте изменения package-lock.json
git add package.json package-lock.json
git commit -m "chore: update @netkeep80/metamode to 0.2.0"
```

---

## Устранение неполадок

### Ошибка: "Package not found" при npm install

**Причина**: npm не знает, что `@netkeep80/` нужно искать в GitHub Packages.

**Решение**: Убедитесь, что `.npmrc` содержит:
```
@netkeep80:registry=https://npm.pkg.github.com
```

### Ошибка: "401 Unauthorized" при npm install

**Причина**: Нет токена аутентификации для GitHub Packages.

**Решение**:
- Для локальной разработки: добавьте в `~/.npmrc`:
  ```
  //npm.pkg.github.com/:_authToken=YOUR_GITHUB_PAT
  ```
- Для GitHub Actions: убедитесь, что workflow использует `NODE_AUTH_TOKEN: ${{ secrets.GITHUB_TOKEN }}` и job имеет `permissions: packages: read`

### Ошибка: "403 Forbidden" при npm publish

**Причина**: Недостаточно прав для публикации в GitHub Packages.

**Решение**: Убедитесь, что:
- Workflow имеет `permissions: packages: write`
- Пакет опубликован в рамках аккаунта `netkeep80` (имя пакета `@netkeep80/metamode` соответствует аккаунту)

### Ошибка: "Version already exists"

**Причина**: Пакет с такой версией уже опубликован в GitHub Packages.

**Решение**: Обновите версию в `package.json` и создайте новый тег:
```bash
npm version patch
git push origin main --tags
```

---

## Связанные документы

- [Phase 14: @netkeep80/metamode](phase-14.md) — план задач по выделению пакета
- [packages/metamode/README.md](../packages/metamode/README.md) — документация пакета
- [GitHub Packages: npm registry](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-npm-registry) — официальная документация GitHub

---

**Назад к [README](../README.md)**
