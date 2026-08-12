import { Link } from 'react-router-dom';
import EmptyState from '../components/EmptyState.jsx';

export default function NotFoundPage() {
  return (
    <div className="narrow-page">
      <EmptyState title="Page not found" message="That NORM page does not exist.">
        <Link className="button button-primary" to="/">
          Return to queue
        </Link>
      </EmptyState>
    </div>
  );
}
