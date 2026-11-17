(() => {
  'use strict';

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

  const CATEGORY_LABELS = {
    BACKEND: 'Backend',
    FRONTEND: 'Frontend',
    DATABASE: 'Базы данных',
    DEVOPS: 'DevOps',
    TOOLS: 'Инструменты',
    SOFT_SKILLS: 'Soft skills',
  };

  const LEVEL_DOTS = { BEGINNER: 1, INTERMEDIATE: 2, ADVANCED: 3, EXPERT: 4 };

  const KIND_ICONS = {
    GITHUB: 'gh',
    LINKEDIN: 'in',
    WEBSITE: 'www',
    TELEGRAM: 'tg',
    EMAIL: '@',
    OTHER: '↗',
  };

  const $ = (selector) => document.querySelector(selector);

  function esc(value) {
    return String(value ?? '').replace(/[&<>"']/g, (char) => {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char];
    });
  }

  function initials(name) {
    return name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0].toUpperCase())
      .join('');
  }

  function monthLabel(isoDate) {
    return new Date(isoDate).toLocaleDateString('ru-RU', {
      month: 'short',
      year: 'numeric',
      timeZone: 'UTC',
    });
  }

  function period(startDate, endDate) {
    return `${monthLabel(startDate)} — ${endDate ? monthLabel(endDate) : 'сейчас'}`;
  }

  function renderLinks(links) {
    if (!links.length) {
      return '';
    }

    return links
      .map(
        (link) => `
          <a class="link-chip" href="${esc(link.url)}" target="_blank" rel="noreferrer">
            <span class="icon">${esc(KIND_ICONS[link.kind] ?? '↗')}</span>${esc(link.label)}
          </a>`,
      )
      .join('');
  }

  function renderSkills(skills) {
    if (!skills.length) {
      return '<p class="state">Пока не добавлено ни одного навыка.</p>';
    }

    const groups = new Map();
    for (const skill of skills) {
      const bucket = groups.get(skill.category) ?? [];
      bucket.push(skill);
      groups.set(skill.category, bucket);
    }

    return [...groups.entries()]
      .map(([category, items]) => {
        const chips = items
          .map((skill) => {
            const filled = LEVEL_DOTS[skill.level] ?? 0;
            const dots = [1, 2, 3, 4]
              .map((index) => `<i class="${index <= filled ? 'on' : ''}"></i>`)
              .join('');
            return `<span class="skill" title="${esc(skill.level)}">${esc(skill.name)}<span class="dots">${dots}</span></span>`;
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
      return '<p class="state">Пока не добавлено ни одной позиции.</p>';
    }

    return experiences
      .map(
        (job) => `
          <article class="job">
            <p class="job-period">${esc(period(job.startDate, job.endDate))}${
              job.location ? ` · ${esc(job.location)}` : ''
            }</p>
            <p class="job-title">${esc(job.position)} <span class="job-company">· ${esc(job.company)}</span></p>
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
      return '<p class="state">Пока не добавлено ни одного проекта.</p>';
    }

    return projects
      .map((project) => {
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

  function render(profile) {
    const avatar = $('#avatar');
    avatar.textContent = initials(profile.name);
    if (profile.avatarUrl) {
      avatar.style.backgroundImage = `url("${profile.avatarUrl.replace(/"/g, '%22')}")`;
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
      const response = await fetch('/graphql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: PROFILE_QUERY }),
      });
      const payload = await response.json();

      if (payload.errors?.length) {
        throw new Error(payload.errors[0].message);
      }
      if (!payload.data?.profile) {
        throw new Error('Профиль ещё не заполнен. Откройте /admin/ и добавьте данные.');
      }

      render(payload.data.profile);
    } catch (error) {
      showError(error.message || 'Не удалось загрузить данные визитки.');
    }
  }

  void start();
})();
