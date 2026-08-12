import crypto from 'node:crypto';
import { Op } from 'sequelize';
import { PullRequest, Repository, WebhookDelivery } from '../models/index.js';
import { syncSinglePullRequest } from './syncService.js';
import { AppError } from '../utils/AppError.js';

export const WEBHOOK_EVENTS = new Set([
  'pull_request',
  'pull_request_review',
  'check_run',
  'check_suite',
  'status',
]);
const activeRepositoryQueues = new Map();

function text(value, maxLength) {
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  return normalized ? normalized.slice(0, maxLength) : null;
}

function pullRequestNumber(value) {
  const number = Number(value);
  return Number.isSafeInteger(number) && number > 0 ? number : null;
}

function uniqueNumbers(values) {
  return [...new Set(values.map(pullRequestNumber).filter(Boolean))];
}

export function verifyWebhookSignature(rawBody, signature, secret) {
  if (!Buffer.isBuffer(rawBody) || !signature || !secret) return false;
  const expected = `sha256=${crypto.createHmac('sha256', secret).update(rawBody).digest('hex')}`;
  const expectedBuffer = Buffer.from(expected, 'utf8');
  const receivedBuffer = Buffer.from(signature, 'utf8');
  return (
    expectedBuffer.length === receivedBuffer.length &&
    crypto.timingSafeEqual(expectedBuffer, receivedBuffer)
  );
}

export function getWebhookMetadata(event, payload = {}) {
  const repository = payload.repository || {};
  const repositoryOwner =
    text(repository.owner?.login || repository.owner?.name, 100)?.toLowerCase() || null;
  const repositoryName = text(repository.name, 100)?.toLowerCase() || null;
  const directPullRequest =
    event === 'pull_request' ? payload.number : payload.pull_request?.number;
  const checkPullRequests =
    event === 'check_run'
      ? payload.check_run?.pull_requests
      : event === 'check_suite'
        ? payload.check_suite?.pull_requests
        : [];
  const pullRequestNumbers = uniqueNumbers([
    directPullRequest,
    ...(Array.isArray(checkPullRequests)
      ? checkPullRequests.map((pullRequest) => pullRequest?.number)
      : []),
  ]);
  const headSha = text(
    payload.pull_request?.head?.sha ||
      payload.check_run?.head_sha ||
      payload.check_suite?.head_sha ||
      payload.sha,
    64,
  );

  return {
    action: text(payload.action, 100),
    repositoryOwner,
    repositoryName,
    pullRequestNumbers,
    headSha,
  };
}

function shouldProcessDelivery(event, metadata) {
  return (
    WEBHOOK_EVENTS.has(event) &&
    Boolean(metadata.repositoryOwner && metadata.repositoryName) &&
    Boolean(metadata.pullRequestNumbers.length || metadata.headSha)
  );
}

export async function registerWebhookDelivery(
  { deliveryId, event, payload },
  deliveryModel = WebhookDelivery,
) {
  const normalizedDeliveryId = text(deliveryId, 120);
  const normalizedEvent = text(event, 80);
  if (!normalizedDeliveryId || !normalizedEvent) {
    throw new AppError(
      'GitHub webhook delivery headers are required',
      400,
      'WEBHOOK_HEADERS_MISSING',
    );
  }

  const metadata = getWebhookMetadata(normalizedEvent, payload);
  const processable = shouldProcessDelivery(normalizedEvent, metadata);
  const [delivery, created] = await deliveryModel.findOrCreate({
    where: { deliveryId: normalizedDeliveryId },
    defaults: {
      deliveryId: normalizedDeliveryId,
      githubEvent: normalizedEvent,
      ...metadata,
      status: processable ? 'PENDING' : 'IGNORED',
      processedAt: processable ? null : new Date(),
    },
  });

  return { delivery, duplicate: !created, shouldProcess: created && processable };
}

function enqueueRepositoryWork(repositoryId, work) {
  const previous = activeRepositoryQueues.get(repositoryId) || Promise.resolve();
  const queued = previous.catch(() => undefined).then(work);
  activeRepositoryQueues.set(repositoryId, queued);
  return queued.finally(() => {
    if (activeRepositoryQueues.get(repositoryId) === queued)
      activeRepositoryQueues.delete(repositoryId);
  });
}

async function findPullRequestNumbers(delivery, repository, pullRequestModel) {
  if (Array.isArray(delivery.pullRequestNumbers) && delivery.pullRequestNumbers.length) {
    return uniqueNumbers(delivery.pullRequestNumbers);
  }
  if (!delivery.headSha) return [];
  const pullRequests = await pullRequestModel.findAll({
    where: { repositoryId: repository.id, headSha: delivery.headSha, state: 'open' },
  });
  return uniqueNumbers(pullRequests.map((pullRequest) => pullRequest.number));
}

export async function processWebhookDelivery(
  deliveryId,
  {
    deliveryModel = WebhookDelivery,
    repositoryModel = Repository,
    pullRequestModel = PullRequest,
    syncPullRequest = syncSinglePullRequest,
  } = {},
) {
  const delivery = await deliveryModel.findByPk(deliveryId);
  if (!delivery || ['COMPLETED', 'IGNORED'].includes(delivery.status))
    return { processed: false, reason: 'already_handled' };
  if (!delivery.repositoryOwner || !delivery.repositoryName) {
    await delivery.update({ status: 'IGNORED', processedAt: new Date() });
    return { processed: false, reason: 'repository_not_provided' };
  }

  await delivery.update({ status: 'PROCESSING', errorSummary: null });
  try {
    const repositories = await repositoryModel.findAll({
      where: { owner: delivery.repositoryOwner, name: delivery.repositoryName },
    });
    let synchronized = 0;

    for (const repository of repositories) {
      const pullRequestNumbers = await findPullRequestNumbers(
        delivery,
        repository,
        pullRequestModel,
      );
      if (!pullRequestNumbers.length) continue;
      await enqueueRepositoryWork(repository.id, async () => {
        for (const pullRequestNumber of pullRequestNumbers) {
          await syncPullRequest(repository, pullRequestNumber);
          synchronized += 1;
        }
      });
    }

    await delivery.update({
      status: synchronized ? 'COMPLETED' : 'IGNORED',
      processedAt: new Date(),
      errorSummary: null,
    });
    return { processed: Boolean(synchronized), synchronized };
  } catch (error) {
    await delivery.update({
      status: 'FAILED',
      processedAt: new Date(),
      errorSummary: text(error.code || 'WEBHOOK_SYNC_FAILED', 200),
    });
    throw error;
  }
}

export function enqueueWebhookDelivery(deliveryId) {
  setImmediate(() => {
    processWebhookDelivery(deliveryId).catch((error) => {
      console.error(`[WEBHOOK_SYNC_FAILED] ${error.code || error.message}`);
    });
  });
}

export async function resumePendingWebhookDeliveries(deliveryModel = WebhookDelivery) {
  const deliveries = await deliveryModel.findAll({
    where: { status: { [Op.in]: ['PENDING', 'PROCESSING'] } },
    order: [['createdAt', 'ASC']],
    limit: 100,
  });
  for (const delivery of deliveries) enqueueWebhookDelivery(delivery.id);
  return deliveries.length;
}
