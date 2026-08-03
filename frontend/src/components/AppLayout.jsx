import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function AppLayout() {
  const { user, logout } = useAuth();
  return (
    <div className="app-shell">
      <header className="site-header">
        <NavLink className="brand" to="/" aria-label="NORM dashboard">
          <span className="brand-mark">N</span>
          <span>NORM</span>
        </NavLink>
        <nav className="main-nav" aria-label="Main navigation">
          <NavLink to="/" end>Queue</NavLink>
          <NavLink to="/team">Team</NavLink>
        </nav>
        <div className="user-menu">
          <div><strong>{user.name}</strong><span>{user.email}</span></div>
          <button className="button button-quiet" type="button" onClick={logout}>Log out</button>
        </div>
      </header>
      <main className="page-shell"><Outlet /></main>
    </div>
  );
}

