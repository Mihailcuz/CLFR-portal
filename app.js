/*
  CLFR Research Portal - Static SPA version
  Data is stored in localStorage (key: clfrData) and sessionStorage (current user).
*/

const STORAGE_KEY = 'clfrData';
const SESSION_KEY = 'clfrCurrentUser';

const DEFAULT_PASSWORD = 'V9!tQ4z@Lm#82pR';

function sha256(text) {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  return crypto.subtle.digest('SHA-256', data).then((hash) => {
    return Array.from(new Uint8Array(hash))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  });
}

function genId() {
  return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, (c) =>
    (
      c ^
      (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))
    ).toString(16)
  );
}

function randomPassword() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=[]{}|;:,.<>?';
  let pass = '';
  for (let i = 0; i < 12; i += 1) {
    pass += chars[Math.floor(Math.random() * chars.length)];
  }
  return pass;
}

function loadData() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (err) {
      console.warn('Corrupt storage, reseeding.');
    }
  }

  const seed = {
    users: [
      {
        id: genId(),
        username: 'Mihail',
        displayName: 'Mihail',
        role: 'owner',
        passwordHash: '',
        disabled: false,
        createdAt: new Date().toISOString(),
        loginHistory: [],
        avatar: 'assets/default-avatar.svg',
      },
    ],
    experiments: [],
    announcements: [],
    index: {
      title: 'Centum Laboratories Archive',
      sections: [
        {
          heading: 'Facility Overview',
          content:
            'Centum Laboratories (CLFR) operates as a secure research tier facility. All personnel are cleared and access is tightly controlled.',
        },
        {
          heading: 'Divisions',
          content:
            'Containment, Bioinformatics, Diagnostics, Secure Ops, and Administrative Oversight. Each division maintains strict compartmentalization.',
        },
        {
          heading: 'Systems',
          content:
            'Access control, logging, and anomaly detection are mandatory. Stay within your clearance boundaries.',
        },
        {
          heading: 'Operational Documentation',
          content:
            'All operational documentation is maintained in the CLFR Wiki; this index provides a high-level summary of core directives.',
        },
      ],
    },
  };

  saveData(seed);
  // Hash the default password once seed is ready
  sha256(DEFAULT_PASSWORD).then((hash) => {
    seed.users[0].passwordHash = hash;
    saveData(seed);
  });

  return seed;
}

function saveData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function getCurrentUser() {
  const id = sessionStorage.getItem(SESSION_KEY);
  if (!id) return null;
  const { users } = loadData();
  return users.find((u) => u.id === id) || null;
}

function setCurrentUser(user) {
  if (!user) {
    sessionStorage.removeItem(SESSION_KEY);
    return;
  }
  sessionStorage.setItem(SESSION_KEY, user.id);
}

function isAdmin(user) {
  return user && (user.role === 'admin' || user.role === 'owner');
}

function renderTopbar() {
  const user = getCurrentUser();
  const container = document.getElementById('topUserSection');
  container.innerHTML = '';

  if (!user) {
    const login = document.createElement('a');
    login.className = 'btn btn-primary';
    login.textContent = 'Login';
    login.href = '#login';
    container.appendChild(login);
    return;
  }

  const userInfo = document.createElement('div');
  userInfo.className = 'user-info';

  const avatar = document.createElement('div');
  avatar.className = 'avatar';
  avatar.style.backgroundImage = `url('${user.avatar}')`;
  userInfo.appendChild(avatar);

  const meta = document.createElement('div');
  meta.className = 'user-meta';

  const nameRow = document.createElement('div');
  nameRow.className = 'username';
  nameRow.textContent = user.username;
  if (isAdmin(user)) {
    const tag = document.createElement('span');
    tag.className = 'tag';
    tag.textContent = 'Admin';
    nameRow.appendChild(tag);
  }

  meta.appendChild(nameRow);

  const actions = document.createElement('div');
  actions.className = 'user-actions';

  const logout = document.createElement('button');
  logout.className = 'btn btn-ghost';
  logout.textContent = 'Logout';
  logout.addEventListener('click', () => {
    setCurrentUser(null);
    goTo('login');
  });

  const profile = document.createElement('button');
  profile.className = 'btn btn-ghost';
  profile.textContent = 'Profile';
  profile.addEventListener('click', openProfile);

  actions.appendChild(logout);
  actions.appendChild(profile);

  if (isAdmin(user)) {
    const admin = document.createElement('a');
    admin.className = 'btn btn-ghost';
    admin.href = '#admin';
    admin.textContent = 'Admin';
    actions.appendChild(admin);
  }

  meta.appendChild(actions);
  userInfo.appendChild(meta);
  container.appendChild(userInfo);
}

function openProfile() {
  const user = getCurrentUser();
  if (!user) return;
  document.getElementById('profileAvatar').style.backgroundImage = `url('${user.avatar}')`;
  document.getElementById('profileUsername').textContent = user.username;
  document.getElementById('profileRole').textContent = user.role;
  document.getElementById('avatar').value = user.avatar;
  document.getElementById('profileModal').classList.remove('hidden');
}

function closeProfile() {
  document.getElementById('profileModal').classList.add('hidden');
}

function goTo(page) {
  window.location.hash = `#${page}`;
  render();
}

function requireLogin(page) {
  const user = getCurrentUser();
  if (!user) {
    goTo('login');
    return false;
  }
  if (user.disabled) {
    setCurrentUser(null);
    goTo('login');
    return false;
  }
  return true;
}

function requireAdmin() {
  const user = getCurrentUser();
  if (!user || !isAdmin(user)) {
    goTo('home');
    return false;
  }
  return true;
}

function render() {
  const hash = window.location.hash.replace('#', '') || 'home';
  const container = document.getElementById('content');
  const user = getCurrentUser();

  renderTopbar();

  if (user && user.disabled) {
    setCurrentUser(null);
    goTo('login');
    return;
  }

  if (hash === 'login') {
    renderLogin();
    return;
  }

  if (!user) {
    goTo('login');
    return;
  }

  if (hash === 'home') {
    renderHome();
  } else if (hash === 'index') {
    renderIndex();
  } else if (hash === 'experiments') {
    renderExperiments();
  } else if (hash === 'announcements') {
    renderAnnouncements();
  } else if (hash === 'admin') {
    renderAdmin();
  } else {
    renderHome();
  }
}

function renderLogin() {
  const container = document.getElementById('content');
  container.innerHTML = `
    <section class="card">
      <h2>Secure Login</h2>
      <div id="loginError" class="alert" style="display:none"></div>
      <form id="loginForm" class="login-form">
        <div class="field">
          <label for="username">Username</label>
          <input name="username" id="username" autocomplete="username" required />
        </div>
        <div class="field">
          <label for="password">Password</label>
          <input name="password" id="password" type="password" autocomplete="current-password" required />
        </div>
        <div class="actions">
          <button class="btn btn-primary" type="submit">Login</button>
        </div>
      </form>
    </section>
  `;

  document.getElementById('loginForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;

    const data = loadData();
    const user = data.users.find((u) => u.username.toLowerCase() === username.toLowerCase());

    if (!user || user.disabled) {
      showLoginError('Invalid credentials.');
      return;
    }

    const hash = await sha256(password);
    if (hash !== user.passwordHash) {
      showLoginError('Invalid credentials.');
      return;
    }

    user.loginHistory.unshift({
      at: new Date().toISOString(),
      ip: 'local',
    });

    saveData(data);
    setCurrentUser(user);
    goTo('home');
  });
}

function showLoginError(message) {
  const err = document.getElementById('loginError');
  err.textContent = message;
  err.style.display = 'block';
}

function renderHome() {
  const user = getCurrentUser();
  const container = document.getElementById('content');
  container.innerHTML = `
    <section class="hero">
      <div class="hero-content">
        <h1>Centum Laboratories Research Portal</h1>
        <p>Secure access only. Welcome to the CLFR secure intranet. Authenticate to proceed.</p>
        <p class="muted">Signed in as <strong>${user.username}</strong>.</p>
      </div>
    </section>
  `;
}

function renderIndex() {
  const data = loadData();
  const container = document.getElementById('content');
  container.innerHTML = `
    <section class="card">
      <h2>${data.index.title}</h2>
      <div id="indexSections"></div>
    </section>
  `;
  const indexSections = document.getElementById('indexSections');
  data.index.sections.forEach((section) => {
    const sectionEl = document.createElement('div');
    sectionEl.className = 'doc-section';
    sectionEl.innerHTML = `
      <h3>${section.heading}</h3>
      <p>${section.content}</p>
    `;
    indexSections.appendChild(sectionEl);
  });
}

function renderExperiments() {
  if (!requireLogin('experiments')) return;

  const data = loadData();
  const user = getCurrentUser();
  const container = document.getElementById('content');

  container.innerHTML = `
    <section class="card">
      <h2>Experiment Log</h2>
      <p class="muted">Only you and administrators can remove entries you created.</p>
      <form id="experimentForm" class="experiment-form">
        <div class="field">
          <label for="virus">Virus</label>
          <input name="virus" id="virus" required />
        </div>
        <div class="field">
          <label for="description">Description</label>
          <textarea name="description" id="description" rows="4" required></textarea>
        </div>
        <div class="actions">
          <button class="btn btn-primary" type="submit">Log Experiment</button>
        </div>
      </form>
      <div id="experimentList"></div>
    </section>
  `;

  document.getElementById('experimentForm').addEventListener('submit', (event) => {
    event.preventDefault();
    const virus = document.getElementById('virus').value.trim();
    const description = document.getElementById('description').value.trim();
    if (!virus || !description) return;

    const data = loadData();
    const entry = {
      id: genId(),
      virus,
      description,
      createdAt: new Date().toISOString(),
      createdBy: { userId: user.id, username: user.username },
    };
    data.experiments.unshift(entry);
    saveData(data);
    renderExperiments();
  });

  renderExperimentList();

  function renderExperimentList() {
    const list = document.getElementById('experimentList');
    const data = loadData();
    const experiments = data.experiments.slice().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    if (experiments.length === 0) {
      list.innerHTML = '<div class="muted">No experiments logged yet.</div>';
      return;
    }

    list.innerHTML = '<div class="table"></div>';
    const table = list.querySelector('.table');

    experiments.forEach((exp) => {
      const row = document.createElement('div');
      row.className = 'row';
      row.innerHTML = `
        <div class="cell">
          <strong>${exp.virus}</strong><br />
          <span class="muted">${new Date(exp.createdAt).toLocaleString()}</span>
        </div>
        <div class="cell">${exp.description}</div>
        <div class="cell">
          <div class="meta">
            <span class="muted">Logged by ${exp.createdBy.username}</span>
            <div class="inline" id="exp-actions-${exp.id}"></div>
          </div>
        </div>
      `;

      table.appendChild(row);

      const actionsEl = document.getElementById(`exp-actions-${exp.id}`);
      if (isAdmin(user) || user.id === exp.createdBy.userId) {
        const del = document.createElement('button');
        del.className = 'btn btn-danger';
        del.textContent = 'Delete';
        del.addEventListener('click', () => {
          const data = loadData();
          data.experiments = data.experiments.filter((e) => e.id !== exp.id);
          saveData(data);
          renderExperiments();
        });
        actionsEl.appendChild(del);
      }
    });
  }
}

function renderAnnouncements() {
  if (!requireLogin('announcements')) return;

  const data = loadData();
  const user = getCurrentUser();
  const container = document.getElementById('content');

  container.innerHTML = `
    <section class="card">
      <h2>Announcements</h2>
      <div id="announcementForm" style="display: none;">
        <form id="announceForm" class="announcement-form">
          <div class="field">
            <label for="message">Message</label>
            <textarea name="message" id="message" rows="3" required></textarea>
          </div>
          <div class="actions">
            <button class="btn btn-primary" type="submit">Post Announcement</button>
          </div>
        </form>
      </div>
      <div id="announcementList"></div>
    </section>
  `;

  if (isAdmin(user)) {
    document.getElementById('announcementForm').style.display = 'block';
    document.getElementById('announceForm').addEventListener('submit', (event) => {
      event.preventDefault();
      const message = document.getElementById('message').value.trim();
      if (!message) return;
      const data = loadData();
      data.announcements.unshift({
        id: genId(),
        message,
        createdAt: new Date().toISOString(),
        createdBy: { userId: user.id, username: user.username },
      });
      saveData(data);
      renderAnnouncements();
    });
  }

  const list = document.getElementById('announcementList');
  if (data.announcements.length === 0) {
    list.innerHTML = '<div class="muted">No announcements at this time.</div>';
    return;
  }

  list.innerHTML = '<div class="announcements"></div>';
  const wrapper = list.querySelector('.announcements');
  data.announcements.forEach((announcement) => {
    const el = document.createElement('div');
    el.className = 'announcement';
    el.innerHTML = `
      <div class="meta">
        <span class="muted">${new Date(announcement.createdAt).toLocaleString()}</span>
        <span class="muted">by ${announcement.createdBy.username}</span>
      </div>
      <p>${announcement.message}</p>
    `;
    wrapper.appendChild(el);
  });
}

function renderAdmin() {
  if (!requireAdmin()) return;

  const data = loadData();
  const user = getCurrentUser();
  const container = document.getElementById('content');

  container.innerHTML = `
    <section class="card">
      <h2>Admin Settings</h2>
      <p class="muted">Manage accounts, generate credentials, and review login activity.</p>
      <div class="admin-grid">
        <div class="panel">
          <h3>Create Account</h3>
          <form id="createUserForm" class="admin-form">
            <div class="field">
              <label for="newUsername">Username</label>
              <input name="username" id="newUsername" required />
            </div>
            <div class="field">
              <label for="newDisplayName">Display Name</label>
              <input name="displayName" id="newDisplayName" required />
            </div>
            <div class="field">
              <label for="newRole">Role</label>
              <select name="role" id="newRole">
                <option value="user">User</option>
                <option value="admin">Administrator</option>
                ${user.role === 'owner' ? '<option value="owner">Owner</option>' : ''}
              </select>
            </div>
            <div class="actions">
              <button class="btn btn-primary" type="submit">Create</button>
            </div>
          </form>
          <div id="newUserAlert" class="alert" style="display:none"></div>
        </div>
        <div class="panel">
          <h3>Accounts</h3>
          <div id="accountsList" class="table"></div>
        </div>
      </div>
    </section>
  `;

  document.getElementById('createUserForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const username = document.getElementById('newUsername').value.trim();
    const displayName = document.getElementById('newDisplayName').value.trim();
    const role = document.getElementById('newRole').value;
    const alertEl = document.getElementById('newUserAlert');

    if (!username || !displayName) {
      showAdminAlert('newUserAlert', 'Username and display name are required.');
      return;
    }

    const data = loadData();
    if (data.users.some((u) => u.username.toLowerCase() === username.toLowerCase())) {
      showAdminAlert('newUserAlert', 'User already exists.');
      return;
    }

    if (role === 'owner' && user.role !== 'owner') {
      showAdminAlert('newUserAlert', 'Only owner can create owner-level accounts.');
      return;
    }

    const password = randomPassword();
    const hash = await sha256(password);

    const newUser = {
      id: genId(),
      username,
      displayName,
      role: role === 'owner' ? 'admin' : role,
      passwordHash: hash,
      disabled: false,
      createdAt: new Date().toISOString(),
      loginHistory: [],
      avatar: 'assets/default-avatar.svg',
    };

    data.users.push(newUser);
    saveData(data);
    renderAdmin();
    showAdminAlert('newUserAlert', `Account created. Password: ${password}`);
  });

  renderAccounts();
}

function showAdminAlert(id, message) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = message;
  el.style.display = 'block';
}

function renderAccounts() {
  const data = loadData();
  const user = getCurrentUser();
  const list = document.getElementById('accountsList');
  list.innerHTML = '';

  data.users
    .slice()
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    .forEach((u) => {
      const row = document.createElement('div');
      row.className = 'row';

      const info = document.createElement('div');
      info.className = 'cell';
      info.innerHTML = `<strong>${u.username}</strong><br /><span class="muted">${u.role}${u.disabled ? ' (disabled)' : ''}</span>`;

      const meta = document.createElement('div');
      meta.className = 'cell';
      meta.innerHTML = `
        <div class="meta">
          <span class="muted">Created ${new Date(u.createdAt).toLocaleString()}</span>
          <span class="muted">IP: ${u.loginHistory[0]?.ip || 'N/A'}</span>
        </div>
      `;

      const actions = document.createElement('div');
      actions.className = 'cell';
      actions.innerHTML = '<div class="inline"></div>';

      const inline = actions.querySelector('.inline');

      const toggle = document.createElement('button');
      toggle.className = 'btn btn-ghost';
      toggle.textContent = u.disabled ? 'Enable' : 'Disable';
      toggle.addEventListener('click', () => {
        if (u.role === 'owner') return;
        const data = loadData();
        const target = data.users.find((x) => x.id === u.id);
        if (target) {
          target.disabled = !target.disabled;
          saveData(data);
          renderAdmin();
        }
      });

      const remove = document.createElement('button');
      remove.className = 'btn btn-danger';
      remove.textContent = 'Delete';
      remove.disabled = u.role === 'owner';
      remove.addEventListener('click', () => {
        if (u.role === 'owner') return;
        const data = loadData();
        data.users = data.users.filter((x) => x.id !== u.id);
        saveData(data);
        if (u.id === user.id) {
          setCurrentUser(null);
          goTo('login');
        } else {
          renderAdmin();
        }
      });

      const reset = document.createElement('button');
      reset.className = 'btn btn-danger';
      reset.textContent = 'Reset Password';
      reset.addEventListener('click', async () => {
        if (u.role === 'owner' && user.role !== 'owner') {
          showAdminAlert('newUserAlert', 'Only owner can reset owner password.');
          return;
        }
        const data = loadData();
        const target = data.users.find((x) => x.id === u.id);
        if (!target) return;
        const pw = randomPassword();
        target.passwordHash = await sha256(pw);
        saveData(data);
        showAdminAlert('newUserAlert', `Password for ${u.username} reset to: ${pw}`);
      });

      inline.appendChild(toggle);
      inline.appendChild(reset);
      inline.appendChild(remove);

      row.appendChild(info);
      row.appendChild(meta);
      row.appendChild(actions);

      list.appendChild(row);
    });
}

function initProfileModal() {
  const closeBtn = document.getElementById('closeProfile');
  closeBtn.addEventListener('click', closeProfile);

  const form = document.getElementById('avatarForm');
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const avatar = document.getElementById('avatar').value;
    const user = getCurrentUser();
    if (!user) return;
    const data = loadData();
    const target = data.users.find((u) => u.id === user.id);
    if (target) {
      target.avatar = avatar;
      saveData(data);
      renderTopbar();
      closeProfile();
    }
  });

  window.addEventListener('click', (event) => {
    const modal = document.getElementById('profileModal');
    if (event.target === modal) {
      closeProfile();
    }
  });
}

window.addEventListener('hashchange', render);

function init() {
  loadData();
  initProfileModal();
  render();
}

init();
