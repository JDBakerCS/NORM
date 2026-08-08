import test from 'node:test';
import assert from 'node:assert/strict';
import { buildPrioritySort } from '../controllers/pullRequestController.js';

test('default queue order puts importance before waiting time and review size', () => {
  const order = buildPrioritySort((expression) => expression);

  assert.deepEqual(order, [
    ['"urgency_score" + "impact_score"', 'DESC'],
    ['githubCreatedAt', 'ASC'],
    ['sizeScore', 'DESC'],
    ['number', 'ASC'],
  ]);
});
