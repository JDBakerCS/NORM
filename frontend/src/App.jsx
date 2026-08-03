import { Route, Routes } from 'react-router-dom';
import AppLayout from './components/AppLayout.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import NotFoundPage from './pages/NotFoundPage.jsx';
import PullRequestDetailPage from './pages/PullRequestDetailPage.jsx';
import RegisterPage from './pages/RegisterPage.jsx';
import RepositorySettingsPage from './pages/RepositorySettingsPage.jsx';
import TeamPage from './pages/TeamPage.jsx';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/pull-requests/:id" element={<PullRequestDetailPage />} />
        <Route path="/repositories/:id/settings" element={<RepositorySettingsPage />} />
        <Route path="/team" element={<TeamPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}

