import { Link } from '@/lib/router';
import { Icon } from '@/components/Icon';

export function NotFound() {
  return (
    <div className="card card-pad" style={{ textAlign: 'center', padding: '48px 20px' }}>
      <Icon name="search" size={30} />
      <h1 style={{ marginTop: 12 }}>Page not found</h1>
      <p className="muted">That calculator does not exist — it may have been renamed or removed.</p>
      <Link to="/" className="btn" style={{ marginTop: 8 }}>
        Back to dashboard
      </Link>
    </div>
  );
}
