export function normalizeCiStatus(checkRuns = [], commitStatuses = []) {
  const checks = [
    ...checkRuns.map((check) => ({ status: check.status, conclusion: check.conclusion })),
    ...commitStatuses.map((status) => ({ status: status.state === 'pending' ? 'in_progress' : 'completed', conclusion: status.state })),
  ];
  if (checks.length === 0) return 'NOT_AVAILABLE';
  if (checks.some((check) => ['queued', 'in_progress', 'pending', 'requested', 'waiting'].includes(check.status))) return 'RUNNING';
  const failed = ['failure', 'failed', 'timed_out', 'cancelled', 'action_required', 'error'];
  if (checks.some((check) => failed.includes(check.conclusion))) return 'FAILED';
  const safe = ['success', 'successful', 'neutral', 'skipped'];
  if (checks.every((check) => check.status === 'completed' && safe.includes(check.conclusion))) return 'PASSED';
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

