import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, errorMessage } from '../api/client.js';
import ErrorMessage from '../components/ErrorMessage.jsx';
import LoadingState from '../components/LoadingState.jsx';
import PriorityBreakdown from '../components/PriorityBreakdown.jsx';
import StatusBadge from '../components/StatusBadge.jsx';

export default function PullRequestDetailPage() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => {
    api.get(`/pull-requests/${id}`).then(({ data: result }) => setData(result)).catch((requestError) => setError(errorMessage(requestError)));
  }, [id]);
  if (error) return <div className="narrow-page"><Link className="back-link" to="/">← Back to queue</Link><ErrorMessage message={error} /></div>;
  if (!data) return <LoadingState label="Loading pull-request details" />;
  const { pullRequest, queueDecision } = data;

  return (
    <div className="detail-page">
      <Link className="back-link" to="/">← Back to queue</Link>
      <section className="detail-heading"><div><p className="eyebrow">{pullRequest.Repository.fullName} · PR #{pullRequest.number}</p><h1>{pullRequest.title}</h1><p>Opened by <strong>{pullRequest.authorLogin}</strong> on {new Date(pullRequest.githubCreatedAt).toLocaleDateString()}</p></div><a className="button button-secondary" href={pullRequest.htmlUrl} target="_blank" rel="noreferrer">Open in GitHub ↗</a></section>
      <div className="detail-grid">
        <section className="content-card"><div className="card-heading"><div><p className="eyebrow">Ranking</p><h2>Why this priority?</h2></div><span className="large-score">{pullRequest.priorityScore}</span></div><PriorityBreakdown pullRequest={pullRequest} /><h3>Signals</h3><ul className="reason-list">{pullRequest.priorityReasons.map((reason) => <li key={reason}>{reason}</li>)}{!pullRequest.priorityReasons.length && <li>No priority signals detected.</li>}</ul></section>
        <aside className="detail-sidebar">
          <section className="content-card decision-card"><p className="eyebrow">Queue decision</p><StatusBadge value={pullRequest.queueStatus} /><p>{queueDecision.reason}</p></section>
          <section className="content-card"><h2>Status</h2><dl className="status-list"><div><dt>Checks</dt><dd><StatusBadge value={pullRequest.ciStatus} compact /></dd></div><div><dt>Review</dt><dd><StatusBadge value={pullRequest.reviewStatus} compact /></dd></div><div><dt>Mergeability</dt><dd><StatusBadge value={pullRequest.mergeableStatus} compact /></dd></div><div><dt>Source branch</dt><dd><code>{pullRequest.branchName}</code></dd></div></dl></section>
        </aside>
        <section className="content-card file-card"><div className="card-heading"><div><p className="eyebrow">Change surface</p><h2>{pullRequest.changedFilesCount} changed files</h2></div><div className="diff-stat"><b>+{pullRequest.additions}</b><i>−{pullRequest.deletions}</i></div></div><ul className="file-list">{pullRequest.changedFilePaths.map((path) => <li key={path}><code>{path}</code></li>)}</ul></section>
        <section className="content-card metadata-card"><h2>GitHub metadata</h2><dl className="status-list"><div><dt>Labels</dt><dd className="label-list">{pullRequest.labels.length ? pullRequest.labels.map((label) => <span key={label}>{label}</span>) : 'None'}</dd></div><div><dt>Created</dt><dd>{new Date(pullRequest.githubCreatedAt).toLocaleString()}</dd></div><div><dt>Updated</dt><dd>{new Date(pullRequest.githubUpdatedAt).toLocaleString()}</dd></div><div><dt>Last synced</dt><dd>{new Date(pullRequest.lastSyncedAt).toLocaleString()}</dd></div></dl></section>
      </div>
    </div>
  );
}

