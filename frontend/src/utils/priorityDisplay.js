export function getAttentionLevel(pullRequest = {}) {
  const urgency = Number(pullRequest.urgencyScore) || 0;
  const impact = Number(pullRequest.impactScore) || 0;

  if (urgency >= 40 || impact >= 25) {
    return { key: 'CRITICAL', label: 'Critical', description: 'Critical urgency or code-area impact' };
  }
  if (urgency + impact >= 30 || impact >= 20) {
    return { key: 'HIGH', label: 'High', description: 'Strong urgency or broad code impact' };
  }
  if (urgency > 0 || impact >= 10) {
    return { key: 'NORMAL', label: 'Normal', description: 'Routine priority or application-code impact' };
  }
  return { key: 'LOW', label: 'Low', description: 'No elevated urgency or impact signals' };
}

export function getReviewSize(pullRequest = {}) {
  const changedLines = Math.max(0, Number(pullRequest.changedLines) || 0);
  const changedFiles = Math.max(0, Number(pullRequest.changedFilesCount) || 0);
  const description = `${changedLines} changed ${changedLines === 1 ? 'line' : 'lines'} across ${changedFiles} ${changedFiles === 1 ? 'file' : 'files'}`;

  if (changedLines > 500 || changedFiles > 10) return { key: 'LARGE', label: 'Large', description };
  if (changedLines > 50 || changedFiles > 3) return { key: 'MEDIUM', label: 'Medium', description };
  return { key: 'SMALL', label: 'Small', description };
}

export function getWaitingTime(githubCreatedAt, now = new Date()) {
  const created = new Date(githubCreatedAt);
  const current = new Date(now);
  const days = Number.isNaN(created.getTime()) || Number.isNaN(current.getTime())
    ? 0
    : Math.max(0, Math.floor((current.getTime() - created.getTime()) / 86_400_000));

  return {
    days,
    label: days === 0 ? 'Today' : `${days} ${days === 1 ? 'day' : 'days'}`,
    compactLabel: days === 0 ? 'Today' : `${days}d waiting`,
  };
}
