import express from 'express';
import * as authController from '../controllers/auth.controller.js';
import authenticate from '../middleware/auth.middleware.js';
import loginRateLimit from '../middleware/loginRateLimit.middleware.js';

const router = express.Router();

router.post('/register', authController.register);
router.post('/login', loginRateLimit, authController.login);
router.get('/me', authenticate, authController.getCurrentUser);

export default router;
