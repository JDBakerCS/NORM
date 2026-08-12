import { useEffect, useState } from 'react';
import { api, errorMessage } from '../api/client.js';
import ErrorMessage from '../components/ErrorMessage.jsx';
import LoadingState from '../components/LoadingState.jsx';

export default function TeamPage() {
  const [team, setTeam] = useState(null);
  const [members, setMembers] = useState([]);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('MEMBER');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const { data } = await api.get('/teams');
        const selectedTeam = data.teams[0];
        setTeam(selectedTeam);
        if (selectedTeam) {
          const memberResponse = await api.get(`/teams/${selectedTeam.id}/members`);
          setMembers(memberResponse.data.members);
        }
      } catch (requestError) {
        setError(errorMessage(requestError));
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function addMember(event) {
    event.preventDefault();
    setError('');
    try {
      const { data } = await api.post(`/teams/${team.id}/members`, { email, role });
      setMembers((current) => [...current, data.member]);
      setEmail('');
    } catch (requestError) {
      setError(errorMessage(requestError));
    }
  }

  if (loading) return <LoadingState label="Loading team" />;
  return (
    <div className="team-page narrow-page">
      <section className="page-heading">
        <div>
          <p className="eyebrow">Workspace</p>
          <h1>{team?.name || 'Your team'}</h1>
          <p>Team members can access repositories and triage data in this workspace.</p>
        </div>
        <span className="role-chip">Your role: {team?.role}</span>
      </section>
      <ErrorMessage message={error} />
      <section className="content-card">
        <div className="card-heading">
          <div>
            <p className="eyebrow">Access</p>
            <h2>
              {members.length} team {members.length === 1 ? 'member' : 'members'}
            </h2>
          </div>
        </div>
        <div className="member-list">
          {members.map((member) => (
            <div className="member-row" key={member.id}>
              <span className="avatar">{member.name.slice(0, 1).toUpperCase()}</span>
              <div>
                <strong>{member.name}</strong>
                <span>{member.email}</span>
              </div>
              <b>{member.role}</b>
            </div>
          ))}
        </div>
      </section>
      {team?.role === 'OWNER' && (
        <form className="content-card member-form" onSubmit={addMember}>
          <div>
            <p className="eyebrow">Existing NORM user</p>
            <h2>Add a team member</h2>
            <p>
              The person must register before you add their email. NORM does not send invitations.
            </p>
          </div>
          <div className="inline-form">
            <label>
              Email
              <input
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="teammate@example.com"
              />
            </label>
            <label>
              Role
              <select value={role} onChange={(event) => setRole(event.target.value)}>
                <option value="MEMBER">Member</option>
                <option value="ADMIN">Admin</option>
              </select>
            </label>
            <button className="button button-primary">Add member</button>
          </div>
        </form>
      )}
    </div>
  );
}
