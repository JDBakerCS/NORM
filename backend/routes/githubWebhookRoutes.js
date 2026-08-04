import { Router } from 'express';
import { receiveGitHubWebhook } from '../controllers/githubWebhookController.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();
router.post('/', asyncHandler(receiveGitHubWebhook));
export default router;
