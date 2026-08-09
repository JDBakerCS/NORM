const uniqueStrings = (values) => [...new Set((values || []).filter(Boolean).map(String))];

const compactNames = (names, limit = 2) => {
  const visible = names.slice(0, limit).join(', ');
  const remaining = names.length - limit;
  return remaining > 0 ? `${visible} +${remaining}` : visible;
};

export function getReviewRequestSummary(pullRequest = {}) {
  const users = uniqueStrings(pullRequest.requestedReviewers).map((login) => `@${login}`);
  const teams = uniqueStrings(pullRequest.requestedTeams).map((team) => `${team} team`);
  const requested = [...users, ...teams];

  if (requested.length > 0) {
    return { label: `Waiting on ${compactNames(requested)}`, hasActiveRequest: true };
  }
  if (pullRequest.reviewStatus === 'APPROVED')
    return { label: 'Reviewer approved', hasActiveRequest: false };
  if (pullRequest.reviewStatus === 'CHANGES_REQUESTED')
    return { label: 'Reviewer requested changes', hasActiveRequest: false };
  return { label: 'No reviewer requested', hasActiveRequest: false };
}

export function sortNamedChecks(checkResults = []) {
  const order = { FAILED: 0, RUNNING: 1, PASSED: 2 };
  return [...checkResults].sort(
    (left, right) => (order[left.status] ?? 3) - (order[right.status] ?? 3),
  );
}

export function getNamedCheckSummary(checkResults = []) {
  const results = sortNamedChecks(checkResults);
  const failed = results.filter((check) => check.status === 'FAILED');
  const running = results.filter((check) => check.status === 'RUNNING');

  if (failed.length > 0)
    return {
      label: `Failed: ${compactNames(failed.map((check) => check.name))}`,
      status: 'FAILED',
    };
  if (running.length > 0)
    return {
      label: `Running: ${compactNames(running.map((check) => check.name))}`,
      status: 'RUNNING',
    };
  if (results.length > 0)
    return {
      label: `${results.length} named ${results.length === 1 ? 'check' : 'checks'} passed`,
      status: 'PASSED',
    };
  return { label: 'No named checks available', status: 'NOT_AVAILABLE' };
}
