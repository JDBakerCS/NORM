import test from 'node:test';
import assert from 'node:assert/strict';
import { githubService } from '../services/githubService.js';
import { normalizeCiStatus } from '../services/normalizationService.js';

function clientWithCheckRunError(error) {
  return {
    checks: {
      async listForRef() {
        throw error;
      },
    },
  };
}

test('check-runs permission denial falls back to commit statuses', async () => {
  const error = new Error('Resource not accessible by personal access token');
  error.status = 403;
  error.response = { headers: { 'x-accepted-github-permissions': 'checks=read' } };

  const checkRuns = await githubService.getCheckRunsWithPermissionFallback(
    'acme',
    'widget',
    'abc123',
    clientWithCheckRunError(error),
  );

  assert.deepEqual(checkRuns, []);
  assert.equal(normalizeCiStatus(checkRuns, [{ state: 'success' }]), 'PASSED');
});

test('other check-runs failures remain visible to the sync error handler', async () => {
  const error = new Error('GitHub rate limit exceeded');
  error.status = 403;
  error.response = { headers: { 'x-ratelimit-remaining': '0' } };

  await assert.rejects(
    githubService.getCheckRunsWithPermissionFallback(
      'acme',
      'widget',
      'abc123',
      clientWithCheckRunError(error),
    ),
    (received) => received === error,
  );
});

test('requested reviewers preserve both user logins and team slugs', async () => {
  const client = {
    pulls: {
      async listRequestedReviewers() {
        return {
          data: {
            users: [{ login: 'octocat' }],
            teams: [{ slug: 'backend-team', name: 'Backend Team' }],
          },
        };
      },
    },
  };

  const result = await githubService.getRequestedReviewers('acme', 'widget', 42, client);
  assert.deepEqual(
    result.users.map((user) => user.login),
    ['octocat'],
  );
  assert.deepEqual(
    result.teams.map((team) => team.slug),
    ['backend-team'],
  );
});

test('pull request commits are paginated and normalized for the detail view', async () => {
  const listCommits = () => {};
  const client = {
    pulls: { listCommits },
    async paginate(endpoint, params) {
      assert.equal(endpoint, listCommits);
      assert.deepEqual(params, {
        owner: 'acme',
        repo: 'widget',
        pull_number: 42,
        per_page: 100,
      });
      return [
        {
          sha: 'abcdef123456789',
          html_url: 'https://github.com/acme/widget/commit/abcdef1',
          author: { login: 'octocat' },
          commit: {
            message: 'Add commit history\n\nMore details',
            author: { name: 'Octocat', date: '2026-08-02T12:00:00Z' },
            verification: { verified: true },
          },
        },
      ];
    },
  };

  const result = await githubService.getPullRequestCommits('acme', 'widget', 42, client);

  assert.deepEqual(result, [
    {
      sha: 'abcdef123456789',
      message: 'Add commit history\n\nMore details',
      authorLogin: 'octocat',
      committedAt: '2026-08-02T12:00:00Z',
      htmlUrl: 'https://github.com/acme/widget/commit/abcdef1',
      isVerified: true,
    },
  ]);
});

test('pull request normalization stores reviewer routing and named checks', () => {
  const result = githubService.normalizePullRequest({
    details: {
      id: 9,
      number: 42,
      title: 'Add reviewer routing',
      user: { login: 'dev', type: 'User' },
      html_url: 'https://github.com/acme/widget/pull/42',
      head: { ref: 'feature/reviewers', sha: 'abc123' },
      labels: [],
      state: 'open',
      created_at: '2026-08-01T00:00:00Z',
      updated_at: '2026-08-02T00:00:00Z',
      mergeable: true,
    },
    files: [{ filename: 'backend/routes/reviews.js', additions: 20, deletions: 5 }],
    reviews: [],
    requestedReviewers: { users: [{ login: 'octocat' }], teams: [{ slug: 'backend-team' }] },
    checkRuns: [{ name: 'Unit tests', status: 'completed', conclusion: 'success' }],
    commitStatuses: [],
  });

  assert.deepEqual(result.requestedReviewers, ['octocat']);
  assert.deepEqual(result.requestedTeams, ['backend-team']);
  assert.deepEqual(result.checkResults, [
    { name: 'Unit tests', status: 'PASSED', detailsUrl: null, source: 'CHECK_RUN' },
  ]);
});
