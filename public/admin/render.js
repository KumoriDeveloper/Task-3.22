/** Markup builders for the admin panel. No state or network access lives here. */

import {
  CATEGORY_LABELS,
  KIND_LABELS,
  LEVEL_LABELS,
  escapeHtml as esc,
  period,
} from '../shared/ui.js';

export function linksMarkup(links) {
  if (!links.length) {
    return '<li class="empty">Ссылок пока нет.</li>';
  }

  return links
    .map(
      (link) => `
        <li class="row">
          <div class="row-main">
            <span class="tag">${esc(KIND_LABELS[link.kind] ?? link.kind)}</span>
            <a class="row-title" href="${esc(link.url)}" target="_blank" rel="noreferrer">${esc(link.label)}</a>
            <span class="row-meta">${esc(link.url)}</span>
          </div>
          <div class="row-actions">
            <button type="button" class="btn tiny danger" data-action="delete-link" data-id="${esc(link.id)}">Удалить</button>
          </div>
        </li>`,
    )
    .join('');
}

export function skillsMarkup(skills) {
  if (!skills.length) {
    return '<li class="empty">Навыков пока нет.</li>';
  }

  return skills
    .map(
      (skill) => `
        <li class="row">
          <div class="row-main">
            <span class="row-title">${esc(skill.name)}</span>
            <span class="row-meta">${esc(CATEGORY_LABELS[skill.category] ?? skill.category)} · ${esc(
              LEVEL_LABELS[skill.level] ?? skill.level,
            )} · порядок ${skill.sortOrder}</span>
          </div>
          <div class="row-actions">
            <button type="button" class="btn tiny ghost" data-action="edit-skill" data-id="${esc(skill.id)}">Изменить</button>
            <button type="button" class="btn tiny danger" data-action="delete-skill" data-id="${esc(skill.id)}">Удалить</button>
          </div>
        </li>`,
    )
    .join('');
}

export function experiencesMarkup(experiences) {
  if (!experiences.length) {
    return '<li class="empty">Позиций пока нет.</li>';
  }

  return experiences
    .map(
      (job) => `
        <li class="row">
          <div class="row-main">
            <span class="row-meta">${esc(period(job.startDate, job.endDate))}${
              job.location ? ` · ${esc(job.location)}` : ''
            }</span>
            <span class="row-title">${esc(job.position)} — ${esc(job.company)}</span>
            ${job.summary ? `<p class="row-text">${esc(job.summary)}</p>` : ''}
            ${
              job.achievements.length
                ? `<ul class="bullets">${job.achievements
                    .map((achievement) => `<li>${esc(achievement)}</li>`)
                    .join('')}</ul>`
                : ''
            }
          </div>
          <div class="row-actions">
            <button type="button" class="btn tiny ghost" data-action="edit-experience" data-id="${esc(job.id)}">Изменить</button>
            <button type="button" class="btn tiny danger" data-action="delete-experience" data-id="${esc(job.id)}">Удалить</button>
          </div>
        </li>`,
    )
    .join('');
}

export function projectsMarkup(projects) {
  if (!projects.length) {
    return '<li class="empty">Проектов пока нет.</li>';
  }

  return projects
    .map(
      (project) => `
        <li class="row">
          <div class="row-main">
            <span class="row-title">${esc(project.name)}</span>
            ${project.description ? `<p class="row-text">${esc(project.description)}</p>` : ''}
            ${
              project.technologies.length
                ? `<div class="tech-chips">${project.technologies
                    .map((technology) => `<span>${esc(technology.name)}</span>`)
                    .join('')}</div>`
                : ''
            }
            ${
              project.repositoryUrl
                ? `<span class="row-meta">${esc(project.repositoryUrl)}</span>`
                : project.url
                  ? `<span class="row-meta">${esc(project.url)}</span>`
                  : ''
            }
          </div>
          <div class="row-actions">
            <button type="button" class="btn tiny ghost" data-action="edit-project" data-id="${esc(project.id)}">Изменить</button>
            <button type="button" class="btn tiny danger" data-action="delete-project" data-id="${esc(project.id)}">Удалить</button>
          </div>
        </li>`,
    )
    .join('');
}

/** Checkboxes for the project editor; a project may only use skills of this profile. */
export function technologyOptionsMarkup(skills, selectedIds = []) {
  if (!skills.length) {
    return '<p class="empty">Сначала добавьте навыки — проекты ссылаются на них.</p>';
  }

  return skills
    .map(
      (skill) => `
        <label class="tech-option">
          <input type="checkbox" value="${esc(skill.id)}" ${
            selectedIds.includes(skill.id) ? 'checked' : ''
          } />
          <span>${esc(skill.name)}</span>
        </label>`,
    )
    .join('');
}
