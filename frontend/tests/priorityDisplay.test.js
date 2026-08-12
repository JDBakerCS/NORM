import assert from 'node:assert/strict';
import test from 'node:test';
import { getAttentionLevel, getReviewSize, getWaitingTime } from '../src/utils/priorityDisplay.js';

test('attention reflects urgency and code impact without size or age', () => {
  assert.equal(getAttentionLevel({ urgencyScore: 40, impactScore: 0 }).key, 'CRITICAL');
  assert.equal(getAttentionLevel({ urgencyScore: 0, impactScore: 25 }).key, 'CRITICAL');
  assert.equal(getAttentionLevel({ urgencyScore: 20, impactScore: 10 }).key, 'HIGH');
  assert.equal(
    getAttentionLevel({ urgencyScore: 0, impactScore: 15, sizeScore: 20, ageScore: 15 }).key,
    'NORMAL',
  );
  assert.equal(
    getAttentionLevel({ urgencyScore: 0, impactScore: 2, sizeScore: 20, ageScore: 15 }).key,
    'LOW',
  );
});

test('review size uses both changed lines and changed files', () => {
  assert.equal(getReviewSize({ changedLines: 50, changedFilesCount: 3 }).key, 'SMALL');
  assert.equal(getReviewSize({ changedLines: 51, changedFilesCount: 3 }).key, 'MEDIUM');
  assert.equal(getReviewSize({ changedLines: 25, changedFilesCount: 4 }).key, 'MEDIUM');
  assert.equal(getReviewSize({ changedLines: 501, changedFilesCount: 2 }).key, 'LARGE');
  assert.equal(getReviewSize({ changedLines: 100, changedFilesCount: 11 }).key, 'LARGE');
});

test('waiting time has readable full and compact labels', () => {
  const now = new Date('2026-08-08T12:00:00Z');

  assert.deepEqual(getWaitingTime('2026-08-08T08:33:00Z', now), {
    days: 0,
    label: '3 hours 27 minutes',
    compactLabel: '3h 27m waiting',
  });
  assert.deepEqual(getWaitingTime('2026-08-08T11:18:00Z', now), {
    days: 0,
    label: '42 minutes',
    compactLabel: '42m waiting',
  });
  assert.deepEqual(getWaitingTime('2026-08-05T09:30:00Z', now), {
    days: 3,
    label: '3 days 2 hours',
    compactLabel: '3d 2h waiting',
  });
  assert.deepEqual(getWaitingTime('2026-08-08T11:59:45Z', now), {
    days: 0,
    label: 'Less than a minute',
    compactLabel: '<1m waiting',
  });
});
