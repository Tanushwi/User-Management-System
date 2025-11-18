// routes/admin.js
const express = require('express');
const router = express.Router();

module.exports = function(publish, usersStore) {
  router.get('/dashboard', (req, res) => {
  const user = req.session.user;
  if (!user || user.role !== 'admin') return res.status(403).send('Forbidden');

  const users = usersStore.list();

  res.render('admin/dashboard', { 
    user,
    users
  });
});

  router.post('/delete/:id', (req, res) => {
    const user = req.session.user;
    if (!user || user.role !== 'admin') return res.status(403).send('Forbidden');
    const id = req.params.id;
    const ok = usersStore.remove(id);
    if (ok) publish('admin:user_deleted', { id });
    res.redirect('/admin/dashboard');
  });

  router.get('/users/json', (req, res) => {
    const user = req.session.user;
    if (!user || user.role !== 'admin') return res.status(403).json({ ok:false });
    res.json({ ok:true, users: usersStore.list() });
  });

  return router;
};
