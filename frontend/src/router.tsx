import { Suspense, lazy } from 'react';
import { createBrowserRouter, redirect } from 'react-router-dom';
import { TerminalShell } from './components/layout/TerminalShell/TerminalShell';
import { AuthLayout } from './components/layout/AuthLayout/AuthLayout';
import { AuthGuard } from './components/guards/AuthGuard';
import { GuestGuard } from './components/guards/GuestGuard';
import { TerminalSkeleton } from './components/ui/TerminalSkeleton/TerminalSkeleton';
import { ErrorBoundaryPage } from './pages/ErrorBoundaryPage';

// Practice modes + stats — all guest-accessible
const EditorPage   = lazy(() => import('./pages/EditorPage'));
const PracticePage = lazy(() => import('./pages/practice/PracticePage'));
const FlowPage     = lazy(() => import('./pages/FlowPage'));
const RecallPage   = lazy(() => import('./pages/RecallPage'));
const StatsPage    = lazy(() => import('./pages/StatsPage'));

// Auth-required features
const ImportPage   = lazy(() => import('./pages/ImportPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));

// Auth pages
const LoginPage    = lazy(() => import('./pages/auth/LoginPage'));
const RegisterPage = lazy(() => import('./pages/auth/RegisterPage'));

const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));

const fallback = <TerminalSkeleton />;

export const router = createBrowserRouter([
  {
    element: <TerminalShell />,
    errorElement: <ErrorBoundaryPage />,
    children: [
      // "/" → /editor for all users
      { index: true, loader: () => redirect('/editor') },

      // ── Guest-accessible modes ─────────────────────────────────────
      { path: '/editor',   element: <Suspense fallback={fallback}><EditorPage /></Suspense> },
      { path: '/practice', element: <Suspense fallback={fallback}><PracticePage /></Suspense> },
      { path: '/flow',     element: <Suspense fallback={fallback}><FlowPage /></Suspense> },
      { path: '/recall',   element: <Suspense fallback={fallback}><RecallPage /></Suspense> },

      // ── Stats: guest sees current-session stats, auth sees full history ──
      { path: '/stats',    element: <Suspense fallback={fallback}><StatsPage /></Suspense> },

      // ── Auth-required features ─────────────────────────────────────
      {
        element: <AuthGuard />,
        children: [
          { path: '/import',   element: <Suspense fallback={fallback}><ImportPage /></Suspense> },
          { path: '/settings', element: <Suspense fallback={fallback}><SettingsPage /></Suspense> },
        ],
      },
    ],
  },

  // Auth pages — outside TerminalShell, minimal AuthLayout
  {
    element: <GuestGuard><AuthLayout /></GuestGuard>,
    errorElement: <ErrorBoundaryPage />,
    children: [
      { path: '/auth/login',    element: <Suspense fallback={null}><LoginPage /></Suspense> },
      { path: '/auth/register', element: <Suspense fallback={null}><RegisterPage /></Suspense> },
    ],
  },

  { path: '*', element: <Suspense fallback={null}><NotFoundPage /></Suspense> },
]);
