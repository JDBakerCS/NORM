import { Link } from 'react-router-dom';
import StatusBadge from './StatusBadge.jsx';
import { getAttentionLevel, getReviewSize, getWaitingTime } from '../utils/priorityDisplay.js';
import { getNamedCheckSummary, getReviewRequestSummary } from '../utils/reviewCoordination.js';

export default function PullRequestCard({ pullRequest }) {
  const attention = getAttentionLevel(pullRequest);
  const reviewSize = getReviewSize(pullRequest);
  const waiting = getWaitingTime(pullRequest.githubCreatedAt);
  const reviewRequest = getReviewRequestSummary(pullRequest);
  const namedChecks = getNamedCheckSummary(pullRequest.checkResults);

  return (
    <article className="pr-card">
      <div
        className={`pr-attention attention-${attention.key.toLowerCase()}`}
        aria-label={`${attention.label} attention`}
      >
        <span>Attention</span>
        <strong>{attention.label}</strong>
      </div>
      <div className="pr-content">
        <div className="pr-heading-row">
          <div>
            <p className="eyebrow">
              PR #{pullRequest.number} · {pullRequest.authorLogin}
            </p>
            <h2>
              <Link to={`/pull-requests/${pullRequest.id}`}>{pullRequest.title}</Link>
            </h2>
          </div>
          <div className="badge-row">
            {pullRequest.isAgentGenerated && <span className="agent-badge">Agent generated</span>}
            <StatusBadge value={pullRequest.queueStatus} />
          </div>
        </div>
        <ul className="reason-list compact-list">
          {(pullRequest.priorityReasons || []).slice(0, 3).map((reason) => (
            <li key={reason}>{reason}</li>
          ))}
          {!pullRequest.priorityReasons?.length && <li>No priority signals detected</li>}
        </ul>
        <div className="pr-coordination">
          <span className={reviewRequest.hasActiveRequest ? 'coordination-active' : ''}>
            {reviewRequest.label}
          </span>
          <span className={`coordination-${namedChecks.status.toLowerCase().replaceAll('_', '-')}`}>
            {namedChecks.label}
          </span>
        </div>
        <div className="pr-meta">
          <StatusBadge value={pullRequest.ciStatus} compact />
          <StatusBadge value={pullRequest.reviewStatus} compact />
          <span>{reviewSize.label} review</span>
          <span>{waiting.compactLabel}</span>
          <span>
            <b>+{pullRequest.additions}</b> / <i>−{pullRequest.deletions}</i>
          </span>
          <span>{pullRequest.changedLines} lines</span>
        </div>
      </div>
      <div className="pr-actions">
        <a href={pullRequest.htmlUrl} target="_blank" rel="noreferrer">
          GitHub ↗
        </a>
        <Link to={`/pull-requests/${pullRequest.id}`}>Details →</Link>
      </div>
    </article>
  );
}
