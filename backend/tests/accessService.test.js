import test from 'node:test';
import assert from 'node:assert/strict';
import { requireRepositoryAccess } from '../services/accessService.js';

test('a user cannot access a repository belonging to another team', async () => {
  const RepositoryModel = { async findByPk() { return { id: 50, teamId: 200 }; } };
  const TeamMemberModel = { async findOne() { return null; } };
  await assert.rejects(
    requireRepositoryAccess(1, 50, null, { RepositoryModel, TeamMemberModel }),
    (error) => error.statusCode === 403 && error.code === 'TEAM_ACCESS_DENIED',
  );
});

