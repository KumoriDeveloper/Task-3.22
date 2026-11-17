import { LinkKind, SkillCategory, SkillLevel } from '@prisma/client';

/**
 * Content of the digital business card.
 *
 * This is the single source of truth for the initial data (it is also what the app
 * writes into an empty database on startup). Replace the values with your own, or
 * edit everything through the admin panel — the seeder never overwrites existing rows.
 */
export interface ProfileFixture {
  name: string;
  headline: string;
  description: string;
  email: string;
  location?: string | null;
  avatarUrl?: string | null;
}

export interface SocialLinkFixture {
  label: string;
  url: string;
  kind: LinkKind;
  sortOrder?: number;
}

export interface SkillFixture {
  name: string;
  category: SkillCategory;
  level: SkillLevel;
  sortOrder?: number;
}

export interface ExperienceFixture {
  company: string;
  position: string;
  /** ISO date, e.g. "2022-03-01" */
  startDate: string;
  /** ISO date or null for the current position */
  endDate: string | null;
  location?: string;
  summary?: string;
  achievements: string[];
  sortOrder?: number;
}

export interface ProjectFixture {
  name: string;
  description?: string;
  url?: string;
  repositoryUrl?: string;
  sortOrder?: number;
  /** Skill names from the `skills` list below. */
  technologies: string[];
}

export interface PortfolioFixture {
  profile: ProfileFixture;
  links: SocialLinkFixture[];
  skills: SkillFixture[];
  experiences: ExperienceFixture[];
  projects: ProjectFixture[];
}

export const PORTFOLIO_FIXTURE: PortfolioFixture = {
  profile: {
    name: 'Алексей Смирнов',
    headline: 'Senior Backend Engineer · NestJS, GraphQL, PostgreSQL',
    description:
      'Проектирую и развиваю backend-сервисы на Node.js и TypeScript: от модели данных и GraphQL-схемы до эксплуатации в Docker. Люблю строгие контракты, тестируемую бизнес-логику и код, который легко поддерживать через год.',
    email: 'alexey.smirnov@example.com',
    location: 'Белград, Сербия · удалённо',
    avatarUrl: null,
  },

  links: [
    {
      label: 'GitHub',
      url: 'https://github.com/alexey-smirnov',
      kind: LinkKind.GITHUB,
      sortOrder: 1,
    },
    {
      label: 'LinkedIn',
      url: 'https://www.linkedin.com/in/alexey-smirnov',
      kind: LinkKind.LINKEDIN,
      sortOrder: 2,
    },
    {
      label: 'Telegram',
      url: 'https://t.me/alexey_smirnov',
      kind: LinkKind.TELEGRAM,
      sortOrder: 3,
    },
    {
      label: 'Личный сайт',
      url: 'https://alexey-smirnov.dev',
      kind: LinkKind.WEBSITE,
      sortOrder: 4,
    },
  ],

  skills: [
    { name: 'TypeScript', category: SkillCategory.BACKEND, level: SkillLevel.EXPERT, sortOrder: 1 },
    { name: 'Node.js', category: SkillCategory.BACKEND, level: SkillLevel.EXPERT, sortOrder: 2 },
    { name: 'NestJS', category: SkillCategory.BACKEND, level: SkillLevel.ADVANCED, sortOrder: 3 },
    { name: 'GraphQL', category: SkillCategory.BACKEND, level: SkillLevel.ADVANCED, sortOrder: 4 },
    {
      name: 'PostgreSQL',
      category: SkillCategory.DATABASE,
      level: SkillLevel.ADVANCED,
      sortOrder: 5,
    },
    { name: 'Prisma', category: SkillCategory.DATABASE, level: SkillLevel.ADVANCED, sortOrder: 6 },
    {
      name: 'Redis',
      category: SkillCategory.DATABASE,
      level: SkillLevel.INTERMEDIATE,
      sortOrder: 7,
    },
    {
      name: 'RabbitMQ',
      category: SkillCategory.BACKEND,
      level: SkillLevel.INTERMEDIATE,
      sortOrder: 8,
    },
    { name: 'Docker', category: SkillCategory.DEVOPS, level: SkillLevel.ADVANCED, sortOrder: 9 },
    {
      name: 'Kubernetes',
      category: SkillCategory.DEVOPS,
      level: SkillLevel.INTERMEDIATE,
      sortOrder: 10,
    },
    {
      name: 'GitHub Actions',
      category: SkillCategory.DEVOPS,
      level: SkillLevel.INTERMEDIATE,
      sortOrder: 11,
    },
    { name: 'Jest', category: SkillCategory.TOOLS, level: SkillLevel.ADVANCED, sortOrder: 12 },
    { name: 'Git', category: SkillCategory.TOOLS, level: SkillLevel.EXPERT, sortOrder: 13 },
    {
      name: 'React',
      category: SkillCategory.FRONTEND,
      level: SkillLevel.INTERMEDIATE,
      sortOrder: 14,
    },
  ],

  experiences: [
    {
      company: 'Fintech Solutions',
      position: 'Senior Backend Engineer',
      startDate: '2022-03-01',
      endDate: null,
      location: 'Белград, Сербия · удалённо',
      summary:
        'Платформа B2B-платежей: GraphQL-шлюз к внутренним сервисам, процессинг транзакций, антифрод-интеграции.',
      achievements: [
        'Спроектировал GraphQL-шлюз для 12 внутренних сервисов: p95 ответа снизился с 420 до 180 мс.',
        'Перевёл обработку платежных событий на идемпотентную схему — дубли транзакций сократились на 98%.',
        'Внедрил миграции Prisma и контрактные тесты схемы, релизы перестали требовать ручных проверок БД.',
        'Наставничал трёх backend-разработчиков и проводил ревью ключевых модулей.',
      ],
      sortOrder: 1,
    },
    {
      company: 'RetailTech',
      position: 'Backend Developer',
      startDate: '2019-06-01',
      endDate: '2022-02-28',
      location: 'Москва · гибрид',
      summary: 'Каталог товаров и оформление заказов для сети из 400+ магазинов.',
      achievements: [
        'Разработал сервис каталога на NestJS с кэшированием в Redis, выдержавший пиковые 2 500 RPS.',
        'Сократил время сборки и деплоя с 25 до 7 минут за счёт многоступенчатого Docker-образа.',
        'Покрыл бизнес-логику заказа unit- и e2e-тестами (покрытие 87%).',
      ],
      sortOrder: 2,
    },
    {
      company: 'WebStudio',
      position: 'Fullstack Developer',
      startDate: '2018-01-15',
      endDate: '2019-05-31',
      location: 'Москва',
      summary: 'Клиентские веб-приложения и интеграции с платежными системами.',
      achievements: [
        'Реализовал 15+ клиентских проектов на Node.js и React, включая интеграции с эквайрингом.',
        'Автоматизировал выгрузку отчётов, сэкономив команде около 10 часов ручной работы в неделю.',
      ],
      sortOrder: 3,
    },
  ],

  projects: [
    {
      name: 'Portfolio GraphQL API',
      description:
        'Этот проект: backend цифровой визитки на NestJS, Prisma и GraphQL с админ-панелью, автоматическими миграциями и идемпотентным сидом.',
      repositoryUrl: 'https://github.com/alexey-smirnov/portfolio-graphql-api',
      sortOrder: 1,
      technologies: ['TypeScript', 'NestJS', 'GraphQL', 'Prisma', 'PostgreSQL', 'Docker'],
    },
    {
      name: 'Payments Gateway',
      description:
        'Сервис приёма платежей с идемпотентностью, ретраями, аудитом транзакций и вебхуками для мерчантов.',
      repositoryUrl: 'https://github.com/alexey-smirnov/payments-gateway',
      sortOrder: 2,
      technologies: ['TypeScript', 'Node.js', 'PostgreSQL', 'RabbitMQ', 'Docker'],
    },
    {
      name: 'Catalog Cache Layer',
      description:
        'Слой кэширования каталога товаров с инвалидацией по событиям и прогревом популярных категорий.',
      repositoryUrl: 'https://github.com/alexey-smirnov/catalog-cache-layer',
      sortOrder: 3,
      technologies: ['TypeScript', 'Node.js', 'Redis', 'Kubernetes'],
    },
    {
      name: 'CI Pipeline Toolkit',
      description:
        'Набор переиспользуемых GitHub Actions для сборки, тестирования и публикации Docker-образов.',
      repositoryUrl: 'https://github.com/alexey-smirnov/ci-pipeline-toolkit',
      sortOrder: 4,
      technologies: ['Docker', 'GitHub Actions', 'TypeScript'],
    },
  ],
};
