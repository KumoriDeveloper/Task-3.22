/**
 * Formatting helpers shared by the public card and the admin panel.
 * Both pages are plain ES modules, so there is no build step for the browser code.
 */

export const CATEGORY_LABELS = {
  BACKEND: 'Backend',
  FRONTEND: 'Frontend',
  DATABASE: 'Базы данных',
  DEVOPS: 'DevOps',
  TOOLS: 'Инструменты',
  SOFT_SKILLS: 'Soft skills',
};

export const CATEGORY_ORDER = Object.keys(CATEGORY_LABELS);

export const LEVEL_LABELS = {
  BEGINNER: 'Начальный',
  INTERMEDIATE: 'Средний',
  ADVANCED: 'Продвинутый',
  EXPERT: 'Эксперт',
};

export const LEVEL_STEPS = {
  BEGINNER: 1,
  INTERMEDIATE: 2,
  ADVANCED: 3,
  EXPERT: 4,
};

export const KIND_LABELS = {
  GITHUB: 'GitHub',
  LINKEDIN: 'LinkedIn',
  WEBSITE: 'Сайт',
  TELEGRAM: 'Telegram',
  EMAIL: 'Email',
  OTHER: 'Другое',
};

export const KIND_ICONS = {
  GITHUB: 'gh',
  LINKEDIN: 'in',
  WEBSITE: 'www',
  TELEGRAM: 'tg',
  EMAIL: '@',
  OTHER: '↗',
};

const HTML_ESCAPES = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

export function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (character) => HTML_ESCAPES[character]);
}

export function initials(name) {
  return String(name ?? '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('');
}

export function monthLabel(isoDate) {
  return new Date(isoDate).toLocaleDateString('ru-RU', {
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

export function period(startDate, endDate) {
  return `${monthLabel(startDate)} — ${endDate ? monthLabel(endDate) : 'сейчас'}`;
}

/** ISO timestamp -> value for <input type="month">. */
export function monthValue(isoDate) {
  return isoDate ? new Date(isoDate).toISOString().slice(0, 7) : '';
}

/** Value from <input type="month"> -> ISO timestamp expected by GraphQL. */
export function monthToIso(value) {
  return value ? `${value}-01T00:00:00.000Z` : null;
}

export function levelLabel(level) {
  return LEVEL_LABELS[level] ?? level;
}
