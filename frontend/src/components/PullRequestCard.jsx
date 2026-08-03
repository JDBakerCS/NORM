import { Link } from 'react-router-dom';
import StatusBadge from './StatusBadge.jsx';

function ageLabel(date) {
  const days = Math.max(0, Math.floor((Date.now() - new Date(date).getTime()) / 86_400_000));
  if (days === 0) return 'Today';
  return `${days}d waiting`;
}

export default function PullRequestCard({ pullRequest }) {
  return (
    <article className="pr-card">
      <div className="pr-score" aria-label={`Priority score ${pullRequest.priorityScore} out of 100`}>
        <strong>{pullRequest.priorityScore}</strong><span>priority</span>
      </div>
      <div className="pr-content">
        <div className="pr-heading-row">
          <div>
            <p className="eyebrow">PR #{pullRequest.number} · {pullRequest.authorLogin}</p>
            <h2><Link to={`/pull-requests/${pullRequest.id}`}>{pullRequest.title}</Link></h2>
          </div>
          <div className="badge-row">
            {pullRequest.isAgentGenerated && <span className="agent-badge">Agent generated</span>}
            <StatusBadge value={pullRequest.queueStatus} />
          </div>
        </div>
        <ul className="reason-list compact-list">
          {(pullRequest.priorityReasons || []).slice(0, 3).map((reason) => <li key={reason}>{reason}</li>)}
          {!pullRequest.priorityReasons?.length && <li>No priority signals detected</li>}
        </ul>
        <div className="pr-meta">
          <StatusBadge value={pullRequest.ciStatus} compact />
          <StatusBadge value={pullRequest.reviewStatus} compact />
          <span>{ageLabel(pullRequest.githubCreatedAt)}</span>
          <span><b>+{pullRequest.additions}</b> / <i>−{pullRequest.deletions}</i></span>
          <span>{pullRequest.changedLines} lines</span>
        </div>
      </div>
      <div className="pr-actions">
        <a href={pullRequest.htmlUrl} target="_blank" rel="noreferrer">GitHub ↗</a>
        <Link to={`/pull-requests/${pullRequest.id}`}>Details →</Link>
      </div>
    </article>
  );
}

