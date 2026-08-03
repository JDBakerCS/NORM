import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeCiStatus, normalizeMergeability, normalizeReviewStatus } from '../services/normalizationService.js';

test('CI normalization preserves running, failure, success, and unavailable states', () => {
  assert.equal(normalizeCiStatus(), 'NOT_AVAILABLE');
  assert.equal(normalizeCiStatus([{ status: 'in_progress', conclusion: null }]), 'RUNNING');
  assert.equal(normalizeCiStatus([{ status: 'completed', conclusion: 'failure' }]), 'FAILED');
  assert.equal(normalizeCiStatus([{ status: 'completed', conclusion: 'success' }, { status: 'completed', conclusion: 'skipped' }]), 'PASSED');
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

