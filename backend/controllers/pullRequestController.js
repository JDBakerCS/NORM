import { Op, literal } from 'sequelize';
import { PullRequest, Repository } from '../models/index.js';
import { CI_STATUSES, QUEUE_STATUSES } from '../config/constants.js';
import { requirePullRequestAccess, requireRepositoryAccess } from '../services/accessService.js';
import { githubService } from '../services/githubService.js';
import { classifyQueue } from '../services/queueService.js';
import { AppError } from '../utils/AppError.js';

export function buildPrioritySort(makeLiteral = literal) {
  return [
    [makeLiteral('"urgency_score" + "impact_score"'), 'DESC'],
    ['githubCreatedAt', 'ASC'],
    ['sizeScore', 'DESC'],
    ['number', 'ASC'],
  ];
}

const SORTS = {
  priority: buildPrioritySort(),
  oldest: [['githubCreatedAt', 'ASC']],
  newest: [['githubCreatedAt', 'DESC']],
  updated: [['githubUpdatedAt', 'DESC']],
};

export async function listPullRequests(request, response) {
  await requireRepositoryAccess(request.user.id, request.params.repositoryId);
  const where = { repositoryId: request.params.repositoryId, state: 'open' };
  if (request.query.queueStatus) {
    if (!QUEUE_STATUSES.includes(request.query.queueStatus))
      throw new AppError('Invalid queueStatus filter', 400, 'VALIDATION_ERROR');
    where.queueStatus = request.query.queueStatus;
  }
  if (request.query.ciStatus) {
    if (!CI_STATUSES.includes(request.query.ciStatus))
      throw new AppError('Invalid ciStatus filter', 400, 'VALIDATION_ERROR');
    where.ciStatus = request.query.ciStatus;
  }
  if (request.query.isAgentGenerated === 'true') where.isAgentGenerated = true;
  if (request.query.isAgentGenerated === 'false') where.isAgentGenerated = false;
  if (request.query.search) {
    const search = String(request.query.search).trim().slice(0, 100);
    where[Op.or] = [
      { title: { [Op.iLike]: `%${search}%` } },
      { authorLogin: { [Op.iLike]: `%${search}%` } },
    ];
  }
  const selectedSort = SORTS[request.query.sort] || SORTS.priority;
  const queueOrder = literal(
    `CASE "queue_status" WHEN 'REVIEW_NOW' THEN 1 WHEN 'RETURN_TO_AGENT' THEN 2 WHEN 'WAITING' THEN 3 WHEN 'LOW_RISK' THEN 4 ELSE 5 END`,
  );
  const pullRequests = await PullRequest.findAll({
    where,
    order: request.query.queueStatus ? selectedSort : [[queueOrder, 'ASC'], ...selectedSort],
  });
  response.json({ pullRequests });
}

export async function getPullRequest(request, response) {
  const pullRequest = await requirePullRequestAccess(request.user.id, request.params.pullRequestId);
  const repository =
    pullRequest.Repository || (await Repository.findByPk(pullRequest.repositoryId));
  const queueDecision = classifyQueue(pullRequest.toJSON(), repository.toJSON());
  response.json({ pullRequest, queueDecision });
}

export async function getPullRequestCommits(request, response) {
  const pullRequest = await requirePullRequestAccess(request.user.id, request.params.pullRequestId);
  const repository =
    pullRequest.Repository || (await Repository.findByPk(pullRequest.repositoryId));
  const commits = await githubService.getPullRequestCommits(
    repository.owner,
    repository.name,
    pullRequest.number,
  );
  response.json({ commits });
}
