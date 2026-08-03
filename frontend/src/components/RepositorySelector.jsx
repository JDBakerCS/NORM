import { Link } from 'react-router-dom';

export default function RepositorySelector({ repositories, selectedId, onChange }) {
  return (
    <div className="repository-selector">
      <label>
        <span>Repository</span>
        <select value={selectedId || ''} onChange={(event) => onChange(Number(event.target.value))}>
          {repositories.map((repository) => <option key={repository.id} value={repository.id}>{repository.fullName}</option>)}
        </select>
      </label>
      {selectedId && <Link className="settings-link" to={`/repositories/${selectedId}/settings`} aria-label="Repository settings">⚙</Link>}
    </div>
  );
}

