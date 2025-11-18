const express = require('express');
const path = require('path');
const http = require('http');
const session = require('express-session');
const { EventEmitter } = require('events');

const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const pagesRoutes = require('./routes/pages');
const { errorHandler } = require('./middleware/errorHandler');
const { hardDeleteCleanup } = require('./controller/adminController');

const app = express();
const server = http.createServer(app);
const io = require('socket.io')(server);

const PORT = process.env.PORT || 3888;

const pubsub = new EventEmitter();

const usersStore = require('./store/usersStore');

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use('/public', express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

const sessionMiddleware = session({
  secret: process.env.SESSION_SECRET || 'devsecret',
  resave: false,
  saveUninitialized: true,
  cookie: { maxAge: 1000*60*60 }
});
app.use(sessionMiddleware);

app.use((req, res, next) => {
  req.pubsub = pubsub;
  req.usersStore = usersStore;
  next();
});

io.use((socket, next) => {
  sessionMiddleware(socket.request, {}, next);
});

io.on('connection', (socket) => {
  console.log('Socket connected', socket.id);
  socket.emit('welcome', { msg: 'Connected', socketId: socket.id });

  const handler = (data) => {
    io.emit(data.channel, data.payload);
  };
  pubsub.on('broadcast', handler);

  socket.on('disconnect', () => {
    pubsub.off('broadcast', handler);
  });
});

function publish(channel, payload) {
  process.nextTick(() => pubsub.emit('broadcast', { channel, payload }));
}

app.get('/', (req, res) => {
  const user = req.session.user || null;
  res.render('home', { user });
});
app.use('/auth', authRoutes(publish, usersStore));
app.use('/admin', adminRoutes(publish, usersStore));
app.use('/', pagesRoutes);

setInterval(() => {
  hardDeleteCleanup().catch(console.error);
}, 60*60*1000);

app.use(errorHandler);

 server.listen(PORT, () => {
  console.log(`Server running: http://localhost:${PORT}`);
});

module.exports = { app, server, io, publish };
