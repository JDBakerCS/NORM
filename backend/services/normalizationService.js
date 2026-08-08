const ACTIVE_CHECK_STATES = new Set(['queued', 'in_progress', 'pending', 'requested', 'waiting']);
const FAILED_CHECK_CONCLUSIONS = new Set(['failure', 'failed', 'timed_out', 'cancelled', 'action_required', 'error']);
const SAFE_CHECK_CONCLUSIONS = new Set(['success', 'successful', 'neutral', 'skipped']);

function normalizedCheckState(status, conclusion) {
  const normalizedStatus = String(status || '').toLowerCase();
  const normalizedConclusion = String(conclusion || '').toLowerCase();
  if (ACTIVE_CHECK_STATES.has(normalizedStatus)) return 'RUNNING';
  if (FAILED_CHECK_CONCLUSIONS.has(normalizedConclusion)) return 'FAILED';
  if (normalizedStatus === 'completed' && SAFE_CHECK_CONCLUSIONS.has(normalizedConclusion)) return 'PASSED';
  return 'RUNNING';
}

const cleanText = (value, maxLength) => String(value || '').trim().slice(0, maxLength);

export function normalizeCheckResults(checkRuns = [], commitStatuses = []) {
  const checkRunResults = checkRuns.map((check) => ({
    name: cleanText(check.name || check.app?.name || 'GitHub check', 200),
    status: normalizedCheckState(check.status, check.conclusion),
    detailsUrl: cleanText(check.details_url || check.html_url, 500) || null,
    source: 'CHECK_RUN',
  }));
  const commitStatusResults = commitStatuses.map((status) => ({
    name: cleanText(status.context || 'Commit status', 200),
    status: normalizedCheckState(status.state === 'pending' ? 'in_progress' : 'completed', status.state),
    detailsUrl: cleanText(status.target_url, 500) || null,
    source: 'COMMIT_STATUS',
  }));
  return [...checkRunResults, ...commitStatusResults].filter((result) => result.name).slice(0, 200);
}

export function normalizeCiStatus(checkRuns = [], commitStatuses = []) {
  const results = normalizeCheckResults(checkRuns, commitStatuses);
  if (results.length === 0) return 'NOT_AVAILABLE';
  if (results.some((result) => result.status === 'RUNNING')) return 'RUNNING';
  if (results.some((result) => result.status === 'FAILED')) return 'FAILED';
  if (results.every((result) => result.status === 'PASSED')) return 'PASSED';
  return 'RUNNING';
}

export function normalizeReviewStatus(reviews = []) {
  if (reviews.length === 0) return 'NOT_AVAILABLE';
  const latestByReviewer = new Map();
  const meaningful = new Set(['APPROVED', 'CHANGES_REQUESTED', 'DISMISSED']);
  const sorted = [...reviews].sort((a, b) => new Date(a.submitted_at || 0) - new Date(b.submitted_at || 0));
  for (const review of sorted) {
    if (review.user?.login && meaningful.has(review.state)) latestByReviewer.set(review.user.login, review.state);
  }
  const active = [...latestByReviewer.values()].filter((state) => state !== 'DISMISSED');
  if (active.includes('CHANGES_REQUESTED')) return 'CHANGES_REQUESTED';
  if (active.includes('APPROVED')) return 'APPROVED';
  return 'PENDING';
}

export function normalizeMergeability(mergeable) {
  if (mergeable === true) return 'MERGEABLE';
  if (mergeable === false) return 'CONFLICTING';
  return 'UNKNOWN';
}
