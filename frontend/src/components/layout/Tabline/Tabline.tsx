import { NavLink } from 'react-router-dom';
import { useAuthStore } from '../../../stores/authStore';
import './Tabline.css';

const TABS = [
  { path: '/editor',   label: 'editor',   authRequired: false },
  { path: '/practice', label: 'practice', authRequired: false },
  { path: '/flow',     label: 'flow',     authRequired: false },
  { path: '/recall',   label: 'recall',   authRequired: false },
  { path: '/stats',    label: 'stats',    authRequired: false },
  { path: '/import',   label: 'import',   authRequired: true  },
] as const;

export function Tabline() {
  const isAuthenticated = useAuthStore(s => s.isAuthenticated);
  const isGuest = useAuthStore(s => s.isGuest);
  const isRealUser = isAuthenticated && !isGuest;

  return (
    <div className="tabline" role="tablist" aria-label="Navigation">
      <span className="tabline__logo">vimtrainer.nvim</span>
      <span className="tabline__divider">│</span>
      {TABS.map((tab) => {
        const locked = tab.authRequired && !isRealUser;
        return (
          <NavLink
            key={tab.path}
            to={tab.path}
            className={({ isActive }) =>
              `tabline__tab${isActive ? ' tabline__tab--active' : ''}${locked ? ' tabline__tab--locked' : ''}`
            }
            role="tab"
          >
            {tab.label}
            {locked && <span className="tabline__lock" aria-hidden="true">·</span>}
          </NavLink>
        );
      })}
    </div>
  );
}
