
const express = require('express');
const router = express.Router();
const authCtrl = require('../controller/authController');
const limiter = require('../middleware/rateLimiter');
const { authMiddleware } = require('../middlewares/auth');

// route-level limiters
const loginLimiter = limiter('login', 10, 60*1000); // 10 req/min

router.post('/register', limiter('register', 20, 60*1000), authCtrl.register);
router.post('/verify-email', limiter('verify', 20, 60*1000), authCtrl.verifyEmail);
router.post('/login', loginLimiter, authCtrl.login);
router.post('/request-reset', limiter('requestReset', 5, 60*1000), authCtrl.requestPasswordReset);
router.post('/reset-password', limiter('reset', 5, 60*1000), authCtrl.resetPassword);

router.get('/me', authMiddleware, authCtrl.me);
router.put('/me', authMiddleware, limiter('updateProfile', 30, 60*1000), authCtrl.updateProfile);

module.exports = router;
