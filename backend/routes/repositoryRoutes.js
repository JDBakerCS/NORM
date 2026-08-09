import { Router } from 'express';
import {
  createRepository,
  deleteRepository,
  getRepository,
  listRepositories,
  synchronizeRepository,
  updateRepository,
} from '../controllers/repositoryController.js';
import { listPullRequests } from '../controllers/pullRequestController.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const teamRepositoryRouter = Router({ mergeParams: true });
teamRepositoryRouter.get('/', asyncHandler(listRepositories));
teamRepositoryRouter.post('/', asyncHandler(createRepository));

export const repositoryRouter = Router();
repositoryRouter.get('/:repositoryId', asyncHandler(getRepository));
repositoryRouter.patch('/:repositoryId', asyncHandler(updateRepository));
repositoryRouter.delete('/:repositoryId', asyncHandler(deleteRepository));
repositoryRouter.post('/:repositoryId/sync', asyncHandler(synchronizeRepository));
repositoryRouter.get('/:repositoryId/pull-requests', asyncHandler(listPullRequests));
