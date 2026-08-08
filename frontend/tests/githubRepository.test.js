import assert from 'node:assert/strict';
import test from 'node:test';
import { parseGitHubRepositoryUrl } from '../src/utils/githubRepository.js';

test('parses a GitHub browser URL', () => {
  assert.deepEqual(parseGitHubRepositoryUrl('https://github.com/octocat/hello-world'), {
    owner: 'octocat',
    name: 'hello-world',
  });
});

test('parses a GitHub clone URL and removes the .git suffix', () => {
  assert.deepEqual(
    parseGitHubRepositoryUrl('https://github.com/example-owner/example-repository.git'),
    { owner: 'example-owner', name: 'example-repository' },
  );
});

test('accepts a copied GitHub URL without the protocol', () => {
  assert.deepEqual(parseGitHubRepositoryUrl('github.com/acme/widgets/'), {
    owner: 'acme',
    name: 'widgets',
  });
});

test('rejects non-GitHub and nested GitHub URLs', () => {
  assert.throws(() => parseGitHubRepositoryUrl('https://gitlab.com/acme/widgets'), /GitHub repository URL/);
  assert.throws(() => parseGitHubRepositoryUrl('https://github.com/acme/widgets/tree/main'), /GitHub repository URL/);
});
