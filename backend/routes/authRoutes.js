import { Router } from 'express';
import { login, me, register } from '../controllers/authController.js';
import { authenticateUser } from '../middleware/authenticateUser.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();
router.post('/register', asyncHandler(register));
router.post('/login', asyncHandler(login));
router.get('/me', authenticateUser, asyncHandler(me));
export default router;

