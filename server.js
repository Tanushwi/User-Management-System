// app.js - Single-file config (no .env) - simple & explainable
const express = require('express');
const path = require('path');

const { connectDB } = require('./config/db');
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const { errorHandler } = require('./middleware/auth');
const maintenance = require('./middleware/maintenance');
const { hardDeleteCleanup } = require('./controller/adminController'); // cleanup task

// ====== GLOBAL CONFIG (change here if needed) ======
const PORT = 3000;
const MONGO_URI = 'mongodb://localhost:27017/user_management';
global.AUTH_SECRET = 'mysupersecretkey_change_for_demo'; // used by cryptoAuth
global.TOKEN_EXPIRY = 3600; // seconds
global.MAINTENANCE = false; // set true to enable maintenance mode
// =====================================================

connectDB(MONGO_URI);

const app = express();
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// maintenance middleware - blocks non-admins when MAINTENANCE true
app.use(maintenance);

// simple request logger (console + file)
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

// routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);

// demo pages
app.get('/', (req, res) => res.render('index'));
app.get('/login', (req, res) => res.render('login'));

// schedule hard-delete cleanup: run every hour
setInterval(() => {
  hardDeleteCleanup().catch(err => console.error('Cleanup err', err));
}, 60 * 60 * 1000); // every hour

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
