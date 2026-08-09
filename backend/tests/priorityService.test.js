import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateAge,
  calculateImpact,
  calculatePriority,
  calculateSize,
  calculateUrgency,
} from '../services/priorityService.js';

test('every urgency label receives the expected score', () => {
  assert.equal(calculateUrgency(['priority:critical']).score, 40);
  assert.equal(calculateUrgency(['priority:high']).score, 30);
  assert.equal(calculateUrgency(['priority:medium']).score, 20);
  assert.equal(calculateUrgency(['priority:normal']).score, 10);
  assert.equal(calculateUrgency([]).score, 0);
});

test('highest urgency wins regardless of label order or case', () => {
  const result = calculateUrgency(['PRIORITY:normal', 'priority:critical', 'priority:high']);
  assert.equal(result.score, 40);
  assert.match(result.reason, /Critical/);
});

test('every size boundary is deterministic', () => {
  const cases = [
    [0, 0],
    [1, 2],
    [50, 2],
    [51, 5],
    [200, 5],
    [201, 10],
    [500, 10],
    [501, 15],
    [1000, 15],
    [1001, 20],
  ];
  for (const [lines, score] of cases)
    assert.equal(calculateSize(lines).score, score, `${lines} lines`);
});

test('every age boundary is deterministic', () => {
  const now = new Date('2026-08-10T12:00:00Z');
  const daysAgo = (days) => new Date(now.getTime() - days * 86_400_000);
  assert.equal(calculateAge(daysAgo(0), now).score, 0);
  assert.equal(calculateAge(daysAgo(1), now).score, 5);
  assert.equal(calculateAge(daysAgo(2), now).score, 5);
  assert.equal(calculateAge(daysAgo(3), now).score, 10);
  assert.equal(calculateAge(daysAgo(5), now).score, 10);
  assert.equal(calculateAge(daysAgo(6), now).score, 15);
});

test('critical path matching works with configured prefixes', () => {
  const result = calculateImpact(['src/security/session.js'], ['src/security/']);
  assert.equal(result.score, 25);
  assert.match(result.reason, /critical/i);
});

test('shared data models and association paths receive high impact', () => {
  for (const path of [
    'models/User.js',
    'src/models/Poll.js',
    'database/associations.js',
    'prisma/schema.prisma',
  ]) {
    const result = calculateImpact([path], []);
    assert.equal(result.score, 20, path);
    assert.match(result.reason, /models|schemas|associations/i);
  }
});

test('documentation-only changes receive documentation impact', () => {
  const result = calculateImpact(['README.md', 'docs/setup.md'], []);
  assert.equal(result.score, 2);
  assert.match(result.reason, /Documentation/);
});

test('priority never exceeds 100 and reasons match scored components', () => {
  const result = calculatePriority(
    {
      labels: ['priority:critical'],
      changedLines: 1500,
      changedFilePaths: ['auth/login.js'],
      githubCreatedAt: '2026-07-01T00:00:00Z',
    },
    { criticalPaths: ['auth/'] },
    new Date('2026-08-10T00:00:00Z'),
  );
  assert.equal(result.priorityScore, 100);
  assert.equal(result.priorityReasons.length, 4);
  assert.equal(
    result.priorityReasons.some((reason) => reason.includes('1500')),
    true,
  );
  assert.equal(result.urgencyScore + result.impactScore + result.sizeScore + result.ageScore, 100);
});
