# Backend Architecture: VimTrainer Go API
**Version**: 1.0
**Last Updated**: 2026-06-16
**Author**: Architecture Team
**Status**: Approved

---

## 1. Repository Structure

```
backend/
├── cmd/
│   └── server/
│       └── main.go                    # Entry point: DI wiring, router setup, server start
│
├── internal/
│   ├── apperrors/
│   │   └── errors.go                  # AppError type, sentinel errors, HTTP mapping
│   │
│   ├── auth/
│   │   ├── jwt.go                     # Token generation, validation, claims parsing
│   │   └── password.go                # bcrypt hash/compare helpers
│   │
│   ├── config/
│   │   └── config.go                  # Config struct, Load() from env, validation
│   │
│   ├── database/
│   │   ├── database.go                # GORM setup, connection pool config, ping
│   │   └── migrations.go              # Auto-migration runner (dev only) or migration check
│   │
│   ├── handlers/
│   │   ├── auth_handler.go            # POST /auth/register, /auth/login, /auth/refresh,
│   │   │                              #   /auth/logout, /auth/guest
│   │   ├── user_handler.go            # GET/PATCH /users/me, DELETE /users/me
│   │   ├── keymap_handler.go          # POST /keymaps/parse-file, /keymaps/parse-github,
│   │   │                              #   /keymaps/import; GET /keymaps; DELETE /keymaps/:id
│   │   ├── session_handler.go         # POST /sessions, /sessions/:id/attempts,
│   │   │                              #   /sessions/:id/complete; GET /sessions/daily-queue
│   │   ├── analytics_handler.go       # GET /analytics/summary, /analytics/commands/:id
│   │   ├── achievement_handler.go     # GET /achievements, /achievements/unlocked
│   │   └── settings_handler.go        # GET /settings, PATCH /settings
│   │
│   ├── middleware/
│   │   ├── cors.go                    # CORS config, origin whitelist
│   │   ├── logger.go                  # Request/response logging (method, path, status, latency)
│   │   ├── recovery.go                # Panic recovery → 500 with stack trace in logs
│   │   ├── rate_limiter.go            # Token bucket per IP or user ID
│   │   ├── jwt_auth.go                # JWTAuth middleware: validates Bearer token
│   │   └── guest_auth.go              # GuestAuth middleware: accepts JWT or X-Guest-Token
│   │
│   ├── models/
│   │   ├── user.go                    # users table
│   │   ├── keymap.go                  # keymaps table
│   │   ├── keymap_source.go           # keymap_sources table
│   │   ├── practice_session.go        # practice_sessions table
│   │   ├── practice_attempt.go        # practice_attempts table
│   │   ├── srs_record.go              # spaced_repetition_records table
│   │   ├── achievement.go             # achievements table (static definitions)
│   │   ├── user_achievement.go        # user_achievements table
│   │   ├── daily_queue.go             # daily_queues table
│   │   └── settings.go                # settings table
│   │
│   ├── repository/
│   │   ├── interfaces.go              # All repository interfaces defined here
│   │   ├── user_repository.go         # UserRepository implementation
│   │   ├── keymap_repository.go       # KeymapRepository implementation
│   │   ├── session_repository.go      # SessionRepository implementation
│   │   ├── srs_repository.go          # SRSRepository implementation
│   │   ├── achievement_repository.go  # AchievementRepository implementation
│   │   ├── daily_queue_repository.go  # DailyQueueRepository implementation
│   │   └── settings_repository.go     # SettingsRepository implementation
│   │
│   ├── services/
│   │   ├── keymap_parser_service.go   # Parse .lua/.vim files → []ParsedKeymap
│   │   ├── github_import_service.go   # Clone → locate → parse → cleanup
│   │   ├── srs_service.go             # SM-2 algorithm, queue ordering
│   │   ├── analytics_service.go       # Dashboard aggregations
│   │   ├── achievement_service.go     # Check and unlock achievements
│   │   └── daily_queue_service.go     # Generate and manage daily queues
│   │
│   └── storage/
│       ├── storage.go                 # StorageService interface
│       ├── local.go                   # LocalStorageService (filesystem)
│       └── r2.go                      # R2StorageService (S3-compatible, future)
│
├── migrations/
│   ├── 001_initial_schema.sql
│   ├── 002_add_achievements.sql
│   ├── 003_add_settings.sql
│   └── seeds/
│       └── seed.sql                   # Dev seed data (motions, test user, sample sessions)
│
├── Dockerfile
├── docker-compose.yml
├── .env.example
├── go.mod
├── go.sum
└── Makefile
```

---

## 2. Entry Point and Dependency Injection

`cmd/server/main.go` is the composition root. All dependencies are wired here. No global state, no `init()` functions for DI.

```go
// cmd/server/main.go
func main() {
    // 1. Load configuration
    cfg := config.Load() // panics if required vars are missing

    // 2. Connect to database
    db := database.Connect(cfg.DatabaseURL)
    database.RunMigrations(db, cfg.Environment) // auto-migrate in dev, check in prod

    // 3. Wire storage
    var store storage.StorageService
    if cfg.StorageProvider == "r2" {
        store = storage.NewR2StorageService(cfg.R2Config)
    } else {
        store = storage.NewLocalStorageService(cfg.StoragePath)
    }

    // 4. Wire repositories
    userRepo := repository.NewUserRepository(db)
    keymapRepo := repository.NewKeymapRepository(db)
    sessionRepo := repository.NewSessionRepository(db)
    srsRepo := repository.NewSRSRepository(db)
    achievementRepo := repository.NewAchievementRepository(db)
    dailyQueueRepo := repository.NewDailyQueueRepository(db)
    settingsRepo := repository.NewSettingsRepository(db)

    // 5. Wire services
    parserSvc := services.NewKeymapParserService()
    githubSvc := services.NewGitHubImportService(parserSvc)
    srsSvc := services.NewSpacedRepetitionService(srsRepo)
    analyticsSvc := services.NewAnalyticsService(sessionRepo, keymapRepo)
    achievementSvc := services.NewAchievementService(achievementRepo, sessionRepo)
    dailyQueueSvc := services.NewDailyQueueService(dailyQueueRepo, keymapRepo, srsRepo)
    settingsSvc := services.NewSettingsService(settingsRepo)

    // 6. Wire handlers
    authHandler := handlers.NewAuthHandler(userRepo, cfg.JWTSecret)
    userHandler := handlers.NewUserHandler(userRepo)
    keymapHandler := handlers.NewKeymapHandler(keymapRepo, parserSvc, githubSvc, store)
    sessionHandler := handlers.NewSessionHandler(sessionRepo, keymapRepo, srsSvc,
        achievementSvc, dailyQueueSvc)
    analyticsHandler := handlers.NewAnalyticsHandler(analyticsSvc)
    achievementHandler := handlers.NewAchievementHandler(achievementSvc)
    settingsHandler := handlers.NewSettingsHandler(settingsSvc)

    // 7. Build router
    router := buildRouter(cfg, authHandler, userHandler, keymapHandler,
        sessionHandler, analyticsHandler, achievementHandler, settingsHandler)

    // 8. Start server
    srv := &http.Server{
        Addr:         ":" + cfg.Port,
        Handler:      router,
        ReadTimeout:  30 * time.Second,
        WriteTimeout: 60 * time.Second, // generous for GitHub clone streaming
        IdleTimeout:  120 * time.Second,
    }
    log.Fatal(srv.ListenAndServe())
}
```

---

## 3. Service Layer Design

### 3.1 KeymapParserService

**File**: `internal/services/keymap_parser_service.go`

**Responsibility**: Accept file paths (or raw content) and return a list of parsed keymap definitions. Has no database dependency — it is a pure transformation service.

**Key types**:
```go
type ParsedKeymap struct {
    LHS         string
    Mode        string // "n", "i", "v", "x", "o", "c", "t"
    Description string
    SourceFile  string
}

type ParseResult struct {
    Keymaps      []ParsedKeymap
    LinesScanned int
    LinesFailed  int
    FailedLines  []string // for user-visible "X lines skipped" warning
}
```

**Methods**:
```go
type KeymapParserService interface {
    // ParseFile parses a single .lua or .vim file.
    // Returns ParseResult. Never returns error for partial parse —
    // failed lines are counted, not fatal.
    ParseFile(ctx context.Context, filePath string) (ParseResult, error)

    // ParseDirectory walks dir, finds all .lua and .vim files,
    // parses each, and returns combined results with SourceFile set
    // to the relative path within dir.
    ParseDirectory(ctx context.Context, dir string) (ParseResult, error)

    // ParseZip extracts the archive to a temp dir, calls ParseDirectory,
    // cleans up, and returns results.
    ParseZip(ctx context.Context, zipPath string) (ParseResult, error)
}
```

**Implementation approach**:

Lua parser (`parseLuaFile`): Multi-pass line scanner. Pass 1 finds `vim.keymap.set` calls. The scanner collects lines until it finds a complete call (handles multi-line calls by tracking open/close parentheses). Pass 2 finds `vim.api.nvim_set_keymap` calls. Mode normalization converts `{"n","v"}` table syntax to individual entries.

Vimscript parser (`parseVimFile`): Single-pass line scanner. Regex per mapping type:
```
^(?P<cmd>nnoremap|inoremap|vnoremap|xnoremap|onoremap|cnoremap|tnoremap|
         nmap|imap|vmap|xmap)\s+(?P<lhs>\S+)\s+(?P<rhs>.+?)
         (?:\s+"(?P<desc>[^"]+)")?$
```

Mode normalization:
| Vimscript command | Mode char |
|------------------|-----------|
| `nnoremap`, `nmap` | `n` |
| `inoremap`, `imap` | `i` |
| `vnoremap`, `vmap` | `v` |
| `xnoremap`, `xmap` | `x` |
| `onoremap` | `o` |
| `cnoremap` | `c` |
| `tnoremap` | `t` |

### 3.2 GitHubImportService

**File**: `internal/services/github_import_service.go`

**Responsibility**: Accept a GitHub repo URL, execute the clone → locate → parse → cleanup pipeline, and return parsed keymaps plus framework detection metadata.

**Key types**:
```go
type GitHubImportResult struct {
    ParseResult       ParseResult
    Framework         string // "lazyvim", "astronvim", "nvchad", "kickstart", "unknown"
    ConfigDir         string // relative path to located config dir within repo
    RepoURL           string
}
```

**Methods**:
```go
type GitHubImportService interface {
    // Import clones the repo, parses Neovim configs, cleans up,
    // and returns the result. The progressCh channel receives status
    // strings ("cloning", "locating", "parsing") as the pipeline advances.
    // Caller should drain progressCh in a goroutine.
    Import(ctx context.Context, repoURL string, progressCh chan<- string) (GitHubImportResult, error)
}
```

**Pipeline implementation**:

```go
func (s *gitHubImportService) Import(ctx context.Context, repoURL string, progressCh chan<- string) (GitHubImportResult, error) {
    // 1. Validate URL
    if err := validateGitHubURL(repoURL); err != nil {
        return GitHubImportResult{}, apperrors.ErrInvalidGitHubURL
    }

    // 2. Create temp dir (always cleaned up)
    tmpDir, err := os.MkdirTemp("", "vimtrainer-clone-*")
    if err != nil {
        return GitHubImportResult{}, fmt.Errorf("create temp dir: %w", err)
    }
    defer os.RemoveAll(tmpDir)

    // 3. Clone with 30-second deadline
    cloneCtx, cancel := context.WithTimeout(ctx, 30*time.Second)
    defer cancel()
    progressCh <- "cloning"
    if err := runGitClone(cloneCtx, repoURL, tmpDir); err != nil {
        return GitHubImportResult{}, classifyGitError(err)
    }

    // 4. Locate Neovim config
    progressCh <- "locating"
    configDir, framework, err := locateNeovimConfig(tmpDir)
    if err != nil {
        return GitHubImportResult{}, apperrors.ErrNoNeovimConfig
    }

    // 5. Parse
    progressCh <- "parsing"
    result, err := s.parser.ParseDirectory(ctx, configDir)
    if err != nil {
        return GitHubImportResult{}, fmt.Errorf("parse directory: %w", err)
    }
    if len(result.Keymaps) == 0 {
        return GitHubImportResult{}, apperrors.ErrParseNoResults
    }

    return GitHubImportResult{
        ParseResult: result,
        Framework:   framework,
        ConfigDir:   strings.TrimPrefix(configDir, tmpDir),
        RepoURL:     repoURL,
    }, nil
}
```

**Config location heuristics** (`locateNeovimConfig`):
```go
func locateNeovimConfig(repoRoot string) (configDir, framework string, err error) {
    // Priority 1: standard XDG path
    if p := filepath.Join(repoRoot, ".config", "nvim"); isDir(p) {
        fw := detectFramework(p)
        return p, fw, nil
    }
    // Priority 2: nvim/ at root
    if p := filepath.Join(repoRoot, "nvim"); isDir(p) {
        fw := detectFramework(p)
        return p, fw, nil
    }
    // Priority 3: BFS for init.lua or init.vim (max depth 4)
    if p := bfsForInitFile(repoRoot, 4); p != "" {
        fw := detectFramework(filepath.Dir(p))
        return filepath.Dir(p), fw, nil
    }
    return "", "", apperrors.ErrNoNeovimConfig
}
```

### 3.3 SpacedRepetitionService

**File**: `internal/services/srs_service.go`

**Responsibility**: Implement the SM-2 variant algorithm. Update SRS records after each practice attempt. Generate ordered challenge queues for sessions.

**Key types**:
```go
type SRSRecord struct {
    UserID       uuid.UUID
    GuestID      *string   // nullable — set for guest sessions
    KeymapID     uuid.UUID
    EaseFactor   float64   // default 2.5, floor 1.3
    Interval     int       // days until next review
    DueDate      time.Time
    TotalAttempts int
    CorrectAttempts int
}

type SRSUpdate struct {
    IsCorrect    bool
    AttemptedAt  time.Time
}
```

**Methods**:
```go
type SpacedRepetitionService interface {
    // UpdateRecord applies SM-2 scoring after an attempt.
    // Creates the record if it does not yet exist (first attempt on this keymap).
    UpdateRecord(ctx context.Context, userID uuid.UUID, keymapID uuid.UUID, update SRSUpdate) error

    // GetOrderedQueue returns keymaps ordered for practice:
    // overdue → due today → new (never attempted) → future (by due date)
    // Filtered to keymaps belonging to the user.
    GetOrderedQueue(ctx context.Context, userID uuid.UUID, limit int) ([]uuid.UUID, error)

    // GetWeakest returns keymapIDs ordered by accuracy ascending (most missed first)
    // for attempts within the last N days.
    GetWeakest(ctx context.Context, userID uuid.UUID, days int, limit int) ([]uuid.UUID, error)

    // GetNeverPracticed returns keymapIDs the user has never attempted.
    GetNeverPracticed(ctx context.Context, userID uuid.UUID, limit int) ([]uuid.UUID, error)
}
```

**SM-2 implementation**:
```go
func applyReview(record *SRSRecord, isCorrect bool) {
    if isCorrect {
        switch record.Interval {
        case 0: // first correct attempt
            record.Interval = 1
        case 1: // second correct attempt
            record.Interval = 6
        default:
            record.Interval = int(math.Round(float64(record.Interval) * record.EaseFactor))
        }
        // Ease factor increase (capped at 2.5)
        record.EaseFactor = math.Min(2.5, record.EaseFactor+0.1)
    } else {
        record.Interval = 1
        record.EaseFactor = math.Max(1.3, record.EaseFactor-0.2)
    }
    record.DueDate = time.Now().UTC().AddDate(0, 0, record.Interval)
}
```

### 3.4 AnalyticsService

**File**: `internal/services/analytics_service.go`

**Responsibility**: Run all analytics aggregation queries and assemble the dashboard response struct. This service owns the query complexity so that handlers remain thin.

**Key types**:
```go
type DateRange struct {
    Start time.Time
    End   time.Time
}

type AccuracyDataPoint struct {
    Date     string  // "2026-06-01"
    Accuracy float64 // 0.0 to 1.0
}

type MissedCommand struct {
    KeymapID    uuid.UUID
    LHS         string
    Description string
    Category    string
    ErrorRate   float64
    TotalCount  int
}

type AnalyticsDashboard struct {
    AccuracyTrend      []AccuracyDataPoint
    ResponseTimeTrend  []ResponseTimeDataPoint
    DailyPracticeTime  []DailyTimeDataPoint
    CategoryBreakdown  []CategoryDataPoint
    MostMissed         []MissedCommand
    MostImproved       []ImprovedCommand
    MasteryScore       float64
}
```

**Methods**:
```go
type AnalyticsService interface {
    // GetDashboardData runs all 7 aggregation queries and returns
    // the assembled dashboard struct.
    GetDashboardData(ctx context.Context, userID uuid.UUID, dateRange DateRange) (AnalyticsDashboard, error)

    // GetCommandHistory returns per-command accuracy and response time
    // history for the analytics drill-down panel.
    GetCommandHistory(ctx context.Context, userID uuid.UUID, keymapID uuid.UUID, dateRange DateRange) (CommandHistory, error)
}
```

**Implementation note**: All 7 queries run sequentially in `GetDashboardData`. They share the same `db` transaction context to ensure consistent point-in-time data across all charts. Total query time target is under 300ms. If this becomes a bottleneck, the queries can be run concurrently via `errgroup`.

### 3.5 AchievementService

**File**: `internal/services/achievement_service.go`

**Responsibility**: After each session completion, evaluate all achievement conditions for the user and unlock any newly earned achievements. Return the list of newly unlocked achievements so the handler can include them in the session-complete response.

**Achievement definitions** (stored in `achievements` table, seeded at startup):

| Code | Name | Condition |
|------|------|-----------|
| `FIRST_SESSION` | First Session | Complete first practice session |
| `MOTION_MASTER` | Motion Master | >= 80% accuracy across 3 consecutive Motion Trainer sessions |
| `LEADER_KEY_MASTER` | Leader Key Master | Practice 20+ leader key commands correctly |
| `ACCURACY_KING` | Accuracy King | 100% accuracy in a single session (>= 10 commands) |
| `SPEED_DEMON` | Speed Demon | Average response time < 500ms in a session |
| `STREAK_7` | 7-Day Streak | Complete daily queue 7 days in a row |
| `STREAK_30` | 30-Day Streak | Complete daily queue 30 days in a row |
| `IMPORTER` | Config Importer | Import at least one keymap file |
| `FLASHCARD_FIRST` | First Flashcard Session | Complete one flashcard session |
| `NIGHT_OWL` | Night Owl | Complete a session between 11pm and 4am |

**Methods**:
```go
type AchievementService interface {
    // CheckAndUnlock evaluates all unearned achievements for the user
    // after a session. Returns newly unlocked achievements.
    CheckAndUnlock(ctx context.Context, userID uuid.UUID, sessionID uuid.UUID) ([]Achievement, error)

    // GetAll returns all achievements with earned status for the user.
    GetAll(ctx context.Context, userID uuid.UUID) ([]AchievementStatus, error)
}
```

**Efficiency**: `CheckAndUnlock` first fetches the set of already-unlocked achievement codes for the user. It then only evaluates conditions for achievements not yet earned. Each condition is a targeted SQL query (not a full table scan). Typical execution: 2–5 DB queries.

### 3.6 DailyQueueService

**File**: `internal/services/daily_queue_service.go`

**Responsibility**: Generate the 20-command daily queue once per user per UTC day. Resume partially completed queues. Mark queues complete.

**Queue composition**: 10 weakest (lowest accuracy, last 14 days) + 5 never-practiced + 5 random from practiced set.

**Methods**:
```go
type DailyQueueService interface {
    // GetOrCreate returns today's queue for the user. If it does not
    // exist, generates and persists it. The queue is fixed once created
    // for the day — subsequent calls return the same queue.
    GetOrCreate(ctx context.Context, userID uuid.UUID) (DailyQueue, error)

    // RecordProgress updates the queue's progress when a command is completed.
    RecordProgress(ctx context.Context, queueID uuid.UUID, keymapID uuid.UUID) error

    // MarkComplete marks the queue as completed and increments the user's streak.
    MarkComplete(ctx context.Context, userID uuid.UUID, queueID uuid.UUID) error
}
```

**Generation logic**:
```go
func (s *dailyQueueService) generateQueue(ctx context.Context, userID uuid.UUID) ([]uuid.UUID, error) {
    // 10 weakest by accuracy (last 14 days)
    weakest, _ := s.srsRepo.GetWeakest(ctx, userID, 14, 10)

    // 5 never practiced
    neverPracticed, _ := s.srsRepo.GetNeverPracticed(ctx, userID, 5)

    // 5 random from practiced set (excluding those already in queue)
    excluded := append(weakest, neverPracticed...)
    random, _ := s.keymapRepo.GetRandom(ctx, userID, excluded, 5)

    // Deduplicate and combine
    queue := deduplicateUUIDs(append(append(weakest, neverPracticed...), random...))

    // Fallback: if user has < 20 keymaps, pad with beginner motions
    if len(queue) < 20 {
        motions, _ := s.keymapRepo.GetBeginnerMotions(ctx, 20-len(queue))
        queue = append(queue, motions...)
    }

    return queue[:min(20, len(queue))], nil
}
```

---

## 4. Handler Layer

### 4.1 Handler Pattern

Handlers are thin. Each handler method:
1. Binds and validates the request
2. Extracts identity from the Gin context (set by auth middleware)
3. Calls exactly one service method
4. Maps the service result to an HTTP response

Handlers do not contain business logic. They do not call repositories directly.

```go
// Canonical handler method shape
func (h *sessionHandler) RecordAttempt(c *gin.Context) {
    // 1. Extract identity (set by GuestAuth middleware)
    userID, isGuest, guestID := extractIdentity(c)

    // 2. Parse and validate request
    sessionID, err := uuid.Parse(c.Param("id"))
    if err != nil {
        c.JSON(http.StatusBadRequest, errorResponse(apperrors.ErrInvalidUUID))
        return
    }

    var req RecordAttemptRequest
    if err := c.ShouldBindJSON(&req); err != nil {
        c.JSON(http.StatusBadRequest, errorResponse(apperrors.NewValidationError(err)))
        return
    }

    // 3. Call service
    result, err := h.sessionService.RecordAttempt(c.Request.Context(), RecordAttemptInput{
        SessionID:       sessionID,
        UserID:          userID,
        GuestID:         guestID,
        IsGuest:         isGuest,
        KeymapID:        req.KeymapID,
        EnteredSequence: req.EnteredSequence,
        ResponseTimeMS:  req.ResponseTimeMS,
    })

    // 4. Map errors to HTTP responses
    if err != nil {
        c.JSON(httpStatusFromError(err), errorResponse(err))
        return
    }

    // 5. Return success
    c.JSON(http.StatusOK, RecordAttemptResponse{
        IsCorrect:     result.IsCorrect,
        CorrectAnswer: result.CorrectAnswer,
    })
}
```

### 4.2 Handler Interface Per Domain

**AuthHandler** — `internal/handlers/auth_handler.go`
```
POST   /api/auth/register           Register with email/password
POST   /api/auth/login              Login, receive access + refresh tokens
POST   /api/auth/refresh            Exchange refresh token for new access token
POST   /api/auth/logout             Invalidate refresh token (clear cookie)
POST   /api/auth/guest              Create guest session, receive guest token
POST   /api/auth/migrate-guest      Migrate guest session data to registered account
POST   /api/auth/change-password    Change password (authenticated)
```

**UserHandler** — `internal/handlers/user_handler.go`
```
GET    /api/users/me                Get current user profile stats
PATCH  /api/users/me                Update user fields (display name)
DELETE /api/users/me                Delete account (requires confirmation string)
```

**KeymapHandler** — `internal/handlers/keymap_handler.go`
```
POST   /api/keymaps/parse-file      Upload and parse file (no DB write)
POST   /api/keymaps/parse-github    Clone and parse GitHub repo (no DB write)
POST   /api/keymaps/import          Confirm and persist parsed keymaps to DB
GET    /api/keymaps                 List user's keymaps (paginated, filterable)
DELETE /api/keymaps/:id             Remove keymap from practice set
GET    /api/keymaps/practice        Fetch challenge set for a session
```

**SessionHandler** — `internal/handlers/session_handler.go`
```
POST   /api/sessions                Create a new practice session (returns session_id)
POST   /api/sessions/:id/attempts   Record a single attempt (validates + SRS update)
POST   /api/sessions/:id/complete   Mark session complete (achievements + streak)
GET    /api/sessions/daily-queue    Get or generate today's daily queue
```

**AnalyticsHandler** — `internal/handlers/analytics_handler.go`
```
GET    /api/analytics/summary       Full dashboard data (7 aggregations)
GET    /api/analytics/commands/:id  Per-command drill-down history
```

**AchievementHandler** — `internal/handlers/achievement_handler.go`
```
GET    /api/achievements            All achievements with user's earned/locked status
GET    /api/achievements/unlocked   Only earned achievements (for profile page)
```

**SettingsHandler** — `internal/handlers/settings_handler.go`
```
GET    /api/settings                Get user's settings
PATCH  /api/settings                Update one or more settings (partial update)
```

### 4.3 Request/Response Types

All request and response types are defined in the handler file that uses them (not in a shared types package). This keeps handler files self-contained and avoids a sprawling shared types package.

```go
// internal/handlers/session_handler.go

type CreateSessionRequest struct {
    Mode          string `json:"mode" binding:"required,oneof=keymaps motions leader"`
    Length        int    `json:"length" binding:"required,oneof=10 20 30"`
    KeymapIDs     []uuid.UUID `json:"keymap_ids"` // optional: pre-specified set
}

type RecordAttemptRequest struct {
    KeymapID        uuid.UUID `json:"keymap_id" binding:"required"`
    EnteredSequence string    `json:"entered_sequence" binding:"required"`
    ResponseTimeMS  int       `json:"response_time_ms" binding:"required,min=0"`
}

type RecordAttemptResponse struct {
    IsCorrect     bool   `json:"is_correct"`
    CorrectAnswer string `json:"correct_answer"` // the lhs, revealed after attempt
}
```

---

## 5. Repository Layer

### 5.1 Interface Definitions

All repository interfaces are defined in a single file. Implementations are in separate files.

```go
// internal/repository/interfaces.go

type UserRepository interface {
    Create(ctx context.Context, user *models.User) error
    GetByID(ctx context.Context, id uuid.UUID) (*models.User, error)
    GetByEmail(ctx context.Context, email string) (*models.User, error)
    Update(ctx context.Context, user *models.User) error
    Delete(ctx context.Context, id uuid.UUID) error
    GetProfileStats(ctx context.Context, userID uuid.UUID) (*UserProfileStats, error)
}

type KeymapRepository interface {
    BatchCreate(ctx context.Context, keymaps []models.Keymap) (int, error)
    GetByUserID(ctx context.Context, userID uuid.UUID, filter KeymapFilter) ([]models.Keymap, int64, error)
    GetByIDs(ctx context.Context, ids []uuid.UUID) ([]models.Keymap, error)
    GetForPractice(ctx context.Context, userID uuid.UUID, mode string, limit int) ([]models.Keymap, error)
    GetRandom(ctx context.Context, userID uuid.UUID, excludeIDs []uuid.UUID, limit int) ([]models.Keymap, error)
    GetBeginnerMotions(ctx context.Context, limit int) ([]models.Keymap, error)
    CheckDuplicates(ctx context.Context, userID uuid.UUID, keymaps []LHSModePair) ([]LHSModePair, error)
    Delete(ctx context.Context, id uuid.UUID, userID uuid.UUID) error
}

type SessionRepository interface {
    Create(ctx context.Context, session *models.PracticeSession) error
    GetByID(ctx context.Context, id uuid.UUID) (*models.PracticeSession, error)
    CreateAttempt(ctx context.Context, attempt *models.PracticeAttempt) error
    Complete(ctx context.Context, sessionID uuid.UUID, accuracy float64, avgResponseMS int) error
    GetRecentByUserID(ctx context.Context, userID uuid.UUID, limit int) ([]models.PracticeSession, error)
    GetAccuracyTrend(ctx context.Context, userID uuid.UUID, dateRange DateRange) ([]AccuracyDataPoint, error)
    GetResponseTimeTrend(ctx context.Context, userID uuid.UUID, dateRange DateRange) ([]ResponseTimeDataPoint, error)
    GetDailyPracticeTime(ctx context.Context, userID uuid.UUID, dateRange DateRange) ([]DailyTimeDataPoint, error)
    GetMostMissed(ctx context.Context, userID uuid.UUID, dateRange DateRange, limit int) ([]MissedCommandRow, error)
    GetMostImproved(ctx context.Context, userID uuid.UUID, dateRange DateRange, limit int) ([]ImprovedCommandRow, error)
    GetCategoryBreakdown(ctx context.Context, userID uuid.UUID, dateRange DateRange) ([]CategoryRow, error)
}

type SRSRepository interface {
    Upsert(ctx context.Context, record *models.SRSRecord) error
    GetByUserAndKeymap(ctx context.Context, userID uuid.UUID, keymapID uuid.UUID) (*models.SRSRecord, error)
    GetWeakest(ctx context.Context, userID uuid.UUID, days int, limit int) ([]uuid.UUID, error)
    GetNeverPracticed(ctx context.Context, userID uuid.UUID, limit int) ([]uuid.UUID, error)
    GetDueForUser(ctx context.Context, userID uuid.UUID) ([]models.SRSRecord, error)
}

type AchievementRepository interface {
    GetAll(ctx context.Context) ([]models.Achievement, error)
    GetUnlockedByUser(ctx context.Context, userID uuid.UUID) ([]models.UserAchievement, error)
    Unlock(ctx context.Context, userID uuid.UUID, achievementID uuid.UUID) error
}

type DailyQueueRepository interface {
    GetForUserToday(ctx context.Context, userID uuid.UUID) (*models.DailyQueue, error)
    Create(ctx context.Context, queue *models.DailyQueue) error
    UpdateProgress(ctx context.Context, queueID uuid.UUID, completedCount int) error
    MarkComplete(ctx context.Context, queueID uuid.UUID) error
}

type SettingsRepository interface {
    GetByUserID(ctx context.Context, userID uuid.UUID) (*models.Settings, error)
    Upsert(ctx context.Context, settings *models.Settings) error
}
```

### 5.2 Repository Implementation Pattern

All repositories use GORM with raw SQL for complex queries. Simple CRUD uses GORM's fluent API. Complex aggregations use `db.Raw()`.

```go
// internal/repository/session_repository.go

func (r *sessionRepository) GetMostMissed(ctx context.Context, userID uuid.UUID,
    dateRange DateRange, limit int) ([]MissedCommandRow, error) {
    var rows []MissedCommandRow
    result := r.db.WithContext(ctx).Raw(`
        SELECT
            k.id         AS keymap_id,
            k.lhs        AS lhs,
            k.description AS description,
            k.category   AS category,
            COUNT(*) FILTER (WHERE NOT pa.is_correct)::float / NULLIF(COUNT(*), 0) AS error_rate,
            COUNT(*)     AS total_count
        FROM practice_attempts pa
        JOIN keymaps k ON k.id = pa.keymap_id
        WHERE pa.user_id = ?
          AND pa.attempted_at BETWEEN ? AND ?
        GROUP BY k.id, k.lhs, k.description, k.category
        HAVING COUNT(*) >= 3
        ORDER BY error_rate DESC
        LIMIT ?
    `, userID, dateRange.Start, dateRange.End, limit).Scan(&rows)
    if result.Error != nil {
        return nil, fmt.Errorf("get most missed: %w", result.Error)
    }
    return rows, nil
}
```

---

## 6. Middleware Stack

Middleware is applied in the following order in `buildRouter`. Order matters: a middleware can only use context set by middleware above it.

### 6.1 Full Middleware Order

```go
func buildRouter(cfg *config.Config, handlers ...) *gin.Engine {
    r := gin.New() // not gin.Default() — we control the middleware stack

    // Layer 1: RequestLogger (outermost — logs every request including panics)
    r.Use(middleware.RequestLogger())

    // Layer 2: Recovery (converts panics to 500 responses, logs stack trace)
    r.Use(middleware.Recovery())

    // Layer 3: CORS (must be before any handler that returns a response)
    r.Use(middleware.CORS(cfg.CORSOrigins))

    // Layer 4: RateLimiter (applied per-route, not globally — different limits per endpoint)
    // Applied inline on specific route groups below

    api := r.Group("/api")
    {
        // Public routes (no auth, per-IP rate limiting)
        auth := api.Group("/auth")
        {
            auth.POST("/register", middleware.RateLimiter("register", 5, time.Minute), authHandler.Register)
            auth.POST("/login", middleware.RateLimiter("login", 10, time.Minute), authHandler.Login)
            auth.POST("/refresh", authHandler.Refresh)
            auth.POST("/logout", authHandler.Logout)
            auth.POST("/guest", middleware.RateLimiter("guest", 3, time.Hour), authHandler.CreateGuest)
        }

        // Practice routes (accept guest OR JWT — GuestAuth middleware)
        practice := api.Group("")
        practice.Use(middleware.GuestAuth(cfg.JWTSecret))
        {
            practice.POST("/sessions", sessionHandler.Create)
            practice.POST("/sessions/:id/attempts", middleware.RateLimiter("attempts", 500, time.Minute), sessionHandler.RecordAttempt)
            practice.POST("/sessions/:id/complete", sessionHandler.Complete)
            practice.POST("/keymaps/parse-file", middleware.RateLimiter("parse", 20, time.Hour), keymapHandler.ParseFile)
            practice.POST("/keymaps/parse-github", middleware.RateLimiter("github", 5, 10*time.Minute), keymapHandler.ParseGitHub)
        }

        // Protected routes (JWT only — JWTAuth middleware)
        protected := api.Group("")
        protected.Use(middleware.JWTAuth(cfg.JWTSecret))
        {
            protected.GET("/sessions/daily-queue", sessionHandler.GetDailyQueue)
            protected.POST("/keymaps/import", keymapHandler.Import)
            protected.GET("/keymaps", keymapHandler.List)
            protected.DELETE("/keymaps/:id", keymapHandler.Delete)
            protected.GET("/analytics/summary", analyticsHandler.Summary)
            protected.GET("/analytics/commands/:id", analyticsHandler.CommandHistory)
            protected.GET("/achievements", achievementHandler.List)
            protected.GET("/achievements/unlocked", achievementHandler.Unlocked)
            protected.GET("/settings", settingsHandler.Get)
            protected.PATCH("/settings", settingsHandler.Update)
            protected.GET("/users/me", userHandler.GetProfile)
            protected.PATCH("/users/me", userHandler.Update)
            protected.DELETE("/users/me", userHandler.Delete)
            protected.POST("/auth/migrate-guest", authHandler.MigrateGuest)
            protected.POST("/auth/change-password", authHandler.ChangePassword)
        }
    }

    r.GET("/health", healthHandler.Check)
    return r
}
```

### 6.2 Middleware Implementations

**RequestLogger** (`internal/middleware/logger.go`):
```go
// Logs: method, path, status, latency, request_id, user_id (if present)
// Uses structured logging (log/slog, JSON format in production)
// Assigns X-Request-ID header (UUID) per request for tracing
```

**Recovery** (`internal/middleware/recovery.go`):
```go
// Catches panics in handlers
// Logs full stack trace with request_id
// Returns: {"error": {"code": "INTERNAL_ERROR", "message": "An unexpected error occurred"}}
// Does NOT expose panic message or stack trace to client
```

**CORS** (`internal/middleware/cors.go`):
```go
// Uses github.com/gin-contrib/cors
// Configuration: see system-design.md section 4.3
// AllowCredentials: true (required for httpOnly refresh token cookie)
```

**RateLimiter** (`internal/middleware/rate_limiter.go`):
```go
// Per-key token bucket. Key = IP for public endpoints, user_id for authenticated.
// State is in-memory (acceptable for single-instance MVP, see system-design.md 4.4)
// Returns 429 with Retry-After header on limit exceeded
//
// Signature:
// func RateLimiter(name string, limit int, window time.Duration) gin.HandlerFunc
```

**JWTAuth** (`internal/middleware/jwt_auth.go`):
```go
// Reads Authorization: Bearer {token} header
// Validates token signature (cfg.JWTSecret), expiry, type == "access"
// Injects c.Set("user_id", claims.Sub) into Gin context
// Returns 401 if token missing, invalid, expired, or wrong type
```

**GuestAuth** (`internal/middleware/guest_auth.go`):
```go
// Tries Authorization: Bearer {token} first → JWTAuth path
// If no JWT: tries X-Guest-Token header → validates guest session in DB
// Injects c.Set("user_id", ...) or c.Set("guest_id", ...) and c.Set("is_guest", bool)
// Returns 401 only if both JWT and guest token are absent or invalid
// Guest sessions expire after 24 hours → 401 with code GUEST_SESSION_EXPIRED
```

---

## 7. Error Handling

### 7.1 AppError Type

```go
// internal/apperrors/errors.go

type AppError struct {
    Code       string `json:"code"`
    Message    string `json:"message"`
    Detail     any    `json:"details,omitempty"`
    Cause      error  `json:"-"` // logged server-side, not sent to client
    HTTPStatus int    `json:"-"` // resolved in handler layer
}

func (e *AppError) Error() string {
    if e.Cause != nil {
        return fmt.Sprintf("%s: %v", e.Code, e.Cause)
    }
    return e.Code
}

func (e *AppError) Unwrap() error { return e.Cause }

// Sentinel errors
var (
    ErrNotFound = &AppError{Code: "NOT_FOUND", Message: "Resource not found", HTTPStatus: 404}
    ErrUnauthorized = &AppError{Code: "UNAUTHORIZED", Message: "Authentication required", HTTPStatus: 401}
    ErrForbidden = &AppError{Code: "FORBIDDEN", Message: "Access denied", HTTPStatus: 403}
    ErrDuplicate = &AppError{Code: "DUPLICATE_RESOURCE", Message: "Resource already exists", HTTPStatus: 409}
    ErrRateLimited = &AppError{Code: "RATE_LIMITED", Message: "Too many requests", HTTPStatus: 429}
    ErrParseNoResults = &AppError{Code: "PARSE_NO_RESULTS", Message: "No keymaps found in the provided file", HTTPStatus: 422}
    ErrInvalidGitHubURL = &AppError{Code: "INVALID_GITHUB_URL", Message: "URL must be a public GitHub repository (https://github.com/user/repo)", HTTPStatus: 400}
    ErrNoNeovimConfig = &AppError{Code: "NO_NEOVIM_CONFIG", Message: "No Neovim configuration directory found in this repository", HTTPStatus: 422}
    ErrCloneTimeout = &AppError{Code: "CLONE_TIMEOUT", Message: "Repository clone timed out. Try uploading specific files instead.", HTTPStatus: 422}
    ErrGuestSessionExpired = &AppError{Code: "GUEST_SESSION_EXPIRED", Message: "Guest session has expired. Create an account to save progress.", HTTPStatus: 401}
    ErrInvalidUUID = &AppError{Code: "INVALID_ID", Message: "Invalid resource identifier", HTTPStatus: 400}
)
```

### 7.2 Error Propagation

```
repository layer
  db.Error → wrapped with fmt.Errorf("operation context: %w", err)
  gorm.ErrRecordNotFound → translated to apperrors.ErrNotFound
  unique constraint violation → translated to apperrors.ErrDuplicate

service layer
  receives error from repository
  may wrap with additional context
  returns AppError variants for business rule violations
  never creates HTTP status codes — that is the handler's responsibility

handler layer
  receives error from service
  calls httpStatusFromError(err) to resolve status
  calls errorResponse(err) to build JSON body
  logs the full error (including .Cause) at ERROR level
  sends only the sanitized AppError fields to the client
```

```go
// internal/handlers/util.go

func httpStatusFromError(err error) int {
    var appErr *apperrors.AppError
    if errors.As(err, &appErr) {
        return appErr.HTTPStatus
    }
    return http.StatusInternalServerError
}

func errorResponse(err error) gin.H {
    var appErr *apperrors.AppError
    if errors.As(err, &appErr) {
        return gin.H{"error": appErr}
    }
    // Unknown error: do not leak details
    return gin.H{"error": gin.H{
        "code": "INTERNAL_ERROR",
        "message": "An unexpected error occurred",
    }}
}
```

---

## 8. Configuration

All configuration is loaded by `config.Load()` from environment variables. No config files in production.

```go
// internal/config/config.go

type Config struct {
    // Server
    Port        string // default: "8080"
    Environment string // required: "development" | "production"

    // Database
    DatabaseURL string // required: full postgres connection string
    // e.g., postgres://user:pass@host:5432/dbname?sslmode=require

    // Auth
    JWTSecret   string // required: minimum 32 characters
    // Used to sign/verify all JWTs. Rotation requires all users to re-login.

    // CORS
    CORSOrigins []string // required in production: comma-separated origins
    // e.g., "https://vimtrainer.dev,https://*.vimtrainer.pages.dev"

    // Storage
    StorageProvider string // default: "local"
    StoragePath     string // default: "./data" (used when StorageProvider="local")

    // R2 (only required when StorageProvider="r2")
    R2AccountID       string
    R2AccessKeyID     string
    R2SecretAccessKey string
    R2BucketName      string

    // Rate limiting
    RateLimitEnabled bool // default: true (set false in test environments)

    // GitHub import
    GitHubCloneTimeoutSeconds int // default: 30
    GitHubMaxRepoSizeKB       int // default: 51200 (50MB — reject repos larger than this)
}

func Load() *Config {
    cfg := &Config{
        Port:                      getEnvOrDefault("PORT", "8080"),
        Environment:               requireEnv("ENVIRONMENT"),
        DatabaseURL:               requireEnv("DATABASE_URL"),
        JWTSecret:                 requireEnv("JWT_SECRET"),
        CORSOrigins:               strings.Split(getEnvOrDefault("CORS_ORIGINS",
                                       "http://localhost:5173"), ","),
        StorageProvider:           getEnvOrDefault("STORAGE_PROVIDER", "local"),
        StoragePath:               getEnvOrDefault("STORAGE_PATH", "./data"),
        RateLimitEnabled:          getEnvBoolOrDefault("RATE_LIMIT_ENABLED", true),
        GitHubCloneTimeoutSeconds: getEnvIntOrDefault("GITHUB_CLONE_TIMEOUT_SECONDS", 30),
        GitHubMaxRepoSizeKB:       getEnvIntOrDefault("GITHUB_MAX_REPO_SIZE_KB", 51200),
    }

    // Validate JWT secret length
    if len(cfg.JWTSecret) < 32 {
        panic("JWT_SECRET must be at least 32 characters")
    }

    return cfg
}
```

### 8.1 Environment Variable Reference

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `ENVIRONMENT` | Yes | — | `development` or `production`. Controls logging format and migration behavior. |
| `DATABASE_URL` | Yes | — | PostgreSQL connection string. Use pgBouncer endpoint in production. |
| `JWT_SECRET` | Yes | — | HMAC-SHA256 signing secret. Min 32 chars. Rotate only during maintenance window. |
| `PORT` | No | `8080` | HTTP port the server listens on. Cloud Run sets this automatically. |
| `CORS_ORIGINS` | No | `http://localhost:5173` | Comma-separated allowed CORS origins. Set to production domain in prod. |
| `STORAGE_PROVIDER` | No | `local` | `local` or `r2`. Selects storage backend. |
| `STORAGE_PATH` | No | `./data` | Local filesystem base path. Only used when `STORAGE_PROVIDER=local`. |
| `R2_ACCOUNT_ID` | Conditional | — | Cloudflare account ID. Required when `STORAGE_PROVIDER=r2`. |
| `R2_ACCESS_KEY_ID` | Conditional | — | R2 access key. Required when `STORAGE_PROVIDER=r2`. |
| `R2_SECRET_ACCESS_KEY` | Conditional | — | R2 secret key. Required when `STORAGE_PROVIDER=r2`. |
| `R2_BUCKET_NAME` | Conditional | — | R2 bucket name. Required when `STORAGE_PROVIDER=r2`. |
| `RATE_LIMIT_ENABLED` | No | `true` | Disable for integration test environments. Never disable in production. |
| `GITHUB_CLONE_TIMEOUT_SECONDS` | No | `30` | Seconds before aborting a git clone operation. |
| `GITHUB_MAX_REPO_SIZE_KB` | No | `51200` | Reject GitHub repos larger than this before attempting clone. |

---

## 9. Models

### 9.1 GORM Model Conventions

All models embed `BaseModel`:
```go
// internal/models/base.go
type BaseModel struct {
    ID        uuid.UUID      `gorm:"type:uuid;primarykey;default:gen_random_uuid()"`
    CreatedAt time.Time
    UpdatedAt time.Time
    DeletedAt gorm.DeletedAt `gorm:"index"` // soft delete
}
```

UUIDs are generated by PostgreSQL (`gen_random_uuid()`), not by the application. This avoids UUID generation in Go and ensures DB-level uniqueness guarantees.

### 9.2 Model Definitions

```go
// internal/models/user.go
type User struct {
    BaseModel
    Email          string    `gorm:"uniqueIndex;not null"`
    PasswordHash   string    `gorm:"not null"`
    CurrentStreak  int       `gorm:"default:0"`
    LongestStreak  int       `gorm:"default:0"`
    LastActiveDate *time.Time
}

// internal/models/keymap.go
type Keymap struct {
    BaseModel
    UserID      uuid.UUID  `gorm:"type:uuid;index;not null"`
    SourceID    *uuid.UUID `gorm:"type:uuid;index"` // nullable: NULL for built-in motions
    LHS         string     `gorm:"not null"`         // key sequence: "<leader>ff"
    Mode        string     `gorm:"not null"`         // "n", "i", "v", "x", "o", "c", "t"
    Description string
    Category    string     `gorm:"index"`            // "Telescope", "LSP", "Motions", etc.
    IsBuiltIn   bool       `gorm:"default:false"`    // true for Motion Trainer library
}

// internal/models/keymap_source.go
type KeymapSource struct {
    BaseModel
    UserID     uuid.UUID `gorm:"type:uuid;index;not null"`
    SourceType string    `gorm:"not null"` // "file" | "github" | "builtin"
    Name       string                      // filename or repo URL
    ParsedAt   time.Time
}

// internal/models/practice_session.go
type PracticeSession struct {
    BaseModel
    UserID        *uuid.UUID `gorm:"type:uuid;index"` // nullable: guest sessions
    GuestID       *string    `gorm:"index"`            // nullable: authenticated sessions
    Mode          string     `gorm:"not null"`         // "keymaps" | "motions" | "leader"
    Length        int        `gorm:"not null"`         // 10, 20, or 30
    Accuracy      float64
    AvgResponseMS int
    Streak        int
    Score         int
    StartedAt     time.Time  `gorm:"not null"`
    CompletedAt   *time.Time                          // null if partial/abandoned
    IsDaily       bool       `gorm:"default:false"`
}

// internal/models/practice_attempt.go
type PracticeAttempt struct {
    ID              uuid.UUID  `gorm:"type:uuid;primarykey;default:gen_random_uuid()"`
    SessionID       uuid.UUID  `gorm:"type:uuid;index;not null"`
    UserID          *uuid.UUID `gorm:"type:uuid;index"`
    GuestID         *string    `gorm:"index"`
    KeymapID        uuid.UUID  `gorm:"type:uuid;index;not null"`
    EnteredSequence string     `gorm:"not null"`
    IsCorrect       bool       `gorm:"not null"`
    ResponseTimeMS  int        `gorm:"not null"`
    AttemptedAt     time.Time  `gorm:"not null;index"` // used in date-range analytics queries
}

// internal/models/srs_record.go
type SRSRecord struct {
    ID              uuid.UUID  `gorm:"type:uuid;primarykey;default:gen_random_uuid()"`
    UserID          *uuid.UUID `gorm:"type:uuid;uniqueIndex:idx_srs_user_keymap"`
    GuestID         *string    `gorm:"uniqueIndex:idx_srs_guest_keymap"`
    KeymapID        uuid.UUID  `gorm:"type:uuid;not null;uniqueIndex:idx_srs_user_keymap;uniqueIndex:idx_srs_guest_keymap"`
    EaseFactor      float64    `gorm:"default:2.5"`
    Interval        int        `gorm:"default:0"`
    DueDate         time.Time  `gorm:"index"`
    TotalAttempts   int        `gorm:"default:0"`
    CorrectAttempts int        `gorm:"default:0"`
    LastAttemptedAt *time.Time
}

// internal/models/achievement.go
type Achievement struct {
    ID          uuid.UUID `gorm:"type:uuid;primarykey;default:gen_random_uuid()"`
    Code        string    `gorm:"uniqueIndex;not null"`
    Name        string    `gorm:"not null"`
    Description string    `gorm:"not null"`
    Condition   string    `gorm:"not null"` // human-readable condition shown on profile
}

// internal/models/user_achievement.go
type UserAchievement struct {
    UserID        uuid.UUID `gorm:"type:uuid;primarykey"`
    AchievementID uuid.UUID `gorm:"type:uuid;primarykey"`
    EarnedAt      time.Time `gorm:"not null"`
}

// internal/models/daily_queue.go
type DailyQueue struct {
    BaseModel
    UserID         uuid.UUID   `gorm:"type:uuid;index;not null"`
    Date           time.Time   `gorm:"not null;index"` // UTC date (time part is midnight)
    KeymapIDs      []uuid.UUID `gorm:"type:uuid[];not null"` // ordered array
    CompletedCount int         `gorm:"default:0"`
    IsComplete     bool        `gorm:"default:false"`
    CompletedAt    *time.Time
}

// internal/models/settings.go
type Settings struct {
    UserID         uuid.UUID `gorm:"type:uuid;primarykey"`
    Theme          string    `gorm:"default:'dark'"` // "dark" | "light" | "system"
    SessionLength  int       `gorm:"default:20"`     // 10, 20, or 30
    SoundEnabled   bool      `gorm:"default:true"`
    AnimationsOn   bool      `gorm:"default:true"`
    KeyboardLayout string    `gorm:"default:'qwerty'"` // "qwerty" | "dvorak" | "colemak"
    LeaderSymbol   string    `gorm:"default:'\\'"`     // single char or "<Space>"
    UpdatedAt      time.Time
}
```

---

## 10. Dockerfile

```dockerfile
# backend/Dockerfile

# ── Build stage ──────────────────────────────────────────────────────
FROM golang:1.23-alpine AS builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o /bin/server ./cmd/server

# ── Dev stage (hot-reload via Air) ───────────────────────────────────
FROM golang:1.23-alpine AS dev
RUN go install github.com/air-verse/air@latest
WORKDIR /app
CMD ["air", "-c", ".air.toml"]

# ── Production stage ─────────────────────────────────────────────────
FROM gcr.io/distroless/static-debian12 AS production
COPY --from=builder /bin/server /server
# git must be available for GitHub import (clone)
# Use alpine instead of distroless to include git
ENTRYPOINT ["/server"]
```

**Note on git availability**: The GitHub import service runs `git clone` via `os/exec`. The production image must include `git`. Use `FROM alpine:3.20 AS production` with `RUN apk add --no-cache git ca-certificates` rather than distroless for the production stage.

Production Dockerfile final form:
```dockerfile
FROM alpine:3.20 AS production
RUN apk add --no-cache git ca-certificates tzdata
COPY --from=builder /bin/server /server
EXPOSE 8080
ENTRYPOINT ["/server"]
```
