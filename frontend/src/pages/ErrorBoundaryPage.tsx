import { useRouteError } from 'react-router-dom';

export function ErrorBoundaryPage() {
  const error = useRouteError();
  console.error(error);

  return (
    <div className="not-found">
      <div className="not-found__code">!</div>
      <p className="not-found__message">Something went wrong.</p>
      <a href="/" style={{ color: 'var(--accent)', fontSize: 'var(--text-sm)' }}>
        Return home
      </a>
    </div>
  );
}
