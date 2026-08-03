import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyQueue } from '../services/queueService.js';

const repository = { criticalPaths: ['auth/'], lowRiskMaxLines: 50 };
const ready = {
  isDraft: false, ciStatus: 'PASSED', reviewStatus: 'PENDING', mergeableStatus: 'MERGEABLE', changedLines: 100, changedFilePaths: ['frontend/App.jsx'],
};

const statusFor = (overrides) => classifyQueue({ ...ready, ...overrides }, repository).queueStatus;

test('draft goes to waiting first', () => assert.equal(statusFor({ isDraft: true, ciStatus: 'FAILED' }), 'WAITING'));
test('running checks go to waiting', () => assert.equal(statusFor({ ciStatus: 'RUNNING' }), 'WAITING'));
test('failed checks return to agent', () => assert.equal(statusFor({ ciStatus: 'FAILED' }), 'RETURN_TO_AGENT'));
test('changes requested returns to agent', () => assert.equal(statusFor({ reviewStatus: 'CHANGES_REQUESTED' }), 'RETURN_TO_AGENT'));
test('merge conflict returns to agent', () => assert.equal(statusFor({ mergeableStatus: 'CONFLICTING' }), 'RETURN_TO_AGENT'));
test('small documentation PR is low risk', () => assert.equal(statusFor({ changedLines: 50, changedFilePaths: ['docs/setup.md'] }), 'LOW_RISK'));
test('critical docs do not become low risk', () => assert.equal(statusFor({ changedLines: 5, changedFilePaths: ['auth/README.md'] }), 'REVIEW_NOW'));
test('normal ready PR is review now', () => assert.equal(statusFor({}), 'REVIEW_NOW'));
test('no checks remains review now and is explained honestly', () => {
  const result = classifyQueue({ ...ready, ciStatus: 'NOT_AVAILABLE' }, repository);
  assert.equal(result.queueStatus, 'REVIEW_NOW');
  assert.match(result.reason, /no checks/i);
});

