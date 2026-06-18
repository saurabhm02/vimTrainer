import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <div className="not-found">
      <div className="not-found__code">404</div>
      <p className="not-found__message">Page not found.</p>
      <Link to="/" style={{ color: 'var(--accent)', fontSize: 'var(--text-sm)' }}>
        Return home
      </Link>
    </div>
  );
}
