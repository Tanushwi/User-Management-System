const express = require('express');
const router = express.Router();
const adminCtrl = require('../controllers/adminController');
const { authMiddleware } = require('../middlewares/auth');
const { permit } = require('../middlewares/roles');
const limiter = require('../middlewares/rateLimiter');

// admin-only: allow admin or superadmin
router.use(authMiddleware);
router.use(permit('admin','superadmin'));

// route-level limiter for admin routes
router.get('/users', limiter('admin-list', 30, 60*1000), adminCtrl.listUsers);
router.delete('/users/:id', limiter('admin-delete', 20, 60*1000), adminCtrl.softDelete);
router.patch('/users/:id/restore', limiter('admin-restore', 20, 60*1000), adminCtrl.restore);
router.put('/users/:id', limiter('admin-update', 30, 60*1000), adminCtrl.updateUser);

router.get('/export', limiter('admin-export', 5, 60*1000), adminCtrl.exportCSV);
router.get('/stats', limiter('admin-stats', 10, 60*1000), adminCtrl.stats);

module.exports = router;
