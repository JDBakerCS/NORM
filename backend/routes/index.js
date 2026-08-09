import { Router } from 'express';
import authRoutes from './authRoutes.js';
import teamRoutes from './teamRoutes.js';
import { repositoryRouter, teamRepositoryRouter } from './repositoryRoutes.js';
import pullRequestRoutes from './pullRequestRoutes.js';
import { authenticateUser } from '../middleware/authenticateUser.js';

const router = Router();
router.use('/auth', authRoutes);
router.use('/teams', authenticateUser, teamRoutes);
router.use('/teams/:teamId/repositories', authenticateUser, teamRepositoryRouter);
router.use('/repositories', authenticateUser, repositoryRouter);
router.use('/pull-requests', authenticateUser, pullRequestRoutes);
export default router;
