import { PullRequest, Repository, sequelize } from '../models/index.js';
import { DEFAULT_CRITICAL_PATHS } from '../config/constants.js';
import { requireMembership, requireRepositoryAccess } from '../services/accessService.js';
import { applyDecisionRules, syncRepository } from '../services/syncService.js';
import { AppError } from '../utils/AppError.js';

const OWNER_PATTERN = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})$/;
const REPOSITORY_PATTERN = /^[A-Za-z0-9._-]{1,100}$/;

function normalizeRepositoryIdentity(ownerInput, nameInput) {
  const owner = String(ownerInput || '').trim().toLowerCase();
  const name = String(nameInput || '').trim().toLowerCase();
  if (!OWNER_PATTERN.test(owner) || !REPOSITORY_PATTERN.test(name) || name === '.' || name === '..') {
    throw new AppError('Enter a valid GitHub owner and repository name', 400, 'VALIDATION_ERROR');
  }
  return { owner, name };
}

function normalizeStringArray(value, fieldName) {
  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) {
    throw new AppError(`${fieldName} must be an array of strings`, 400, 'VALIDATION_ERROR');
  }
  return [...new Set(value.map((item) => item.trim()).filter(Boolean))].slice(0, 100);
}

export async function listRepositories(request, response) {
  await requireMembership(request.user.id, request.params.teamId);
  const repositories = await Repository.findAll({ where: { teamId: request.params.teamId }, order: [['name', 'ASC']] });
  response.json({ repositories });
}

export async function createRepository(request, response) {
  await requireMembership(request.user.id, request.params.teamId, ['OWNER', 'ADMIN']);
  const { owner, name } = normalizeRepositoryIdentity(request.body.owner, request.body.name);
  const [repository, created] = await Repository.findOrCreate({
    where: { teamId: request.params.teamId, owner, name },
    defaults: {
      fullName: `${owner}/${name}`,
      htmlUrl: `https://github.com/${encodeURIComponent(owner)}/${encodeURIComponent(name)}`,
      criticalPaths: DEFAULT_CRITICAL_PATHS,
      agentAccounts: [],
    },
  });
  if (!created) throw new AppError('This repository is already registered for the team', 409, 'REPOSITORY_EXISTS');
  response.status(201).json({ repository });
}

export async function getRepository(request, response) {
  const repository = await requireRepositoryAccess(request.user.id, request.params.repositoryId);
  response.json({ repository });
}

export async function updateRepository(request, response) {
  const repository = await requireRepositoryAccess(request.user.id, request.params.repositoryId, ['OWNER', 'ADMIN']);
  const updates = {};
  if (request.body.criticalPaths !== undefined) updates.criticalPaths = normalizeStringArray(request.body.criticalPaths, 'criticalPaths');
  if (request.body.agentAccounts !== undefined) updates.agentAccounts = normalizeStringArray(request.body.agentAccounts, 'agentAccounts');
  if (request.body.lowRiskMaxLines !== undefined) {
    const limit = Number(request.body.lowRiskMaxLines);
    if (!Number.isInteger(limit) || limit < 0 || limit > 10000) throw new AppError('lowRiskMaxLines must be an integer from 0 to 10000', 400, 'VALIDATION_ERROR');
    updates.lowRiskMaxLines = limit;
  }
  await sequelize.transaction(async (transaction) => {
    await repository.update(updates, { transaction });
    const openPullRequests = await PullRequest.findAll({ where: { repositoryId: repository.id, state: 'open' }, transaction });
    for (const pullRequest of openPullRequests) {
      const decision = applyDecisionRules(pullRequest.toJSON(), repository.toJSON());
      await pullRequest.update({
        isAgentGenerated: decision.isAgentGenerated,
        queueStatus: decision.queueStatus,
        urgencyScore: decision.urgencyScore,
        impactScore: decision.impactScore,
        sizeScore: decision.sizeScore,
        ageScore: decision.ageScore,
        priorityScore: decision.priorityScore,
        priorityReasons: decision.priorityReasons,
      }, { transaction });
    }
  });
  response.json({ repository });
}

export async function deleteRepository(request, response) {
  const repository = await requireRepositoryAccess(request.user.id, request.params.repositoryId, ['OWNER', 'ADMIN']);
  await repository.destroy();
  response.status(204).end();
}

export async function synchronizeRepository(request, response) {
  const repository = await requireRepositoryAccess(request.user.id, request.params.repositoryId);
  const result = await syncRepository(repository);
  response.json({ sync: { imported: result.imported, syncedAt: result.syncedAt }, repository: result.repository });
}
