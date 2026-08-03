import { Team, TeamMember, User } from '../models/index.js';
import { requireMembership } from '../services/accessService.js';
import { AppError } from '../utils/AppError.js';

export async function listTeams(request, response) {
  const memberships = await TeamMember.findAll({
    where: { userId: request.user.id },
    include: [{ model: Team }],
    order: [['createdAt', 'ASC']],
  });
  response.json({ teams: memberships.map((membership) => ({ ...membership.Team.toJSON(), role: membership.role })) });
}

export async function getTeam(request, response) {
  const membership = await requireMembership(request.user.id, request.params.teamId);
  const team = await Team.findByPk(request.params.teamId);
  response.json({ team: { ...team.toJSON(), role: membership.role } });
}

export async function listMembers(request, response) {
  await requireMembership(request.user.id, request.params.teamId);
  const members = await TeamMember.findAll({
    where: { teamId: request.params.teamId },
    include: [{ model: User, attributes: ['id', 'name', 'email', 'githubUsername', 'createdAt'] }],
    order: [['createdAt', 'ASC']],
  });
  response.json({ members: members.map((membership) => ({ ...membership.User.toJSON(), role: membership.role })) });
}

export async function addMember(request, response) {
  await requireMembership(request.user.id, request.params.teamId, ['OWNER']);
  const email = String(request.body.email || '').trim().toLowerCase();
  const role = request.body.role || 'MEMBER';
  if (!['ADMIN', 'MEMBER'].includes(role)) throw new AppError('Role must be ADMIN or MEMBER', 400, 'VALIDATION_ERROR');
  const user = await User.findOne({ where: { email } });
  if (!user) throw new AppError('No existing user has that email', 404, 'USER_NOT_FOUND');
  const [membership, created] = await TeamMember.findOrCreate({ where: { userId: user.id, teamId: request.params.teamId }, defaults: { role } });
  if (!created) throw new AppError('That user is already a team member', 409, 'MEMBER_EXISTS');
  response.status(201).json({ member: { ...user.toJSON(), role: membership.role } });
}

