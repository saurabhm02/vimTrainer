# VimTrainer Routing Plan

**Version**: 1.0
**Last Updated**: 2026-06-16
**Status**: Production Reference

---

## 1. React Router v6 Route Tree

All routes are defined in `src/router.tsx` using `createBrowserRouter`.

```tsx
// src/router.tsx
import { createBrowserRouter, redirect } from 'react-router-dom';
import { Suspense, lazy } from 'react';
import { AppShell } from './components/layout/AppShell/AppShell';
import { AuthLayout } from './components/layout/AuthLayout/AuthLayout';
import { PageSkeleton } from './components/ui/PageSkeleton/PageSkeleton';
import { AuthGuard } from './components/guards/AuthGuard';
import { GuestGuard } from './components/guards/GuestGuard';
import { ErrorBoundaryPage } from './pages/ErrorBoundaryPage';

// Eagerly loaded — always needed
import { LandingPage } from './pages/LandingPage';

// Lazily loaded — practice routes (most common, load first in bundle split)
const PracticePage       = lazy(() => import('./pages/practice/PracticePage'));
const MotionsPage        = lazy(() => import('./pages/practice/MotionsPage'));
const LeaderPage         = lazy(() => import('./pages/practice/LeaderPage'));
const FlashcardsPage     = lazy(() => import('./pages/practice/FlashcardsPage'));

// Auth routes
const LoginPage          = lazy(() => import('./pages/auth/LoginPage'));
const RegisterPage       = lazy(() => import('./pages/auth/RegisterPage'));

// Authenticated routes
const ImportPage         = lazy(() => import('./pages/ImportPage'));
const DashboardPage      = lazy(() => import('./pages/DashboardPage'));
const ProfilePage        = lazy(() => import('./pages/ProfilePage'));
const SettingsPage       = lazy(() => import('./pages/SettingsPage'));

// Not found
const NotFoundPage       = lazy(() => import('./pages/NotFoundPage'));

export const router = createBrowserRouter([
  // ─── Public landing (no shell) ───────────────────────────────────────────
  {
    path: '/',
    element: <LandingPage />,
    errorElement: <ErrorBoundaryPage />,
  },

  // ─── Auth routes (no AppShell, centered AuthLayout) ──────────────────────
  {
    element: <GuestGuard><AuthLayout /></GuestGuard>,
    errorElement: <ErrorBoundaryPage />,
    children: [
      {
        path: '/auth/login',
        element: (
          <Suspense fallback={<PageSkeleton variant="auth" />}>
            <LoginPage />
          </Suspense>
        ),
        handle: { title: 'Sign In' },
      },
      {
        path: '/auth/register',
        element: (
          <Suspense fallback={<PageSkeleton variant="auth" />}>
            <RegisterPage />
          </Suspense>
        ),
        handle: { title: 'Create Account' },
      },
    ],
  },

  // ─── App shell routes (sidebar + topbar) ─────────────────────────────────
  {
    element: <AppShell />,
    errorElement: <ErrorBoundaryPage />,
    children: [
      // Practice routes — guest OK
      {
        path: '/practice',
        element: (
          <Suspense fallback={<PageSkeleton variant="practice" />}>
            <PracticePage />
          </Suspense>
        ),
        handle: { title: 'Practice' },
      },
      {
        path: '/practice/motions',
        element: (
          <Suspense fallback={<PageSkeleton variant="practice" />}>
            <MotionsPage />
          </Suspense>
        ),
        handle: { title: 'Motion Trainer' },
      },
      {
        path: '/practice/leader',
        element: (
          <Suspense fallback={<PageSkeleton variant="practice" />}>
            <LeaderPage />
          </Suspense>
        ),
        handle: { title: 'Leader Key Trainer' },
      },
      {
        path: '/practice/flashcards',
        element: (
          <Suspense fallback={<PageSkeleton variant="practice" />}>
            <FlashcardsPage />
          </Suspense>
        ),
        handle: { title: 'Flashcards' },
      },

      // Authenticated-only routes
      {
        element: <AuthGuard />,
        children: [
          {
            path: '/import',
            element: (
              <Suspense fallback={<PageSkeleton variant="default" />}>
                <ImportPage />
              </Suspense>
            ),
            handle: { title: 'Import Keymaps' },
          },
          {
            path: '/dashboard',
            element: (
              <Suspense fallback={<PageSkeleton variant="dashboard" />}>
                <DashboardPage />
              </Suspense>
            ),
            handle: { title: 'Dashboard' },
          },
          {
            path: '/profile',
            element: (
              <Suspense fallback={<PageSkeleton variant="default" />}>
                <ProfilePage />
              </Suspense>
            ),
            handle: { title: 'Profile' },
          },
          {
            path: '/settings',
            element: (
              <Suspense fallback={<PageSkeleton variant="default" />}>
                <SettingsPage />
              </Suspense>
            ),
            handle: { title: 'Settings' },
          },
        ],
      },
    ],
  },

  // ─── 404 fallback ─────────────────────────────────────────────────────────
  {
    path: '*',
    element: (
      <Suspense fallback={null}>
        <NotFoundPage />
      </Suspense>
    ),
    handle: { title: 'Not Found' },
  },
]);
```

---

## 2. Route Guard Components

### 2.1 AuthGuard

Protects routes that require authentication. Redirects unauthenticated users to login, preserving the intended destination.

**File:** `src/components/guards/AuthGuard.tsx`

```tsx
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';

/**
 * Wraps authenticated-only routes.
 *
 * Redirect logic:
 * - Not authenticated AND not guest → /auth/login?next={currentPath}
 * - Authenticated OR guest → render children via <Outlet />
 *
 * Guest users (isGuest=true) can access practice routes but NOT import/dashboard/profile.
 * AuthGuard is only applied to import/dashboard/profile/settings — practice routes
 * are outside this guard and accessible to guests.
 */
export function AuthGuard(): JSX.Element {
  const { isAuthenticated, isGuest } = useAuthStore(s => ({
    isAuthenticated: !!s.token && !!s.user,
    isGuest: s.isGuest,
  }));
  const location = useLocation();

  if (!isAuthenticated) {
    // Preserve destination so login page can redirect back after auth
    const nextUrl = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/auth/login?next=${nextUrl}`} replace />;
  }

  return <Outlet />;
}
```

### 2.2 GuestGuard

Prevents authenticated users from accessing auth pages (login/register). Redirects them to dashboard.

**File:** `src/components/guards/GuestGuard.tsx`

```tsx
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';

interface GuestGuardProps {
  children: React.ReactNode;
}

/**
 * Wraps auth pages (/auth/login, /auth/register).
 *
 * Redirect logic:
 * - Already authenticated → /dashboard
 * - Not authenticated → render children
 *
 * Guest users (isGuest=true) are NOT considered authenticated for this guard;
 * they can still see auth pages to sign up.
 */
export function GuestGuard({ children }: GuestGuardProps): JSX.Element {
  const isAuthenticated = useAuthStore(s => !!s.token && !!s.user && !s.isGuest);

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
```

### 2.3 PublicGuard

Not a redirect guard — a utility wrapper that simply renders children. Kept for semantic clarity in cases where a route is explicitly marked as public.

**File:** `src/components/guards/PublicGuard.tsx`

```tsx
interface PublicGuardProps {
  children: React.ReactNode;
}

/**
 * Explicit marker for public routes. No redirect logic.
 * Documents intent: this route is intentionally accessible to all users.
 */
export function PublicGuard({ children }: PublicGuardProps): JSX.Element {
  return <>{children}</>;
}
```

---

## 3. Code Splitting Configuration

### 3.1 Vite Manual Chunks

**File:** `vite.config.ts`

```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Core React runtime — always loaded
          'react-vendor': ['react', 'react-dom'],

          // Router — loaded immediately after main bundle
          'router-vendor': ['react-router-dom'],

          // State management — loaded immediately
          'state-vendor': ['zustand'],

          // Data fetching — loaded immediately
          'query-vendor': ['@tanstack/react-query', 'axios'],

          // Charts — deferred until Dashboard loads
          'charts-vendor': ['recharts'],

          // Practice routes — first feature chunk
          'practice-chunk': [
            './src/pages/practice/PracticePage',
            './src/pages/practice/MotionsPage',
            './src/pages/practice/LeaderPage',
            './src/pages/practice/FlashcardsPage',
          ],

          // Authenticated feature chunk
          'auth-features-chunk': [
            './src/pages/ImportPage',
            './src/pages/DashboardPage',
            './src/pages/ProfilePage',
            './src/pages/SettingsPage',
          ],

          // Auth pages
          'auth-pages-chunk': [
            './src/pages/auth/LoginPage',
            './src/pages/auth/RegisterPage',
          ],
        },
      },
    },
    // Chunk size warning at 250kb
    chunkSizeWarningLimit: 250,
  },
  // Preload practice-chunk on landing page since it's the next user action
  experimental: {
    renderBuiltUrl: undefined,
  },
});
```

### 3.2 Suspense Fallback Components

**File:** `src/components/ui/PageSkeleton/PageSkeleton.tsx`

```tsx
type PageSkeletonVariant = 'default' | 'practice' | 'dashboard' | 'auth';

interface PageSkeletonProps {
  variant?: PageSkeletonVariant;
}

/**
 * Skeleton shown during React.lazy chunk loading.
 * Each variant matches the layout of its target page to prevent layout shift.
 */
export function PageSkeleton({ variant = 'default' }: PageSkeletonProps): JSX.Element {
  if (variant === 'practice') {
    return (
      <div className="page-skeleton page-skeleton--practice" aria-busy="true" aria-label="Loading practice mode">
        <div className="page-skeleton__challenge-placeholder" />
        <div className="page-skeleton__input-placeholder" />
        <div className="page-skeleton__stats-placeholder" />
      </div>
    );
  }

  if (variant === 'dashboard') {
    return (
      <div className="page-skeleton page-skeleton--dashboard" aria-busy="true">
        <div className="page-skeleton__gauge-placeholder" />
        <div className="page-skeleton__chart-row">
          <div className="page-skeleton__chart-placeholder" />
          <div className="page-skeleton__chart-placeholder" />
        </div>
      </div>
    );
  }

  if (variant === 'auth') {
    return (
      <div className="page-skeleton page-skeleton--auth" aria-busy="true">
        <div className="page-skeleton__card-placeholder" />
      </div>
    );
  }

  // default
  return (
    <div className="page-skeleton" aria-busy="true">
      <div className="page-skeleton__header-placeholder" />
      <div className="page-skeleton__content-placeholder" />
    </div>
  );
}
```

### 3.3 Prefetch Strategy

The landing page prefetches the `practice-chunk` since the primary CTA leads to `/practice`.

**File:** `src/pages/LandingPage.tsx` (relevant hook)

```tsx
import { useEffect } from 'react';

// Prefetch practice page bundle when LandingPage mounts
// This runs after critical resources are loaded
function usePrefetchPractice(): void {
  useEffect(() => {
    const timer = setTimeout(() => {
      import('./practice/PracticePage');
    }, 2000); // Delay 2s to not compete with initial page load
    return () => clearTimeout(timer);
  }, []);
}
```

---

## 4. Keyboard-Driven Navigation

Global keyboard shortcuts for navigation. Registered in `uiStore.shortcutRegistry` and activated by the `useGlobalShortcuts` hook.

**File:** `src/hooks/useGlobalShortcuts.ts`

```tsx
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUIStore } from '../stores/uiStore';
import { usePracticeStore } from '../stores/practiceStore';

/**
 * Registers global keyboard navigation shortcuts.
 *
 * Active only when:
 *  - No modal is open (uiStore.modalStack.length === 0)
 *  - Practice session is NOT active (practiceStore.sessionState !== 'active')
 *  - No input/textarea is focused
 *
 * Shortcuts:
 *  p         → /practice
 *  m         → /practice/motions
 *  l         → /practice/leader
 *  f         → /practice/flashcards
 *  d         → /dashboard
 *  i         → /import
 *  ,         → /settings
 *  g h       → / (home) [two-key sequence, 500ms window]
 *  ?         → open keyboard shortcut reference modal
 *  Escape    → go back (if not in practice)
 */
export function useGlobalShortcuts(): void {
  const navigate    = useNavigate();
  const modalStack  = useUIStore(s => s.modalStack);
  const sessionState = usePracticeStore(s => s.sessionState);
  const openModal   = useUIStore(s => s.openModal);

  useEffect(() => {
    let pendingKey: string | null = null;
    let pendingTimer: ReturnType<typeof setTimeout> | null = null;

    function isInputFocused(): boolean {
      const el = document.activeElement;
      return (
        el instanceof HTMLInputElement ||
        el instanceof HTMLTextAreaElement ||
        (el instanceof HTMLElement && el.isContentEditable)
      );
    }

    function shouldHandleShortcut(): boolean {
      return (
        modalStack.length === 0 &&
        sessionState !== 'active' &&
        sessionState !== 'correct-feedback' &&
        sessionState !== 'incorrect-feedback' &&
        !isInputFocused()
      );
    }

    function handleKeyDown(e: KeyboardEvent): void {
      if (!shouldHandleShortcut()) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      const key = e.key;

      // Two-key sequence: g → h (go home)
      if (pendingKey === 'g') {
        if (pendingTimer) clearTimeout(pendingTimer);
        pendingKey = null;
        if (key === 'h') { e.preventDefault(); navigate('/'); }
        return;
      }

      switch (key) {
        case 'g':
          pendingKey = 'g';
          pendingTimer = setTimeout(() => { pendingKey = null; }, 500);
          e.preventDefault();
          break;
        case 'p':
          e.preventDefault();
          navigate('/practice');
          break;
        case 'm':
          e.preventDefault();
          navigate('/practice/motions');
          break;
        case 'l':
          e.preventDefault();
          navigate('/practice/leader');
          break;
        case 'f':
          e.preventDefault();
          navigate('/practice/flashcards');
          break;
        case 'd':
          e.preventDefault();
          navigate('/dashboard');
          break;
        case 'i':
          e.preventDefault();
          navigate('/import');
          break;
        case ',':
          e.preventDefault();
          navigate('/settings');
          break;
        case '?':
          e.preventDefault();
          openModal('keyboard-shortcuts');
          break;
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (pendingTimer) clearTimeout(pendingTimer);
    };
  }, [navigate, modalStack, sessionState, openModal]);
}
```

---

## 5. URL State for Practice Mode

Session configuration is stored in URL search params so sessions are shareable and bookmarkable.

### 5.1 URL Schema

```
/practice?mode=all&length=20&categories=Telescope,LSP&layout=qwerty
/practice/leader?length=15
/practice/flashcards?deck=missed&shuffle=true
```

### 5.2 Parameter Definitions

| Param | Values | Default | Description |
|-------|--------|---------|-------------|
| `mode` | `all`, `motions`, `leader`, `custom` | `all` | Challenge pool filter |
| `length` | `5`, `10`, `20`, `50` | `20` | Number of challenges |
| `categories` | Comma-separated category names | (all) | Filter by category |
| `layout` | `qwerty`, `dvorak`, `colemak`, `azerty` | `qwerty` | Keyboard layout hint |
| `deck` | `missed`, `all`, `category:{name}` | `all` | Flashcard deck filter |
| `shuffle` | `true`, `false` | `true` | Randomize challenge order |

### 5.3 Hook to Read/Write Session Config

**File:** `src/hooks/useSessionConfig.ts`

```tsx
import { useSearchParams } from 'react-router-dom';
import { useCallback } from 'react';

type PracticeMode = 'all' | 'motions' | 'leader' | 'custom';
type KeyboardLayout = 'qwerty' | 'dvorak' | 'colemak' | 'azerty';

interface SessionConfig {
  mode: PracticeMode;
  length: number;
  categories: string[];
  layout: KeyboardLayout;
  shuffle: boolean;
}

interface UseSessionConfigReturn {
  config: SessionConfig;
  setConfig: (partial: Partial<SessionConfig>) => void;
  resetConfig: () => void;
}

const VALID_LENGTHS = [5, 10, 20, 50];
const DEFAULT_CONFIG: SessionConfig = {
  mode: 'all',
  length: 20,
  categories: [],
  layout: 'qwerty',
  shuffle: true,
};

export function useSessionConfig(): UseSessionConfigReturn {
  const [searchParams, setSearchParams] = useSearchParams();

  const config: SessionConfig = {
    mode: (searchParams.get('mode') as PracticeMode) ?? DEFAULT_CONFIG.mode,
    length: (() => {
      const v = parseInt(searchParams.get('length') ?? '', 10);
      return VALID_LENGTHS.includes(v) ? v : DEFAULT_CONFIG.length;
    })(),
    categories: searchParams.get('categories')
      ? searchParams.get('categories')!.split(',').filter(Boolean)
      : DEFAULT_CONFIG.categories,
    layout: (searchParams.get('layout') as KeyboardLayout) ?? DEFAULT_CONFIG.layout,
    shuffle: searchParams.get('shuffle') !== 'false',
  };

  const setConfig = useCallback(
    (partial: Partial<SessionConfig>) => {
      setSearchParams(prev => {
        const next = new URLSearchParams(prev);
        if (partial.mode !== undefined)       next.set('mode', partial.mode);
        if (partial.length !== undefined)     next.set('length', String(partial.length));
        if (partial.categories !== undefined) {
          if (partial.categories.length === 0) next.delete('categories');
          else next.set('categories', partial.categories.join(','));
        }
        if (partial.layout !== undefined)    next.set('layout', partial.layout);
        if (partial.shuffle !== undefined)   next.set('shuffle', String(partial.shuffle));
        return next;
      }, { replace: true });
    },
    [setSearchParams],
  );

  const resetConfig = useCallback(() => {
    setSearchParams({}, { replace: true });
  }, [setSearchParams]);

  return { config, setConfig, resetConfig };
}
```

---

## 6. Error Boundary Placement

### 6.1 Error Boundary Strategy

```
Router level: 1 errorElement on root layout — catches routing errors
AppShell level: 1 errorElement — catches shell render errors
Practice page: 1 wrapping ErrorBoundary class component — session errors must not crash the app
Chart components: individual try/catch in each chart, render "Chart unavailable" on error
```

### 6.2 ErrorBoundaryPage Component

**File:** `src/pages/ErrorBoundaryPage.tsx`

```tsx
import { useRouteError, isRouteErrorResponse, Link } from 'react-router-dom';

export function ErrorBoundaryPage(): JSX.Element {
  const error = useRouteError();

  let status = 500;
  let message = 'Something went wrong. Please refresh the page.';

  if (isRouteErrorResponse(error)) {
    status  = error.status;
    message = error.status === 404
      ? 'This page does not exist.'
      : error.statusText || message;
  } else if (error instanceof Error) {
    message = error.message;
  }

  return (
    <div className="error-page" role="main">
      <h1 className="error-page__status">{status}</h1>
      <p className="error-page__message">{message}</p>
      <div className="error-page__actions">
        <Link to="/" className="btn btn--primary btn--md">Go Home</Link>
        <button
          className="btn btn--secondary btn--md"
          onClick={() => window.location.reload()}
        >
          Retry
        </button>
      </div>
    </div>
  );
}
```

### 6.3 Practice Session Error Boundary

**File:** `src/components/practice/PracticeErrorBoundary.tsx`

```tsx
import { Component, ErrorInfo, ReactNode } from 'react';
import { usePracticeStore } from '../../stores/practiceStore';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Catches errors inside PracticeArena without crashing the whole app.
 * On error: reset session state and show recovery UI.
 */
export class PracticeErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('[PracticeErrorBoundary]', error, info);
    // Reset the practice store to prevent stale session state
    usePracticeStore.getState().resetSession();
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="practice-error" role="alert">
          <h2>Session Error</h2>
          <p>The practice session encountered an error. Your progress may not have been saved.</p>
          <button
            className="btn btn--primary btn--md"
            onClick={() => this.setState({ hasError: false, error: null })}
          >
            Start New Session
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
```

---

## 7. Scroll Restoration Strategy

**File:** `src/hooks/useScrollRestoration.ts`

React Router v6 does not restore scroll position by default for SPAs. This hook implements manual scroll restoration.

```tsx
import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

const scrollPositions = new Map<string, number>();

/**
 * Saves and restores scroll position per route pathname.
 *
 * Behavior:
 * - On route change: save current scroll position for old path.
 * - On new route mount: restore saved position, or scroll to top if none.
 * - Practice arena routes (/practice/*): always scroll to top (don't restore —
 *   session starts fresh).
 */
export function useScrollRestoration(): void {
  const { pathname } = useLocation();
  const prevPathname  = useRef<string>(pathname);

  useEffect(() => {
    const prev = prevPathname.current;

    // Save position for previous route
    scrollPositions.set(prev, window.scrollY);

    // Restore or reset for new route
    const isPracticeRoute = pathname.startsWith('/practice');
    if (isPracticeRoute) {
      window.scrollTo(0, 0);
    } else {
      const saved = scrollPositions.get(pathname);
      window.scrollTo(0, saved ?? 0);
    }

    prevPathname.current = pathname;
  }, [pathname]);
}
```

Mount in `AppShell`:

```tsx
// src/components/layout/AppShell/AppShell.tsx
export function AppShell(): JSX.Element {
  useScrollRestoration();
  // ...
}
```

---

## 8. `_redirects` File for Cloudflare Pages SPA Routing

**File:** `public/_redirects`

```
# SPA fallback: all routes serve index.html
# Cloudflare Pages reads this file from /public/_redirects

/*    /index.html    200
```

This ensures that direct navigation to `/practice`, `/dashboard`, etc. serves the React app instead of returning a 404 from Cloudflare's edge network.

---

## 9. Route Handle Data (Page Titles)

Each route carries a `handle` object with `title`. The `TopBar` reads this to render the page heading and set `document.title`.

**File:** `src/hooks/useRouteTitle.ts`

```tsx
import { useMatches } from 'react-router-dom';

interface RouteHandle {
  title?: string;
}

/**
 * Returns the title from the deepest matching route's handle.
 * Falls back to 'VimTrainer' if no title is set.
 */
export function useRouteTitle(): string {
  const matches = useMatches();

  for (let i = matches.length - 1; i >= 0; i--) {
    const handle = matches[i].handle as RouteHandle | undefined;
    if (handle?.title) return handle.title;
  }

  return 'VimTrainer';
}
```

---

## 10. Route Summary Table

| Path | Auth Required | Lazy | Page Title | Suspense Variant |
|------|:---:|:---:|---|---|
| `/` | No | No | VimTrainer | — |
| `/auth/login` | No (guest only) | Yes | Sign In | auth |
| `/auth/register` | No (guest only) | Yes | Create Account | auth |
| `/practice` | No | Yes | Practice | practice |
| `/practice/motions` | No | Yes | Motion Trainer | practice |
| `/practice/leader` | No | Yes | Leader Key Trainer | practice |
| `/practice/flashcards` | No | Yes | Flashcards | practice |
| `/import` | Yes | Yes | Import Keymaps | default |
| `/dashboard` | Yes | Yes | Dashboard | dashboard |
| `/profile` | Yes | Yes | Profile | default |
| `/settings` | Yes | Yes | Settings | default |
| `*` | No | Yes | Not Found | — |
