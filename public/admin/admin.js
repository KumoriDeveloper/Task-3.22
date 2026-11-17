(() => {
  'use strict';

  const TOKEN_KEY = 'business-card.admin.token';

  const PANEL_TITLES = {
    profile: 'Профиль',
    skills: 'Навыки',
    experience: 'Опыт работы',
    projects: 'Проекты',
  };

  const CATEGORY_LABELS = {
    BACKEND: 'Backend',
    FRONTEND: 'Frontend',
    DATABASE: 'Базы данных',
    DEVOPS: 'DevOps',
    TOOLS: 'Инструменты',
    SOFT_SKILLS: 'Soft skills',
  };

  const LEVEL_LABELS = {
    BEGINNER: 'Начальный',
    INTERMEDIATE: 'Средний',
    ADVANCED: 'Продвинутый',
    EXPERT: 'Эксперт',
  };

  const KIND_LABELS = {
    GITHUB: 'GitHub',
    LINKEDIN: 'LinkedIn',
    WEBSITE: 'Сайт',
    TELEGRAM: 'Telegram',
    EMAIL: 'Email',
    OTHER: 'Другое',
  };

  const PROFILE_QUERY = `
    query AdminProfile {
      profile {
        id
        name
        headline
        description
        email
        location
        avatarUrl
        links { id label url kind sortOrder }
        skills { id name category level sortOrder }
        experiences {
          id company position startDate endDate location summary achievements sortOrder
        }
        projects {
          id name description url repositoryUrl sortOrder
          technologies { id name }
        }
      }
    }
  `;

  const ME_QUERY = `query Me { me { id email name } }`;

  const LOGIN = `
    mutation Login($input: LoginInput!) {
      login(input: $input) { accessToken admin { id email name } }
    }
  `;

  const UPDATE_PROFILE = `
    mutation UpdateProfile($input: UpdateProfileInput!) {
      updateProfile(input: $input) { id }
    }
  `;

  const CREATE_LINK = `
    mutation CreateLink($input: CreateSocialLinkInput!) {
      createSocialLink(input: $input) { id }
    }
  `;

  const DELETE_LINK = `mutation DeleteLink($id: ID!) { deleteSocialLink(id: $id) }`;

  const CREATE_SKILL = `
    mutation CreateSkill($input: CreateSkillInput!) {
      createSkill(input: $input) { id }
    }
  `;

  const UPDATE_SKILL = `
    mutation UpdateSkill($id: ID!, $input: UpdateSkillInput!) {
      updateSkill(id: $id, input: $input) { id }
    }
  `;

  const DELETE_SKILL = `mutation DeleteSkill($id: ID!) { deleteSkill(id: $id) }`;

  const CREATE_EXPERIENCE = `
    mutation CreateExperience($input: CreateExperienceInput!) {
      createExperience(input: $input) { id }
    }
  `;

  const UPDATE_EXPERIENCE = `
    mutation UpdateExperience($id: ID!, $input: UpdateExperienceInput!) {
      updateExperience(id: $id, input: $input) { id }
    }
  `;

  const DELETE_EXPERIENCE = `mutation DeleteExperience($id: ID!) { deleteExperience(id: $id) }`;

  const CREATE_PROJECT = `
    mutation CreateProject($input: CreateProjectInput!) {
      createProject(input: $input) { id }
    }
  `;

  const UPDATE_PROJECT = `
    mutation UpdateProject($id: ID!, $input: UpdateProjectInput!) {
      updateProject(id: $id, input: $input) { id }
    }
  `;

  const DELETE_PROJECT = `mutation DeleteProject($id: ID!) { deleteProject(id: $id) }`;

  const state = {
    token: sessionStorage.getItem(TOKEN_KEY) ?? '',
    profile: null,
  };

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

  /* ---------- helpers ---------- */

  function esc(value) {
    return String(value ?? '').replace(/[&<>"']/g, (char) => {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char];
    });
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

  function monthValue(isoDate) {
    return isoDate ? new Date(isoDate).toISOString().slice(0, 7) : '';
  }

  function monthToIso(value) {
    return value ? `${value}-01T00:00:00.000Z` : null;
  }

  function fillSelect(select, labels, selected) {
    select.innerHTML = Object.entries(labels)
      .map(([value, label]) => `<option value="${esc(value)}">${esc(label)}</option>`)
      .join('');
    if (selected) {
      select.value = selected;
    }
  }

  function showToast(message, variant = 'success') {
    const toast = $('#toast');
    toast.textContent = message;
    toast.classList.toggle('error', variant === 'error');
    toast.hidden = false;
    window.clearTimeout(showToast.timeout);
    showToast.timeout = window.setTimeout(() => {
      toast.hidden = true;
    }, 3200);
  }

  function setStatus(text) {
    $('#status').textContent = text;
  }

  /* ---------- API ---------- */

  async function api(query, variables = {}) {
    const headers = { 'Content-Type': 'application/json' };
    if (state.token) {
      headers.Authorization = `Bearer ${state.token}`;
    }

    const response = await fetch('/graphql', {
      method: 'POST',
      headers,
      body: JSON.stringify({ query, variables }),
    });

    let payload = null;
    try {
      payload = await response.json();
    } catch {
      payload = null;
    }

    if (!response.ok || !payload || payload.errors) {
      const message =
        payload?.errors?.[0]?.message ?? `Запрос не выполнен (HTTP ${response.status})`;

      if (response.status === 401 || /authentication required|session is invalid/i.test(message)) {
        signOut('Сессия истекла — войдите снова.');
      }

      throw new Error(message);
    }

    return payload.data;
  }

  async function refresh() {
    setStatus('Загрузка…');
    const data = await api(PROFILE_QUERY);

    if (!data?.profile) {
      throw new Error('Профиль ещё не создан в базе данных');
    }

    state.profile = data.profile;
    renderAll();
    setStatus('Данные актуальны');
  }

  /* ---------- rendering ---------- */

  function renderAll() {
    const profile = state.profile;
    if (!profile) {
      return;
    }

    $('#profile-name').value = profile.name;
    $('#profile-headline').value = profile.headline;
    $('#profile-description').value = profile.description;
    $('#profile-email').value = profile.email;
    $('#profile-location').value = profile.location ?? '';
    $('#profile-avatar').value = profile.avatarUrl ?? '';

    renderLinks();
    renderSkills();
    renderExperiences();
    renderProjects();
    renderTechnologyOptions();
  }

  function renderLinks() {
    const list = $('#links-list');
    const links = state.profile.links;

    if (!links.length) {
      list.innerHTML = '<li class="empty">Ссылок пока нет.</li>';
      return;
    }

    list.innerHTML = links
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

  function renderSkills() {
    const list = $('#skills-list');
    const skills = state.profile.skills;
    $('#skills-count').textContent = skills.length ? `· ${skills.length}` : '';

    if (!skills.length) {
      list.innerHTML = '<li class="empty">Навыков пока нет.</li>';
      return;
    }

    list.innerHTML = skills
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

  function renderExperiences() {
    const list = $('#experience-list');
    const experiences = state.profile.experiences;
    $('#experience-count').textContent = experiences.length ? `· ${experiences.length}` : '';

    if (!experiences.length) {
      list.innerHTML = '<li class="empty">Позиций пока нет.</li>';
      return;
    }

    list.innerHTML = experiences
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

  function renderProjects() {
    const list = $('#projects-list');
    const projects = state.profile.projects;
    $('#projects-count').textContent = projects.length ? `· ${projects.length}` : '';

    if (!projects.length) {
      list.innerHTML = '<li class="empty">Проектов пока нет.</li>';
      return;
    }

    list.innerHTML = projects
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

  function renderTechnologyOptions(selectedIds = []) {
    const container = $('#project-techs');
    const skills = state.profile.skills;

    if (!skills.length) {
      container.innerHTML =
        '<p class="empty">Сначала добавьте навыки — проекты ссылаются на них.</p>';
      return;
    }

    container.innerHTML = skills
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

  /* ---------- panels & forms ---------- */

  function switchPanel(name) {
    $$('.nav-btn').forEach((button) => {
      button.classList.toggle('is-active', button.dataset.panel === name);
    });
    $$('[data-panel-view]').forEach((panel) => {
      panel.classList.toggle('is-active', panel.dataset.panelView === name);
    });
    $('#panel-title').textContent = PANEL_TITLES[name] ?? '';
  }

  async function submitForm(form, errorNode, action) {
    const button = form.querySelector('button[type="submit"]');
    const label = button.textContent;
    errorNode.hidden = true;
    button.disabled = true;
    button.textContent = 'Сохраняем…';

    try {
      await action();
      return true;
    } catch (error) {
      errorNode.textContent = error.message || 'Не удалось сохранить изменения';
      errorNode.hidden = false;
      return false;
    } finally {
      button.disabled = false;
      button.textContent = label;
    }
  }

  function resetSkillForm() {
    $('#skill-id').value = '';
    $('#skill-name').value = '';
    $('#skill-category').value = 'BACKEND';
    $('#skill-level').value = 'INTERMEDIATE';
    $('#skill-order').value = '0';
    $('#skill-form-title').textContent = 'Новый навык';
    $('#skill-submit').textContent = 'Добавить';
    $('#skill-cancel').hidden = true;
  }

  function resetExperienceForm() {
    $('#experience-id').value = '';
    $('#experience-company').value = '';
    $('#experience-position').value = '';
    $('#experience-start').value = '';
    $('#experience-end').value = '';
    $('#experience-location').value = '';
    $('#experience-summary').value = '';
    $('#experience-achievements').value = '';
    $('#experience-form-title').textContent = 'Новая позиция';
    $('#experience-submit').textContent = 'Добавить';
    $('#experience-cancel').hidden = true;
  }

  function resetProjectForm() {
    $('#project-id').value = '';
    $('#project-name').value = '';
    $('#project-description').value = '';
    $('#project-url').value = '';
    $('#project-repo').value = '';
    $('#project-form-title').textContent = 'Новый проект';
    $('#project-submit').textContent = 'Добавить';
    $('#project-cancel').hidden = true;
    renderTechnologyOptions();
  }

  function editSkill(id) {
    const skill = state.profile.skills.find((item) => item.id === id);
    if (!skill) {
      return;
    }

    switchPanel('skills');
    $('#skill-id').value = skill.id;
    $('#skill-name').value = skill.name;
    $('#skill-category').value = skill.category;
    $('#skill-level').value = skill.level;
    $('#skill-order').value = String(skill.sortOrder);
    $('#skill-form-title').textContent = `Редактирование: ${skill.name}`;
    $('#skill-submit').textContent = 'Сохранить';
    $('#skill-cancel').hidden = false;
    $('#skill-form').scrollIntoView({ behavior: 'smooth', block: 'start' });
    $('#skill-name').focus();
  }

  function editExperience(id) {
    const job = state.profile.experiences.find((item) => item.id === id);
    if (!job) {
      return;
    }

    switchPanel('experience');
    $('#experience-id').value = job.id;
    $('#experience-company').value = job.company;
    $('#experience-position').value = job.position;
    $('#experience-start').value = monthValue(job.startDate);
    $('#experience-end').value = monthValue(job.endDate);
    $('#experience-location').value = job.location ?? '';
    $('#experience-summary').value = job.summary ?? '';
    $('#experience-achievements').value = job.achievements.join('\n');
    $('#experience-form-title').textContent = `Редактирование: ${job.position}`;
    $('#experience-submit').textContent = 'Сохранить';
    $('#experience-cancel').hidden = false;
    $('#experience-form').scrollIntoView({ behavior: 'smooth', block: 'start' });
    $('#experience-company').focus();
  }

  function editProject(id) {
    const project = state.profile.projects.find((item) => item.id === id);
    if (!project) {
      return;
    }

    switchPanel('projects');
    $('#project-id').value = project.id;
    $('#project-name').value = project.name;
    $('#project-description').value = project.description ?? '';
    $('#project-url').value = project.url ?? '';
    $('#project-repo').value = project.repositoryUrl ?? '';
    $('#project-form-title').textContent = `Редактирование: ${project.name}`;
    $('#project-submit').textContent = 'Сохранить';
    $('#project-cancel').hidden = false;
    renderTechnologyOptions(project.technologies.map((technology) => technology.id));
    $('#project-form').scrollIntoView({ behavior: 'smooth', block: 'start' });
    $('#project-name').focus();
  }

  /* ---------- actions ---------- */

  async function deleteLink(id) {
    if (!window.confirm('Удалить эту ссылку?')) {
      return;
    }
    await api(DELETE_LINK, { id });
    await refresh();
    showToast('Ссылка удалена');
  }

  async function deleteSkill(id) {
    if (!window.confirm('Удалить навык? Он также исчезнет из проектов, где использовался.')) {
      return;
    }
    await api(DELETE_SKILL, { id });
    await refresh();
    resetSkillForm();
    showToast('Навык удалён');
  }

  async function deleteExperience(id) {
    if (!window.confirm('Удалить эту позицию из опыта работы?')) {
      return;
    }
    await api(DELETE_EXPERIENCE, { id });
    await refresh();
    resetExperienceForm();
    showToast('Позиция удалена');
  }

  async function deleteProject(id) {
    if (!window.confirm('Удалить проект?')) {
      return;
    }
    await api(DELETE_PROJECT, { id });
    await refresh();
    resetProjectForm();
    showToast('Проект удалён');
  }

  /* ---------- session ---------- */

  function showLogin(message) {
    $('#shell').hidden = true;
    $('#login-screen').hidden = false;

    const error = $('#login-error');
    error.hidden = !message;
    error.textContent = message ?? '';
  }

  function showApp() {
    $('#login-screen').hidden = true;
    $('#shell').hidden = false;
  }

  function signOut(message) {
    state.token = '';
    state.profile = null;
    sessionStorage.removeItem(TOKEN_KEY);
    showLogin(message);
  }

  /* ---------- wiring ---------- */

  function bindEvents() {
    $('#login-form').addEventListener('submit', async (event) => {
      event.preventDefault();

      const error = $('#login-error');
      const button = $('#login-submit');
      error.hidden = true;
      button.disabled = true;
      button.textContent = 'Входим…';

      try {
        const data = await api(LOGIN, {
          input: {
            email: $('#login-email').value.trim(),
            password: $('#login-password').value,
          },
        });

        state.token = data.login.accessToken;
        sessionStorage.setItem(TOKEN_KEY, state.token);
        $('#login-password').value = '';
        showApp();
        await refresh();
        showToast('Добро пожаловать!');
      } catch (err) {
        error.textContent = err.message;
        error.hidden = false;
      } finally {
        button.disabled = false;
        button.textContent = 'Войти';
      }
    });

    $('#profile-form').addEventListener('submit', async (event) => {
      event.preventDefault();

      await submitForm($('#profile-form'), $('#profile-error'), async () => {
        await api(UPDATE_PROFILE, {
          input: {
            name: $('#profile-name').value,
            headline: $('#profile-headline').value,
            description: $('#profile-description').value,
            email: $('#profile-email').value,
            location: $('#profile-location').value,
            avatarUrl: $('#profile-avatar').value,
          },
        });
        await refresh();
        showToast('Профиль сохранён');
      });
    });

    $('#link-form').addEventListener('submit', async (event) => {
      event.preventDefault();

      const saved = await submitForm($('#link-form'), $('#link-error'), async () => {
        await api(CREATE_LINK, {
          input: {
            label: $('#link-label').value,
            url: $('#link-url').value,
            kind: $('#link-kind').value,
          },
        });
        await refresh();
        showToast('Ссылка добавлена');
      });

      if (saved) {
        $('#link-label').value = '';
        $('#link-url').value = '';
      }
    });

    $('#skill-form').addEventListener('submit', async (event) => {
      event.preventDefault();

      const id = $('#skill-id').value;
      const input = {
        name: $('#skill-name').value,
        category: $('#skill-category').value,
        level: $('#skill-level').value,
        sortOrder: Number($('#skill-order').value || 0),
      };

      const saved = await submitForm($('#skill-form'), $('#skill-error'), async () => {
        if (id) {
          await api(UPDATE_SKILL, { id, input });
        } else {
          await api(CREATE_SKILL, { input });
        }
        await refresh();
        showToast(id ? 'Навык обновлён' : 'Навык добавлен');
      });

      if (saved) {
        resetSkillForm();
      }
    });

    $('#experience-form').addEventListener('submit', async (event) => {
      event.preventDefault();

      const id = $('#experience-id').value;
      const endDate = monthToIso($('#experience-end').value);
      const input = {
        company: $('#experience-company').value,
        position: $('#experience-position').value,
        startDate: monthToIso($('#experience-start').value),
        endDate,
        location: $('#experience-location').value,
        summary: $('#experience-summary').value,
        achievements: $('#experience-achievements')
          .value.split('\n')
          .map((line) => line.trim())
          .filter(Boolean),
      };

      const saved = await submitForm($('#experience-form'), $('#experience-error'), async () => {
        if (id) {
          await api(UPDATE_EXPERIENCE, { id, input });
        } else {
          await api(CREATE_EXPERIENCE, { input });
        }
        await refresh();
        showToast(id ? 'Позиция обновлена' : 'Позиция добавлена');
      });

      if (saved) {
        resetExperienceForm();
      }
    });

    $('#project-form').addEventListener('submit', async (event) => {
      event.preventDefault();

      const id = $('#project-id').value;
      const technologyIds = $$('#project-techs input:checked').map((input) => input.value);
      const input = {
        name: $('#project-name').value,
        description: $('#project-description').value,
        url: $('#project-url').value,
        repositoryUrl: $('#project-repo').value,
        technologyIds,
      };

      const saved = await submitForm($('#project-form'), $('#project-error'), async () => {
        if (id) {
          await api(UPDATE_PROJECT, { id, input });
        } else {
          await api(CREATE_PROJECT, { input });
        }
        await refresh();
        showToast(id ? 'Проект обновлён' : 'Проект добавлен');
      });

      if (saved) {
        resetProjectForm();
      }
    });

    document.addEventListener('click', async (event) => {
      const target = event.target.closest('[data-action]');
      if (!target) {
        return;
      }

      const { action, id, panel } = target.dataset;

      try {
        switch (action) {
          case 'panel':
            switchPanel(panel);
            break;
          case 'logout':
            signOut('Вы вышли из админ-панели.');
            break;
          case 'cancel-skill':
            resetSkillForm();
            break;
          case 'cancel-experience':
            resetExperienceForm();
            break;
          case 'cancel-project':
            resetProjectForm();
            break;
          case 'delete-link':
            await deleteLink(id);
            break;
          case 'edit-skill':
            editSkill(id);
            break;
          case 'delete-skill':
            await deleteSkill(id);
            break;
          case 'edit-experience':
            editExperience(id);
            break;
          case 'delete-experience':
            await deleteExperience(id);
            break;
          case 'edit-project':
            editProject(id);
            break;
          case 'delete-project':
            await deleteProject(id);
            break;
          default:
            break;
        }
      } catch (error) {
        showToast(error.message || 'Не удалось выполнить действие', 'error');
      }
    });
  }

  async function boot() {
    fillSelect($('#skill-category'), CATEGORY_LABELS, 'BACKEND');
    fillSelect($('#skill-level'), LEVEL_LABELS, 'INTERMEDIATE');
    fillSelect($('#link-kind'), KIND_LABELS, 'GITHUB');
    bindEvents();

    if (!state.token) {
      showLogin();
      return;
    }

    try {
      await api(ME_QUERY);
      showApp();
      await refresh();
    } catch (error) {
      signOut(error.message);
    }
  }

  void boot();
})();
