import { Repository, PullRequest, TeamMember } from '../models/index.js';
import { AppError } from '../utils/AppError.js';

export async function requireMembership(
  userId,
  teamId,
  roles = null,
  teamMemberModel = TeamMember,
) {
  const membership = await teamMemberModel.findOne({ where: { userId, teamId } });
  if (!membership)
    throw new AppError('You do not have access to this team', 403, 'TEAM_ACCESS_DENIED');
  if (roles && !roles.includes(membership.role))
    throw new AppError('Your team role cannot perform this action', 403, 'TEAM_ROLE_REQUIRED');
  return membership;
}

export async function requireRepositoryAccess(userId, repositoryId, roles = null, models = {}) {
  const repositoryModel = models.RepositoryModel || Repository;
  const teamMemberModel = models.TeamMemberModel || TeamMember;
  const repository = await repositoryModel.findByPk(repositoryId);
  if (!repository) throw new AppError('Repository was not found', 404, 'REPOSITORY_NOT_FOUND');
  await requireMembership(userId, repository.teamId, roles, teamMemberModel);
  return repository;
}

export async function requirePullRequestAccess(userId, pullRequestId) {
  const pullRequest = await PullRequest.findByPk(pullRequestId, {
    include: [{ model: Repository }],
  });
  if (!pullRequest) throw new AppError('Pull request was not found', 404, 'PULL_REQUEST_NOT_FOUND');
  await requireMembership(userId, pullRequest.Repository.teamId);
  return pullRequest;
}
