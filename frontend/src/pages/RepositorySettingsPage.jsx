import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, errorMessage } from '../api/client.js';
import ErrorMessage from '../components/ErrorMessage.jsx';
import LoadingState from '../components/LoadingState.jsx';

export default function RepositorySettingsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [repository, setRepository] = useState(null);
  const [form, setForm] = useState({ criticalPaths: '', agentAccounts: '', lowRiskMaxLines: 50 });
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get(`/repositories/${id}`).then(({ data }) => {
      setRepository(data.repository);
      setForm({ criticalPaths: data.repository.criticalPaths.join('\n'), agentAccounts: data.repository.agentAccounts.join('\n'), lowRiskMaxLines: data.repository.lowRiskMaxLines });
    }).catch((requestError) => setError(errorMessage(requestError)));
  }, [id]);

  async function save(event) {
    event.preventDefault(); setSaving(true); setError(''); setNotice('');
    try {
      const payload = {
        criticalPaths: form.criticalPaths.split('\n').map((item) => item.trim()).filter(Boolean),
        agentAccounts: form.agentAccounts.split('\n').map((item) => item.trim()).filter(Boolean),
        lowRiskMaxLines: Number(form.lowRiskMaxLines),
      };
      const { data } = await api.patch(`/repositories/${id}`, payload);
      setRepository(data.repository);
      setNotice('Repository rules saved. Existing open pull requests were recalculated immediately.');
    } catch (requestError) { setError(errorMessage(requestError)); }
    finally { setSaving(false); }
  }

  async function remove() {
    if (!window.confirm(`Remove ${repository.fullName} and its imported pull requests from NORM? GitHub will not be changed.`)) return;
    try { await api.delete(`/repositories/${id}`); localStorage.removeItem('normRepositoryId'); navigate('/'); }
    catch (requestError) { setError(errorMessage(requestError)); }
  }

  if (!repository && !error) return <LoadingState label="Loading repository settings" />;
  if (!repository) return <div className="narrow-page"><ErrorMessage message={error} /></div>;
  return (
    <div className="settings-page narrow-page">
      <Link className="back-link" to="/">← Back to queue</Link>
      <section className="page-heading"><div><p className="eyebrow">Repository rules</p><h1>{repository.fullName}</h1><p>These explicit rules affect agent detection, low-risk classification, and critical-file impact.</p></div></section>
      <ErrorMessage message={error} />{notice && <div className="success-message">{notice}</div>}
      <form className="content-card settings-form" onSubmit={save}>
        <label>Critical paths<span>One path prefix per line. Matching files receive the highest impact score.</span><textarea rows="10" value={form.criticalPaths} onChange={(event) => setForm({ ...form, criticalPaths: event.target.value })} /></label>
        <label>Agent accounts<span>One GitHub login per line, without the @ symbol.</span><textarea rows="5" value={form.agentAccounts} onChange={(event) => setForm({ ...form, agentAccounts: event.target.value })} placeholder="dependabot[bot]" /></label>
        <label>Low-risk maximum changed lines<span>Documentation-only PRs at or below this limit can enter Low Risk.</span><input type="number" min="0" max="10000" value={form.lowRiskMaxLines} onChange={(event) => setForm({ ...form, lowRiskMaxLines: event.target.value })} /></label>
        <div className="form-actions"><button className="button button-primary" disabled={saving}>{saving ? 'Saving…' : 'Save rules'}</button></div>
      </form>
      <section className="danger-zone"><div><h2>Remove repository</h2><p>Deletes imported NORM data only. It never modifies the GitHub repository.</p></div><button className="button button-danger" type="button" onClick={remove}>Remove repository</button></section>
    </div>
  );
}
