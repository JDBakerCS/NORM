import { PullRequest, sequelize } from '../models/index.js';
import { calculatePriority } from './priorityService.js';
import { classifyQueue } from './queueService.js';
import { githubService } from './githubService.js';
import { AppError } from '../utils/AppError.js';

export function detectAgentGenerated(pullRequest, repository) {
  const labels = (pullRequest.labels || []).map((label) => label.toLowerCase());
  const accounts = (repository.agentAccounts || []).map((account) => account.toLowerCase());
  return labels.includes('agent-generated')
    || pullRequest.branchName.toLowerCase().startsWith('agent/')
    || pullRequest.authorType.toLowerCase() === 'bot'
    || accounts.includes(pullRequest.authorLogin.toLowerCase());
}

export function applyDecisionRules(pullRequest, repository, now = new Date()) {
  const withAgentFlag = { ...pullRequest, isAgentGenerated: detectAgentGenerated(pullRequest, repository) };
  const priority = calculatePriority(withAgentFlag, repository, now);
  const queue = classifyQueue(withAgentFlag, repository);
  return { ...withAgentFlag, ...priority, queueStatus: queue.queueStatus };
}

export async function syncRepository(
  repository,
  provider = githubService,
  pullRequestModel = PullRequest,
  runTransaction = (work) => sequelize.transaction(work),
) {
  try {
    const githubRepository = await provider.getRepository(repository.owner, repository.name);
    const openSummaries = await provider.getOpenPullRequests(repository.owner, repository.name);
    const normalizedPullRequests = [];
    for (const summary of openSummaries) {
      normalizedPullRequests.push(await provider.syncPullRequest(repository.owner, repository.name, summary));
    }

    const syncedAt = new Date();
    const rows = normalizedPullRequests.map((pullRequest) => ({
      ...applyDecisionRules(pullRequest, repository, syncedAt),
      repositoryId: repository.id,
      lastSyncedAt: syncedAt,
    }));

    await runTransaction(async (transaction) => {
      await repository.update({
        githubRepositoryId: githubRepository.id,
        fullName: githubRepository.full_name,
        htmlUrl: githubRepository.html_url,
        defaultBranch: githubRepository.default_branch || repository.defaultBranch,
        lastSyncedAt: syncedAt,
      }, { transaction });

      const openIds = rows.map((row) => String(row.githubPullRequestId));
      const existingOpen = await pullRequestModel.findAll({ where: { repositoryId: repository.id, state: 'open' }, transaction });
      for (const existing of existingOpen) {
        if (!openIds.includes(String(existing.githubPullRequestId))) await existing.update({ state: 'closed', lastSyncedAt: syncedAt }, { transaction });
      }

      for (const row of rows) {
        const existing = await pullRequestModel.findOne({ where: { repositoryId: repository.id, githubPullRequestId: row.githubPullRequestId }, transaction });
        if (existing) await existing.update(row, { transaction });
        else await pullRequestModel.create(row, { transaction });
      }
    });

    return { imported: rows.length, repository, syncedAt };
  } catch (error) {
    if (error instanceof AppError) throw error;
    const status = error.status === 401 || error.status === 403 ? 502 : 500;
    const detail = error.status ? `GitHub returned HTTP ${error.status}` : null;
    throw new AppError('Repository could not be synchronized', status, 'GITHUB_SYNC_FAILED', detail);
  }
}
