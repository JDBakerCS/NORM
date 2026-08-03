import test from 'node:test';
import assert from 'node:assert/strict';
import { syncRepository } from '../services/syncService.js';

const normalized = (overrides = {}) => ({
  githubPullRequestId: 12345,
  number: 42,
  title: 'Update API route',
  bodyPreview: null,
  authorLogin: 'dev',
  authorType: 'User',
  htmlUrl: 'https://github.com/acme/widget/pull/42',
  branchName: 'feature/api',
  state: 'open',
  labels: [],
  isDraft: false,
  additions: 40,
  deletions: 10,
  changedLines: 50,
  changedFilesCount: 1,
  changedFilePaths: ['backend/routes/widget.js'],
  headSha: 'abc123',
  ciStatus: 'PASSED',
  reviewStatus: 'PENDING',
  mergeableStatus: 'MERGEABLE',
  githubCreatedAt: new Date(Date.now() - 86_400_000),
  githubUpdatedAt: new Date(),
  ...overrides,
});

function inMemoryModel() {
  const rows = [];
  return {
    rows,
    async findAll({ where }) { return rows.filter((row) => row.repositoryId === where.repositoryId && row.state === where.state); },
    async findOne({ where }) { return rows.find((row) => row.repositoryId === where.repositoryId && String(row.githubPullRequestId) === String(where.githubPullRequestId)) || null; },
    async create(values) {
      const row = { ...values, async update(updates) { Object.assign(this, updates); } };
      rows.push(row);
      return row;
    },
  };
}

function repository() {
  return {
    id: 9,
    owner: 'acme',
    name: 'widget',
    defaultBranch: 'main',
    criticalPaths: ['auth/'],
    agentAccounts: [],
    lowRiskMaxLines: 50,
    async update(values) { Object.assign(this, values); },
  };
}

function provider(current) {
  return {
    async getRepository() { return { id: 77, full_name: 'acme/widget', html_url: 'https://github.com/acme/widget', default_branch: 'main' }; },
    async getOpenPullRequests() { return current.value ? [{ number: current.value.number }] : []; },
    async syncPullRequest() { return current.value; },
  };
}

const runTransaction = async (work) => work({});

test('first sync creates, second sync updates without a duplicate and recalculates', async () => {
  const model = inMemoryModel();
  const repo = repository();
  const current = { value: normalized() };
  await syncRepository(repo, provider(current), model, runTransaction);
  assert.equal(model.rows.length, 1);
  assert.equal(model.rows[0].urgencyScore, 0);
  assert.equal(model.rows[0].impactScore, 15);

  current.value = normalized({ title: 'Urgent auth update', labels: ['priority:critical'], changedFilePaths: ['auth/session.js'], changedLines: 900 });
  await syncRepository(repo, provider(current), model, runTransaction);
  assert.equal(model.rows.length, 1);
  assert.equal(model.rows[0].title, 'Urgent auth update');
  assert.equal(model.rows[0].urgencyScore, 40);
  assert.equal(model.rows[0].impactScore, 25);
});

test('a PR missing from the next open response is marked closed', async () => {
  const model = inMemoryModel();
  const repo = repository();
  const current = { value: normalized() };
  await syncRepository(repo, provider(current), model, runTransaction);
  current.value = null;
  await syncRepository(repo, provider(current), model, runTransaction);
  assert.equal(model.rows[0].state, 'closed');
});

test('GitHub provider failure becomes a useful safe application error', async () => {
  const failing = { async getRepository() { const error = new Error('secret response'); error.status = 403; throw error; } };
  await assert.rejects(
    syncRepository(repository(), failing, inMemoryModel(), runTransaction),
    (error) => error.code === 'GITHUB_SYNC_FAILED' && error.message === 'Repository could not be synchronized' && error.details === 'GitHub returned HTTP 403',
  );
});

