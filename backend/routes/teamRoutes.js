import { Router } from 'express';
import { addMember, getTeam, listMembers, listTeams } from '../controllers/teamController.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();
router.get('/', asyncHandler(listTeams));
router.get('/:teamId', asyncHandler(getTeam));
router.get('/:teamId/members', asyncHandler(listMembers));
router.post('/:teamId/members', asyncHandler(addMember));
export default router;

