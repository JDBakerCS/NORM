const LABELS = {
  REVIEW_NOW: 'Review now', RETURN_TO_AGENT: 'Return to agent', WAITING: 'Waiting', LOW_RISK: 'Low risk',
  PASSED: 'Checks passed', FAILED: 'Checks failed', RUNNING: 'Checks running', NOT_AVAILABLE: 'Not available',
  APPROVED: 'Approved', CHANGES_REQUESTED: 'Changes requested', PENDING: 'Review pending',
  MERGEABLE: 'Mergeable', CONFLICTING: 'Conflicting', UNKNOWN: 'Unknown',
};

export default function StatusBadge({ value, compact = false }) {
  const slug = String(value || 'UNKNOWN').toLowerCase().replaceAll('_', '-');
  return <span className={`status-badge status-${slug}${compact ? ' compact' : ''}`}>{LABELS[value] || value}</span>;
}

