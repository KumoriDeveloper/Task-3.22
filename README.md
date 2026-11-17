# Цифровая визитка — backend на NestJS, Prisma и GraphQL

Backend цифровой визитки: публичная страница-карточка, GraphQL API и админ-панель, через
которую весь контент редактируется без пересборки и без доступа к БД. База данных
автоматически приводится в актуальное состояние и заполняется при первом запуске.

**Стек:** TypeScript · Node.js · NestJS · Prisma · PostgreSQL · GraphQL (Apollo) · Docker · Git.

---

## 1. Быстрый старт

```bash
cp .env.example .env         # обязательные значения: JWT_SECRET, ADMIN_EMAIL, ADMIN_PASSWORD
docker compose up --build
```

Одна команда поднимает PostgreSQL, применяет миграции и стартует API. Никаких ручных шагов
с БД не требуется: схема создаётся миграциями, данные — сидером при старте приложения.

| Что                  | Адрес                         |
| -------------------- | ----------------------------- |
| Публичная визитка    | http://localhost:3000/        |
| GraphQL API          | http://localhost:3000/graphql |
| Админ-панель         | http://localhost:3000/admin/  |
| Health check         | http://localhost:3000/health  |
| PostgreSQL (снаружи) | `localhost:5433`              |

Учётная запись администратора и пароль задаются **только через окружение** (`ADMIN_EMAIL`,
`ADMIN_PASSWORD`, `ADMIN_NAME`). Значения из `.env.example` — локальная заготовка: смените
пароль и `JWT_SECRET` перед реальным запуском. Публичная визитка не содержит ссылок на
`/admin/` или `/graphql`, поэтому панель доступна только тем, кто знает адрес.

Apollo Sandbox и GraphQL introspection по умолчанию выключены (в production) и включаются
переменными `GRAPHQL_SANDBOX=true` / `GRAPHQL_INTROSPECTION=true` — только для разработки.

Остановить и удалить данные: `docker compose down -v`.

### Локальный запуск без Docker для API

```bash
docker compose up -d db      # только PostgreSQL
cp .env.example .env         # заполните ADMIN_EMAIL и ADMIN_PASSWORD
npm ci
npx prisma migrate deploy    # применить миграции
npm run start:dev            # nest start --watch
```

---

## 2. Деплой на Vercel

Проект уже подготовлен к serverless-запуску: Nest-приложение экспортируется как Vercel
Function, а статика (`public/`) раздаётся с CDN. Отдельная сборка фронтенда не нужна.

### Что уже настроено

| Файл                      | Назначение                                                                |
| ------------------------- | ------------------------------------------------------------------------- |
| `api/index.js`            | Vercel Function, которая подключает скомпилированный `dist/serverless.js` |
| `src/serverless.ts`       | ленивый bootstrap Nest + кеширование приложения между тёплыми вызовами    |
| `src/bootstrap.ts`        | единая фабрика приложения для Docker, Vercel и e2e-тестов                 |
| `vercel.json`             | rewrites `/graphql` и `/health` на функцию, `public/` как output          |
| `scripts/vercel-build.js` | `prisma generate` → `nest build` → `migrate deploy` → seed                |
| `.vercelignore`           | не отправляет в сборку `.env`, `test`, `dist` и локальные артефакты       |

`api/index.js` — обычный CommonJS-файл, который подключает `dist/serverless.js`. Поэтому
декораторы и `emitDecoratorMetadata` компилируются `nest build`, а не esbuild на стороне
Vercel: DI Nest продолжает работать без сюрпризов.

### Порядок деплоя

1. Создайте PostgreSQL с пулером подключений: Neon, Supabase, Railway или любой другой
   провайдер. Для serverless берите **pooled** строку подключения, а не direct.
2. Импортируйте репозиторий в Vercel. Framework определится как «Other», команды сборки
   уже лежат в `vercel.json`.
3. Добавьте переменные окружения для Production (и Preview, если нужна отдельная БД):

   | Переменная              | Значение                                           |
   | ----------------------- | -------------------------------------------------- |
   | `DATABASE_URL`          | pooled-строка PostgreSQL                           |
   | `JWT_SECRET`            | случайная строка не короче 16 символов             |
   | `ADMIN_EMAIL`           | email администратора                               |
   | `ADMIN_PASSWORD`        | пароль администратора                              |
   | `ADMIN_NAME`            | отображаемое имя администратора                    |
   | `JWT_EXPIRES_IN`        | `12h` (необязательно)                              |
   | `SEED_PORTFOLIO`        | `false`, если контент уже заведён (необязательно)  |
   | `GRAPHQL_SANDBOX`       | `false` (по умолчанию в production; необязательно) |
   | `GRAPHQL_INTROSPECTION` | `false` (по умолчанию в production; необязательно) |
   | `PRISMA_LOG_QUERIES`    | `false` (необязательно)                            |

4. Нажмите Deploy. `scripts/vercel-build.js`:
   - генерирует Prisma Client под runtime Vercel (`rhel-openssl-3.0.x` уже указан в схеме);
   - собирает Nest в `dist/`;
   - применяет миграции (`prisma migrate deploy`);
   - создаёт/обновляет администратора и один раз заполняет карточку.

   Повторный деплой безопасен: сидер не перезаписывает данные, изменённые через админку.

5. Проверьте после деплоя: `/` — визитка, `/admin/` — панель (ссылки на неё нет на визитке),
   `/health` — `{"status":"ok"}`, `/graphql` — API. Sandbox доступен только при
   `GRAPHQL_SANDBOX=true`.

### Preview и общие базы

Preview-деплой по умолчанию использует те же переменные, что и Production, поэтому миграции
и сид выполнятся и для превью. Если превью не должно трогать production-базу, задайте
`VERCEL_SKIP_DB_SETUP=1` для Preview: сборка пропустит миграции и сид. Схему и данные тогда
обновляйте вручную:

```bash
DATABASE_URL="postgresql://…" npm run db:deploy
DATABASE_URL="postgresql://…" npm run db:seed
```

### Serverless-ограничения

- **Соединения с БД.** Функции масштабируются горизонтально, поэтому используйте пулер
  провайдера (Neon pooled URL, Supabase `?pgbouncer=true&connection_limit=1`). Прямое
  подключение к PostgreSQL исчерпает лимит соединений при нагрузке.
- **Статика.** `express.static` на Vercel игнорируется платформой; файлы из `public/`
  раздаются CDN. В `src/serverless.ts` статика поэтому отключена, в Docker — включена.
- **Лимиты функции.** В `vercel.json` задан `maxDuration` — 30 секунд. Память функции
  настраивается в дашборде проекта (в `vercel.json` она больше не задаётся); значения по
  умолчанию хватает: Prisma-запросы и DataLoader'ы укладываются с запасом.
- **Холодный старт.** Приложение инициализируется при первом запросе и переиспользуется
  тёплыми вызовами. На Vercel boot-сид отключён автоматически (`SEED_ON_BOOT=false`):
  администратор и контент готовятся на этапе сборки. Если миграции и сид в сборке пропущены
  (`VERCEL_SKIP_DB_SETUP=1`), задайте `SEED_ON_BOOT=true`, чтобы синхронизировать
  администратора при первом запросе.

Локальная проверка serverless-режима без деплоя:

```bash
npm run build
node -e "const http=require('http'); const h=require('./dist/serverless').default; http.createServer(h).listen(3000)"
```

### Обновление схемы БД

После изменения `prisma/schema.prisma` создайте миграцию локально и закоммитьте её:

```bash
npx prisma migrate dev --name describe_change
```

На Vercel она применится автоматически при следующем деплое.

---

## 3. GraphQL API

Схема генерируется кодом (code-first), поэтому не может разойтись с моделями.
Запросы — публичные, мутации — только с JWT администратора.

### Пример запроса

```graphql
query {
  profile {
    name
    description
    links {
      label
      url
      kind
    }
    skills {
      name
      category
      level
    }
    experiences {
      company
      position
      startDate
      endDate
      achievements
    }
    projects {
      name
      repositoryUrl
      technologies {
        name
      }
    }
  }
}
```

`endDate: null` означает текущую позицию. Навыки отсортированы по `sortOrder`, опыт — от
самой свежей позиции, проекты — по `sortOrder`.

### Типы

| Тип          | Поля                                                                                                                                                                                        |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Profile`    | `id`, `name`, `headline`, `description`, `email`, `location`, `avatarUrl`, `createdAt`, `updatedAt`                                                                                         |
| `SocialLink` | `id`, `label`, `url`, `kind`, `sortOrder` — `kind`: `GITHUB`, `LINKEDIN`, `WEBSITE`, `TELEGRAM`, `EMAIL`, `OTHER`                                                                           |
| `Skill`      | `id`, `name`, `category`, `level`, `sortOrder` — `category`: `BACKEND`, `FRONTEND`, `DATABASE`, `DEVOPS`, `TOOLS`, `SOFT_SKILLS`; `level`: `BEGINNER`, `INTERMEDIATE`, `ADVANCED`, `EXPERT` |
| `Experience` | `id`, `company`, `position`, `startDate`, `endDate`, `location`, `summary`, `achievements[]`, `sortOrder`                                                                                   |
| `Project`    | `id`, `name`, `description`, `url`, `repositoryUrl`, `sortOrder`, `technologies[]`                                                                                                          |

### Аутентификация и мутации

```graphql
mutation {
  login(input: { email: "ADMIN_EMAIL", password: "ADMIN_PASSWORD" }) {
    accessToken
    admin {
      email
    }
  }
}
```

Полученный токен передаётся заголовком `Authorization: Bearer <token>`.

| Мутация                                                      | Назначение                       |
| ------------------------------------------------------------ | -------------------------------- |
| `updateProfile(input)`                                       | Изменить профиль                 |
| `createSocialLink` / `deleteSocialLink`                      | Ссылки на GitHub/LinkedIn/сайт   |
| `createSkill` / `updateSkill` / `deleteSkill`                | Навыки                           |
| `createExperience` / `updateExperience` / `deleteExperience` | Опыт работы                      |
| `createProject` / `updateProject` / `deleteProject`          | Проекты (с привязкой технологий) |
| `me` (query)                                                 | Проверка активной сессии         |

Пример создания навыка:

```graphql
mutation {
  createSkill(input: { name: "Kafka", category: BACKEND, level: INTERMEDIATE }) {
    id
    name
  }
}
```

### Ошибки

GraphQL-ответ содержит `extensions.code`, соответствующий HTTP-смыслу ошибки:
`BAD_REQUEST`, `UNAUTHENTICATED`, `FORBIDDEN`, `NOT_FOUND`, `CONFLICT`, `BAD_USER_INPUT`.
Стандартный маппинг NestJS покрывает только 400/401/403/422, поэтому в
`src/graphql/format-error.ts` добавлено отображение остальных статусов — иначе конфликт
уникальности (409) неотличим от падения сервера (500).
Трассировки стека отдаются только вне `NODE_ENV=production`.

---

## 4. Архитектура и обоснование решений

### Слои и ответственность

```
GraphQL resolver  (транспорт: аргументы, @ResolveField, guards)
        │
        ▼
Service           (бизнес-логика и правила домена)
        │
        ▼
PrismaService     (единственная точка доступа к PostgreSQL)
```

- **Resolver** ничего не знает о SQL. Он валидирует вход (DTO + `class-validator` через
  глобальный `ValidationPipe`), вызывает сервис и отдаёт модель.
- **Service** содержит правила: профиль существует и единственный, навык уникален в рамках
  профиля, `endDate >= startDate`, проект может ссылаться только на навыки своего профиля и т. д.
- **Prisma** — слой доступа к данным. Отдельный repository-слой поверх ORM здесь не добавлен
  намеренно: Prisma уже даёт типизированный, тестируемый интерфейс, а дополнительная обёртка
  дублировала бы его без выгоды для проекта такого размера.

Модули сгруппированы по агрегатам (`profile`, `skills`, `experiences`, `projects`), плюс
`auth`, `database` (сидирование), `health`, `prisma`, `graphql` (общая инфраструктура).

### Разделение чтения и записи

В каждом модуле резолверы разделены на два класса:

- `*.resolver.ts` — публичные запросы и `@ResolveField` для вложенных данных;
- `*.admin.resolver.ts` — мутации, защищённые `@UseGuards(JwtAuthGuard)` **на уровне класса**.

Guard на классе, а не на каждом методе, выбран специально: новую мутацию нельзя случайно
сделать публичной. Единственная открытая мутация — `login`.

### Вложенные данные без N+1

Ключевое требование задания — корректная работа с вложенными связями. Реализация:

1. `profile` загружает только строку профиля.
2. Каждая вложенная коллекция — `@ResolveField`, который обращается к **DataLoader**
   (`src/graphql/loaders.ts`), создаваемому на один GraphQL-запрос в context.
3. DataLoader собирает ключи, запрошенные за один тик event loop, и выполняет один
   `WHERE ... IN (...)` вместо запроса на каждую строку.
4. Связь «проект ↔ навыки» — many-to-many, то есть настоящий источник N+1; она загружается
   отдельным батчем (`Project.technologies`), поэтому `projects { technologies { name } }`
   остаётся одним запросом независимо от числа проектов.
5. Кэш DataLoader живёт в пределах запроса: повторное обращение к тому же профилю/проекту
   в одном запросе не идёт в БД, а между запросами состояние не протекает (нет устаревших данных).

Измерено с `PRISMA_LOG_QUERIES=true` на сидовых данных (14 навыков, 3 позиции, 4 проекта):

| Запрос                                                      | SQL-запросов |
| ----------------------------------------------------------- | ------------ |
| `{ profile { name } }`                                      | 1            |
| полная карточка (ссылки, навыки, опыт, проекты, технологии) | 9            |

Число не зависит от количества строк: коллекции загружаются батчами, а не построчно.

Альтернатива — `include` в одном запросе — быстрее на 1–2 round-trip, но тянет поля,
которые клиент не запрашивал. Выбранный вариант делает стоимость запроса пропорциональной
форме GraphQL-документа, а не объёму данных; при необходимости `include` можно добавить
точечно для «горячих» полей — резолверы от этого не меняются.

### Модель данных (`prisma/schema.prisma`)

- `Profile` — корень агрегата. Визитка описывает одного человека, поэтому профиль один;
  сервисы сами находят его (`ProfileService.getProfileId()`), клиент не может подставить id.
- `Skill` принадлежит профилю (1-n) и связан с проектами many-to-many: проект использует
  технологии из списка навыков. Отдельный справочник навыков не нужен — это данные карточки.
- `SocialLink` — профессиональные ссылки с семантическим `kind`.
- `Experience` — компания, должность, период (`DATE`, не `timestamp`, чтобы не ловить
  сдвиги часовых поясов), достижения как `String[]`.
- `AdminUser` — только хэш пароля (bcrypt), без регистрации.
- Инварианты на уровне БД: `@@unique([profileId, name])` для навыков, `@@unique([profileId, url])`
  для ссылок, `onDelete: Cascade` от профиля. Ошибки уникальности превращаются в `CONFLICT`.

Миграции лежат в репозитории (`prisma/migrations`) и применяются `prisma migrate deploy`,
без `db push` — схема всегда воспроизводима.

### Инициализация и заполнение БД

Две независимые стадии:

1. **Схема.** `docker/entrypoint.sh` выполняет `prisma migrate deploy` с ретраями (БД может
   подниматься дольше API). Если миграции не применились — контейнер не стартует, а не
   работает на полупустой схеме.
2. **Данные.** `SeedService.onApplicationBootstrap()`:
   - синхронизирует администратора с `ADMIN_EMAIL` / `ADMIN_PASSWORD` / `ADMIN_NAME`
     (пароль меняется, если он разошёлся с окружением — учётка воспроизводима);
   - заполняет карточку, **только если профиля ещё нет**;
   - на время проверки и вставки берёт `pg_advisory_xact_lock`, поэтому два одновременно
     стартующих контейнера не создадут дубликаты;
   - повторный запуск не перезаписывает правки, сделанные через админ-панель.

Сидовые данные — один файл `src/database/portfolio.fixture.ts` (профиль, ссылки, навыки,
опыт, проекты). Замените значения на свои или отредактируйте всё через админ-панель.
Отключить сидирование контента: `SEED_PORTFOLIO=false` (администратор создаётся всегда).
Полностью пропустить подготовку данных при старте: `SEED_ON_BOOT=false` (так делает
serverless-вход на Vercel, где эту работу выполняет сборка).

### Конфигурация

Все параметры читаются из окружения и проверяются один раз при старте
(`src/config/env.validation.ts`): при ошибке приложение падает с понятным сообщением,
а не с `undefined` в глубине Prisma.

| Переменная              | Обязательна | По умолчанию                         | Назначение                                   |
| ----------------------- | ----------- | ------------------------------------ | -------------------------------------------- |
| `DATABASE_URL`          | да          | —                                    | Строка подключения PostgreSQL                |
| `JWT_SECRET`            | да          | —                                    | Ключ подписи JWT (≥ 16 символов)             |
| `ADMIN_EMAIL`           | да          | —                                    | Логин администратора                         |
| `ADMIN_PASSWORD`        | да          | —                                    | Пароль администратора (≥ 8 символов)         |
| `APP_PORT`              | нет         | `3000`                               | HTTP-порт приложения                         |
| `JWT_EXPIRES_IN`        | нет         | `12h`                                | Время жизни токена                           |
| `ADMIN_NAME`            | нет         | `Portfolio Admin`                    | Отображаемое имя администратора              |
| `SEED_PORTFOLIO`        | нет         | `true`                               | Заполнять ли карточку при пустой БД          |
| `SEED_ON_BOOT`          | нет         | `true`                               | Готовить данные при старте (Vercel: `false`) |
| `GRAPHQL_SANDBOX`       | нет         | `true` вне production, иначе `false` | Отдавать Apollo Sandbox на `GET /graphql`    |
| `GRAPHQL_INTROSPECTION` | нет         | как у `GRAPHQL_SANDBOX`              | Разрешать introspection GraphQL-схемы        |
| `PRISMA_LOG_QUERIES`    | нет         | `false`                              | Логировать SQL (для проверки батчинга)       |

Порт вынесен в `APP_PORT`, а не в распространённый `PORT`: переменная `PORT` часто
выставляется окружением хоста/платформы (в т.ч. в `0`), и приложение не должно из-за этого
терять свой порт.

### Тестируемость

HTTP-обвязка (глобальная валидация, статика, маршрут Sandbox) вынесена в
`src/app.setup.ts` и используется и в `main.ts`, и в e2e-тестах. Поэтому тесты проверяют
не «урезанное» приложение, а ту же конфигурацию, что работает в production.

### Безопасность

- Пароль администратора хранится как bcrypt-хэш (cost 10), сравнение — `bcrypt.compare`.
- Ответ на неверные учётные данные не различает «нет такого email» и «неверный пароль».
- JWT проверяется кастомным guard'ом (`JwtAuthGuard`) в GraphQL-контексте; payload
  (`sub`, `email`) кладётся в request, `@CurrentAdmin()` читает его.
- Все входные данные — типизированные `InputType` с `class-validator`; глобальный
  `ValidationPipe` с `whitelist: true` отбрасывает лишние поля.
- Запросы к БД — только через Prisma (параметризованные), SQL-строки не склеиваются.
- Авторизация через заголовок, а не cookie: браузерная CSRF на API не применима.
- Контейнер работает под пользователем `node` (не root), секреты не попадают в образ.
- Админ-панель и API отдают одинаковый контент — публичные данные визитки и так открыты;
  редактирование закрыто мутациями.

### Docker

Многоступенчатая сборка: `deps` → `build` (`prisma generate` + `nest build`) → `production-deps`
(`npm ci --omit=dev`) → `runner` (Alpine, non-root, только `dist`, `public`, `prisma` и
production-зависимости). `prisma` CLI оставлен в production-зависимостях, потому что именно
он применяет миграции в entrypoint. Обе службы в `docker-compose.yml` имеют healthcheck,
API ждёт `db` в состоянии `service_healthy`.

---

## 5. Структура проекта

```
prisma/
  schema.prisma                  модель данных + binaryTargets для Vercel
  migrations/                    версионированная схема БД
src/
  main.ts                        bootstrap: создать приложение и слушать порт
  bootstrap.ts                   единая фабрика Nest-приложения
  serverless.ts                  Vercel Function: ленивый bootstrap + кеш инстанса
  app.setup.ts                   общая HTTP-обвязка (валидация, статика, Sandbox)
  app.module.ts                  сборка модулей и GraphQL
  config/env.validation.ts       валидация окружения
  prisma/                        PrismaService (единственный доступ к БД)
  graphql/
    models/                      GraphQL-типы (code-first)
    inputs/                      InputType + валидация
    loaders.ts                   DataLoader'ы на запрос
    format-error.ts              коды ошибок GraphQL
    sandbox.page.ts              страница Apollo Sandbox
    enums.ts                     регистрация enum'ов
  auth/                          login, me, JwtAuthGuard, @CurrentAdmin
  profile/                       профиль, ссылки, публичный резолвер
  skills/                        навыки + админские мутации
  experiences/                   опыт работы + админские мутации
  projects/                      проекты + батчинг технологий
  database/
    portfolio.fixture.ts         содержимое визитки по умолчанию
    seed.ts                      идемпотентные syncAdminAccount и seedPortfolio
    seed.service.ts              запуск сидера при boot длительного процесса
    seed.cli.ts                  тот же сидер для Vercel build / db:seed
  health/                        healthcheck для Docker и Vercel
api/index.js                     Vercel Function entry point
scripts/vercel-build.js          generate → build → migrate → seed
public/
  index.html, styles.css, card.js      публичная визитка
  shared/                              общие ES-модули (UI-хелперы и GraphQL-клиент)
  admin/
    index.html, styles.css, admin.js   админ-панель
    documents.js                       GraphQL-документы
    render.js                          разметка списков и форм
test/
  profile.e2e-spec.ts            вложенный запрос профиля и батчинг SQL
  seeding.e2e-spec.ts            первичный сид, идемпотентность, env-настройки
  auth.e2e-spec.ts               защита всех мутаций, коды ошибок
  utils/                         общий bootstrap приложения и подготовка схемы БД
docker/entrypoint.sh             миграции + запуск
Dockerfile, docker-compose.yml
vercel.json, .vercelignore
```

---

## 6. Админ-панель

Отдельного фронтенд-сборщика нет: статические ES-модули, отдаваемые тем же Nest-приложением
(или CDN на Vercel), работают с тем же GraphQL API. Это осознанный выбор — админка не тянет
второй стек и сборку, а контракт API остаётся единственным источником истины.

Публичная визитка не ссылается на админ-панель или GraphQL API: это внутренние инструменты,
а не контент для посетителя. Панель открывается по прямому адресу `/admin/`, учётные данные
приходят из `ADMIN_EMAIL` / `ADMIN_PASSWORD`, а страница закрыта авторизацией и помечена
`noindex`.

Публичная визитка и админка оформлены в конструктивистской традиции: бумажный фон, чёрные
линейки и офсетные тени, сигнальный красный, крупная сжатая типографика и геометрические
акценты. Композиция адаптируется к светлой и тёмной схемам; Oswald и Golos Text подключаются
с Google Fonts, а при недоступности сети остаются системные фолбэки.

Код админки разделён по ответственности: `documents.js` — GraphQL-документы, `render.js` —
разметка списков, `admin.js` — состояние, формы и обработка событий. Общие хелперы escape,
форматирования дат и GraphQL-клиент лежат в `public/shared/` и используются и визиткой, и
админкой.

Что можно делать:

- редактировать профиль (имя, заголовок, описание, email, локация, аватар);
- добавлять и удалять профессиональные ссылки;
- создавать, изменять и удалять навыки (категория, уровень, порядок);
- вести опыт работы: компания, должность, период, локация, описание, достижения списком;
- вести проекты: название, описание, ссылки, набор технологий из списка навыков.

После каждой мутации панель перезапрашивает данные с сервера (никакого оптимистичного
локального состояния), сессия хранится в `sessionStorage` и сбрасывается при истёкшем токене.

---

## 7. Тесты

```bash
docker compose up -d db   # нужен только PostgreSQL
npm run test:e2e
```

Тесты идут против изолированной схемы `e2e` в той же базе (`TEST_DATABASE_URL`, по
умолчанию `…?schema=e2e`): миграции применяются один раз, перед каждой проверкой данные
очищаются, поэтому dev-данные не затрагиваются. Приложение поднимается целиком через
`AppModule` и `configureApp()` — с валидацией, guard'ами и форматированием ошибок.

Что покрыто:

- **Вложенный запрос профиля.** Полная карточка возвращает ссылки, навыки, опыт и проекты
  с технологиями строго по данным фикстуры; `{ profile { name } }` отдаёт только запрошенное
  поле; число SQL-запросов на полную карточку не растёт после добавления пяти проектов
  (проверяется по событиям Prisma `$on('query')`).
- **Сидер.** На пустой БД создаются администратор и контент, повторный старт ничего не
  дублирует, правки в БД переживают рестарт, пароль администратора синхронизируется с
  окружением, при `SEED_PORTFOLIO=false` создаётся только администратор.
- **Защита мутаций.** Каждая админская мутация и запрос `me` без токена возвращают
  `UNAUTHENTICATED`; битый токен отклоняется; вход не раскрывает существование email;
  валидный токен открывает мутации; бизнес-ошибки приходят с кодами `CONFLICT`,
  `NOT_FOUND`, `BAD_REQUEST` (включая ошибку валидации входа).

## 8. Проверки

Выполнено вручную на запущенном приложении:

- `npm run build` и `npx tsc --noEmit` — без ошибок;
- `node scripts/vercel-build.js` — generate, build, `migrate deploy` и seed отрабатывают;
- serverless entry (`require('./dist/serverless').default`) локально отвечает на `GET /health`,
  `POST /graphql` и `GET /graphql` (Sandbox при `GRAPHQL_SANDBOX=true`); `api/index.js`
  подключает тот же handler;
- production-образ собран и запущен: entrypoint применил миграцию, на пустой БД отработал сидер,
  `GET /health` → 200, GraphQL-запросы отвечают, `GET /graphql` закрыт без флага Sandbox;
- публичная страница не содержит ссылок на `/admin/` и `/graphql`;
- повторный старт: «Portfolio already contains data, seeding skipped» (сид идемпотентен);
- `docker compose config` валиден; связка API + PostgreSQL проверена запуском образа;
- вложенный запрос из задания возвращает профиль, 14 навыков, 3 позиции, 4 проекта с технологиями;
- число SQL-запросов: 1 для `{ profile { name } }`, 9 для полной карточки (батчинг работает);
- мутации без токена → `UNAUTHENTICATED`, с токеном → создание/изменение/удаление;
- правила домена: дубликат навыка → `CONFLICT`, `endDate < startDate` → `BAD_REQUEST`,
  чужой `technologyId` → `BAD_REQUEST`;
- админ-панель: вход, загрузка данных, создание навыка, режим редактирования проекта
  (поля и чекбоксы технологий заполняются), удаление — проверено в браузере;
- `npm run test:e2e` — 24 теста, 3 файла, все зелёные.

## 9. Ограничения и возможные улучшения

- Администратор один и задаётся окружением: нет регистрации, ролей и смены пароля из UI.
- Нет пагинации и полнотекстового поиска — данные визитки заведомо небольшие; при росте
  коллекций понадобятся cursor-based connections.
- Тесты e2e требуют внешнего PostgreSQL (берут его из `docker compose up -d db`);
  полностью автономный запуск потребовал бы Testcontainers.
- Покрыты API и сидер; отдельного unit-уровня для сервисов нет — при росте правил его
  стоит добавить.
- Нет подписок/realtime и загрузки файлов (аватар задаётся URL).
- `introspection` и Sandbox по умолчанию выключены в production: схема и живой API не
  рекламируются посетителю. Для локальной отладки включите `GRAPHQL_SANDBOX=true` и
  `GRAPHQL_INTROSPECTION=true`.
