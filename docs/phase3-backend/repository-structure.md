# Repository Structure: VimTrainer Backend
**Version**: 1.0
**Last Updated**: 2026-06-16
**Author**: Backend Architect
**Status**: Production-Ready

---

## 1. Complete Directory Tree

```
backend/
├── cmd/
│   └── server/
│       └── main.go                          # Composition root: wires all deps, builds router, starts HTTP server
│
├── internal/
│   ├── apperrors/
│   │   └── errors.go                        # AppError type, all sentinel errors, HTTP status mapping
│   │
│   ├── auth/
│   │   ├── jwt.go                           # GenerateAccessToken, GenerateRefreshToken, GenerateGuestToken, Validate*
│   │   └── password.go                      # HashPassword (bcrypt cost 12), ComparePassword (constant-time)
│   │
│   ├── config/
│   │   └── config.go                        # Config struct, Load() reads all env vars, panics on missing required
│   │
│   ├── database/
│   │   ├── database.go                      # Connect(dsn) returns *gorm.DB with pool settings, ping check
│   │   └── migrations.go                    # RunMigrations() runs golang-migrate up on startup
│   │
│   ├── handlers/
│   │   ├── auth_handler.go                  # Register, Login, Refresh, Logout, CreateGuest, MigrateGuest
│   │   ├── user_handler.go                  # GetMe, UpdateMe, ChangePassword, DeleteMe
│   │   ├── keymap_handler.go                # Upload, UploadConfirm, GitHub, GitHubStatus, Sources, DeleteSource, Builtin, List
│   │   ├── session_handler.go               # CreateSession, GetSession, RecordAttempt, CompleteSession
│   │   ├── analytics_handler.go             # Summary, AccuracyTrend, ResponseTimeTrend, PracticeTime, MostMissed, MostImproved, CategoryBreakdown
│   │   ├── achievement_handler.go           # ListAchievements, RecentAchievements
│   │   ├── queue_handler.go                 # GetTodayQueue, RegenerateQueue
│   │   ├── settings_handler.go              # GetSettings, UpdateSettings
│   │   ├── health_handler.go                # HealthCheck (pings DB and storage, returns 200 or 503)
│   │   └── util.go                          # extractIdentity, requireRegistered, errorResponse, httpStatusFromError, successResponse
│   │
│   ├── middleware/
│   │   ├── cors.go                          # CORS config using gin-contrib/cors; reads CORS_ORIGINS env
│   │   ├── logger.go                        # Structured request/response logging (slog, JSON in prod); assigns X-Request-ID
│   │   ├── recovery.go                      # Panic recovery → 500 JSON response; logs full stack trace
│   │   ├── rate_limiter.go                  # Token bucket rate limiter; RateLimiterStore, IPKeyFunc, UserIDKeyFunc
│   │   ├── jwt_auth.go                      # JWTAuth: validates Bearer token, rejects guests, sets user_id in context
│   │   ├── guest_auth.go                    # GuestOrAuth: accepts guest or registered JWT, sets user_id + is_guest in context
│   │   └── security_headers.go              # Sets X-Content-Type-Options, HSTS, X-Frame-Options, CSP headers
│   │
│   ├── models/
│   │   ├── base.go                          # BaseModel struct with ID (uuid), CreatedAt, UpdatedAt, DeletedAt
│   │   ├── user.go                          # User GORM model
│   │   ├── keymap_source.go                 # KeymapSource GORM model
│   │   ├── keymap.go                        # Keymap GORM model
│   │   ├── practice_session.go              # PracticeSession GORM model
│   │   ├── practice_attempt.go              # PracticeAttempt GORM model (no BaseModel, no soft-delete)
│   │   ├── srs_record.go                    # SRSRecord GORM model (no BaseModel, has UNIQUE constraint)
│   │   ├── achievement.go                   # Achievement GORM model (static data, no soft-delete)
│   │   ├── user_achievement.go              # UserAchievement GORM model (junction table)
│   │   ├── daily_queue.go                   # DailyQueue GORM model with UUID[] array field
│   │   └── user_settings.go                 # UserSettings GORM model (user_id as PK)
│   │
│   ├── repository/
│   │   ├── interfaces.go                    # All repository interfaces in one file
│   │   ├── user_repository.go               # GormUserRepository: CRUD + GetByEmail + GetProfileStats
│   │   ├── keymap_repository.go             # GormKeymapRepository: BatchCreate + List + GetForPractice + GetRandom + GetBuiltin
│   │   ├── keymap_source_repository.go      # GormKeymapSourceRepository: Create + ListByUser + GetByID + SoftDelete
│   │   ├── session_repository.go            # GormSessionRepository: Create + GetByID + CreateAttempt + Complete + GetAccuracyTrend + ...
│   │   ├── attempt_repository.go            # GormAttemptRepository: Create + GetBySession
│   │   ├── srs_repository.go                # GormSRSRepository: Upsert + GetByUserAndKeymap + GetWeakest + GetDue + GetNeverPracticed
│   │   ├── daily_queue_repository.go        # GormDailyQueueRepository: GetForUserToday + Create + MarkComplete
│   │   ├── analytics_repository.go          # GormAnalyticsRepository: all 7 analytics aggregation queries
│   │   ├── achievement_repository.go        # GormAchievementRepository: GetAll + GetUnlockedByUser + Unlock
│   │   └── settings_repository.go           # GormSettingsRepository: GetByUserID + Upsert
│   │
│   ├── services/
│   │   ├── auth_service.go                  # RegisterUser, LoginUser, RefreshToken, CreateGuest, MigrateGuest, ChangePassword
│   │   ├── keymap_parser_service.go         # ParseFile, ParseDirectory, ParseZip (lua + vimscript parsers)
│   │   ├── github_import_service.go         # Import: clone → locate → parse → cleanup pipeline
│   │   ├── srs_service.go                   # SM-2 UpdateRecord, GetOrderedQueue, GetWeakest, GetNeverPracticed
│   │   ├── session_service.go               # CreateSession, RecordAttempt (validates + SRS update), CompleteSession
│   │   ├── analytics_service.go             # GetDashboard, GetAccuracyTrend, GetResponseTimeTrend, GetMostMissed, GetMostImproved, GetCategoryBreakdown
│   │   ├── achievement_service.go           # CheckAndUnlock (evaluates all conditions post-session), GetAll
│   │   ├── daily_queue_service.go           # GetOrCreate, MarkComplete (generates 10 weakest + 5 new + 5 random)
│   │   └── settings_service.go              # GetSettings, UpdateSettings (UPSERT with defaults)
│   │
│   └── storage/
│       ├── storage.go                       # StorageService interface definition
│       ├── local.go                         # LocalStorageService: saves files to STORAGE_PATH, path traversal protection
│       └── r2.go                            # R2StorageService: S3-compatible client for Cloudflare R2 (future)
│
├── migrations/
│   ├── 001_initial_schema.up.sql            # All CREATE TABLE and CREATE INDEX statements
│   ├── 001_initial_schema.down.sql          # DROP TABLE CASCADE in reverse order
│   ├── 002_seed_achievements.up.sql         # INSERT 10 achievement definitions
│   ├── 002_seed_achievements.down.sql       # DELETE achievement seed rows
│   ├── 003_seed_builtin_keymaps.up.sql      # INSERT system user + 68 built-in Vim motion keymaps
│   └── 003_seed_builtin_keymaps.down.sql    # DELETE system user (cascades to keymaps)
│
├── Dockerfile                               # Multi-stage: builder (go:1.23-alpine) + runtime (alpine:3.20 with git)
├── docker-compose.yml                       # Local dev: api + postgres services with volume and env wiring
├── .env.example                             # All environment variables with comments and example values
├── go.mod                                   # Module: github.com/vimtrainer/backend; Go 1.23
├── go.sum                                   # Dependency checksums
└── Makefile                                 # make dev, make build, make test, make migrate-up, make migrate-down
```

---

## 2. Repository Interfaces

All interfaces are defined in `internal/repository/interfaces.go`. Implementations are in separate files. All methods accept `context.Context` as the first parameter to support timeout propagation and cancellation.

```go
// internal/repository/interfaces.go

package repository

import (
    "context"
    "time"

    "github.com/google/uuid"
    "github.com/vimtrainer/backend/internal/models"
)

// ============================================================
// SHARED TYPES
// ============================================================

// KeymapFilter defines filtering and pagination options for keymap list queries.
type KeymapFilter struct {
    Mode          string
    Category      string
    SourceID      *uuid.UUID
    Search        string     // substring match on key_sequence or description
    IncludeBuiltin bool
    Cursor        string
    Limit         int        // max 100
}

// DateRange defines an inclusive time range for analytics queries.
type DateRange struct {
    Start time.Time
    End   time.Time
}

// ============================================================
// UserRepository
// ============================================================

// UserProfileStats holds aggregated statistics for the user profile page.
type UserProfileStats struct {
    TotalSessions       int
    TotalPracticeMinutes float64
    AllTimeAccuracy     float64
    AllTimeAvgResponseMs float64
    KeymapsImported     int
    CommandsMastered    int
}

// ConvertGuestInput holds the fields needed to upgrade a guest user to a registered account.
type ConvertGuestInput struct {
    Email        string
    PasswordHash string
    DisplayName  string
}

type UserRepository interface {
    // Create inserts a new user row. Sets u.ID from the DB-generated UUID.
    Create(ctx context.Context, u *models.User) error

    // GetByID returns a user by primary key. Returns ErrNotFound if absent or soft-deleted.
    GetByID(ctx context.Context, id uuid.UUID) (*models.User, error)

    // GetByEmail returns an active (not soft-deleted) user by email.
    // Returns ErrNotFound if no active user has this email.
    GetByEmail(ctx context.Context, email string) (*models.User, error)

    // GetByGuestToken returns a guest user by their guest_token UUID.
    // Returns ErrNotFound if the token does not match any active guest user.
    GetByGuestToken(ctx context.Context, guestToken uuid.UUID) (*models.User, error)

    // Update persists changes to an existing user row. Updates updated_at automatically.
    Update(ctx context.Context, u *models.User) error

    // SoftDelete sets deleted_at to now for the given user ID.
    SoftDelete(ctx context.Context, id uuid.UUID) error

    // GetProfileStats returns aggregated statistics for the profile page.
    GetProfileStats(ctx context.Context, userID uuid.UUID) (*UserProfileStats, error)

    // ConvertGuestToRegistered atomically upgrades a guest user row to a registered account.
    // Sets is_guest=false, email, password_hash, display_name, clears guest_token.
    ConvertGuestToRegistered(ctx context.Context, guestUserID uuid.UUID, input ConvertGuestInput) error

    // UpdateStreak updates current_streak, longest_streak, and last_active_date.
    UpdateStreak(ctx context.Context, userID uuid.UUID, currentStreak int, longestStreak int, lastActiveDate time.Time) error

    // CountByGuestAge returns the count of guest users older than the given duration (for cleanup monitoring).
    CountByGuestAge(ctx context.Context, olderThan time.Duration) (int64, error)
}

// ============================================================
// KeymapRepository
// ============================================================

// LHSModePair is used for duplicate detection during import.
type LHSModePair struct {
    KeySequence string
    Mode        string
}

type KeymapRepository interface {
    // BatchCreate inserts multiple keymaps in a single transaction.
    // Returns the count of successfully inserted rows (skipping duplicates via ON CONFLICT DO NOTHING).
    BatchCreate(ctx context.Context, keymaps []models.Keymap) (int, error)

    // GetByID returns a single keymap by ID. Returns ErrNotFound if absent or soft-deleted.
    GetByID(ctx context.Context, id uuid.UUID) (*models.Keymap, error)

    // ListByUser returns the user's keymaps with filtering and cursor-based pagination.
    // Returns keymaps, the total count (before pagination), and the next cursor (empty = no more pages).
    ListByUser(ctx context.Context, userID uuid.UUID, filter KeymapFilter) ([]models.Keymap, int64, string, error)

    // GetByIDs returns keymaps for the given IDs in the same order as the input slice.
    // Keymaps not found or soft-deleted are silently skipped.
    GetByIDs(ctx context.Context, ids []uuid.UUID) ([]models.Keymap, error)

    // GetForPractice returns keymaps for a practice session.
    // mode filters by Vim mode (empty = all modes). limit = max returned.
    // Uses ORDER BY RANDOM() — acceptable for user keymap sets < 500 rows.
    GetForPractice(ctx context.Context, userID uuid.UUID, mode string, limit int) ([]models.Keymap, error)

    // GetRandom returns random keymaps belonging to the user, excluding the given IDs.
    // Used for the "random" slot in daily queue generation.
    GetRandom(ctx context.Context, userID uuid.UUID, excludeIDs []uuid.UUID, limit int) ([]models.Keymap, error)

    // GetBuiltin returns built-in Vim motion keymaps.
    // category and mode are optional filters (empty = no filter).
    GetBuiltin(ctx context.Context, category string, mode string) ([]models.Keymap, error)

    // GetBuiltinBeginnerMotions returns a random selection of built-in keymaps
    // from the motion category, used to pad short daily queues.
    GetBuiltinBeginnerMotions(ctx context.Context, limit int) ([]models.Keymap, error)

    // CheckDuplicates returns the subset of the given key_sequence+mode pairs that already
    // exist for the user in the active set (not soft-deleted).
    // Used to count skip duplicates during import.
    CheckDuplicates(ctx context.Context, userID uuid.UUID, pairs []LHSModePair) ([]LHSModePair, error)

    // SoftDelete sets deleted_at for the given keymap, verifying it belongs to userID.
    // Returns ErrNotFound if not found. Returns ErrForbidden if not owned by user.
    SoftDelete(ctx context.Context, id uuid.UUID, userID uuid.UUID) error

    // CountByUserAndSource counts active keymaps belonging to a source (for source deletion summary).
    CountByUserAndSource(ctx context.Context, userID uuid.UUID, sourceID uuid.UUID) (int64, error)
}

// ============================================================
// KeymapSourceRepository
// ============================================================

type KeymapSourceRepository interface {
    // Create inserts a new keymap source row.
    Create(ctx context.Context, source *models.KeymapSource) error

    // GetByID returns a source by ID. Returns ErrNotFound if absent or soft-deleted.
    GetByID(ctx context.Context, id uuid.UUID) (*models.KeymapSource, error)

    // ListByUser returns all active sources for a user, ordered by created_at DESC.
    ListByUser(ctx context.Context, userID uuid.UUID) ([]models.KeymapSource, error)

    // SoftDelete soft-deletes the source. Also soft-deletes all keymaps with this source_id.
    // Runs in a transaction to ensure atomicity.
    SoftDelete(ctx context.Context, id uuid.UUID, userID uuid.UUID) error

    // UpdateKeymapCount sets keymap_count to the given value. Called after batch import.
    UpdateKeymapCount(ctx context.Context, id uuid.UUID, count int) error
}

// ============================================================
// SessionRepository
// ============================================================

// AccuracyDataPoint is one data point in the accuracy trend chart.
type AccuracyDataPoint struct {
    Date         string  `json:"date"`          // "2026-06-16"
    Accuracy     *float64 `json:"accuracy"`     // nil if no sessions on this date
    SessionCount int     `json:"session_count"`
}

// ResponseTimeDataPoint is one data point in the response time trend chart.
type ResponseTimeDataPoint struct {
    Date         string   `json:"date"`
    AvgMs        *float64 `json:"avg_ms"`        // nil if no sessions on this date
    SessionCount int      `json:"session_count"`
}

// DailyTimeDataPoint is one data point in the practice time chart.
type DailyTimeDataPoint struct {
    Date    string `json:"date"`
    Minutes int    `json:"minutes"`
}

// MostMissedRow holds data for the most-missed keymaps query result.
type MostMissedRow struct {
    KeymapID       uuid.UUID `json:"keymap_id"`
    KeySequence    string    `json:"key_sequence"`
    Description    string    `json:"description"`
    Category       string    `json:"category"`
    Mode           string    `json:"mode"`
    ErrorRate      float64   `json:"error_rate"`
    TotalAttempts  int       `json:"total_attempts"`
    CorrectAttempts int      `json:"correct_attempts"`
}

// MostImprovedRow holds data for the most-improved keymaps query result.
type MostImprovedRow struct {
    KeymapID            uuid.UUID `json:"keymap_id"`
    KeySequence         string    `json:"key_sequence"`
    Description         string    `json:"description"`
    Category            string    `json:"category"`
    Mode                string    `json:"mode"`
    AccuracyFirstHalf   float64   `json:"accuracy_first_half"`
    AccuracySecondHalf  float64   `json:"accuracy_second_half"`
    ImprovementPct      float64   `json:"improvement_pct"`
    TotalAttempts       int       `json:"total_attempts"`
}

// CategoryRow holds data for the category breakdown query result.
type CategoryRow struct {
    Category       string  `json:"category"`
    TotalAttempts  int     `json:"total_attempts"`
    CorrectAttempts int    `json:"correct_attempts"`
    Accuracy       float64 `json:"accuracy"`
    KeymapCount    int     `json:"keymap_count"`
}

// SessionSummary holds aggregate totals for a date range.
type SessionSummary struct {
    SessionsCompleted  int
    ChallengesAnswered int
    CorrectAnswers     int
    Accuracy           float64
    TotalPracticeMinutes float64
}

type SessionRepository interface {
    // Create inserts a new practice session. Sets s.ID from DB.
    Create(ctx context.Context, s *models.PracticeSession) error

    // GetByID returns a session by ID. Returns ErrNotFound if not found.
    GetByID(ctx context.Context, id uuid.UUID) (*models.PracticeSession, error)

    // Complete marks a session as completed, setting completed_at, accuracy, avg_response_ms, score, streak_achieved.
    Complete(ctx context.Context, id uuid.UUID, completedAt time.Time, totalAttempts int, correctAttempts int, accuracy float64, avgResponseMs int, score int, streakAchieved int) error

    // GetRecentByUserID returns the N most recently completed sessions for a user.
    GetRecentByUserID(ctx context.Context, userID uuid.UUID, limit int) ([]models.PracticeSession, error)

    // CountByUserID returns the total number of completed sessions for a user.
    CountByUserID(ctx context.Context, userID uuid.UUID) (int, error)

    // GetSummary returns aggregate totals for a date range.
    GetSummary(ctx context.Context, userID uuid.UUID, dr DateRange) (*SessionSummary, error)

    // GetAccuracyTrend returns daily accuracy data points for a date range.
    // Days with no sessions have Accuracy=nil.
    GetAccuracyTrend(ctx context.Context, userID uuid.UUID, dr DateRange) ([]AccuracyDataPoint, error)

    // GetResponseTimeTrend returns daily avg response time data points for a date range.
    // Days with no sessions have AvgMs=nil.
    GetResponseTimeTrend(ctx context.Context, userID uuid.UUID, dr DateRange) ([]ResponseTimeDataPoint, error)

    // GetDailyPracticeTime returns daily practice time in minutes for a date range.
    // Only includes days with at least one completed session.
    GetDailyPracticeTime(ctx context.Context, userID uuid.UUID, dr DateRange) ([]DailyTimeDataPoint, error)

    // GetMostMissed returns keymaps with the highest error rate in the date range.
    // minAttempts = minimum attempt count to include a keymap.
    GetMostMissed(ctx context.Context, userID uuid.UUID, dr DateRange, limit int, minAttempts int) ([]MostMissedRow, error)

    // GetMostImproved returns keymaps with the greatest accuracy improvement
    // from the first half to the second half of the date range.
    GetMostImproved(ctx context.Context, userID uuid.UUID, dr DateRange, limit int, minAttempts int) ([]MostImprovedRow, error)

    // GetCategoryBreakdown returns accuracy broken down by keymap category.
    GetCategoryBreakdown(ctx context.Context, userID uuid.UUID, dr DateRange) ([]CategoryRow, error)
}

// ============================================================
// AttemptRepository
// ============================================================

type AttemptRepository interface {
    // Create inserts a single practice attempt. Sets a.ID from DB.
    Create(ctx context.Context, a *models.PracticeAttempt) error

    // GetBySession returns all attempts for a session, ordered by attempted_at ASC.
    GetBySession(ctx context.Context, sessionID uuid.UUID) ([]models.PracticeAttempt, error)

    // GetCountBySession returns the total count of attempts for a session.
    GetCountBySession(ctx context.Context, sessionID uuid.UUID) (int, error)

    // GetCorrectCountBySession returns the count of correct attempts for a session.
    GetCorrectCountBySession(ctx context.Context, sessionID uuid.UUID) (int, error)

    // GetAvgResponseMsBySession returns the average response_ms for a session.
    GetAvgResponseMsBySession(ctx context.Context, sessionID uuid.UUID) (float64, error)
}

// ============================================================
// SRSRepository
// ============================================================

type SRSRepository interface {
    // Upsert inserts or updates the SRS record for (user_id, keymap_id).
    // Uses INSERT ... ON CONFLICT (user_id, keymap_id) DO UPDATE.
    Upsert(ctx context.Context, record *models.SRSRecord) error

    // GetByUserAndKeymap returns the SRS record for a specific user+keymap pair.
    // Returns ErrNotFound if no record exists (keymap never practiced).
    GetByUserAndKeymap(ctx context.Context, userID uuid.UUID, keymapID uuid.UUID) (*models.SRSRecord, error)

    // GetDueForUser returns SRS records where next_review_at <= NOW(), ordered by next_review_at ASC (most overdue first).
    GetDueForUser(ctx context.Context, userID uuid.UUID, limit int) ([]models.SRSRecord, error)

    // GetWeakest returns keymap IDs for keymaps with the lowest accuracy in the last N days.
    // Only includes keymaps with total_reviews >= 2.
    GetWeakest(ctx context.Context, userID uuid.UUID, days int, limit int) ([]uuid.UUID, error)

    // GetNeverPracticed returns keymap IDs for keymaps the user owns but has never attempted.
    // Uses a NOT EXISTS subquery against srs_records.
    GetNeverPracticed(ctx context.Context, userID uuid.UUID, limit int) ([]uuid.UUID, error)

    // CountByUserID returns total SRS records for a user.
    CountByUserID(ctx context.Context, userID uuid.UUID) (int, error)

    // GetAllByUser returns all SRS records for a user with cursor-based pagination.
    // sortField: "next_review_at" | "ease_factor" | "accuracy". order: "asc" | "desc".
    GetAllByUser(ctx context.Context, userID uuid.UUID, sortField string, order string, cursor string, limit int) ([]models.SRSRecord, string, error)
}

// ============================================================
// DailyQueueRepository
// ============================================================

type DailyQueueRepository interface {
    // GetForUserOnDate returns the daily queue for a user on a specific UTC date.
    // Returns ErrNotFound if no queue has been generated for this date.
    GetForUserOnDate(ctx context.Context, userID uuid.UUID, date time.Time) (*models.DailyQueue, error)

    // Create inserts a new daily queue.
    // Uses INSERT ... ON CONFLICT (user_id, queue_date) DO NOTHING to handle race conditions.
    Create(ctx context.Context, queue *models.DailyQueue) error

    // MarkComplete sets completed_at = NOW() for the given queue ID.
    MarkComplete(ctx context.Context, queueID uuid.UUID) error

    // Replace replaces an existing queue's keymap_ids array. Used by regenerate.
    // Returns ErrNotFound if queue does not exist.
    Replace(ctx context.Context, userID uuid.UUID, date time.Time, keymapIDs []uuid.UUID) error
}

// ============================================================
// AnalyticsRepository
// ============================================================

type AnalyticsRepository interface {
    // GetSummaryTotals returns aggregate session totals for a date range.
    GetSummaryTotals(ctx context.Context, userID uuid.UUID, dr DateRange) (*SessionSummary, error)

    // GetAccuracyTrend returns daily accuracy points for charting.
    GetAccuracyTrend(ctx context.Context, userID uuid.UUID, dr DateRange) ([]AccuracyDataPoint, error)

    // GetResponseTimeTrend returns daily average response time points for charting.
    GetResponseTimeTrend(ctx context.Context, userID uuid.UUID, dr DateRange) ([]ResponseTimeDataPoint, error)

    // GetPracticeTime returns daily practice minutes for charting.
    GetPracticeTime(ctx context.Context, userID uuid.UUID, dr DateRange) ([]DailyTimeDataPoint, error)

    // GetMostMissed returns keymaps with highest error rates in the period.
    GetMostMissed(ctx context.Context, userID uuid.UUID, dr DateRange, limit int, minAttempts int) ([]MostMissedRow, error)

    // GetMostImproved returns keymaps with greatest accuracy improvement between period halves.
    GetMostImproved(ctx context.Context, userID uuid.UUID, dr DateRange, limit int, minAttempts int) ([]MostImprovedRow, error)

    // GetCategoryBreakdown returns attempt counts and accuracy grouped by keymap category.
    GetCategoryBreakdown(ctx context.Context, userID uuid.UUID, dr DateRange) ([]CategoryRow, error)
}

// ============================================================
// AchievementRepository
// ============================================================

type AchievementRepository interface {
    // GetAll returns all achievement definitions, ordered by condition_value ASC.
    GetAll(ctx context.Context) ([]models.Achievement, error)

    // GetBySlug returns a single achievement by its slug. Returns ErrNotFound if absent.
    GetBySlug(ctx context.Context, slug string) (*models.Achievement, error)

    // GetUnlockedByUser returns all user_achievements rows for a user, ordered by unlocked_at DESC.
    GetUnlockedByUser(ctx context.Context, userID uuid.UUID) ([]models.UserAchievement, error)

    // GetRecentUnlocked returns the N most recently unlocked achievements for a user.
    GetRecentUnlocked(ctx context.Context, userID uuid.UUID, limit int) ([]models.UserAchievement, error)

    // IsUnlocked returns true if the user has already unlocked the given achievement.
    IsUnlocked(ctx context.Context, userID uuid.UUID, achievementID uuid.UUID) (bool, error)

    // Unlock inserts a user_achievement row. Uses ON CONFLICT DO NOTHING (idempotent).
    Unlock(ctx context.Context, userID uuid.UUID, achievementID uuid.UUID) error
}

// ============================================================
// SettingsRepository
// ============================================================

type SettingsRepository interface {
    // GetByUserID returns user settings. Returns ErrNotFound if no settings row exists yet.
    // Callers should apply application defaults when ErrNotFound is returned.
    GetByUserID(ctx context.Context, userID uuid.UUID) (*models.UserSettings, error)

    // Upsert inserts or updates the settings row for a user.
    // Uses INSERT ... ON CONFLICT (user_id) DO UPDATE SET ...
    Upsert(ctx context.Context, settings *models.UserSettings) error
}
```

---

## 3. Storage Interface

```go
// internal/storage/storage.go

package storage

import (
    "context"
    "io"
    "time"
)

// StorageService abstracts file storage operations.
// V1 implementation uses the local filesystem.
// V2 will swap to Cloudflare R2 by injecting a different implementation.
type StorageService interface {
    // Save writes the data from r to a storage path identified by key.
    // key is a relative path (e.g., "uploads/user123/config.zip").
    // Returns the storage-provider URL or path for the stored object.
    Save(ctx context.Context, key string, r io.Reader, contentType string) (string, error)

    // Get returns an io.ReadCloser for the object at key.
    // Caller must close the reader.
    // Returns ErrNotFound if the object does not exist.
    Get(ctx context.Context, key string) (io.ReadCloser, error)

    // Delete removes the object at key. No-op if the object does not exist.
    Delete(ctx context.Context, key string) error

    // Exists returns true if an object exists at key.
    Exists(ctx context.Context, key string) (bool, error)

    // GetURL returns a publicly accessible URL for the object at key.
    // For local storage, returns the local file path (not a URL).
    // For R2, returns a pre-signed URL valid for the given duration.
    GetURL(ctx context.Context, key string, expiry time.Duration) (string, error)

    // Ping verifies the storage backend is accessible. Used by the health check.
    Ping(ctx context.Context) error
}
```

---

## 4. KeymapParser Interface

```go
// internal/services/keymap_parser_service.go

package services

import "context"

// ParsedKeymap holds a single parsed keymap entry from a config file.
type ParsedKeymap struct {
    KeySequence string // the LHS key binding: "<leader>ff", "gd", "ciw"
    Mode        string // single char: "n", "i", "v", "x", "o", "c", "t"
    Description string // human-readable description from the `desc` field
    Category    string // inferred category: "leader", "lsp", "motion", etc.
    SourceFile  string // relative path within the parsed dir/zip: "lua/plugins/telescope.lua"
}

// ParseResult holds the output of a parse operation.
type ParseResult struct {
    Keymaps      []ParsedKeymap
    LinesScanned int
    LinesFailed  int
    FailedLines  []string // first 20 failed lines for user-visible warning
}

// KeymapParserService parses Neovim configuration files and extracts key mappings.
// It is a pure transformation service with no database dependency.
type KeymapParserService interface {
    // ParseFile parses a single .lua or .vim/.vimrc file at filePath.
    // Never returns an error for partial parse failures — failed lines are
    // counted in ParseResult.LinesFailed and collected in ParseResult.FailedLines.
    // Returns an error only for file read failures.
    ParseFile(ctx context.Context, filePath string) (ParseResult, error)

    // ParseDirectory walks dir recursively, finds all .lua and .vim/.vimrc files,
    // parses each one, and returns combined results with SourceFile set to the
    // relative path within dir.
    ParseDirectory(ctx context.Context, dir string) (ParseResult, error)

    // ParseZip extracts the ZIP archive at zipPath to a temporary directory,
    // calls ParseDirectory on the extracted content, cleans up the temp dir,
    // and returns the results.
    // Returns an error if the archive is invalid, contains path traversal sequences
    // (/../), or contains executable files.
    ParseZip(ctx context.Context, zipPath string) (ParseResult, error)
}
```

---

## 5. GORM Model Structs

All models use `gorm` struct tags for column mapping, `json` tags for API serialization, and `validate` tags for struct-level validation. UUID fields use `github.com/google/uuid.UUID`.

```go
// internal/models/base.go

package models

import (
    "time"

    "github.com/google/uuid"
    "gorm.io/gorm"
)

// BaseModel is embedded in all models that have soft delete.
// UUID is generated by PostgreSQL (gen_random_uuid()), not by Go.
type BaseModel struct {
    ID        uuid.UUID      `gorm:"type:uuid;primarykey;default:gen_random_uuid()" json:"id"`
    CreatedAt time.Time      `gorm:"not null;autoCreateTime"                         json:"created_at"`
    UpdatedAt time.Time      `gorm:"not null;autoUpdateTime"                         json:"updated_at"`
    DeletedAt gorm.DeletedAt `gorm:"index"                                           json:"-"`
}
```

```go
// internal/models/user.go

package models

import (
    "time"

    "github.com/google/uuid"
)

type User struct {
    BaseModel
    Email           *string   `gorm:"uniqueIndex;type:text"        json:"email"            validate:"omitempty,email,max=255"`
    PasswordHash    *string   `gorm:"type:text"                    json:"-"`
    IsGuest         bool      `gorm:"not null;default:false"       json:"is_guest"`
    GuestToken      *uuid.UUID `gorm:"type:uuid;uniqueIndex"       json:"-"`
    DisplayName     string    `gorm:"not null;default:'';type:text" json:"display_name"    validate:"max=50"`
    CurrentStreak   int       `gorm:"not null;default:0"           json:"current_streak"`
    LongestStreak   int       `gorm:"not null;default:0"           json:"longest_streak"`
    LastActiveDate  *time.Time `gorm:"type:date"                   json:"last_active_date"`
}

func (User) TableName() string { return "users" }
```

```go
// internal/models/keymap_source.go

package models

import (
    "time"

    "github.com/google/uuid"
)

type KeymapSource struct {
    BaseModel
    UserID      uuid.UUID `gorm:"type:uuid;not null;index"      json:"user_id"`
    SourceType  string    `gorm:"type:text;not null"            json:"source_type"  validate:"required,oneof=file_upload github_import builtin"`
    SourceName  string    `gorm:"type:text;not null"            json:"source_name"  validate:"required,max=512"`
    GithubURL   *string   `gorm:"type:text"                     json:"github_url"`
    ParsedAt    time.Time `gorm:"not null;default:now()"        json:"parsed_at"`
    KeymapCount int       `gorm:"not null;default:0"            json:"keymap_count"`
}

func (KeymapSource) TableName() string { return "keymap_sources" }
```

```go
// internal/models/keymap.go

package models

import "github.com/google/uuid"

type Keymap struct {
    BaseModel
    UserID      uuid.UUID  `gorm:"type:uuid;not null;index"      json:"user_id"`
    SourceID    *uuid.UUID `gorm:"type:uuid;index"               json:"source_id"`
    KeySequence string     `gorm:"type:text;not null"            json:"key_sequence"  validate:"required,max=100"`
    Mode        string     `gorm:"type:text;not null"            json:"mode"          validate:"required,oneof=n i v x o t c"`
    Description string     `gorm:"type:text;not null;default:''" json:"description"  validate:"max=500"`
    Category    string     `gorm:"type:text;not null;default:'other'" json:"category" validate:"required,oneof=motion leader lsp navigation editing plugin other"`
    IsBuiltin   bool       `gorm:"not null;default:false"        json:"is_builtin"`
}

func (Keymap) TableName() string { return "keymaps" }
```

```go
// internal/models/practice_session.go

package models

import (
    "time"

    "github.com/google/uuid"
)

type PracticeSession struct {
    BaseModel
    UserID          uuid.UUID `gorm:"type:uuid;not null;index"           json:"user_id"`
    Mode            string    `gorm:"type:text;not null"                 json:"mode"             validate:"required,oneof=practice motion leader flashcard"`
    StartedAt       time.Time `gorm:"not null;default:now()"             json:"started_at"`
    CompletedAt     *time.Time `gorm:"type:timestamptz"                  json:"completed_at"`
    TotalAttempts   int       `gorm:"not null;default:0"                 json:"total_attempts"`
    CorrectAttempts int       `gorm:"not null;default:0"                 json:"correct_attempts"`
    Accuracy        *float64  `gorm:"type:numeric(5,2)"                  json:"accuracy"`
    AvgResponseMs   *int      `gorm:"type:int"                           json:"avg_response_ms"`
    Score           int       `gorm:"not null;default:0"                 json:"score"`
    StreakAchieved  int       `gorm:"not null;default:0"                 json:"streak_achieved"`
}

func (PracticeSession) TableName() string { return "practice_sessions" }
```

```go
// internal/models/practice_attempt.go

package models

import (
    "time"

    "github.com/google/uuid"
)

// PracticeAttempt does not embed BaseModel — it has no UpdatedAt and no soft delete.
type PracticeAttempt struct {
    ID          uuid.UUID `gorm:"type:uuid;primarykey;default:gen_random_uuid()" json:"id"`
    SessionID   uuid.UUID `gorm:"type:uuid;not null;index"                       json:"session_id"   validate:"required"`
    KeymapID    uuid.UUID `gorm:"type:uuid;not null;index"                       json:"keymap_id"    validate:"required"`
    UserInput   string    `gorm:"type:text;not null;default:''"                  json:"user_input"`
    IsCorrect   bool      `gorm:"not null"                                       json:"is_correct"`
    ResponseMs  int       `gorm:"not null"                                       json:"response_ms"  validate:"min=0"`
    AttemptedAt time.Time `gorm:"not null;default:now();index"                   json:"attempted_at"`
}

func (PracticeAttempt) TableName() string { return "practice_attempts" }
```

```go
// internal/models/srs_record.go

package models

import (
    "time"

    "github.com/google/uuid"
    "github.com/shopspring/decimal"
)

// SRSRecord does not embed BaseModel — it has no UpdatedAt, CreatedAt, or soft delete.
// The UNIQUE constraint on (user_id, keymap_id) is defined at the DB level.
type SRSRecord struct {
    ID             uuid.UUID        `gorm:"type:uuid;primarykey;default:gen_random_uuid()" json:"id"`
    UserID         uuid.UUID        `gorm:"type:uuid;not null;uniqueIndex:uq_srs_user_keymap" json:"user_id"`
    KeymapID       uuid.UUID        `gorm:"type:uuid;not null;uniqueIndex:uq_srs_user_keymap" json:"keymap_id"`
    IntervalDays   int              `gorm:"not null;default:1"                               json:"interval_days"`
    EaseFactor     decimal.Decimal  `gorm:"type:numeric(4,2);not null;default:2.50"          json:"ease_factor"`
    Repetitions    int              `gorm:"not null;default:0"                               json:"repetitions"`
    NextReviewAt   time.Time        `gorm:"not null;default:now();index"                     json:"next_review_at"`
    LastReviewedAt *time.Time       `gorm:"type:timestamptz"                                 json:"last_reviewed_at"`
    TotalReviews   int              `gorm:"not null;default:0"                               json:"total_reviews"`
    CorrectReviews int              `gorm:"not null;default:0"                               json:"correct_reviews"`
}

func (SRSRecord) TableName() string { return "spaced_repetition_records" }
```

```go
// internal/models/achievement.go

package models

import "github.com/google/uuid"

// Achievement does not embed BaseModel — it is static seed data with no timestamps needed.
type Achievement struct {
    ID             uuid.UUID `gorm:"type:uuid;primarykey;default:gen_random_uuid()" json:"id"`
    Slug           string    `gorm:"type:text;not null;uniqueIndex"                 json:"slug"`
    Name           string    `gorm:"type:text;not null"                             json:"name"`
    Description    string    `gorm:"type:text;not null"                             json:"description"`
    IconName       string    `gorm:"type:text;not null"                             json:"icon_name"`
    ConditionType  string    `gorm:"type:text;not null"                             json:"condition_type"`
    ConditionValue int       `gorm:"not null"                                       json:"condition_value"`
}

func (Achievement) TableName() string { return "achievements" }
```

```go
// internal/models/user_achievement.go

package models

import (
    "time"

    "github.com/google/uuid"
)

// UserAchievement is the junction table for user earned achievements.
// No BaseModel — uses its own primary key (id UUID) with a UNIQUE constraint.
type UserAchievement struct {
    ID            uuid.UUID `gorm:"type:uuid;primarykey;default:gen_random_uuid()" json:"id"`
    UserID        uuid.UUID `gorm:"type:uuid;not null;uniqueIndex:uq_user_achievement;index" json:"user_id"`
    AchievementID uuid.UUID `gorm:"type:uuid;not null;uniqueIndex:uq_user_achievement"      json:"achievement_id"`
    UnlockedAt    time.Time `gorm:"not null;default:now()"                                   json:"unlocked_at"`

    // Preloaded associations
    Achievement *Achievement `gorm:"foreignKey:AchievementID" json:"achievement,omitempty"`
}

func (UserAchievement) TableName() string { return "user_achievements" }
```

```go
// internal/models/daily_queue.go

package models

import (
    "time"

    "github.com/google/uuid"
    "github.com/lib/pq"
)

// DailyQueue stores the ordered list of keymaps for a user's daily practice queue.
// The keymap_ids UUID array is stored as a PostgreSQL UUID[] native array.
// Requires the github.com/lib/pq driver for array scanning.
type DailyQueue struct {
    ID          uuid.UUID    `gorm:"type:uuid;primarykey;default:gen_random_uuid()"  json:"id"`
    UserID      uuid.UUID    `gorm:"type:uuid;not null;index"                        json:"user_id"`
    QueueDate   time.Time    `gorm:"type:date;not null"                              json:"queue_date"`
    KeymapIDs   pq.GenericArray `gorm:"type:uuid[];not null"                        json:"keymap_ids"`
    GeneratedAt time.Time    `gorm:"not null;default:now()"                          json:"generated_at"`
    CompletedAt *time.Time   `gorm:"type:timestamptz"                                json:"completed_at"`
}

func (DailyQueue) TableName() string { return "daily_queues" }
```

```go
// internal/models/user_settings.go

package models

import (
    "time"

    "github.com/google/uuid"
)

// UserSettings uses user_id as the primary key (one-to-one with users).
// No BaseModel — has its own updated_at but no created_at soft-delete.
type UserSettings struct {
    ID                    uuid.UUID `gorm:"type:uuid;primarykey;default:gen_random_uuid()" json:"id"`
    UserID                uuid.UUID `gorm:"type:uuid;not null;uniqueIndex"                 json:"user_id"`
    Theme                 string    `gorm:"type:text;not null;default:'dark'"              json:"theme"                      validate:"oneof=dark light system"`
    SessionDurationMinutes int      `gorm:"not null;default:10"                            json:"session_duration_minutes"   validate:"oneof=5 10 15 20 30"`
    SoundsEnabled         bool      `gorm:"not null;default:true"                          json:"sounds_enabled"`
    AnimationsEnabled     bool      `gorm:"not null;default:true"                          json:"animations_enabled"`
    KeyboardLayout        string    `gorm:"type:text;not null;default:'qwerty'"            json:"keyboard_layout"            validate:"oneof=qwerty dvorak colemak"`
    LeaderKeySymbol       string    `gorm:"type:text;not null;default:'<leader>'"          json:"leader_key_symbol"          validate:"oneof=<leader> <space> \\ , g"`
    CreatedAt             time.Time `gorm:"not null;autoCreateTime"                        json:"created_at"`
    UpdatedAt             time.Time `gorm:"not null;autoUpdateTime"                        json:"updated_at"`
}

func (UserSettings) TableName() string { return "user_settings" }
```

---

## 6. Environment Variables (.env.example)

```bash
# ============================================================
# VimTrainer Backend — Environment Variables
# Copy to .env and fill in values for local development.
# Production values are set directly in Cloud Run environment.
# ============================================================

# ------------------------------------------------------------
# SERVER
# ------------------------------------------------------------

# HTTP port the server listens on.
# Cloud Run sets this automatically to 8080; do not override in production.
PORT=8080

# Deployment environment. Controls log format and behavior.
# Values: "development" (human-readable logs, verbose errors)
#         "production" (JSON logs, sanitized errors)
ENVIRONMENT=development

# ------------------------------------------------------------
# DATABASE
# ------------------------------------------------------------

# Full PostgreSQL connection string.
# Local: connects directly to the docker-compose postgres service.
# Production: use the Supabase pgBouncer transaction pool endpoint.
# IMPORTANT: append "?statement_cache_mode=describe" for pgBouncer compatibility.
DATABASE_URL=postgres://vimtrainer:vimtrainer_dev@localhost:5432/vimtrainer?sslmode=disable

# Maximum open connections per Go process.
# In production: 10 (Cloud Run) * 10 (max instances) = 100 total connections to pgBouncer.
DB_MAX_OPEN_CONNS=10

# Maximum idle connections kept in pool.
DB_MAX_IDLE_CONNS=5

# Maximum connection lifetime in seconds. Forces periodic reconnection.
DB_CONN_MAX_LIFETIME_SECONDS=300

# Maximum idle connection lifetime in seconds. Closes idle connections.
DB_CONN_MAX_IDLE_TIME_SECONDS=60

# ------------------------------------------------------------
# AUTHENTICATION
# ------------------------------------------------------------

# HMAC-SHA256 signing secret for all JWTs (access + refresh + guest tokens).
# Minimum 32 characters. Use a cryptographically random value.
# Generate with: openssl rand -hex 32
# ROTATE ONLY DURING MAINTENANCE WINDOW — rotation logs out all users.
JWT_SECRET=replace_with_at_least_32_chars_of_random_secret_here

# Access token lifetime in minutes.
JWT_ACCESS_TOKEN_EXPIRY_MINUTES=15

# Refresh token lifetime in days.
JWT_REFRESH_TOKEN_EXPIRY_DAYS=30

# Guest token lifetime in hours.
JWT_GUEST_TOKEN_EXPIRY_HOURS=24

# ------------------------------------------------------------
# CORS
# ------------------------------------------------------------

# Comma-separated list of allowed CORS origins.
# Local development: Vite default dev server and preview server.
# Production: set to your production and preview domains.
# Example prod: https://vimtrainer.dev,https://www.vimtrainer.dev,https://*.vimtrainer.pages.dev
CORS_ORIGINS=http://localhost:5173,http://localhost:4173

# ------------------------------------------------------------
# STORAGE
# ------------------------------------------------------------

# Storage backend selection.
# Values: "local" (uses STORAGE_PATH below)
#         "r2" (uses R2_* variables below)
STORAGE_PROVIDER=local

# Base directory for local file storage.
# Created automatically if it does not exist.
# Stores uploaded ZIP and config files temporarily during parsing.
STORAGE_PATH=./data

# ------------------------------------------------------------
# CLOUDFLARE R2 (only required when STORAGE_PROVIDER=r2)
# ------------------------------------------------------------

# Cloudflare account ID (found in Cloudflare dashboard → right sidebar).
R2_ACCOUNT_ID=

# R2 access key ID (generated in Cloudflare R2 → Manage R2 API Tokens).
R2_ACCESS_KEY_ID=

# R2 secret access key.
R2_SECRET_ACCESS_KEY=

# R2 bucket name.
R2_BUCKET_NAME=vimtrainer-uploads

# ------------------------------------------------------------
# RATE LIMITING
# ------------------------------------------------------------

# Enable or disable rate limiting.
# Set to "false" in integration test environments only.
# Never disable in production.
RATE_LIMIT_ENABLED=true

# ------------------------------------------------------------
# GITHUB IMPORT
# ------------------------------------------------------------

# Seconds to wait before aborting a git clone operation.
# Increase for users with large dotfile repos on slow connections.
GITHUB_CLONE_TIMEOUT_SECONDS=30

# Maximum repo size in KB. Repos larger than this are rejected before cloning.
# Prevents cloning multi-GB repos. 50MB default.
GITHUB_MAX_REPO_SIZE_KB=51200

# ------------------------------------------------------------
# LOGGING
# ------------------------------------------------------------

# Log level. Values: "debug", "info", "warn", "error".
# Use "debug" for local development, "info" for production.
LOG_LEVEL=debug

# Log format. Values: "json" (production), "text" (development).
# In production, JSON logs are consumed by Cloud Logging.
LOG_FORMAT=text
```

---

## 7. Dockerfile

```dockerfile
# backend/Dockerfile
# Multi-stage build:
#   Stage 1 (builder): compiles the Go binary with CGO disabled
#   Stage 2 (production): minimal Alpine runtime with git for GitHub import

# ============================================================
# Stage 1: Build
# ============================================================
FROM golang:1.23-alpine AS builder

# Install build dependencies: git (for go mod download with VCS deps)
RUN apk add --no-cache git

WORKDIR /app

# Download dependencies first (layer caching — only re-runs when go.mod/go.sum change)
COPY go.mod go.sum ./
RUN go mod download

# Copy source and build
COPY . .

# Build flags:
#   CGO_ENABLED=0: pure Go build, no C dependencies (required for Alpine runtime)
#   -ldflags="-s -w": strip debug info and DWARF, reduces binary size by ~30%
#   -trimpath: remove local file paths from stack traces (security)
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 \
    go build \
    -ldflags="-s -w" \
    -trimpath \
    -o /bin/server \
    ./cmd/server

# ============================================================
# Stage 2: Production runtime
# ============================================================
FROM alpine:3.20 AS production

# Install runtime dependencies:
#   git: required by GitHubImportService (git clone via os/exec)
#   ca-certificates: required for HTTPS connections (Supabase, GitHub API)
#   tzdata: required for time zone handling in scheduled jobs
RUN apk add --no-cache \
    git \
    ca-certificates \
    tzdata

# Create non-root user for running the server
RUN addgroup -g 1001 -S vimtrainer && \
    adduser -u 1001 -S vimtrainer -G vimtrainer

# Create data directory for local storage (used when STORAGE_PROVIDER=local)
RUN mkdir -p /data && chown vimtrainer:vimtrainer /data

# Copy compiled binary from builder stage
COPY --from=builder /bin/server /server

# Run as non-root user
USER vimtrainer

# Expose the application port
EXPOSE 8080

# Health check: Cloud Run uses the /health endpoint
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget -qO- http://localhost:8080/health || exit 1

# Start the server
ENTRYPOINT ["/server"]
```

---

## 8. Docker Compose (Local Development)

```yaml
# backend/docker-compose.yml
# Local development stack: Go API with hot-reload (Air) + PostgreSQL

version: "3.9"

services:
  # ============================================================
  # PostgreSQL Database
  # ============================================================
  postgres:
    image: postgres:15-alpine
    restart: unless-stopped
    environment:
      POSTGRES_DB: vimtrainer
      POSTGRES_USER: vimtrainer
      POSTGRES_PASSWORD: vimtrainer_dev
    ports:
      # Expose on localhost:5432 for direct psql access and tools like TablePlus
      - "5432:5432"
    volumes:
      # Persist data across container restarts
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U vimtrainer -d vimtrainer"]
      interval: 5s
      timeout: 5s
      retries: 10
      start_period: 10s

  # ============================================================
  # Go API (hot-reload with Air)
  # ============================================================
  api:
    build:
      context: .
      dockerfile: Dockerfile
      target: builder   # Use the builder stage which has the Go toolchain
    restart: unless-stopped
    command: >
      sh -c "
        go install github.com/air-verse/air@latest &&
        air -c .air.toml
      "
    ports:
      - "8080:8080"
    volumes:
      # Mount source for hot-reload
      - .:/app
      # Separate volume for Go build cache (faster rebuilds)
      - go_cache:/root/.cache/go-build
      - go_mod_cache:/go/pkg/mod
      # Local storage directory
      - ./data:/data
    environment:
      PORT: "8080"
      ENVIRONMENT: development
      DATABASE_URL: postgres://vimtrainer:vimtrainer_dev@postgres:5432/vimtrainer?sslmode=disable
      JWT_SECRET: local_dev_jwt_secret_minimum_32_characters_long
      JWT_ACCESS_TOKEN_EXPIRY_MINUTES: "15"
      JWT_REFRESH_TOKEN_EXPIRY_DAYS: "30"
      JWT_GUEST_TOKEN_EXPIRY_HOURS: "24"
      CORS_ORIGINS: http://localhost:5173,http://localhost:4173
      STORAGE_PROVIDER: local
      STORAGE_PATH: /data
      RATE_LIMIT_ENABLED: "false"
      GITHUB_CLONE_TIMEOUT_SECONDS: "30"
      GITHUB_MAX_REPO_SIZE_KB: "51200"
      LOG_LEVEL: debug
      LOG_FORMAT: text
      DB_MAX_OPEN_CONNS: "5"
      DB_MAX_IDLE_CONNS: "2"
      DB_CONN_MAX_LIFETIME_SECONDS: "300"
      DB_CONN_MAX_IDLE_TIME_SECONDS: "60"
    depends_on:
      postgres:
        condition: service_healthy
    working_dir: /app

# ============================================================
# Volumes
# ============================================================
volumes:
  postgres_data:
    driver: local
  go_cache:
    driver: local
  go_mod_cache:
    driver: local
```

### Air Configuration (.air.toml)

Place this file at `backend/.air.toml` for hot-reload in the Docker Compose `api` service:

```toml
# backend/.air.toml
# Air hot-reload configuration for local development

root = "."
tmp_dir = "tmp"

[build]
  # Command to run on file change
  cmd = "go build -o ./tmp/server ./cmd/server"
  # Binary to run after build
  bin = "./tmp/server"
  # Additional args passed to the binary
  args_bin = []
  # Watch these file extensions
  include_ext = ["go", "html", "tmpl"]
  # Exclude these directories
  exclude_dir = ["tmp", "data", "migrations", "vendor"]
  # Exclude files matching these patterns
  exclude_file = []
  # Kill old process and start new one
  send_interrupt = true
  # Delay before sending interrupt signal (ms)
  kill_delay = 500
  # Rerun on same file change (prevents double-trigger)
  rerun = false

[log]
  time = true
  main_only = false

[color]
  main = "magenta"
  watcher = "cyan"
  build = "yellow"
  runner = "green"

[misc]
  clean_on_exit = true
```
