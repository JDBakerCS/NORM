import { hashPassword } from '../services/authService.js';
import { applyDecisionRules } from '../services/syncService.js';
import { DEFAULT_CRITICAL_PATHS } from '../config/constants.js';
import { PullRequest, Repository, sequelize, Team, TeamMember, User } from '../models/index.js';

if (!process.argv.includes('--reset')) {
  console.error('Seed refused: run the explicit `npm run seed` reset command.');
  process.exit(1);
}

const daysAgo = (days) => new Date(Date.now() - days * 86_400_000);
const base = {
  authorType: 'User',
  state: 'open',
  isDraft: false,
  labels: [],
  additions: 40,
  deletions: 10,
  changedLines: 50,
  changedFilesCount: 1,
  changedFilePaths: ['frontend/src/App.jsx'],
  requestedReviewers: ['reviewer-one'],
  requestedTeams: [],
  checkResults: [{ name: 'Unit tests', status: 'PASSED', detailsUrl: null, source: 'CHECK_RUN' }],
  headSha: 'demo-sha',
  ciStatus: 'PASSED',
  reviewStatus: 'PENDING',
  mergeableStatus: 'MERGEABLE',
  githubCreatedAt: daysAgo(1),
  githubUpdatedAt: daysAgo(0),
  lastSyncedAt: new Date(),
};

const demos = [
  { number: 101, title: 'Add session rotation to authentication middleware', authorLogin: 'norm-agent', branchName: 'agent/session-rotation', labels: ['priority:critical', 'agent-generated'], additions: 420, deletions: 105, changedLines: 525, changedFilesCount: 5, changedFilePaths: ['backend/middleware/authenticateUser.js', 'backend/services/authService.js'], githubCreatedAt: daysAgo(4) },
  { number: 102, title: 'Draft the repository analytics view', authorLogin: 'sam-dev', branchName: 'feature/analytics', isDraft: true, labels: ['priority:medium'], additions: 700, deletions: 80, changedLines: 780, changedFilesCount: 8, githubCreatedAt: daysAgo(2) },
  { number: 103, title: 'Repair flaky integration test setup', authorLogin: 'agent-bot[bot]', authorType: 'Bot', branchName: 'agent/fix-tests', ciStatus: 'FAILED', labels: ['priority:high'], additions: 75, deletions: 25, changedLines: 100, changedFilePaths: ['backend/tests/integration.test.js'], checkResults: [{ name: 'Integration tests', status: 'FAILED', detailsUrl: null, source: 'CHECK_RUN' }], githubCreatedAt: daysAgo(3) },
  { number: 104, title: 'Upgrade the billing migration', authorLogin: 'alex', branchName: 'fix/billing-migration', reviewStatus: 'CHANGES_REQUESTED', labels: ['priority:high'], additions: 110, deletions: 32, changedLines: 142, changedFilesCount: 2, changedFilePaths: ['backend/migrations/20260801-billing.js', 'backend/services/billing.js'], githubCreatedAt: daysAgo(7) },
  { number: 105, title: 'Refresh account settings experience', authorLogin: 'riley', branchName: 'feature/account-ui', labels: ['priority:normal'], additions: 1320, deletions: 145, changedLines: 1465, changedFilesCount: 14, changedFilePaths: ['frontend/src/pages/SettingsPage.jsx', 'frontend/src/styles.css'], githubCreatedAt: daysAgo(1) },
  { number: 106, title: 'Clarify local database setup', authorLogin: 'taylor', branchName: 'docs/local-database', additions: 18, deletions: 4, changedLines: 22, changedFilesCount: 2, changedFilePaths: ['README.md', 'docs/database.md'], ciStatus: 'NOT_AVAILABLE', reviewStatus: 'NOT_AVAILABLE', requestedReviewers: [], checkResults: [], githubCreatedAt: daysAgo(1) },
  { number: 107, title: 'Add repository access endpoints', authorLogin: 'jordan', branchName: 'feature/repository-routes', labels: ['priority:medium'], additions: 180, deletions: 60, changedLines: 240, changedFilesCount: 5, changedFilePaths: ['backend/routes/repositories.js', 'backend/controllers/repositories.js'], githubCreatedAt: daysAgo(9) },
  { number: 108, title: 'Resolve conflicts in profile editor', authorLogin: 'norm-agent', branchName: 'agent/profile-conflicts', mergeableStatus: 'CONFLICTING', additions: 65, deletions: 31, changedLines: 96, changedFilesCount: 3, changedFilePaths: ['frontend/src/pages/ProfilePage.jsx'], githubCreatedAt: daysAgo(2) },
  { number: 109, title: 'Wait for deployment smoke tests', authorLogin: 'casey', branchName: 'deployment/smoke-tests', ciStatus: 'RUNNING', labels: ['priority:high'], additions: 52, deletions: 8, changedLines: 60, changedFilesCount: 3, changedFilePaths: ['deployment/render.yaml', '.github/workflows/smoke.yml'], requestedTeams: ['platform-team'], checkResults: [{ name: 'Deployment smoke test', status: 'RUNNING', detailsUrl: null, source: 'CHECK_RUN' }], githubCreatedAt: daysAgo(6) },
  { number: 110, title: 'Clean up empty-state copy', authorLogin: 'morgan', branchName: 'chore/empty-state-copy', additions: 20, deletions: 16, changedLines: 36, changedFilesCount: 2, changedFilePaths: ['frontend/src/components/EmptyState.jsx'], ciStatus: 'NOT_AVAILABLE', reviewStatus: 'NOT_AVAILABLE', requestedReviewers: [], checkResults: [], githubCreatedAt: daysAgo(0) },
];

try {
  await sequelize.authenticate();
  await sequelize.sync({ force: true });
  const passwordHash = await hashPassword('norm-demo-password');
  const user = await User.create({ name: 'NORM Demo', email: 'demo@norm.local', passwordHash, githubUsername: 'norm-demo' });
  const team = await Team.create({ name: 'NORM Demo Team' });
  await TeamMember.create({ userId: user.id, teamId: team.id, role: 'OWNER' });
  const repository = await Repository.create({
    teamId: team.id,
    githubRepositoryId: 900000001,
    owner: 'norm-demo',
    name: 'triage-example',
    fullName: 'norm-demo/triage-example',
    htmlUrl: 'https://github.com/octocat/Hello-World',
    defaultBranch: 'main',
    criticalPaths: DEFAULT_CRITICAL_PATHS,
    agentAccounts: ['norm-agent'],
    lowRiskMaxLines: 50,
    lastSyncedAt: new Date(),
  });

  for (const [index, demo] of demos.entries()) {
    const normalized = { ...base, ...demo };
    await PullRequest.create({
      ...normalized,
      ...applyDecisionRules(normalized, repository.toJSON()),
      repositoryId: repository.id,
      githubPullRequestId: 800000000 + index,
      bodyPreview: `Demo pull request illustrating NORM queue behavior for ${demo.title.toLowerCase()}.`,
      htmlUrl: `https://github.com/octocat/Hello-World/pull/${demo.number}`,
      headSha: `demo-sha-${demo.number}`,
    });
  }
  console.log('Demo data created. Login: demo@norm.local / norm-demo-password');
} catch (error) {
  console.error(`Seed failed: ${error.message}`);
  process.exitCode = 1;
} finally {
  await sequelize.close();
}
