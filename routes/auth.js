// routes/auth.js
const express = require('express');

module.exports = function(publish, usersStore) {
  const router = express.Router();

  router.get('/login', (req, res) => {
    res.render('auth/login', { error: null });
  });

  router.post('/login', (req, res) => {
    const { email, password } = req.body;
    const user = usersStore.findByEmail(email);
    if (!user || user.password !== password) {
      return res.render('auth/login', { error: 'Invalid credentials' });
    }
    req.session.user = { id: user.id, name: user.name, email: user.email, role: user.role };
    publish('user:login', { id: user.id, name: user.name, email: user.email });
    return res.redirect('/');
  });

  router.get('/register', (req, res) => {
    res.render('auth/register', { error: null, values: {} });
  });

  router.post('/register', (req, res) => {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password) {
      return res.render('auth/register', { error: 'All fields required', values: req.body });
    }
    if (usersStore.findByEmail(email)) {
      return res.render('auth/register', { error: 'Email already used', values: req.body });
    }
    const user = usersStore.create({ name, email, password, role });
    publish('user:register', { id: user.id, name: user.name, email: user.email });
    req.session.user = { id: user.id, name: user.name, email: user.email, role: user.role };
    return res.redirect('/');
  });

  router.post('/logout', (req, res) => {
    const u = req.session.user;
    req.session.destroy(() => {});
    if (u) publish('user:logout', { id: u.id, name: u.name, email: u.email });
    res.redirect('/');
  });

  return router;
};
