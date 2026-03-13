const path = require('path');
const fs = require('fs');
const express = require('express');
const expressLayouts = require('express-ejs-layouts');
const session = require('express-session');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');

const DATA_PATH = path.join(__dirname, 'data', 'db.json');

const app = express();
const PORT = process.env.PORT || 3000;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(expressLayouts);

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.use(
  session({
    secret: process.env.SESSION_SECRET || 'clfr-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 1000 * 60 * 60 * 8 },
  })
);

function ensureDataDir() {
  const dir = path.dirname(DATA_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(DATA_PATH)) {
    const defaultOwnerPassword = 'V9!tQ4z@Lm#82pR';
    const ownerHash = bcrypt.hashSync(defaultOwnerPassword, 10);
    const seed = {
      users: [
        {
          id: uuidv4(),
          username: 'Mihail',
          displayName: 'Mihail',
          role: 'owner',
          passwordHash: ownerHash,
          disabled: false,
          createdAt: new Date().toISOString(),
          loginHistory: [],
          avatar: '/assets/default-avatar.svg',
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
    fs.writeFileSync(DATA_PATH, JSON.stringify(seed, null, 2));
  }
}

function readDb() {
  ensureDataDir();
  const raw = fs.readFileSync(DATA_PATH, 'utf-8');
  return JSON.parse(raw);
}

function writeDb(data) {
  ensureDataDir();
  fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2));
}

function requireLogin(req, res, next) {
  if (!req.session.userId) {
    return res.redirect('/login');
  }
  next();
}

function requireRole(role) {
  return (req, res, next) => {
    const db = readDb();
    const user = db.users.find((u) => u.id === req.session.userId);
    if (!user || user.disabled) {
      req.session.destroy(() => {});
      return res.redirect('/login');
    }

    if (role === 'admin') {
      if (user.role === 'admin' || user.role === 'owner') return next();
    }

    if (role === 'owner') {
      if (user.role === 'owner') return next();
    }

    return res.status(403).render('error', { message: 'Access denied.' });
  };
}

function attachUser(req, res, next) {
  if (!req.session.userId) {
    res.locals.currentUser = null;
    return next();
  }
  const db = readDb();
  const user = db.users.find((u) => u.id === req.session.userId);
  if (!user) {
    req.session.destroy(() => {});
    res.locals.currentUser = null;
    return next();
  }
  res.locals.currentUser = user;
  next();
}

app.use(attachUser);

app.get('/', (req, res) => {
  if (!req.session.userId) return res.redirect('/home');
  res.redirect('/home');
});

app.get('/home', (req, res) => {
  res.render('home');
});

app.get('/login', (req, res) => {
  res.render('login', { error: null });
});

app.post('/login', (req, res) => {
  const { username, password } = req.body;
  const db = readDb();
  const user = db.users.find((u) => u.username.toLowerCase() === (username || '').toLowerCase());

  if (!user || user.disabled) {
    return res.render('login', { error: 'Invalid credentials.' });
  }

  if (!bcrypt.compareSync(password || '', user.passwordHash)) {
    return res.render('login', { error: 'Invalid credentials.' });
  }

  req.session.userId = user.id;
  user.loginHistory.unshift({
    at: new Date().toISOString(),
    ip: req.ip,
  });
  writeDb(db);

  res.redirect('/home');
});

app.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/login');
  });
});

app.get('/index', requireLogin, (req, res) => {
  const db = readDb();
  res.render('index', { index: db.index });
});

app.get('/experiments', requireLogin, (req, res) => {
  const db = readDb();
  const experiments = db.experiments.slice().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.render('experiments', { experiments });
});

app.post('/experiments', requireLogin, (req, res) => {
  const { virus, description } = req.body;
  if (!virus || !description) {
    return res.status(400).send('Virus and Description are required.');
  }
  const db = readDb();
  const user = db.users.find((u) => u.id === req.session.userId);
  const entry = {
    id: uuidv4(),
    virus: virus.trim(),
    description: description.trim(),
    createdAt: new Date().toISOString(),
    createdBy: {
      userId: user.id,
      username: user.username,
    },
  };
  db.experiments.unshift(entry);
  writeDb(db);
  res.redirect('/experiments');
});

app.post('/experiments/delete/:id', requireLogin, (req, res) => {
  const { id } = req.params;
  const db = readDb();
  const user = db.users.find((u) => u.id === req.session.userId);
  const experiment = db.experiments.find((e) => e.id === id);
  if (!experiment) return res.status(404).send('Not found');

  const isOwner = user.role === 'owner';
  const isAdmin = user.role === 'admin';
  const isCreator = experiment.createdBy.userId === user.id;
  if (!isOwner && !isAdmin && !isCreator) {
    return res.status(403).send('Forbidden');
  }

  db.experiments = db.experiments.filter((e) => e.id !== id);
  writeDb(db);
  res.redirect('/experiments');
});

app.get('/announcements', requireLogin, (req, res) => {
  const db = readDb();
  const announcements = db.announcements.slice().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.render('announcements', { announcements });
});

app.post('/announcements', requireRole('admin'), (req, res) => {
  const { message } = req.body;
  if (!message) return res.status(400).send('Message required');
  const db = readDb();
  const user = db.users.find((u) => u.id === req.session.userId);
  db.announcements.unshift({
    id: uuidv4(),
    message: message.trim(),
    createdAt: new Date().toISOString(),
    createdBy: { userId: user.id, username: user.username },
  });
  writeDb(db);
  res.redirect('/announcements');
});

app.get('/admin', requireRole('admin'), (req, res) => {
  const db = readDb();
  const users = db.users.map((u) => ({
    id: u.id,
    username: u.username,
    role: u.role,
    disabled: u.disabled,
    createdAt: u.createdAt,
    loginHistory: u.loginHistory || [],
    avatar: u.avatar,
  }));
  const currentUser = db.users.find((u) => u.id === req.session.userId);
  const resetPasswordMessage = req.session.resetPasswordMessage;
  delete req.session.resetPasswordMessage;
  res.render('admin', { users, currentUser, resetPasswordMessage });
});

app.post('/admin/user', requireRole('admin'), (req, res) => {
  const { username, displayName, role } = req.body;
  const db = readDb();

  if (!username) return res.status(400).send('Username required');
  if (!displayName) return res.status(400).send('Display name required');

  const existing = db.users.find((u) => u.username.toLowerCase() === username.toLowerCase());
  if (existing) return res.status(400).send('User already exists');

  const isOwner = db.users.find((u) => u.id === req.session.userId).role === 'owner';
  const targetRole = role === 'owner' ? 'admin' : role; // only owner can create owner; if attempted, create admin

  if (role === 'owner' && !isOwner) {
    return res.status(403).send('Only owner can create owner-level accounts');
  }

  const password = Math.random().toString(36).slice(2, 10) + 'A1!';
  const user = {
    id: uuidv4(),
    username: username.trim(),
    displayName: displayName.trim(),
    role: targetRole || 'user',
    passwordHash: bcrypt.hashSync(password, 10),
    disabled: false,
    createdAt: new Date().toISOString(),
    loginHistory: [],
    avatar: '/assets/default-avatar.svg',
  };
  db.users.push(user);
  writeDb(db);

  res.render('admin', { users: db.users, currentUser: db.users.find((u) => u.id === req.session.userId), newUserPassword: password });
});

app.post('/admin/user/toggle/:id', requireRole('admin'), (req, res) => {
  const { id } = req.params;
  const db = readDb();
  const target = db.users.find((u) => u.id === id);
  if (!target) return res.status(404).send('Not found');
  if (target.role === 'owner') return res.status(403).send('Cannot disable owner');
  target.disabled = !target.disabled;
  writeDb(db);
  res.redirect('/admin');
});

app.post('/admin/user/delete/:id', requireRole('admin'), (req, res) => {
  const { id } = req.params;
  const db = readDb();
  const target = db.users.find((u) => u.id === id);
  if (!target) return res.status(404).send('Not found');
  if (target.role === 'owner') return res.status(403).send('Cannot delete owner');
  db.users = db.users.filter((u) => u.id !== id);
  writeDb(db);
  res.redirect('/admin');
});

app.post('/admin/user/reset/:id', requireRole('admin'), (req, res) => {
  const { id } = req.params;
  const db = readDb();
  const target = db.users.find((u) => u.id === id);
  if (!target) return res.status(404).send('Not found');

  const currentUser = db.users.find((u) => u.id === req.session.userId);
  if (target.role === 'owner' && currentUser.role !== 'owner') {
    return res.status(403).send('Only owner can reset owner password');
  }

  const password = Math.random().toString(36).slice(2, 10) + 'A1!';
  target.passwordHash = bcrypt.hashSync(password, 10);
  writeDb(db);

  req.session.resetPasswordMessage = `Password for ${target.username} reset to: ${password}`;
  res.redirect('/admin');
});

app.post('/profile/avatar', requireLogin, (req, res) => {
  const { avatar } = req.body;
  const db = readDb();
  const user = db.users.find((u) => u.id === req.session.userId);
  if (avatar && avatar.startsWith('/assets/')) {
    user.avatar = avatar;
    writeDb(db);
  }
  res.redirect('/home');
});

app.get('*', (req, res) => {
  res.status(404).render('error', { message: 'Page not found' });
});

app.listen(PORT, () => {
  console.log(`CLFR Research Portal running on http://localhost:${PORT}`);
});
