import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeCheckResults,
  normalizeCiStatus,
  normalizeMergeability,
  normalizeReviewStatus,
} from '../services/normalizationService.js';

test('CI normalization preserves running, failure, success, and unavailable states', () => {
  assert.equal(normalizeCiStatus(), 'NOT_AVAILABLE');
  assert.equal(normalizeCiStatus([{ status: 'in_progress', conclusion: null }]), 'RUNNING');
  assert.equal(normalizeCiStatus([{ status: 'completed', conclusion: 'failure' }]), 'FAILED');
  assert.equal(
    normalizeCiStatus([
      { status: 'completed', conclusion: 'success' },
      { status: 'completed', conclusion: 'skipped' },
    ]),
    'PASSED',
  );
});

test('commit statuses classify CI when check runs are unavailable', () => {
  assert.equal(normalizeCiStatus([], [{ state: 'pending' }]), 'RUNNING');
  assert.equal(normalizeCiStatus([], [{ state: 'failure' }]), 'FAILED');
  assert.equal(normalizeCiStatus([], [{ state: 'success' }]), 'PASSED');
});

test('named check results preserve source, destination, and a human-readable state', () => {
  const results = normalizeCheckResults(
    [
      {
        name: 'Unit tests',
        status: 'completed',
        conclusion: 'success',
        details_url: 'https://github.com/checks/1',
      },
    ],
    [{ context: 'security/scan', state: 'failure', target_url: 'https://github.com/status/2' }],
  );
  assert.deepEqual(results, [
    {
      name: 'Unit tests',
      status: 'PASSED',
      detailsUrl: 'https://github.com/checks/1',
      source: 'CHECK_RUN',
    },
    {
      name: 'security/scan',
      status: 'FAILED',
      detailsUrl: 'https://github.com/status/2',
      source: 'COMMIT_STATUS',
    },
  ]);
});

test('latest meaningful review from each reviewer controls review status', () => {
  const reviews = [
    { user: { login: 'one' }, state: 'CHANGES_REQUESTED', submitted_at: '2026-01-01' },
    { user: { login: 'one' }, state: 'APPROVED', submitted_at: '2026-01-02' },
    { user: { login: 'two' }, state: 'COMMENTED', submitted_at: '2026-01-03' },
  ];
  assert.equal(normalizeReviewStatus(reviews), 'APPROVED');
  assert.equal(normalizeReviewStatus([]), 'NOT_AVAILABLE');
});

test('an active change request outranks an approval', () => {
  const reviews = [
    { user: { login: 'one' }, state: 'APPROVED', submitted_at: '2026-01-01' },
    { user: { login: 'two' }, state: 'CHANGES_REQUESTED', submitted_at: '2026-01-02' },
  ];
  assert.equal(normalizeReviewStatus(reviews), 'CHANGES_REQUESTED');
});

test('mergeability maps null to unknown', () => {
  assert.equal(normalizeMergeability(true), 'MERGEABLE');
  assert.equal(normalizeMergeability(false), 'CONFLICTING');
  assert.equal(normalizeMergeability(null), 'UNKNOWN');
});
