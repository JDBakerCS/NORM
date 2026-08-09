import { Router } from 'express';
import { getPullRequest } from '../controllers/pullRequestController.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();
router.get('/:pullRequestId', asyncHandler(getPullRequest));
export default router;
