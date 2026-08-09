import crypto from 'node:crypto';
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getWebhookMetadata,
  processWebhookDelivery,
  registerWebhookDelivery,
  verifyWebhookSignature,
} from '../services/webhookService.js';

function createDelivery(values) {
  return {
    ...values,
    async update(updates) {
      Object.assign(this, updates);
    },
  };
}

function inMemoryDeliveryModel(initialRows = []) {
  const rows = initialRows.map(createDelivery);
  return {
    rows,
    async findOrCreate({ where, defaults }) {
      const existing = rows.find((row) => row.deliveryId === where.deliveryId);
      if (existing) return [existing, false];
      const row = createDelivery({ id: rows.length + 1, ...defaults });
      rows.push(row);
      return [row, true];
    },
    async findByPk(id) {
      return rows.find((row) => row.id === id) || null;
    },
    async findAll() {
      return rows;
    },
  };
}

const pullRequestPayload = {
  action: 'synchronize',
  number: 42,
  repository: { owner: { login: 'Acme' }, name: 'Widget' },
  pull_request: { number: 42, head: { sha: 'abc123' } },
};

test('webhook signatures use a timing-safe HMAC comparison', () => {
  const rawBody = Buffer.from(JSON.stringify(pullRequestPayload));
  const secret = 'webhook-secret';
  const signature = `sha256=${crypto.createHmac('sha256', secret).update(rawBody).digest('hex')}`;
  assert.equal(verifyWebhookSignature(rawBody, signature, secret), true);
  assert.equal(verifyWebhookSignature(rawBody, 'sha256=not-the-right-signature', secret), false);
  assert.equal(verifyWebhookSignature(rawBody, signature, ''), false);
});

test('webhook metadata identifies PRs directly and through check-run payloads', () => {
  assert.deepEqual(getWebhookMetadata('pull_request', pullRequestPayload), {
    action: 'synchronize',
    repositoryOwner: 'acme',
    repositoryName: 'widget',
    pullRequestNumbers: [42],
    headSha: 'abc123',
  });

  const checkRun = getWebhookMetadata('check_run', {
    repository: { owner: { login: 'Acme' }, name: 'Widget' },
    check_run: { head_sha: 'def456', pull_requests: [{ number: 7 }, { number: 7 }, { number: 8 }] },
  });
  assert.deepEqual(checkRun.pullRequestNumbers, [7, 8]);
  assert.equal(checkRun.headSha, 'def456');
});

test('a repeated GitHub delivery is recorded once and does not schedule duplicate work', async () => {
  const deliveries = inMemoryDeliveryModel();
  const first = await registerWebhookDelivery(
    { deliveryId: 'delivery-1', event: 'pull_request', payload: pullRequestPayload },
    deliveries,
  );
  const second = await registerWebhookDelivery(
    { deliveryId: 'delivery-1', event: 'pull_request', payload: pullRequestPayload },
    deliveries,
  );

  assert.equal(first.duplicate, false);
  assert.equal(first.shouldProcess, true);
  assert.equal(first.delivery.status, 'PENDING');
  assert.equal(second.duplicate, true);
  assert.equal(second.shouldProcess, false);
  assert.equal(deliveries.rows.length, 1);
});

test('an unsupported ping delivery is safely recorded without scheduling a sync', async () => {
  const deliveries = inMemoryDeliveryModel();
  const result = await registerWebhookDelivery(
    { deliveryId: 'delivery-ping', event: 'ping', payload: { zen: 'Keep it logically awesome.' } },
    deliveries,
  );

  assert.equal(result.duplicate, false);
  assert.equal(result.shouldProcess, false);
  assert.equal(result.delivery.status, 'IGNORED');
  assert.ok(result.delivery.processedAt instanceof Date);
});

test('a PR delivery refreshes the matching registered repository', async () => {
  const deliveries = inMemoryDeliveryModel([
    {
      id: 1,
      deliveryId: 'delivery-2',
      status: 'PENDING',
      repositoryOwner: 'acme',
      repositoryName: 'widget',
      pullRequestNumbers: [42],
      headSha: 'abc123',
    },
  ]);
  const calls = [];
  const result = await processWebhookDelivery(1, {
    deliveryModel: deliveries,
    repositoryModel: {
      async findAll() {
        return [{ id: 9, owner: 'acme', name: 'widget' }];
      },
    },
    pullRequestModel: {
      async findAll() {
        throw new Error('Direct PR number should not need a SHA lookup');
      },
    },
    async syncPullRequest(repository, pullRequestNumber) {
      calls.push([repository.id, pullRequestNumber]);
    },
  });

  assert.deepEqual(calls, [[9, 42]]);
  assert.deepEqual(result, { processed: true, synchronized: 1 });
  assert.equal(deliveries.rows[0].status, 'COMPLETED');
});

test('a status delivery finds open PRs by head SHA before refreshing them', async () => {
  const deliveries = inMemoryDeliveryModel([
    {
      id: 1,
      deliveryId: 'delivery-3',
      status: 'PENDING',
      repositoryOwner: 'acme',
      repositoryName: 'widget',
      pullRequestNumbers: [],
      headSha: 'status-sha',
    },
  ]);
  const calls = [];
  await processWebhookDelivery(1, {
    deliveryModel: deliveries,
    repositoryModel: {
      async findAll() {
        return [{ id: 9, owner: 'acme', name: 'widget' }];
      },
    },
    pullRequestModel: {
      async findAll() {
        return [{ number: 42 }];
      },
    },
    async syncPullRequest(repository, pullRequestNumber) {
      calls.push([repository.id, pullRequestNumber]);
    },
  });

  assert.deepEqual(calls, [[9, 42]]);
  assert.equal(deliveries.rows[0].status, 'COMPLETED');
});

test('a status delivery with no matching open PR is safely ignored', async () => {
  const deliveries = inMemoryDeliveryModel([
    {
      id: 1,
      deliveryId: 'delivery-4',
      status: 'PENDING',
      repositoryOwner: 'acme',
      repositoryName: 'widget',
      pullRequestNumbers: [],
      headSha: 'unmatched-status-sha',
    },
  ]);
  const calls = [];
  const result = await processWebhookDelivery(1, {
    deliveryModel: deliveries,
    repositoryModel: {
      async findAll() {
        return [{ id: 9, owner: 'acme', name: 'widget' }];
      },
    },
    pullRequestModel: {
      async findAll() {
        return [];
      },
    },
    async syncPullRequest(repository, pullRequestNumber) {
      calls.push([repository.id, pullRequestNumber]);
    },
  });

  assert.deepEqual(result, { processed: false, synchronized: 0 });
  assert.deepEqual(calls, []);
  assert.equal(deliveries.rows[0].status, 'IGNORED');
});
