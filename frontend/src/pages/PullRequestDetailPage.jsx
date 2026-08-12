import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, errorMessage } from '../api/client.js';
import ErrorMessage from '../components/ErrorMessage.jsx';
import LoadingState from '../components/LoadingState.jsx';
import PriorityBreakdown from '../components/PriorityBreakdown.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import { getAttentionLevel } from '../utils/priorityDisplay.js';
import { getRepositoryDisplayName } from '../utils/repositoryDisplay.js';
import { getReviewRequestSummary, sortNamedChecks } from '../utils/reviewCoordination.js';

export default function PullRequestDetailPage() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [commits, setCommits] = useState([]);
  const [commitsOpen, setCommitsOpen] = useState(false);
  const [commitsLoading, setCommitsLoading] = useState(false);
  const [commitsLoaded, setCommitsLoaded] = useState(false);
  const [commitsError, setCommitsError] = useState('');

  useEffect(() => {
    setData(null);
    setError('');
    setCommits([]);
    setCommitsOpen(false);
    setCommitsLoading(false);
    setCommitsLoaded(false);
    setCommitsError('');
    api
      .get(`/pull-requests/${id}`)
      .then(({ data: result }) => setData(result))
      .catch((requestError) => setError(errorMessage(requestError)));
  }, [id]);

  function loadCommits() {
    if (commitsLoaded || commitsLoading) return;
    setCommitsLoading(true);
    setCommitsError('');
    api
      .get(`/pull-requests/${id}/commits`)
      .then(({ data: result }) => {
        setCommits(result.commits || []);
        setCommitsLoaded(true);
      })
      .catch((requestError) => setCommitsError(errorMessage(requestError)))
      .finally(() => setCommitsLoading(false));
  }

  function toggleCommits() {
    const nextOpen = !commitsOpen;
    setCommitsOpen(nextOpen);
    if (nextOpen) loadCommits();
  }

  if (error)
    return (
      <div className="narrow-page">
        <Link className="back-link" to="/">
          ← Back to queue
        </Link>
        <ErrorMessage message={error} />
      </div>
    );
  if (!data) return <LoadingState label="Loading pull-request details" />;
  const { pullRequest, queueDecision } = data;
  const attention = getAttentionLevel(pullRequest);
  const reviewRequest = getReviewRequestSummary(pullRequest);
  const namedChecks = sortNamedChecks(pullRequest.checkResults || []);

  return (
    <div className="detail-page">
      <Link className="back-link" to="/">
        ← Back to queue
      </Link>
      <section className="detail-heading">
        <div>
          <p className="eyebrow">
            {getRepositoryDisplayName(pullRequest.Repository)} · PR #{pullRequest.number}
          </p>
          <h1>{pullRequest.title}</h1>
          <p>
            Opened by <strong>{pullRequest.authorLogin}</strong> on{' '}
            {new Date(pullRequest.githubCreatedAt).toLocaleDateString()}
          </p>
        </div>
        <a
          className="button button-secondary"
          href={pullRequest.htmlUrl}
          target="_blank"
          rel="noreferrer"
        >
          Open in GitHub ↗
        </a>
      </section>
      <div className="detail-grid">
        <section className="content-card">
          <div className="card-heading">
            <div>
              <p className="eyebrow">Review guidance</p>
              <h2>Why this needs attention</h2>
            </div>
            <span className={`attention-label attention-${attention.key.toLowerCase()}`}>
              {attention.label} attention
            </span>
          </div>
          <PriorityBreakdown pullRequest={pullRequest} />
          <h3>Signals</h3>
          <ul className="reason-list">
            {pullRequest.priorityReasons.map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
            {!pullRequest.priorityReasons.length && <li>No priority signals detected.</li>}
          </ul>
        </section>
        <aside className="detail-sidebar">
          <section className="content-card decision-card">
            <p className="eyebrow">Queue decision</p>
            <StatusBadge value={pullRequest.queueStatus} />
            <p>{queueDecision.reason}</p>
          </section>
          <section className="content-card">
            <h2>Status</h2>
            <dl className="status-list">
              <div>
                <dt>Checks</dt>
                <dd>
                  <StatusBadge value={pullRequest.ciStatus} compact />
                </dd>
              </div>
              <div>
                <dt>Review</dt>
                <dd>
                  <StatusBadge value={pullRequest.reviewStatus} compact />
                </dd>
              </div>
              <div>
                <dt>Mergeability</dt>
                <dd>
                  <StatusBadge value={pullRequest.mergeableStatus} compact />
                </dd>
              </div>
              <div>
                <dt>Source branch</dt>
                <dd>
                  <code>{pullRequest.branchName}</code>
                </dd>
              </div>
            </dl>
          </section>
          <section className="content-card reviewer-card">
            <p className="eyebrow">Review routing</p>
            <h2>{reviewRequest.hasActiveRequest ? 'Review requested' : 'Current assignment'}</h2>
            <p>{reviewRequest.label}</p>
          </section>
        </aside>
        <section className="content-card checks-card">
          <div className="card-heading">
            <div>
              <p className="eyebrow">Automation</p>
              <h2>Named checks</h2>
            </div>
            <StatusBadge value={pullRequest.ciStatus} compact />
          </div>
          {namedChecks.length ? (
            <ul className="check-list">
              {namedChecks.map((check, index) => (
                <li key={`${check.source}-${check.name}-${index}`}>
                  <div>
                    <strong>
                      {check.detailsUrl ? (
                        <a href={check.detailsUrl} target="_blank" rel="noreferrer">
                          {check.name} ↗
                        </a>
                      ) : (
                        check.name
                      )}
                    </strong>
                    <small>
                      {check.source === 'COMMIT_STATUS' ? 'Commit status' : 'Check run'}
                    </small>
                  </div>
                  <StatusBadge
                    value={check.status}
                    compact
                    label={
                      check.status === 'PASSED'
                        ? 'Passed'
                        : check.status === 'FAILED'
                          ? 'Failed'
                          : 'Running'
                    }
                  />
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted-copy">No named checks are available for this pull request.</p>
          )}
        </section>
        <section className="content-card commits-card">
          <div className="card-heading">
            <div>
              <p className="eyebrow">History</p>
              <h2>Commits{commitsLoaded ? ` (${commits.length})` : ''}</h2>
            </div>
            <button
              className="button button-secondary commits-toggle"
              type="button"
              aria-expanded={commitsOpen}
              onClick={toggleCommits}
            >
              {commitsOpen ? 'Hide commits' : 'Show commits'}
            </button>
          </div>
          {commitsOpen && (
            <>
              {commitsLoading && <LoadingState label="Loading commits" />}
              <ErrorMessage message={commitsError} onRetry={loadCommits} />
              {!commitsLoading && !commitsError && commits.length > 0 && (
                <ol className="commit-list">
                  {commits.map((commit) => (
                    <li key={commit.sha}>
                      <div className="commit-main">
                        <strong className="commit-message">
                          {commit.htmlUrl ? (
                            <a href={commit.htmlUrl} target="_blank" rel="noreferrer">
                              {commit.message.split('\n')[0]} ↗
                            </a>
                          ) : (
                            commit.message.split('\n')[0]
                          )}
                        </strong>
                        <span className="commit-meta">
                          {commit.authorLogin} ·{' '}
                          {commit.committedAt
                            ? new Date(commit.committedAt).toLocaleString()
                            : 'Unknown date'}
                          {commit.isVerified && ' · Verified'}
                        </span>
                      </div>
                      <code className="commit-sha">{commit.sha.slice(0, 7)}</code>
                    </li>
                  ))}
                </ol>
              )}
              {!commitsLoading && !commitsError && commitsLoaded && !commits.length && (
                <p className="muted-copy">No commits are available for this pull request.</p>
              )}
            </>
          )}
        </section>
        <section className="content-card file-card">
          <div className="card-heading">
            <div>
              <p className="eyebrow">Change surface</p>
              <h2>{pullRequest.changedFilesCount} changed files</h2>
            </div>
            <div className="diff-stat">
              <b>+{pullRequest.additions}</b>
              <i>−{pullRequest.deletions}</i>
            </div>
          </div>
          <ul className="file-list">
            {pullRequest.changedFilePaths.map((path) => (
              <li key={path}>
                <code>{path}</code>
              </li>
            ))}
          </ul>
        </section>
        <section className="content-card metadata-card">
          <h2>GitHub metadata</h2>
          <dl className="status-list">
            <div>
              <dt>Labels</dt>
              <dd className="label-list">
                {pullRequest.labels.length
                  ? pullRequest.labels.map((label) => <span key={label}>{label}</span>)
                  : 'None'}
              </dd>
            </div>
            <div>
              <dt>Created</dt>
              <dd>{new Date(pullRequest.githubCreatedAt).toLocaleString()}</dd>
            </div>
            <div>
              <dt>Updated</dt>
              <dd>{new Date(pullRequest.githubUpdatedAt).toLocaleString()}</dd>
            </div>
            <div>
              <dt>Last synced</dt>
              <dd>{new Date(pullRequest.lastSyncedAt).toLocaleString()}</dd>
            </div>
          </dl>
        </section>
      </div>
    </div>
  );
}
