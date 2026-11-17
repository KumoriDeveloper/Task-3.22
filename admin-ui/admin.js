import {
  CATEGORY_LABELS,
  KIND_LABELS,
  LEVEL_LABELS,
  escapeHtml as esc,
  monthToIso,
  monthValue,
} from '../shared/ui.js';
import { GraphqlError, graphqlRequest } from '../shared/graphql.js';
import * as documents from './documents.js';
import {
  experiencesMarkup,
  linksMarkup,
  projectsMarkup,
  skillsMarkup,
  technologyOptionsMarkup,
} from './render.js';

const TOKEN_KEY = 'business-card.admin.token';

const PANEL_TITLES = {
  profile: 'Профиль',
  skills: 'Навыки',
  experience: 'Опыт работы',
  projects: 'Проекты',
};

const state = {
  token: sessionStorage.getItem(TOKEN_KEY) ?? '',
  profile: null,
};

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

/* ---------- helpers ---------- */

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

/* ---------- API & session ---------- */

async function api(query, variables = {}) {
  try {
    return await graphqlRequest(query, variables, { token: state.token });
  } catch (error) {
    const isExpired =
      error instanceof GraphqlError &&
      state.token &&
      (error.status === 401 || error.code === 'UNAUTHENTICATED');

    if (isExpired) {
      signOut('Сессия истекла — войдите снова.');
    }

    throw error;
  }
}

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

async function refresh() {
  setStatus('Загрузка…');
  const data = await api(documents.PROFILE_QUERY);

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

  $('#links-list').innerHTML = linksMarkup(profile.links);
  $('#skills-list').innerHTML = skillsMarkup(profile.skills);
  $('#experience-list').innerHTML = experiencesMarkup(profile.experiences);
  $('#projects-list').innerHTML = projectsMarkup(profile.projects);

  $('#skills-count').textContent = profile.skills.length ? `· ${profile.skills.length}` : '';
  $('#experience-count').textContent = profile.experiences.length
    ? `· ${profile.experiences.length}`
    : '';
  $('#projects-count').textContent = profile.projects.length ? `· ${profile.projects.length}` : '';

  renderTechnologyOptions();
}

function renderTechnologyOptions(selectedIds = []) {
  $('#project-techs').innerHTML = technologyOptionsMarkup(state.profile.skills, selectedIds);
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
  $('#skill-name').focus({ preventScroll: true });
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
  $('#experience-company').focus({ preventScroll: true });
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
  $('#project-name').focus({ preventScroll: true });
}

/* ---------- delete actions ---------- */

async function deleteLink(id) {
  if (!window.confirm('Удалить эту ссылку?')) {
    return;
  }
  await api(documents.DELETE_LINK, { id });
  await refresh();
  showToast('Ссылка удалена');
}

async function deleteSkill(id) {
  if (!window.confirm('Удалить навык? Он также исчезнет из проектов, где использовался.')) {
    return;
  }
  await api(documents.DELETE_SKILL, { id });
  await refresh();
  resetSkillForm();
  showToast('Навык удалён');
}

async function deleteExperience(id) {
  if (!window.confirm('Удалить эту позицию из опыта работы?')) {
    return;
  }
  await api(documents.DELETE_EXPERIENCE, { id });
  await refresh();
  resetExperienceForm();
  showToast('Позиция удалена');
}

async function deleteProject(id) {
  if (!window.confirm('Удалить проект?')) {
    return;
  }
  await api(documents.DELETE_PROJECT, { id });
  await refresh();
  resetProjectForm();
  showToast('Проект удалён');
}

/* ---------- event wiring ---------- */

function bindEvents() {
  $('#login-form').addEventListener('submit', async (event) => {
    event.preventDefault();

    const error = $('#login-error');
    const button = $('#login-submit');
    error.hidden = true;
    button.disabled = true;
    button.textContent = 'Входим…';

    try {
      const data = await api(documents.LOGIN, {
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
      await api(documents.UPDATE_PROFILE, {
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
      await api(documents.CREATE_LINK, {
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
        await api(documents.UPDATE_SKILL, { id, input });
      } else {
        await api(documents.CREATE_SKILL, { input });
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
    const input = {
      company: $('#experience-company').value,
      position: $('#experience-position').value,
      startDate: monthToIso($('#experience-start').value),
      endDate: monthToIso($('#experience-end').value),
      location: $('#experience-location').value,
      summary: $('#experience-summary').value,
      achievements: $('#experience-achievements')
        .value.split('\n')
        .map((line) => line.trim())
        .filter(Boolean),
    };

    const saved = await submitForm($('#experience-form'), $('#experience-error'), async () => {
      if (id) {
        await api(documents.UPDATE_EXPERIENCE, { id, input });
      } else {
        await api(documents.CREATE_EXPERIENCE, { input });
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
        await api(documents.UPDATE_PROJECT, { id, input });
      } else {
        await api(documents.CREATE_PROJECT, { input });
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
    await api(documents.ME_QUERY);
    showApp();
    await refresh();
  } catch (error) {
    signOut(error.message);
  }
}

void boot();
