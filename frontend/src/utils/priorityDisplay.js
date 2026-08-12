export function getAttentionLevel(pullRequest = {}) {
  const urgency = Number(pullRequest.urgencyScore) || 0;
  const impact = Number(pullRequest.impactScore) || 0;

  if (urgency >= 40 || impact >= 25) {
    return {
      key: 'CRITICAL',
      label: 'Critical',
      description: 'Critical urgency or code-area impact',
    };
  }
  if (urgency + impact >= 30 || impact >= 20) {
    return { key: 'HIGH', label: 'High', description: 'Strong urgency or broad code impact' };
  }
  if (urgency > 0 || impact >= 10) {
    return {
      key: 'NORMAL',
      label: 'Normal',
      description: 'Routine priority or application-code impact',
    };
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
  const elapsedMinutes =
    Number.isNaN(created.getTime()) || Number.isNaN(current.getTime())
      ? 0
      : Math.max(0, Math.floor((current.getTime() - created.getTime()) / 60_000));
  const days = Math.floor(elapsedMinutes / 1_440);
  const hours = Math.floor((elapsedMinutes % 1_440) / 60);
  const minutes = elapsedMinutes % 60;

  if (days > 0) {
    const dayLabel = `${days} ${days === 1 ? 'day' : 'days'}`;
    const hourLabel = hours > 0 ? ` ${hours} ${hours === 1 ? 'hour' : 'hours'}` : '';
    return {
      days,
      label: `${dayLabel}${hourLabel}`,
      compactLabel: `${days}d${hours > 0 ? ` ${hours}h` : ''} waiting`,
    };
  }

  if (hours > 0) {
    return {
      days,
      label: `${hours} ${hours === 1 ? 'hour' : 'hours'} ${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`,
      compactLabel: `${hours}h ${minutes}m waiting`,
    };
  }

  if (minutes > 0) {
    return {
      days,
      label: `${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`,
      compactLabel: `${minutes}m waiting`,
    };
  }

  return {
    days,
    label: 'Less than a minute',
    compactLabel: '<1m waiting',
  };
}
