import { Router } from 'express';
import {
  getPullRequest,
  getPullRequestCommits,
} from '../controllers/pullRequestController.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();
router.get('/:pullRequestId/commits', asyncHandler(getPullRequestCommits));
router.get('/:pullRequestId', asyncHandler(getPullRequest));
export default router;
