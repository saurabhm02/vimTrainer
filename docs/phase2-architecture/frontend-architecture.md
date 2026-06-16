# Frontend Architecture: VimTrainer React SPA
**Version**: 1.0
**Last Updated**: 2026-06-16
**Author**: Architecture Team
**Status**: Approved

---

## 1. Technology Stack

| Concern | Choice | Rationale |
|---------|--------|-----------|
| Framework | React 18 | Concurrent rendering for the practice loop |
| Language | TypeScript 5 | Type safety across API boundaries |
| Build tool | Vite 5 | Fast HMR in dev, optimized production builds |
| Routing | React Router v6 | Standard, stable, supports data loaders |
| State management | Zustand | Minimal boilerplate, no provider wrapping, easy to test |
| Server state | TanStack Query v5 | Cache invalidation, background refetching, optimistic updates |
| HTTP client | Axios | Interceptors for JWT refresh logic |
| Charts | Recharts | React-native, composable, no canvas performance concerns at our data volume |
| Styling | Custom CSS (CSS modules per component) | No runtime CSS-in-JS overhead; practice loop requires deterministic render timing |
| Deployment | Cloudflare Pages | Edge CDN, automatic deploy previews, zero config |

---

## 2. Repository Structure

```
frontend/
├── index.html                          # Single entry point
├── vite.config.ts                      # Build config, dev proxy, code splitting
├── tsconfig.json                       # Strict TypeScript config
├── tsconfig.node.json                  # Config for Vite's Node.js environment
├── .env.example                        # Documents all VITE_ env vars
│
└── src/
    ├── main.tsx                        # React root: QueryClientProvider, RouterProvider
    │
    ├── api/
    │   ├── client.ts                   # Axios instance with interceptors (auth, refresh)
    │   ├── queries/
    │   │   ├── auth.queries.ts         # useLogin, useRegister, useLogout hooks
    │   │   ├── keymap.queries.ts       # useKeymaps, useParseFile, useImportKeymaps
    │   │   ├── session.queries.ts      # useCreateSession, useRecordAttempt, useCompleteSession
    │   │   ├── analytics.queries.ts    # useAnalyticsSummary, useCommandHistory
    │   │   ├── achievement.queries.ts  # useAchievements
    │   │   ├── settings.queries.ts     # useSettings, useUpdateSettings
    │   │   └── daily-queue.queries.ts  # useDailyQueue
    │   └── types/
    │       └── api.types.ts            # Types matching backend JSON exactly
    │
    ├── components/
    │   ├── ui/                         # Stateless primitives — no business logic
    │   │   ├── Button/
    │   │   │   ├── Button.tsx
    │   │   │   └── Button.module.css
    │   │   ├── Input/
    │   │   ├── Badge/
    │   │   ├── Card/
    │   │   ├── Modal/
    │   │   ├── Toast/
    │   │   ├── ProgressBar/
    │   │   ├── Spinner/
    │   │   └── EmptyState/
    │   │
    │   ├── layout/
    │   │   ├── AppShell/               # Root layout: sidebar + main content area
    │   │   ├── Sidebar/                # Navigation, user avatar, streak counter
    │   │   ├── Header/                 # Page title, breadcrumb, right-side actions
    │   │   └── AuthLayout/             # Centered card layout for /auth/* pages
    │   │
    │   ├── practice/                   # Practice session components
    │   │   ├── PracticeArena/          # Root practice component — owns session state machine
    │   │   ├── ChallengeDisplay/       # Shows action description + category tag
    │   │   ├── KeyInput/               # Keyboard input capture — performance-critical
    │   │   ├── FeedbackOverlay/        # Green/red flash on answer
    │   │   ├── ProgressHeader/         # "3/20" counter + streak display
    │   │   ├── SessionResults/         # End-of-session results breakdown
    │   │   ├── SessionConfig/          # Mode + length selector before session starts
    │   │   └── LeaderKeyHint/          # Shows leader key symbol when sequence starts
    │   │
    │   ├── flashcard/
    │   │   ├── FlashcardDeck/          # Deck selection screen
    │   │   ├── FlashcardCard/          # Show/reveal card + Knew It/Missed It buttons
    │   │   └── FlashcardResults/       # End-of-deck results
    │   │
    │   ├── import/
    │   │   ├── FileDropzone/           # Drag-and-drop upload zone
    │   │   ├── KeymapReviewTable/      # Paginated review table with checkboxes
    │   │   ├── GitHubImportForm/       # URL input + progress state display
    │   │   └── DuplicateModal/         # Replace/Keep/Skip duplicate resolution
    │   │
    │   ├── analytics/
    │   │   ├── AccuracyChart/          # Recharts LineChart wrapper
    │   │   ├── ResponseTimeChart/      # Recharts LineChart wrapper
    │   │   ├── DailyTimeChart/         # Recharts BarChart wrapper
    │   │   ├── CategoryDonut/          # Recharts PieChart wrapper
    │   │   ├── MostMissedChart/        # Recharts BarChart wrapper (horizontal)
    │   │   ├── MostImprovedChart/      # Recharts BarChart wrapper (horizontal)
    │   │   ├── DrillDownPanel/         # Per-command history slide-in panel
    │   │   └── MasteryScore/           # Large single-stat display
    │   │
    │   └── achievements/
    │       ├── AchievementCard/        # Single achievement with earned/locked state
    │       └── AchievementToast/       # In-session unlock notification
    │
    ├── pages/
    │   ├── LandingPage.tsx             # /
    │   ├── auth/
    │   │   ├── LoginPage.tsx           # /auth/login
    │   │   └── RegisterPage.tsx        # /auth/register
    │   ├── OnboardingPage.tsx          # /onboarding (2-step)
    │   ├── PracticePage.tsx            # /practice (session config + arena)
    │   ├── MotionTrainerPage.tsx       # /practice/motions
    │   ├── LeaderKeyPage.tsx           # /practice/leader
    │   ├── FlashcardsPage.tsx          # /practice/flashcards
    │   ├── ImportPage.tsx              # /import (tab: file upload or GitHub)
    │   ├── DashboardPage.tsx           # /dashboard (daily queue + charts preview)
    │   ├── AnalyticsPage.tsx           # /analytics (full dashboard)
    │   ├── ProfilePage.tsx             # /profile
    │   └── SettingsPage.tsx            # /settings
    │
    ├── stores/
    │   ├── auth.store.ts               # Authentication state
    │   ├── practice.store.ts           # Active session state machine
    │   ├── keymap.store.ts             # Imported keymaps + filter state
    │   ├── settings.store.ts           # User settings with localStorage cache
    │   └── ui.store.ts                 # Theme, sidebar, modal state
    │
    ├── types/
    │   ├── domain.types.ts             # Domain types (Keymap, Session, Achievement, etc.)
    │   ├── store.types.ts              # Zustand store state shapes
    │   └── chart.types.ts              # Recharts data shapes
    │
    ├── utils/
    │   ├── key-normalizer.ts           # Normalize key sequences for comparison display
    │   ├── date.ts                     # Date formatting utilities
    │   ├── srs.ts                      # Client-side SRS display helpers (not algorithm)
    │   ├── cn.ts                       # Class name concatenation utility
    │   └── jwt.ts                      # JWT decode for exp check (no verification)
    │
    ├── hooks/
    │   ├── useKeyCapture.ts            # Keyboard event capture for practice input
    │   ├── useDebounce.ts              # Generic debounce hook
    │   ├── useTheme.ts                 # Apply theme CSS var from settingsStore
    │   ├── useGuestToken.ts            # Read/write guest token from localStorage
    │   └── useSessionTimer.ts          # Per-command response time measurement
    │
    └── styles/
        ├── global.css                  # CSS reset + global defaults
        ├── tokens.css                  # CSS custom properties (design tokens)
        ├── themes/
        │   ├── dark.css                # --color-bg: #0d0d0d, etc.
        │   └── light.css               # --color-bg: #fafafa, etc.
        └── typography.css              # Font scale, line heights
```

---

## 3. Routing Plan

```
/                       LandingPage          No auth required
                        Data: none

/auth/login             LoginPage            Redirect to /dashboard if authed
                        Data: none (form submit calls useLogin)

/auth/register          RegisterPage         Redirect to /dashboard if authed
                        Data: none

/onboarding             OnboardingPage       Guest or authenticated
                        Data: none (2-step form, no prefetch needed)

/practice               PracticePage         Guest OK (GuestAuth)
                        Data: useKeymaps (for mode=keymaps)
                        State: practiceStore owns session machine

/practice/motions       MotionTrainerPage    Guest OK
                        Data: built-in motions from /api/keymaps?builtin=true
                        State: practiceStore

/practice/leader        LeaderKeyPage        Guest OK
                        Data: useKeymaps filtered to leader=true
                        State: practiceStore

/practice/flashcards    FlashcardsPage       Guest OK
                        Data: useDueFlashcards (SRS records due today)
                        State: local component state (no Zustand needed)

/import                 ImportPage           Guest OK (but import save requires account?)
                        Note: guests CAN parse and review, but saving to practice set
                        requires a warning that data won't persist without an account.
                        Data: none (upload is initiated by user action)

/dashboard              DashboardPage        Authenticated only (redirect /auth/login)
                        Data: useDailyQueue, useRecentSessions
                        Data: prefetched via React Router loader

/analytics              AnalyticsPage        Authenticated only
                        Data: useAnalyticsSummary({ range: '30d' })

/profile                ProfilePage          Authenticated only
                        Data: useUserProfile, useAchievements

/settings               SettingsPage         Guest OK (settings apply to guests too)
                        Data: useSettings (authenticated users only; guests use store)
```

### 3.1 Route Protection

```tsx
// src/main.tsx

// ProtectedRoute: redirects to /auth/login if not authenticated
// GuestRoute: redirects to /dashboard if already authenticated (login/register pages)

const router = createBrowserRouter([
  { path: "/", element: <LandingPage /> },
  {
    element: <AuthLayout />,
    children: [
      { path: "/auth/login",    element: <GuestRoute><LoginPage /></GuestRoute> },
      { path: "/auth/register", element: <GuestRoute><RegisterPage /></GuestRoute> },
    ]
  },
  {
    element: <AppShell />,
    children: [
      { path: "/onboarding",           element: <OnboardingPage /> },
      { path: "/practice",             element: <PracticePage /> },
      { path: "/practice/motions",     element: <MotionTrainerPage /> },
      { path: "/practice/leader",      element: <LeaderKeyPage /> },
      { path: "/practice/flashcards",  element: <FlashcardsPage /> },
      { path: "/import",               element: <ImportPage /> },
      { path: "/settings",             element: <SettingsPage /> },
      {
        // Protected: must be authenticated
        element: <ProtectedRoute />,
        children: [
          { path: "/dashboard",  element: <DashboardPage /> },
          { path: "/analytics",  element: <AnalyticsPage /> },
          { path: "/profile",    element: <ProfilePage /> },
        ]
      }
    ]
  }
])
```

---

## 4. Zustand Stores

### 4.1 authStore

**File**: `src/stores/auth.store.ts`

```typescript
interface User {
  id: string
  email: string
}

interface AuthState {
  // State
  user: User | null
  accessToken: string | null
  isGuest: boolean
  guestToken: string | null      // set when isGuest=true
  isInitialized: boolean         // true after initial hydration from localStorage

  // Actions
  login: (user: User, accessToken: string) => void
  logout: () => void
  setGuest: (guestToken: string) => void
  setAccessToken: (token: string) => void  // called by refresh interceptor
  initialize: () => void                   // hydrate from localStorage on app start
}

// Computed selectors (not in store state — derived at call site)
// isAuthenticated: authStore(s => s.user !== null && !s.isGuest)
// hasAnySession: authStore(s => s.user !== null || s.isGuest)
```

**Hydration on startup** (`initialize`):
1. Read `vimtrainer_access_token` from localStorage
2. Decode JWT to check expiry (using `utils/jwt.ts` — decode only, no signature verification)
3. If valid: set `user` and `accessToken`
4. If expired: attempt token refresh via `POST /api/auth/refresh` (cookie is httpOnly, sent automatically)
5. If no JWT found: check for `vimtrainer_guest_token` in localStorage → set guest mode

**Persistence**: Access token stored in `localStorage['vimtrainer_access_token']`. Guest token in `localStorage['vimtrainer_guest_token']`. Zustand's `persist` middleware handles this automatically:
```typescript
export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({ ... }),
    {
      name: 'vimtrainer_auth',
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        isGuest: state.isGuest,
        guestToken: state.guestToken,
      }),
    }
  )
)
```

### 4.2 practiceStore

**File**: `src/stores/practice.store.ts`

The practice store owns the session state machine. This is the performance-critical store — it must not trigger unnecessary re-renders.

```typescript
type SessionPhase =
  | 'idle'           // no session active
  | 'configuring'    // session config screen
  | 'active'         // challenge is displayed, waiting for input
  | 'feedback'       // showing correct/incorrect feedback
  | 'results'        // session complete, showing results

interface Challenge {
  id: string           // keymap_id
  description: string
  mode: string
  category: string
  // NOTE: lhs is NOT here — fetched from server after submission
}

interface AttemptRecord {
  keymapId: string
  enteredSequence: string
  isCorrect: boolean
  responseTimeMs: number
  correctAnswer: string  // revealed after attempt
}

interface PracticeState {
  // Session identity
  sessionId: string | null
  phase: SessionPhase

  // Challenges
  challenges: Challenge[]
  currentIndex: number

  // Current challenge input state
  currentInput: string        // typed so far in this challenge
  challengeStartTime: number  // Date.now() when challenge was shown

  // Session accumulator
  attempts: AttemptRecord[]
  streak: number
  maxStreak: number

  // Results (populated after completion)
  finalScore: number | null
  finalAccuracy: number | null
  achievementsUnlocked: Achievement[]

  // Actions
  startSession: (sessionId: string, challenges: Challenge[]) => void
  appendInput: (char: string) => void
  submitAttempt: (result: { isCorrect: boolean; correctAnswer: string }) => void
  advanceToNext: () => void
  endSession: (results: SessionResults) => void
  resetSession: () => void
  pauseChallenge: () => void    // tab focus loss
  resumeChallenge: () => void   // tab focus return
}
```

**Why practiceStore uses no `persist` middleware**: Session state is ephemeral — there is no value in persisting mid-session state to localStorage across page refreshes. A refresh abandons the session and the user starts fresh. This simplifies the store.

**Re-render minimization strategy**: Components that need practice state should use fine-grained selectors:

```tsx
// Correct: only re-renders when currentIndex changes
const currentIndex = usePracticeStore(s => s.currentIndex)

// Correct: only re-renders when currentInput changes
const currentInput = usePracticeStore(s => s.currentInput)

// Wrong: re-renders on any state change
const state = usePracticeStore()
```

`ChallengeDisplay` subscribes only to `challenges[currentIndex]`. `KeyInput` subscribes only to `currentInput` and `phase`. `ProgressHeader` subscribes only to `currentIndex` and `challenges.length`. These are the four components that update during the practice loop — every other component on screen is static while a challenge is active.

### 4.3 keymapStore

**File**: `src/stores/keymap.store.ts`

```typescript
interface KeymapFilter {
  mode: string | null        // "n" | "i" | "v" | null (all)
  category: string | null
  search: string             // searches description and lhs
  leaderOnly: boolean
}

interface KeymapState {
  // State
  keymaps: Keymap[]
  totalCount: number
  currentPage: number
  pageSize: number           // fixed at 50 per page
  filter: KeymapFilter

  // Upload review state (between parse and import)
  pendingKeymaps: ParsedKeymap[]
  selectedIds: Set<string>   // keymaps selected for import

  // Actions
  setFilter: (filter: Partial<KeymapFilter>) => void
  setPage: (page: number) => void
  setPendingKeymaps: (keymaps: ParsedKeymap[]) => void
  toggleSelected: (id: string) => void
  selectAll: () => void
  deselectAll: () => void
  clearPending: () => void
}
```

**Note**: The `keymaps` list in this store is populated by TanStack Query, not by the store itself. The store holds filter/pagination state. The query hook reads from the store: `useKeymaps(keymapStore.filter, keymapStore.currentPage)`.

### 4.4 settingsStore

**File**: `src/stores/settings.store.ts`

```typescript
interface Settings {
  theme: 'dark' | 'light' | 'system'
  sessionLength: 10 | 20 | 30
  soundEnabled: boolean
  animationsOn: boolean
  keyboardLayout: 'qwerty' | 'dvorak' | 'colemak'
  leaderSymbol: string       // single char or "<Space>"
}

interface SettingsState {
  settings: Settings
  isLoaded: boolean          // false until hydrated from API or localStorage

  // Actions
  updateSetting: <K extends keyof Settings>(key: K, value: Settings[K]) => void
  hydrateFromAPI: (settings: Settings) => void
  hydrateFromLocalStorage: () => void
}

const defaultSettings: Settings = {
  theme: 'dark',
  sessionLength: 20,
  soundEnabled: true,
  animationsOn: true,
  keyboardLayout: 'qwerty',
  leaderSymbol: '\\',
}
```

**Hydration strategy**:
- Authenticated users: TanStack Query's `useSettings` fetches from `/api/settings` on mount. On success, calls `hydrateFromAPI()` which updates the store. The store is also persisted to localStorage as a fast-load cache (shown immediately, overwritten when API responds).
- Guest users: `hydrateFromLocalStorage()` called on app init. Settings are saved directly to localStorage on each change via the `persist` middleware.

**Settings persistence**:
- Store is persisted to `localStorage['vimtrainer_settings']` via Zustand `persist`
- For authenticated users, each `updateSetting` call also fires `PATCH /api/settings` (via TanStack Query mutation) to sync to backend
- The `useUpdateSettings` mutation uses a 500ms debounce for text inputs (`leaderSymbol`)

### 4.5 uiStore

**File**: `src/stores/ui.store.ts`

```typescript
interface UIState {
  // Sidebar
  sidebarCollapsed: boolean
  toggleSidebar: () => void

  // Modals
  activeModal: string | null   // modal identifier, e.g., "duplicate-keymaps"
  modalProps: Record<string, unknown>
  openModal: (id: string, props?: Record<string, unknown>) => void
  closeModal: () => void

  // Toasts
  toasts: Toast[]
  addToast: (toast: Omit<Toast, 'id'>) => void
  removeToast: (id: string) => void
}

interface Toast {
  id: string
  type: 'success' | 'error' | 'info' | 'warning'
  message: string
  duration?: number    // ms, default 4000
}
```

**No persistence**: UI state does not persist across page loads. Sidebar defaults to expanded. No modals or toasts on fresh load.

---

## 5. Data Fetching Layer

### 5.1 Axios Client

```typescript
// src/api/client.ts

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:8080',
  withCredentials: true,   // include httpOnly cookie for refresh token
  headers: { 'Content-Type': 'application/json' },
})

// Request interceptor: attach auth headers
apiClient.interceptors.request.use((config) => {
  const { accessToken, isGuest, guestToken } = useAuthStore.getState()
  if (accessToken) {
    config.headers['Authorization'] = `Bearer ${accessToken}`
  } else if (isGuest && guestToken) {
    config.headers['X-Guest-Token'] = guestToken
  }
  return config
})

// Response interceptor: handle 401 → attempt token refresh
let isRefreshing = false
let refreshQueue: Array<(token: string) => void> = []

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean }

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // Queue this request until refresh completes
        return new Promise((resolve) => {
          refreshQueue.push((token) => {
            originalRequest.headers['Authorization'] = `Bearer ${token}`
            resolve(apiClient(originalRequest))
          })
        })
      }

      originalRequest._retry = true
      isRefreshing = true

      try {
        const { data } = await apiClient.post('/api/auth/refresh')
        const newToken = data.access_token
        useAuthStore.getState().setAccessToken(newToken)
        refreshQueue.forEach(cb => cb(newToken))
        refreshQueue = []
        isRefreshing = false
        originalRequest.headers['Authorization'] = `Bearer ${newToken}`
        return apiClient(originalRequest)
      } catch (refreshError) {
        // Refresh failed: force logout
        useAuthStore.getState().logout()
        window.location.href = '/auth/login'
        return Promise.reject(refreshError)
      }
    }

    return Promise.reject(error)
  }
)
```

### 5.2 TanStack Query Configuration

```typescript
// src/main.tsx

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,   // 5 minutes: most data is fine stale
      retry: (failureCount, error) => {
        // Don't retry on 4xx errors
        if (axios.isAxiosError(error) && error.response?.status < 500) return false
        return failureCount < 2
      },
      refetchOnWindowFocus: false,  // practice sessions should not be interrupted
    },
    mutations: {
      retry: false,
    }
  }
})
```

### 5.3 Query Key Conventions

All query keys follow a consistent pattern: `[domain, operation, ...params]`.

```typescript
// src/api/queries/keymap.queries.ts
export const keymapKeys = {
  all: ['keymaps'] as const,
  list: (filter: KeymapFilter, page: number) =>
    ['keymaps', 'list', filter, page] as const,
  forPractice: (mode: string) =>
    ['keymaps', 'practice', mode] as const,
}

// src/api/queries/analytics.queries.ts
export const analyticsKeys = {
  summary: (userId: string, range: string) =>
    ['analytics', 'summary', userId, range] as const,
  command: (userId: string, keymapId: string, range: string) =>
    ['analytics', 'command', userId, keymapId, range] as const,
}

// src/api/queries/session.queries.ts
export const sessionKeys = {
  dailyQueue: (userId: string) =>
    ['sessions', 'daily-queue', userId] as const,
}
```

### 5.4 Cache Invalidation Strategy

| Event | Invalidates |
|-------|-------------|
| Import keymaps confirmed | `keymapKeys.all` |
| Delete keymap | `keymapKeys.all` |
| Complete session | `sessionKeys.dailyQueue(userId)`, `analyticsKeys.summary(userId, *)` |
| Update settings | `['settings', userId]` |
| Unlock achievement | `['achievements', userId]` |

Invalidation is called in TanStack Query mutation `onSuccess` callbacks:
```typescript
useMutation({
  mutationFn: completeSession,
  onSuccess: (data, { userId }) => {
    queryClient.invalidateQueries({ queryKey: sessionKeys.dailyQueue(userId) })
    queryClient.invalidateQueries({ queryKey: analyticsKeys.summary(userId, '30d') })
    // Optimistically update achievement list if any were unlocked
    if (data.achievementsUnlocked.length > 0) {
      queryClient.invalidateQueries({ queryKey: ['achievements', userId] })
    }
  }
})
```

### 5.5 Optimistic Updates for Attempt Recording

The practice loop fires `POST /api/sessions/{id}/attempts` after every keypress. This must not block UI updates — the green/red feedback must show in under 100ms regardless of network latency.

**Strategy**: Fire the mutation, show feedback immediately based on the client-side evaluation, then reconcile with the server response.

Wait — the client does NOT have the correct answer (`lhs`) upfront. The server validates the attempt and returns `is_correct`. Therefore, the feedback loop is:

1. User submits
2. Frontend calls `useRecordAttempt` mutation — this is fire-and-send, not fire-and-forget
3. The API response (with `is_correct` and `correct_answer`) should arrive in < 50ms on a good connection (the DB lookup is a single indexed query)
4. On response: update `practiceStore` with `submitAttempt(result)`, which triggers `FeedbackOverlay`

**Target latency**: API round-trip for attempt recording should be under 80ms p95. The query is `SELECT lhs FROM keymaps WHERE id = ? AND user_id = ?` — a primary key lookup with GORM, sub-1ms execution.

**On slow connections**: If the API call takes more than 500ms, a loading spinner appears in the input field. The session remains blocked (we cannot advance without knowing if the attempt was correct). This is a valid UX trade-off — the alternative (client-side validation with the answer in memory) creates cheating opportunity.

---

## 6. Component Design: Practice Loop

The practice loop is the most performance-sensitive UI in VimTrainer. A single unnecessary re-render at the wrong time creates visible latency.

### 6.1 Component Hierarchy

```
PracticePage
└── PracticeArena
    ├── ProgressHeader          (subscribes: currentIndex, challenges.length, streak)
    ├── ChallengeDisplay        (subscribes: challenges[currentIndex])
    ├── LeaderKeyHint           (subscribes: settings.leaderSymbol, currentInput)
    ├── KeyInput                (subscribes: phase, currentInput — performance-critical)
    └── FeedbackOverlay         (subscribes: phase only — renders null when phase='active')
```

### 6.2 KeyInput Component

`KeyInput` is the most render-sensitive component. It must capture keystrokes and call `appendInput` with zero perceptible delay.

```tsx
// src/components/practice/KeyInput/KeyInput.tsx

// NOT memoized with React.memo — it always needs to re-render on currentInput change.
// But it subscribes only to the minimum state.

export function KeyInput() {
  const phase = usePracticeStore(s => s.phase)
  const currentInput = usePracticeStore(s => s.currentInput)
  const appendInput = usePracticeStore(s => s.appendInput)
  const { mutate: recordAttempt } = useRecordAttempt()

  const inputRef = useRef<HTMLInputElement>(null)

  // Keep input focused during active phase
  useEffect(() => {
    if (phase === 'active' && inputRef.current) {
      inputRef.current.focus()
    }
  }, [phase])

  // Handle the Enter key as submit, all other keys as input
  const handleKeyDown = useCallback((e: KeyboardEvent<HTMLInputElement>) => {
    if (phase !== 'active') return
    e.preventDefault()  // prevent default browser behavior for all keys

    if (e.key === 'Enter' && currentInput.length > 0) {
      recordAttempt({ enteredSequence: currentInput })
      return
    }

    if (e.key === 'Escape') {
      // Handled by PracticeArena's useEffect for early termination
      return
    }

    // Append character to input
    const char = normalizeKey(e.key, e.ctrlKey, e.altKey)
    appendInput(char)
  }, [phase, currentInput, appendInput, recordAttempt])

  return (
    <div className={styles.inputWrapper}>
      <input
        ref={inputRef}
        className={styles.keyInput}
        value={currentInput}
        onChange={() => {}} // controlled — actual updates via onKeyDown
        onKeyDown={handleKeyDown}
        readOnly={phase !== 'active'}
        aria-label="Type the key sequence"
        autoComplete="off"
        autoCapitalize="off"
        spellCheck={false}
      />
    </div>
  )
}
```

**Why a controlled `<input>` and not `document.addEventListener`**: The `<input>` element participates in React's event system, which is simpler to test and avoids manual cleanup. The `onChange` no-op + `onKeyDown` pattern gives us character-by-character control without letting the browser's input handling interfere with special keys like `Ctrl+` combinations.

### 6.3 FeedbackOverlay Component

The `FeedbackOverlay` only renders during the `'feedback'` phase. It uses a CSS animation (not JavaScript animation) for the green/red flash to avoid main-thread blocking.

```tsx
export const FeedbackOverlay = React.memo(function FeedbackOverlay() {
  const phase = usePracticeStore(s => s.phase)
  const lastAttempt = usePracticeStore(s => s.attempts[s.attempts.length - 1])

  if (phase !== 'feedback') return null

  return (
    <div
      className={cn(
        styles.overlay,
        lastAttempt?.isCorrect ? styles.correct : styles.incorrect
      )}
      role="status"
      aria-live="polite"
    >
      {lastAttempt?.isCorrect ? (
        <span className={styles.correctLabel}>Correct</span>
      ) : (
        <div className={styles.incorrectContent}>
          <span className={styles.incorrectLabel}>Incorrect</span>
          <span className={styles.correctAnswer}>{lastAttempt?.correctAnswer}</span>
        </div>
      )}
    </div>
  )
})
```

**Memoized** because it renders `null` in the common case (phase=active) and only updates when `phase` or `lastAttempt` changes — both of which are legitimate render triggers.

---

## 7. Performance Strategy

### 7.1 Route-Level Code Splitting

Every page component is lazy-loaded. The main bundle contains only: router config, auth store, API client, and AppShell layout.

```typescript
// src/main.tsx

const LandingPage        = lazy(() => import('./pages/LandingPage'))
const LoginPage          = lazy(() => import('./pages/auth/LoginPage'))
const RegisterPage       = lazy(() => import('./pages/auth/RegisterPage'))
const PracticePage       = lazy(() => import('./pages/PracticePage'))
const MotionTrainerPage  = lazy(() => import('./pages/MotionTrainerPage'))
const LeaderKeyPage      = lazy(() => import('./pages/LeaderKeyPage'))
const FlashcardsPage     = lazy(() => import('./pages/FlashcardsPage'))
const ImportPage         = lazy(() => import('./pages/ImportPage'))
const DashboardPage      = lazy(() => import('./pages/DashboardPage'))
const AnalyticsPage      = lazy(() => import('./pages/AnalyticsPage'))
const ProfilePage        = lazy(() => import('./pages/ProfilePage'))
const SettingsPage       = lazy(() => import('./pages/SettingsPage'))
```

Recharts is imported only in the analytics component chunk, not in the main bundle. This is the largest single dependency (~200KB minified) and is irrelevant to the practice session experience.

### 7.2 Memoization Policy

Memoize a component when:
- It renders `null` most of the time (FeedbackOverlay, AchievementToast)
- It renders static data that never changes during a session (ChallengeDisplay between advances)
- It is expensive to render and its props change infrequently (Recharts wrappers)

Do NOT memoize:
- Components that always re-render on the same trigger as their parent
- Components with primitive props that are cheap to compare
- The `KeyInput` component (it must re-render on every keypress)

```typescript
// Memoized: ChallengeDisplay
// Props: { challenge: Challenge } — only changes on advance to next challenge
export const ChallengeDisplay = React.memo(function ChallengeDisplay({
  challenge
}: { challenge: Challenge }) {
  return (
    <div className={styles.challenge}>
      <h1 className={styles.description}>{challenge.description}</h1>
      <Badge className={styles.category}>{challenge.category}</Badge>
    </div>
  )
})
// Recharts wrappers: memoized because chart data only changes on date range switch
export const AccuracyChart = React.memo(function AccuracyChart({
  data
}: { data: AccuracyDataPoint[] }) { ... })
```

### 7.3 Bundle Size Budget

| Chunk | Target | Rationale |
|-------|--------|-----------|
| Main bundle (`index.[hash].js`) | < 120KB gzip | Contains router, stores, API client — must be fast to parse |
| Practice chunk | < 80KB gzip | Critical user path, loaded before first session |
| Analytics chunk | < 250KB gzip | Recharts is large; this chunk loads only when user visits Analytics |
| Import chunk | < 60KB gzip | Only loaded on /import page |

**Bundle analysis**: Run `npx vite-bundle-visualizer` after each build to verify chunk sizes.

### 7.4 Vite Configuration

```typescript
// vite.config.ts

export default defineConfig({
  plugins: [react()],

  resolve: {
    alias: { '@': path.resolve(__dirname, './src') }
  },

  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      }
    }
  },

  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Recharts into its own chunk
          'vendor-recharts': ['recharts'],
          // React core into a stable vendor chunk (changes rarely)
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          // TanStack Query
          'vendor-query': ['@tanstack/react-query'],
        }
      }
    },
    // Warn when any single chunk exceeds 400KB unminified
    chunkSizeWarningLimit: 400,
  },

  // Cloudflare Pages serves from the dist/ directory
  base: '/',
})
```

---

## 8. Type Definitions

### 8.1 Core Domain Types

```typescript
// src/types/domain.types.ts

export interface Keymap {
  id: string
  userId: string
  lhs: string
  mode: 'n' | 'i' | 'v' | 'x' | 'o' | 'c' | 't'
  description: string
  category: string
  isBuiltIn: boolean
  createdAt: string
}

export interface Challenge {
  id: string         // keymap_id
  description: string
  mode: string
  category: string
  // lhs intentionally absent — fetched from server post-attempt
}

export interface PracticeSession {
  id: string
  mode: string
  length: number
  accuracy: number
  avgResponseMs: number
  streak: number
  score: number
  startedAt: string
  completedAt: string | null
  isDaily: boolean
}

export interface SRSRecord {
  keymapId: string
  easeFactor: number
  interval: number
  dueDate: string
  totalAttempts: number
  correctAttempts: number
}

export interface Achievement {
  id: string
  code: string
  name: string
  description: string
  condition: string
  earnedAt: string | null  // null if locked
}

export interface DailyQueue {
  id: string
  date: string
  challenges: Challenge[]
  completedCount: number
  isComplete: boolean
}

export interface UserSettings {
  theme: 'dark' | 'light' | 'system'
  sessionLength: 10 | 20 | 30
  soundEnabled: boolean
  animationsOn: boolean
  keyboardLayout: 'qwerty' | 'dvorak' | 'colemak'
  leaderSymbol: string
}
```

### 8.2 API Response Types

```typescript
// src/api/types/api.types.ts
// These types mirror the backend JSON exactly (camelCase after transformation)

export interface RecordAttemptResponse {
  isCorrect: boolean
  correctAnswer: string
}

export interface CompleteSessionResponse {
  score: number
  accuracy: number
  streak: number
  achievementsUnlocked: Achievement[]
}

export interface AnalyticsSummaryResponse {
  accuracyTrend: Array<{ date: string; accuracy: number }>
  responseTimeTrend: Array<{ date: string; avgMs: number }>
  dailyPracticeTime: Array<{ date: string; minutes: number }>
  categoryBreakdown: Array<{ category: string; percentage: number; minutes: number }>
  mostMissed: Array<{
    keymapId: string
    lhs: string
    description: string
    category: string
    errorRate: number
    totalCount: number
  }>
  mostImproved: Array<{
    keymapId: string
    description: string
    improvementPercent: number
  }>
  masteryScore: number
}

export interface ParseFileResponse {
  keymaps: ParsedKeymap[]
  linesScanned: number
  linesFailed: number
}

export interface ParsedKeymap {
  lhs: string
  mode: string
  description: string
  sourceFile: string
}
```

---

## 9. Cloudflare Pages Deployment

### 9.1 Build Configuration

In the Cloudflare Pages dashboard (or via `wrangler.toml`):

```
Build command:    npm run build
Build output:     dist
Root directory:   frontend
```

### 9.2 SPA Routing Fix

Cloudflare Pages serves `_redirects` from the `public/` directory:

```
# frontend/public/_redirects
/*    /index.html    200
```

Without this, navigating directly to `/dashboard` returns a 404 because Cloudflare Pages would look for a `dashboard/index.html` file.

### 9.3 Environment Variables

Set in Cloudflare Pages dashboard under Settings → Environment Variables:

```
VITE_API_URL=https://api.vimtrainer.dev
```

All `VITE_` prefixed variables are inlined at build time by Vite. They are embedded in the JavaScript bundle — do not put secrets here.

### 9.4 Preview Deployments

Cloudflare Pages automatically creates a preview deployment for every git push to a non-main branch. Preview deployments need their own `VITE_API_URL` pointing to a staging Cloud Run service. Set this in Cloudflare Pages under "Preview branches" environment variable overrides.
