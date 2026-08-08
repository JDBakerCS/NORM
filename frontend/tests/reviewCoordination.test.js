import assert from 'node:assert/strict';
import test from 'node:test';
import { getNamedCheckSummary, getReviewRequestSummary, sortNamedChecks } from '../src/utils/reviewCoordination.js';

test('review routing names requested users and teams', () => {
  const result = getReviewRequestSummary({
    requestedReviewers: ['octocat'],
    requestedTeams: ['backend-team'],
    reviewStatus: 'PENDING',
  });
  assert.deepEqual(result, { label: 'Waiting on @octocat, backend-team team', hasActiveRequest: true });
});

test('review routing distinguishes completed and missing requests', () => {
  assert.equal(getReviewRequestSummary({ reviewStatus: 'APPROVED' }).label, 'Reviewer approved');
  assert.equal(getReviewRequestSummary({ reviewStatus: 'PENDING' }).label, 'No reviewer requested');
});

test('named check summaries prioritize failures and running work', () => {
  const checks = [
    { name: 'Unit tests', status: 'PASSED' },
    { name: 'Deploy preview', status: 'RUNNING' },
    { name: 'Security scan', status: 'FAILED' },
  ];
  assert.equal(getNamedCheckSummary(checks).label, 'Failed: Security scan');
  assert.deepEqual(sortNamedChecks(checks).map((check) => check.status), ['FAILED', 'RUNNING', 'PASSED']);
});

test('named check summaries explain all-pass and unavailable states', () => {
  assert.equal(getNamedCheckSummary([{ name: 'Unit tests', status: 'PASSED' }]).label, '1 named check passed');
  assert.equal(getNamedCheckSummary([]).label, 'No named checks available');
});
