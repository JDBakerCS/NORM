import { Octokit } from '@octokit/rest';
import {
  normalizeCheckResults,
  normalizeCiStatus,
  normalizeMergeability,
  normalizeReviewStatus,
} from './normalizationService.js';
import { AppError } from '../utils/AppError.js';

function getClient() {
  if (!process.env.GITHUB_TOKEN)
    throw new AppError(
      'GITHUB_TOKEN is not configured on the backend',
      503,
      'GITHUB_TOKEN_MISSING',
    );
  return new Octokit({ auth: process.env.GITHUB_TOKEN, userAgent: 'norm-pr-triage/1.0' });
}

async function getRepository(owner, repo) {
  const { data } = await getClient().repos.get({ owner, repo });
  return data;
}

async function getOpenPullRequests(owner, repo) {
  return getClient().paginate(getClient().pulls.list, {
    owner,
    repo,
    state: 'open',
    per_page: 100,
  });
}

async function getPullRequestDetails(owner, repo, pullNumber) {
  const { data } = await getClient().pulls.get({ owner, repo, pull_number: pullNumber });
  return data;
}

async function getChangedFiles(owner, repo, pullNumber) {
  return getClient().paginate(getClient().pulls.listFiles, {
    owner,
    repo,
    pull_number: pullNumber,
    per_page: 100,
  });
}

async function getReviews(owner, repo, pullNumber) {
  return getClient().paginate(getClient().pulls.listReviews, {
    owner,
    repo,
    pull_number: pullNumber,
    per_page: 100,
  });
}

function normalizeCommit(commit) {
  const commitDetails = commit.commit || {};
  const commitAuthor = commit.author || {};
  return {
    sha: commit.sha || '',
    message: commitDetails.message || 'No commit message',
    authorLogin: commitAuthor.login || commitDetails.author?.name || 'unknown',
    committedAt: commitDetails.author?.date || commitDetails.committer?.date || null,
    htmlUrl: commit.html_url || null,
    isVerified: Boolean(commitDetails.verification?.verified),
  };
}

async function getPullRequestCommits(owner, repo, pullNumber, client = getClient()) {
  const commits = await client.paginate(client.pulls.listCommits, {
    owner,
    repo,
    pull_number: pullNumber,
    per_page: 100,
  });
  return commits.map(normalizeCommit);
}

async function getRequestedReviewers(owner, repo, pullNumber, client = getClient()) {
  const { data } = await client.pulls.listRequestedReviewers({
    owner,
    repo,
    pull_number: pullNumber,
  });
  return data;
}

async function getCheckRuns(owner, repo, ref, client = getClient()) {
  const { data } = await client.checks.listForRef({ owner, repo, ref, per_page: 100 });
  return data.check_runs || [];
}

function isMissingChecksReadPermission(error) {
  const acceptedPermissions = error.response?.headers?.['x-accepted-github-permissions'];
  return (
    error.status === 403 &&
    typeof acceptedPermissions === 'string' &&
    acceptedPermissions
      .toLowerCase()
      .split(',')
      .map((permission) => permission.trim())
      .includes('checks=read')
  );
}

async function getCheckRunsWithPermissionFallback(owner, repo, ref, client = getClient()) {
  try {
    return await getCheckRuns(owner, repo, ref, client);
  } catch (error) {
    // Commit statuses are still useful CI evidence when this token cannot read check runs.
    if (isMissingChecksReadPermission(error)) return [];
    throw error;
  }
}

async function getCommitStatuses(owner, repo, ref, client = getClient()) {
  const { data } = await client.repos.getCombinedStatusForRef({ owner, repo, ref, per_page: 100 });
  return data.statuses || [];
}

function normalizePullRequest({
  details,
  files,
  reviews,
  requestedReviewers,
  checkRuns,
  commitStatuses,
}) {
  const labels = (details.labels || [])
    .map((label) => (typeof label === 'string' ? label : label.name))
    .filter(Boolean);
  const changedFilePaths = files.map((file) => file.filename).filter(Boolean);
  const additions =
    Number(details.additions) ||
    files.reduce((sum, file) => sum + (Number(file.additions) || 0), 0);
  const deletions =
    Number(details.deletions) ||
    files.reduce((sum, file) => sum + (Number(file.deletions) || 0), 0);
  const requestedUsers = (requestedReviewers?.users || [])
    .map((user) => user.login)
    .filter(Boolean)
    .slice(0, 100);
  const requestedTeams = (requestedReviewers?.teams || [])
    .map((team) => team.slug || team.name)
    .filter(Boolean)
    .slice(0, 100);
  return {
    githubPullRequestId: details.id,
    number: details.number,
    title: details.title || `Pull request #${details.number}`,
    bodyPreview: details.body ? details.body.slice(0, 500) : null,
    authorLogin: details.user?.login || 'unknown',
    authorType: details.user?.type || 'User',
    htmlUrl: details.html_url,
    branchName: details.head?.ref || '',
    state: details.state || 'open',
    labels,
    isDraft: Boolean(details.draft),
    additions,
    deletions,
    changedLines: additions + deletions,
    changedFilesCount: Number(details.changed_files) || changedFilePaths.length,
    changedFilePaths,
    requestedReviewers: requestedUsers,
    requestedTeams,
    checkResults: normalizeCheckResults(checkRuns, commitStatuses),
    headSha: details.head?.sha || '',
    ciStatus: normalizeCiStatus(checkRuns, commitStatuses),
    reviewStatus: normalizeReviewStatus(reviews),
    mergeableStatus: normalizeMergeability(details.mergeable),
    githubCreatedAt: details.created_at,
    githubUpdatedAt: details.updated_at,
  };
}

async function syncPullRequest(owner, repo, pullSummary) {
  const pullNumber = pullSummary.number;
  const details = await getPullRequestDetails(owner, repo, pullNumber);
  const client = getClient();
  const [files, reviews, requestedReviewers, checkRuns, commitStatuses] = await Promise.all([
    getChangedFiles(owner, repo, pullNumber),
    getReviews(owner, repo, pullNumber),
    getRequestedReviewers(owner, repo, pullNumber),
    getCheckRunsWithPermissionFallback(owner, repo, details.head.sha, client),
    getCommitStatuses(owner, repo, details.head.sha, client),
  ]);
  return normalizePullRequest({
    details,
    files,
    reviews,
    requestedReviewers,
    checkRuns,
    commitStatuses,
  });
}

export const githubService = {
  getRepository,
  getOpenPullRequests,
  getPullRequestDetails,
  getChangedFiles,
  getReviews,
  getPullRequestCommits,
  getRequestedReviewers,
  getCheckRuns,
  getCheckRunsWithPermissionFallback,
  normalizePullRequest,
  syncPullRequest,
};
