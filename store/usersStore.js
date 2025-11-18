
const { v4: uuidv4 } = require('uuid');

const users = [
  { id: uuidv4(), name: 'Admin', email: 'admin@example.com', password: 'admin123', role: 'admin', createdAt: Date.now() }
];

module.exports = {
  list: () => users.slice().reverse(),
  findByEmail: (email) => users.find(u => u.email === email),
  findById: (id) => users.find(u => u.id === id),
  create: ({ name, email, password, role }) => {
    const u = { id: uuidv4(), name, email, password, role: role || 'user', createdAt: Date.now() };
    users.push(u);
    return u;
  },
  remove: (id) => {
    const idx = users.findIndex(u => u.id === id);
    if (idx >= 0) users.splice(idx,1);
    return idx >= 0;
  }
};

