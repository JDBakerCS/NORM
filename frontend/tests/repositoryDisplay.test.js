import assert from 'node:assert/strict';
import test from 'node:test';
import { getRepositoryDisplayName } from '../src/utils/repositoryDisplay.js';

test('repository labels show the project name without its GitHub organization', () => {
  assert.equal(getRepositoryDisplayName({
    owner: 'former-organization',
    name: 'CleanSlate_backend',
    fullName: 'former-organization/CleanSlate_backend',
  }), 'CleanSlate_backend');
});

test('repository labels safely fall back to the name portion of a full identifier', () => {
  assert.equal(getRepositoryDisplayName({ fullName: 'example-owner/example-repository' }), 'example-repository');
  assert.equal(getRepositoryDisplayName(), 'Repository');
});
