import {
  CATEGORY_LABELS,
  CATEGORY_ORDER,
  KIND_ICONS,
  LEVEL_STEPS,
  escapeHtml as esc,
  initials,
  levelLabel,
  period,
} from './shared/ui.js';
import { graphqlRequest } from './shared/graphql.js';

const PROFILE_QUERY = `
  query PublicCard {
    profile {
      name
      headline
      description
      email
      location
      avatarUrl
      links {
        id
        label
        url
        kind
      }
      skills {
        id
        name
        category
        level
      }
      experiences {
        id
        company
        position
        startDate
        endDate
        location
        summary
        achievements
      }
      projects {
        id
        name
        description
        url
        repositoryUrl
        technologies {
          id
          name
        }
      }
    }
  }
`;

const $ = (selector) => document.querySelector(selector);

function renderLinks(links) {
  if (!links.length) {
    return '';
  }

  return links
    .map(
      (link) => `
        <a class="link-chip" href="${esc(link.url)}" target="_blank" rel="noreferrer">
          <span class="icon" aria-hidden="true">${esc(KIND_ICONS[link.kind] ?? '↗')}</span>${esc(link.label)}
        </a>`,
    )
    .join('');
}

function renderSkills(skills) {
  if (!skills.length) {
    return '<p class="empty">Пока не добавлено ни одного навыка.</p>';
  }

  const groups = new Map(CATEGORY_ORDER.map((category) => [category, []]));

  for (const skill of skills) {
    const bucket = groups.get(skill.category) ?? [];
    bucket.push(skill);
    groups.set(skill.category, bucket);
  }

  return [...groups.entries()]
    .filter(([, items]) => items.length > 0)
    .map(([category, items]) => {
      const chips = items
        .map((skill) => {
          const filled = LEVEL_STEPS[skill.level] ?? 0;
          const bars = [1, 2, 3, 4]
            .map((step) => `<i class="${step <= filled ? 'on' : ''}"></i>`)
            .join('');

          return `
            <span class="skill" title="${esc(levelLabel(skill.level))}">
              ${esc(skill.name)}
              <span class="level" role="img" aria-label="Уровень: ${esc(levelLabel(skill.level))}">${bars}</span>
            </span>`;
        })
        .join('');

      return `
        <div class="skill-group">
          <h3>${esc(CATEGORY_LABELS[category] ?? category)}</h3>
          <div class="skill-list">${chips}</div>
        </div>`;
    })
    .join('');
}

function renderExperience(experiences) {
  if (!experiences.length) {
    return '<p class="empty">Пока не добавлено ни одной позиции.</p>';
  }

  return experiences
    .map(
      (job) => `
        <article class="job">
          <p class="job-period">${esc(period(job.startDate, job.endDate))}${
            job.location ? ` · ${esc(job.location)}` : ''
          }</p>
          <p class="job-title">
            ${esc(job.position)} <span class="job-company">· ${esc(job.company)}</span>
          </p>
          ${job.summary ? `<p class="job-summary">${esc(job.summary)}</p>` : ''}
          ${
            job.achievements.length
              ? `<ul class="bullets">${job.achievements
                  .map((achievement) => `<li>${esc(achievement)}</li>`)
                  .join('')}</ul>`
              : ''
          }
        </article>`,
    )
    .join('');
}

function renderProjects(projects) {
  if (!projects.length) {
    return '<p class="empty">Пока не добавлено ни одного проекта.</p>';
  }

  return projects
    .map((project, index) => {
      const links = [
        project.url
          ? `<a href="${esc(project.url)}" target="_blank" rel="noreferrer">Сайт ↗</a>`
          : '',
        project.repositoryUrl
          ? `<a href="${esc(project.repositoryUrl)}" target="_blank" rel="noreferrer">Репозиторий ↗</a>`
          : '',
      ]
        .filter(Boolean)
        .join('');

      return `
        <article class="project">
          <span class="project-number" aria-hidden="true">${String(index + 1).padStart(2, '0')}</span>
          <h3>${esc(project.name)}</h3>
          ${project.description ? `<p>${esc(project.description)}</p>` : ''}
          ${
            project.technologies.length
              ? `<div class="techs">${project.technologies
                  .map((technology) => `<span>${esc(technology.name)}</span>`)
                  .join('')}</div>`
              : ''
          }
          ${links ? `<div class="project-links">${links}</div>` : ''}
        </article>`;
    })
    .join('');
}

function renderProfile(profile) {
  const avatar = $('#avatar');
  const avatarUrl = String(profile.avatarUrl ?? '').replace(/["\\\r\n]/g, '');

  avatar.textContent = initials(profile.name);

  if (avatarUrl) {
    avatar.style.backgroundImage = `url("${avatarUrl}")`;
    avatar.textContent = '';
  }

  $('#location').textContent = profile.location ?? '';
  $('#name').textContent = profile.name;
  $('#headline').textContent = profile.headline;
  $('#description').textContent = profile.description;
  $('#links').innerHTML = renderLinks(profile.links);
  $('#skills').innerHTML = renderSkills(profile.skills);
  $('#experience').innerHTML = renderExperience(profile.experiences);
  $('#projects').innerHTML = renderProjects(profile.projects);

  $('#loading').hidden = true;
  $('#card').hidden = false;
}

function showError(message) {
  const node = $('#error');
  node.textContent = message;
  node.hidden = false;
  $('#loading').hidden = true;
}

async function start() {
  try {
    const data = await graphqlRequest(PROFILE_QUERY);

    if (!data?.profile) {
      throw new Error('Профиль ещё не заполнен. Откройте /admin/ и добавьте данные.');
    }

    renderProfile(data.profile);
  } catch (error) {
    showError(error.message || 'Не удалось загрузить данные визитки.');
  }
}

void start();
