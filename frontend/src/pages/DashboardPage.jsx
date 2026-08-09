import { useCallback, useEffect, useMemo, useState } from 'react';
import { api, errorMessage } from '../api/client.js';
import EmptyState from '../components/EmptyState.jsx';
import ErrorMessage from '../components/ErrorMessage.jsx';
import LoadingState from '../components/LoadingState.jsx';
import PullRequestCard from '../components/PullRequestCard.jsx';
import QueueTabs from '../components/QueueTabs.jsx';
import RepositorySelector from '../components/RepositorySelector.jsx';
import SearchAndFilters from '../components/SearchAndFilters.jsx';
import { parseGitHubRepositoryUrl } from '../utils/githubRepository.js';

const QUEUES = ['REVIEW_NOW', 'RETURN_TO_AGENT', 'WAITING', 'LOW_RISK'];
const AUTO_REFRESH_INTERVAL_MS = 30_000;

export default function DashboardPage() {
  const [teams, setTeams] = useState([]);
  const [activeTeamId, setActiveTeamId] = useState(null);
  const [repositories, setRepositories] = useState([]);
  const [repositoryId, setRepositoryId] = useState(null);
  const [pullRequests, setPullRequests] = useState([]);
  const [queue, setQueue] = useState('REVIEW_NOW');
  const [search, setSearch] = useState('');
  const [agentFilter, setAgentFilter] = useState('all');
  const [ciFilter, setCiFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [lastQueueRefreshAt, setLastQueueRefreshAt] = useState(null);
  const [error, setError] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [newRepositoryUrl, setNewRepositoryUrl] = useState('');

  const selectedRepository = repositories.find((repository) => repository.id === repositoryId);

  const loadPullRequests = useCallback(async (selectedId) => {
    if (!selectedId) {
      setPullRequests([]);
      setLastQueueRefreshAt(null);
      return;
    }
    const { data } = await api.get(`/repositories/${selectedId}/pull-requests`, {
      params: { sort: 'priority' },
    });
    setPullRequests(data.pullRequests);
    setLastQueueRefreshAt(new Date());
  }, []);

  useEffect(() => {
    async function loadWorkspace() {
      setLoading(true);
      setError('');
      try {
        const { data } = await api.get('/teams');
        setTeams(data.teams);
        setActiveTeamId(data.teams[0]?.id || null);
      } catch (requestError) {
        setError(errorMessage(requestError, 'Could not load your workspace'));
      } finally {
        setLoading(false);
      }
    }
    loadWorkspace();
  }, []);

  useEffect(() => {
    if (!activeTeamId) return;
    async function loadRepositories() {
      setLoading(true);
      setError('');
      try {
        const { data } = await api.get(`/teams/${activeTeamId}/repositories`);
        setRepositories(data.repositories);
        const saved = Number(localStorage.getItem('normRepositoryId'));
        const selected =
          data.repositories.find((repository) => repository.id === saved) || data.repositories[0];
        setRepositoryId(selected?.id || null);
      } catch (requestError) {
        setError(errorMessage(requestError, 'Could not load repositories'));
      } finally {
        setLoading(false);
      }
    }
    loadRepositories();
  }, [activeTeamId]);

  useEffect(() => {
    if (!repositoryId) {
      setPullRequests([]);
      return;
    }
    localStorage.setItem('normRepositoryId', repositoryId);
    setLoading(true);
    setError('');
    loadPullRequests(repositoryId)
      .catch((requestError) => setError(errorMessage(requestError, 'Could not load pull requests')))
      .finally(() => setLoading(false));
  }, [repositoryId, loadPullRequests]);

  useEffect(() => {
    if (!repositoryId) return undefined;
    let active = true;
    let refreshing = false;

    async function refreshQueue() {
      if (document.visibilityState === 'hidden' || syncing || refreshing) return;
      refreshing = true;
      try {
        await loadPullRequests(repositoryId);
      } catch (requestError) {
        if (active) setError(errorMessage(requestError, 'Could not refresh the review queue'));
      } finally {
        refreshing = false;
      }
    }

    function refreshWhenVisible() {
      if (document.visibilityState === 'visible') refreshQueue();
    }

    const intervalId = window.setInterval(refreshQueue, AUTO_REFRESH_INTERVAL_MS);
    document.addEventListener('visibilitychange', refreshWhenVisible);
    return () => {
      active = false;
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', refreshWhenVisible);
    };
  }, [repositoryId, syncing, loadPullRequests]);

  const counts = useMemo(
    () =>
      Object.fromEntries(
        QUEUES.map((value) => [
          value,
          pullRequests.filter((pr) => pr.queueStatus === value).length,
        ]),
      ),
    [pullRequests],
  );
  const visible = useMemo(
    () =>
      pullRequests.filter((pullRequest) => {
        const matchesSearch =
          !search ||
          `${pullRequest.title} ${pullRequest.authorLogin}`
            .toLowerCase()
            .includes(search.toLowerCase());
        const matchesAgent =
          agentFilter === 'all' ||
          (agentFilter === 'agent' ? pullRequest.isAgentGenerated : !pullRequest.isAgentGenerated);
        const matchesCi = ciFilter === 'all' || pullRequest.ciStatus === ciFilter;
        return pullRequest.queueStatus === queue && matchesSearch && matchesAgent && matchesCi;
      }),
    [pullRequests, queue, search, agentFilter, ciFilter],
  );

  async function sync() {
    setSyncing(true);
    setError('');
    try {
      await api.post(`/repositories/${repositoryId}/sync`);
      await loadPullRequests(repositoryId);
      const { data } = await api.get(`/teams/${activeTeamId}/repositories`);
      setRepositories(data.repositories);
    } catch (requestError) {
      setError(errorMessage(requestError, 'Repository could not be synchronized'));
    } finally {
      setSyncing(false);
    }
  }

  async function addRepository(event) {
    event.preventDefault();
    setError('');
    try {
      const repositoryIdentity = parseGitHubRepositoryUrl(newRepositoryUrl);
      const { data } = await api.post(`/teams/${activeTeamId}/repositories`, repositoryIdentity);
      setRepositories((current) => [...current, data.repository]);
      setRepositoryId(data.repository.id);
      setNewRepositoryUrl('');
      setShowAdd(false);
    } catch (requestError) {
      setError(errorMessage(requestError, 'Could not add repository'));
    }
  }

  if (loading && teams.length === 0) return <LoadingState label="Loading your review queue" />;

  return (
    <div className="dashboard-page">
      <section className="page-heading dashboard-heading">
        <div>
          <p className="eyebrow">Decision queue</p>
          <h1>Pull requests, sorted by next action.</h1>
          <p>Deterministic signals surface what needs a human and explain why.</p>
        </div>
        {repositories.length > 0 && (
          <div className="heading-actions">
            <RepositorySelector
              repositories={repositories}
              selectedId={repositoryId}
              onChange={setRepositoryId}
            />
            <button
              className="button button-primary"
              type="button"
              onClick={sync}
              disabled={syncing}
            >
              {syncing ? (
                <>
                  <span className="spinner small" /> Syncing…
                </>
              ) : (
                '↻ Sync from GitHub'
              )}
            </button>
          </div>
        )}
      </section>
      <ErrorMessage
        message={error}
        onRetry={repositoryId ? () => loadPullRequests(repositoryId) : undefined}
      />

      {repositories.length === 0 ? (
        <EmptyState
          title="Connect your first repository"
          message="Paste its GitHub URL. NORM will import pull requests when you press Sync."
        >
          {!showAdd && (
            <button
              className="button button-primary"
              type="button"
              onClick={() => setShowAdd(true)}
            >
              Add repository
            </button>
          )}
          {showAdd && (
            <form className="inline-form add-repository-form" onSubmit={addRepository}>
              <label className="repository-url-field">
                GitHub repository URL
                <input
                  required
                  inputMode="url"
                  autoComplete="url"
                  value={newRepositoryUrl}
                  onChange={(event) => setNewRepositoryUrl(event.target.value)}
                  placeholder="https://github.com/owner/repository"
                />
              </label>
              <button className="button button-primary">Add</button>
            </form>
          )}
        </EmptyState>
      ) : (
        <>
          <section className="queue-summary">
            <div>
              <span>Review-ready</span>
              <strong>{counts.REVIEW_NOW}</strong>
              <small>ranked by priority</small>
            </div>
            <div>
              <span>Needs another pass</span>
              <strong>{counts.RETURN_TO_AGENT}</strong>
              <small>failed, conflicted, or revised</small>
            </div>
            <div>
              <span>Still in motion</span>
              <strong>{counts.WAITING}</strong>
              <small>drafts and running checks</small>
            </div>
            <div>
              <span>Low-risk changes</span>
              <strong>{counts.LOW_RISK}</strong>
              <small>small documentation updates</small>
            </div>
          </section>
          <section className="queue-panel">
            <div className="queue-toolbar">
              <QueueTabs active={queue} counts={counts} onChange={setQueue} />
              <SearchAndFilters
                search={search}
                onSearch={setSearch}
                agentFilter={agentFilter}
                onAgentFilter={setAgentFilter}
                ciFilter={ciFilter}
                onCiFilter={setCiFilter}
              />
            </div>
            <div className="sync-note">
              <div className="sync-details">
                <span>
                  {selectedRepository?.lastSyncedAt
                    ? `Last synced ${new Date(selectedRepository.lastSyncedAt).toLocaleString()}`
                    : 'Not synced with GitHub yet'}
                </span>
                <small>
                  Auto-refreshes this queue every 30 seconds
                  {lastQueueRefreshAt
                    ? ` · Last checked ${lastQueueRefreshAt.toLocaleTimeString()}`
                    : ''}
                </small>
              </div>
              <button type="button" onClick={() => setShowAdd((value) => !value)}>
                + Add repository
              </button>
            </div>
            {showAdd && (
              <form
                className="inline-form add-repository-form toolbar-form"
                onSubmit={addRepository}
              >
                <label className="repository-url-field">
                  GitHub repository URL
                  <input
                    required
                    inputMode="url"
                    autoComplete="url"
                    value={newRepositoryUrl}
                    onChange={(event) => setNewRepositoryUrl(event.target.value)}
                    placeholder="https://github.com/owner/repository"
                  />
                </label>
                <button className="button button-secondary">Save repository</button>
              </form>
            )}
            {loading ? (
              <LoadingState label="Loading pull requests" />
            ) : visible.length ? (
              <div className="pr-list">
                {visible.map((pullRequest) => (
                  <PullRequestCard key={pullRequest.id} pullRequest={pullRequest} />
                ))}
              </div>
            ) : (
              <EmptyState
                title="Nothing in this queue"
                message="Try another queue or change the filters. A GitHub sync will refresh the latest state."
              />
            )}
          </section>
        </>
      )}
    </div>
  );
}
