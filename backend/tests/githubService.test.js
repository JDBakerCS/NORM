import test from 'node:test';
import assert from 'node:assert/strict';
import { githubService } from '../services/githubService.js';
import { normalizeCiStatus } from '../services/normalizationService.js';

function clientWithCheckRunError(error) {
  return {
    checks: {
      async listForRef() { throw error; },
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
    githubService.getCheckRunsWithPermissionFallback('acme', 'widget', 'abc123', clientWithCheckRunError(error)),
    (received) => received === error,
  );
});
