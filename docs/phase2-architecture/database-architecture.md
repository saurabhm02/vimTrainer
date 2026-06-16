# Database Architecture: VimTrainer
**Version**: 1.0
**Last Updated**: 2026-06-16
**Author**: Architecture Team
**Status**: Approved

---

## 1. Schema Overview

### 1.1 Entity Relationship Diagram

```
┌──────────────────────────────────────────────────────────────────────┐
│                         CORE IDENTITY                                │
│                                                                      │
│  ┌─────────────────┐                                                 │
│  │     users        │                                                │
│  │─────────────────│                                                 │
│  │ id (PK)         │◄────────────────────────────────────────────┐  │
│  │ email           │                                             │  │
│  │ password_hash   │◄──────────────────────┐                    │  │
│  │ current_streak  │                       │                    │  │
│  │ longest_streak  │                       │                    │  │
│  │ last_active_date│                       │                    │  │
│  └────────┬────────┘                       │                    │  │
│           │                                │                    │  │
└───────────┼────────────────────────────────┼────────────────────┼──┘
            │                                │                    │
            │  KEYMAPS                       │  SESSIONS          │  PROFILE
            │                                │                    │
            ▼                                │                    │
┌─────────────────────┐                      │           ┌────────┴────────┐
│   keymap_sources     │                      │           │    settings      │
│─────────────────────│                      │           │─────────────────│
│ id (PK)             │                      │           │ user_id (PK, FK) │
│ user_id (FK)        │                      │           │ theme            │
│ source_type         │                      │           │ session_length   │
│ name                │                      │           │ sound_enabled    │
│ parsed_at           │                      │           │ animations_on    │
└──────┬──────────────┘                      │           │ keyboard_layout  │
       │                                     │           │ leader_symbol    │
       │                                     │           └──────────────────┘
       ▼                                     │
┌─────────────────────┐                      │           ┌──────────────────┐
│      keymaps         │                      │           │   achievements   │
│─────────────────────│                      │           │─────────────────│
│ id (PK)             │◄──────────────────┐  │           │ id (PK)         │
│ user_id (FK)        │                   │  │           │ code (UNIQUE)   │
│ source_id (FK, null)│                   │  │           │ name            │
│ lhs                 │                   │  │           │ description     │
│ mode                │                   │  │           │ condition       │
│ description         │                   │  │           └────────┬────────┘
│ category            │                   │  │                    │
│ is_built_in         │                   │  │           ┌────────┴────────┐
└──────┬──────────────┘                   │  │           │user_achievements│
       │                                  │  │           │─────────────────│
       │         ┌────────────────────────┘  │           │ user_id (FK,PK) │
       │         │                           │           │ achievement_id  │
       │         │                           │           │   (FK, PK)      │
       ▼         ▼                           │           │ earned_at       │
┌───────────────────────────┐               │           └─────────────────┘
│  spaced_repetition_records │               │
│───────────────────────────│               │
│ id (PK)                   │               │
│ user_id (FK, null)        │               │
│ guest_id (null)           │               │
│ keymap_id (FK)            │               │
│ ease_factor               │               │
│ interval                  │               │
│ due_date                  │               │
│ total_attempts            │               │
│ correct_attempts          │               │
│ last_attempted_at         │               │
└───────────────────────────┘               │
                                            │
┌────────────────────────────────────────────┼──────────────────────────┐
│  SESSIONS                                  │                          │
│                                            │                          │
│  ┌──────────────────────┐                  │                          │
│  │  practice_sessions   │                  │                          │
│  │──────────────────────│                  │                          │
│  │ id (PK)              │◄─────────────────┘                         │
│  │ user_id (FK, null)   │                                             │
│  │ guest_id (null)      │◄────────────────────────────────────┐      │
│  │ mode                 │                                      │      │
│  │ length               │                                      │      │
│  │ accuracy             │                                      │      │
│  │ avg_response_ms      │                                      │      │
│  │ streak               │                              ┌───────┴──────┴──┐
│  │ score                │                              │  daily_queues    │
│  │ started_at           │                              │────────────────── │
│  │ completed_at         │                              │ id (PK)          │
│  │ is_daily             │                              │ user_id (FK)     │
│  └───────┬──────────────┘                              │ date             │
│          │                                             │ keymap_ids[]     │
│          ▼                                             │ completed_count  │
│  ┌──────────────────────┐                              │ is_complete      │
│  │  practice_attempts   │                              │ completed_at     │
│  │──────────────────────│                              └──────────────────┘
│  │ id (PK)              │
│  │ session_id (FK)      │
│  │ user_id (FK, null)   │
│  │ guest_id (null)      │
│  │ keymap_id (FK)       │
│  │ entered_sequence     │
│  │ is_correct           │
│  │ response_time_ms     │
│  │ attempted_at         │
│  └──────────────────────┘
│                                                                       │
└───────────────────────────────────────────────────────────────────────┘
```

---

## 2. Table Definitions

### 2.1 users

**Purpose**: Registered user accounts. Guest sessions are tracked in `guest_sessions` (not a full table — just the token + expiry in a lightweight structure, or keyed by `guest_id` string in session tables).

```sql
CREATE TABLE users (
    id                UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    email             TEXT         NOT NULL UNIQUE,
    password_hash     TEXT         NOT NULL,
    current_streak    INT          NOT NULL DEFAULT 0,
    longest_streak    INT          NOT NULL DEFAULT 0,
    last_active_date  DATE,        -- UTC date of last completed daily queue
    created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    deleted_at        TIMESTAMPTZ  -- soft delete; NULL = active
);

-- Soft-delete index: most queries filter deleted_at IS NULL
CREATE INDEX idx_users_email ON users(email) WHERE deleted_at IS NULL;
```

**Constraints**:
- `email`: unique across all non-deleted users (enforced by unique index with WHERE clause)
- `current_streak` and `longest_streak`: never go below 0 (enforced by application logic, not CHECK constraint — streak resets are intentional)
- `password_hash`: bcrypt hash, never the raw password

### 2.2 keymap_sources

**Purpose**: Tracks the origin of an import batch. Each import (file upload or GitHub clone) creates one source record. Keymaps reference their source for attribution in the review UI.

```sql
CREATE TABLE keymap_sources (
    id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    source_type  TEXT         NOT NULL CHECK (source_type IN ('file', 'github', 'builtin')),
    name         TEXT         NOT NULL,  -- filename or repo URL or 'built-in'
    parsed_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_keymap_sources_user_id ON keymap_sources(user_id);
```

**Constraints**:
- `source_type`: enforced CHECK constraint — only three valid values

### 2.3 keymaps

**Purpose**: The central table. Stores all keymap entries: user-imported and built-in Motion Trainer entries.

```sql
CREATE TABLE keymaps (
    id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    source_id    UUID         REFERENCES keymap_sources(id) ON DELETE SET NULL,
    lhs          TEXT         NOT NULL,   -- key sequence: "<leader>ff", "gd", "ciw"
    mode         TEXT         NOT NULL CHECK (mode IN ('n', 'i', 'v', 'x', 'o', 'c', 't')),
    description  TEXT         NOT NULL DEFAULT '',
    category     TEXT         NOT NULL DEFAULT 'Uncategorized',
    is_built_in  BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    deleted_at   TIMESTAMPTZ  -- soft delete allows removal from practice set
);

-- Uniqueness: one lhs+mode combination per user (prevents duplicates in practice set)
CREATE UNIQUE INDEX idx_keymaps_user_lhs_mode
    ON keymaps(user_id, lhs, mode)
    WHERE deleted_at IS NULL;

-- Practice queries filter by user and mode
CREATE INDEX idx_keymaps_user_mode ON keymaps(user_id, mode) WHERE deleted_at IS NULL;

-- Category filter for analytics and flashcard deck selection
CREATE INDEX idx_keymaps_user_category ON keymaps(user_id, category) WHERE deleted_at IS NULL;

-- Built-in Motion Trainer keymaps lookup (shared across all users)
CREATE INDEX idx_keymaps_builtin ON keymaps(is_built_in) WHERE is_built_in = TRUE;
```

**Constraints**:
- `mode`: strict CHECK constraint — only valid Vim mode characters
- `lhs`: no constraint on format — preserves raw key sequences including `<leader>`, `<C-p>`, etc.
- The unique index on `(user_id, lhs, mode)` is partial (WHERE deleted_at IS NULL). Deleting a keymap (soft delete) allows re-import of the same binding.

**Built-in keymaps**: The 45 Motion Trainer keymaps (Beginner: 14, Intermediate: 15, Advanced: 16) are stored in this table with `is_built_in = TRUE` and a special `user_id` pointing to a system user. Practice sessions for users without imports reference these rows. This allows the SRS system to apply uniformly to built-in and user-imported keymaps.

### 2.4 practice_sessions

**Purpose**: One row per practice session. Stores aggregate session metrics. Individual attempt data is in `practice_attempts`.

```sql
CREATE TABLE practice_sessions (
    id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID         REFERENCES users(id) ON DELETE CASCADE,
    guest_id        TEXT,        -- UUID string for guest sessions; NULL for authenticated
    mode            TEXT         NOT NULL CHECK (mode IN ('keymaps', 'motions', 'leader', 'flashcard', 'daily')),
    length          INT          NOT NULL CHECK (length IN (10, 20, 30)),
    accuracy        FLOAT8       CHECK (accuracy >= 0 AND accuracy <= 1),
    avg_response_ms INT          CHECK (avg_response_ms >= 0),
    streak          INT          NOT NULL DEFAULT 0,
    score           INT          NOT NULL DEFAULT 0,
    started_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    completed_at    TIMESTAMPTZ, -- NULL = in progress or abandoned
    is_daily        BOOLEAN      NOT NULL DEFAULT FALSE,

    -- At least one of user_id or guest_id must be set
    CONSTRAINT chk_session_owner CHECK (
        (user_id IS NOT NULL AND guest_id IS NULL) OR
        (user_id IS NULL AND guest_id IS NOT NULL)
    )
);

-- Most queries filter by user + date range
CREATE INDEX idx_sessions_user_started ON practice_sessions(user_id, started_at DESC)
    WHERE user_id IS NOT NULL AND completed_at IS NOT NULL;

-- Guest session lookup
CREATE INDEX idx_sessions_guest ON practice_sessions(guest_id)
    WHERE guest_id IS NOT NULL;
```

**Constraints**:
- The `chk_session_owner` constraint enforces that every session belongs to either a user or a guest — never both, never neither.
- `accuracy` is stored as a float (0.0 to 1.0), not a percentage integer. All percentage display is done in the application layer.
- `completed_at IS NULL` = session is in progress or was abandoned. Analytics queries filter to `completed_at IS NOT NULL`.

### 2.5 practice_attempts

**Purpose**: One row per answered challenge in a session. This is the highest-volume table — it grows at roughly `sessions × session_length` rows per user.

```sql
CREATE TABLE practice_attempts (
    id               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id       UUID         NOT NULL REFERENCES practice_sessions(id) ON DELETE CASCADE,
    user_id          UUID         REFERENCES users(id) ON DELETE CASCADE,
    guest_id         TEXT,
    keymap_id        UUID         NOT NULL REFERENCES keymaps(id) ON DELETE CASCADE,
    entered_sequence TEXT         NOT NULL,
    is_correct       BOOLEAN      NOT NULL,
    response_time_ms INT          NOT NULL CHECK (response_time_ms >= 0),
    attempted_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Analytics: per-user, per-keymap accuracy and response time
CREATE INDEX idx_attempts_user_keymap ON practice_attempts(user_id, keymap_id)
    WHERE user_id IS NOT NULL;

-- Analytics: date-range queries (accuracy trend, most missed)
CREATE INDEX idx_attempts_user_attempted ON practice_attempts(user_id, attempted_at DESC)
    WHERE user_id IS NOT NULL;

-- SRS: get weakest keymaps for user (filtered by last N days)
-- This index serves: WHERE user_id = ? AND attempted_at > ? GROUP BY keymap_id
CREATE INDEX idx_attempts_user_date_keymap ON practice_attempts(user_id, attempted_at, keymap_id)
    WHERE user_id IS NOT NULL;

-- Session drill-down: all attempts in a session
CREATE INDEX idx_attempts_session ON practice_attempts(session_id);
```

**Growth projection**: A dedicated user doing 1 daily session of 20 commands generates 7,300 rows per year. At 1,000 active users, this is 7.3M rows per year — well within PostgreSQL's comfortable range for indexed single-user queries.

### 2.6 spaced_repetition_records

**Purpose**: SM-2 state per (user, keymap) pair. One row per keymap per user (or guest). Updated after every attempt.

```sql
CREATE TABLE spaced_repetition_records (
    id                UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id           UUID         REFERENCES users(id) ON DELETE CASCADE,
    guest_id          TEXT,
    keymap_id         UUID         NOT NULL REFERENCES keymaps(id) ON DELETE CASCADE,
    ease_factor       FLOAT8       NOT NULL DEFAULT 2.5
                                   CHECK (ease_factor >= 1.3 AND ease_factor <= 2.5),
    interval          INT          NOT NULL DEFAULT 0 CHECK (interval >= 0),
    due_date          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    total_attempts    INT          NOT NULL DEFAULT 0 CHECK (total_attempts >= 0),
    correct_attempts  INT          NOT NULL DEFAULT 0 CHECK (correct_attempts >= 0),
    last_attempted_at TIMESTAMPTZ,

    -- One record per user+keymap pair
    CONSTRAINT uq_srs_user_keymap  UNIQUE (user_id, keymap_id),
    CONSTRAINT uq_srs_guest_keymap UNIQUE (guest_id, keymap_id),
    CONSTRAINT chk_srs_owner CHECK (
        (user_id IS NOT NULL AND guest_id IS NULL) OR
        (user_id IS NULL AND guest_id IS NOT NULL)
    ),
    CONSTRAINT chk_correct_lte_total CHECK (correct_attempts <= total_attempts)
);

-- Daily queue generation: get keymaps due for review
CREATE INDEX idx_srs_user_due ON spaced_repetition_records(user_id, due_date ASC)
    WHERE user_id IS NOT NULL;

-- Weakest keymaps query: sort by accuracy
-- Computed as correct_attempts / total_attempts
CREATE INDEX idx_srs_user_keymap ON spaced_repetition_records(user_id, keymap_id)
    WHERE user_id IS NOT NULL;

-- Never-practiced keymaps (total_attempts = 0)
CREATE INDEX idx_srs_user_new ON spaced_repetition_records(user_id)
    WHERE user_id IS NOT NULL AND total_attempts = 0;
```

**UPSERT pattern**: Every attempt uses `INSERT ... ON CONFLICT (user_id, keymap_id) DO UPDATE`. This creates the record on first attempt and updates it on subsequent attempts, without the application needing to check for existence.

### 2.7 achievements

**Purpose**: Static definitions of the 10 achievements. Seeded at startup, never modified by application logic.

```sql
CREATE TABLE achievements (
    id          UUID  PRIMARY KEY DEFAULT gen_random_uuid(),
    code        TEXT  NOT NULL UNIQUE,
    name        TEXT  NOT NULL,
    description TEXT  NOT NULL,
    condition   TEXT  NOT NULL  -- human-readable, shown on profile page
);

-- No indexes needed: this table has 10 rows and is read-only post-seed.
-- PostgreSQL will sequential scan it faster than using an index.
```

**Seed data**:
```sql
INSERT INTO achievements (code, name, description, condition) VALUES
    ('FIRST_SESSION',   'First Session',      'Completed your first practice session',           'Complete 1 practice session'),
    ('MOTION_MASTER',   'Motion Master',       'Achieved proficiency in Vim motions',             '>=80% accuracy across 3 consecutive Motion Trainer sessions'),
    ('LEADER_KEY_MASTER','Leader Key Master',  'Practiced leader key commands effectively',       'Answer 20 leader key commands correctly'),
    ('ACCURACY_KING',   'Accuracy King',       'Achieved perfect accuracy in a session',          '100% accuracy in a session of 10+ commands'),
    ('SPEED_DEMON',     'Speed Demon',         'Responded with lightning speed',                  'Average response time < 500ms in a full session'),
    ('STREAK_7',        '7-Day Streak',        'Practiced every day for a week',                  'Complete the daily queue 7 days in a row'),
    ('STREAK_30',       '30-Day Streak',       'Practiced every day for a month',                 'Complete the daily queue 30 days in a row'),
    ('IMPORTER',        'Config Importer',     'Imported your Neovim configuration',              'Import at least one keymap file or GitHub repo'),
    ('FLASHCARD_FIRST', 'Card Shark',          'Completed your first flashcard session',          'Complete 1 flashcard review session'),
    ('NIGHT_OWL',       'Night Owl',           'Practiced during late-night hours',               'Complete a session between 11pm and 4am');
```

### 2.8 user_achievements

**Purpose**: Records which users have earned which achievements, and when. Composite primary key on (user_id, achievement_id) — no separate surrogate key needed.

```sql
CREATE TABLE user_achievements (
    user_id        UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    achievement_id UUID         NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
    earned_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    PRIMARY KEY (user_id, achievement_id)
);

-- Profile page: get all earned achievements for a user
CREATE INDEX idx_user_achievements_user ON user_achievements(user_id);
```

### 2.9 daily_queues

**Purpose**: Stores the ordered daily practice queue for each user per UTC day. Generated once and cached here — not regenerated on each request.

```sql
CREATE TABLE daily_queues (
    id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    date            DATE         NOT NULL,   -- UTC date: '2026-06-16'
    keymap_ids      UUID[]       NOT NULL,   -- ordered array of keymap IDs (20 entries)
    completed_count INT          NOT NULL DEFAULT 0 CHECK (completed_count >= 0),
    is_complete     BOOLEAN      NOT NULL DEFAULT FALSE,
    completed_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    UNIQUE (user_id, date)       -- one queue per user per day
);

-- Lookup today's queue for user
CREATE INDEX idx_daily_queues_user_date ON daily_queues(user_id, date DESC);
```

**Array type for `keymap_ids`**: PostgreSQL's native array type (`UUID[]`) is used for the ordered list of keymap IDs. The queue order is defined at generation time and must not change during the day. Using an array avoids a join table and allows atomic replacement of the entire queue if regeneration is ever needed.

### 2.10 settings

**Purpose**: User settings, one row per user. Uses `user_id` as the primary key (one-to-one with users). Created on first settings save (not at registration), so some users may have no row (use defaults).

```sql
CREATE TABLE settings (
    user_id         UUID         PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    theme           TEXT         NOT NULL DEFAULT 'dark'
                                 CHECK (theme IN ('dark', 'light', 'system')),
    session_length  INT          NOT NULL DEFAULT 20
                                 CHECK (session_length IN (10, 20, 30)),
    sound_enabled   BOOLEAN      NOT NULL DEFAULT TRUE,
    animations_on   BOOLEAN      NOT NULL DEFAULT TRUE,
    keyboard_layout TEXT         NOT NULL DEFAULT 'qwerty'
                                 CHECK (keyboard_layout IN ('qwerty', 'dvorak', 'colemak')),
    leader_symbol   TEXT         NOT NULL DEFAULT '\'
                                 CHECK (LENGTH(leader_symbol) = 1 OR leader_symbol = '<Space>'),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- No additional indexes: lookup is always by primary key (user_id)
```

**UPSERT pattern**: `INSERT INTO settings (user_id, ...) VALUES (?, ...) ON CONFLICT (user_id) DO UPDATE SET ...`. This handles both first-time save and subsequent updates in one statement.

---

## 3. Indexing Strategy

### 3.1 Index Summary by Query Pattern

The following index decisions are derived from the 10 most performance-sensitive queries (section 4).

**practice_attempts** — this table is the primary analytics source and receives the heaviest query load:

```sql
-- Serves: accuracy trend, response time trend, daily time (date range aggregations)
CREATE INDEX idx_attempts_user_attempted
    ON practice_attempts(user_id, attempted_at DESC)
    WHERE user_id IS NOT NULL;

-- Serves: per-keymap accuracy for most missed / most improved
-- (user_id + attempted_at for date range, keymap_id for grouping)
CREATE INDEX idx_attempts_user_date_keymap
    ON practice_attempts(user_id, attempted_at, keymap_id)
    WHERE user_id IS NOT NULL;

-- Serves: session drill-down (all attempts in a session)
CREATE INDEX idx_attempts_session ON practice_attempts(session_id);
```

**spaced_repetition_records** — queried during daily queue generation and after every attempt:

```sql
-- Serves: GetDueForUser — flashcard and SRS queue
CREATE INDEX idx_srs_user_due
    ON spaced_repetition_records(user_id, due_date ASC)
    WHERE user_id IS NOT NULL;

-- Serves: GetWeakest — daily queue composition (sort by accuracy)
-- Note: accuracy = correct_attempts/total_attempts is computed, not stored.
-- The index enables the WHERE + ORDER BY without a full table scan.
-- The sort by accuracy is done in application memory after fetching candidate rows.
CREATE INDEX idx_srs_user_attempts
    ON spaced_repetition_records(user_id, total_attempts, correct_attempts)
    WHERE user_id IS NOT NULL AND total_attempts > 0;

-- Serves: GetNeverPracticed — never-attempted keymaps for daily queue
CREATE INDEX idx_srs_user_new
    ON spaced_repetition_records(user_id)
    WHERE user_id IS NOT NULL AND total_attempts = 0;
```

**keymaps** — queried at practice session start and during import review:

```sql
-- Serves: GetForPractice — fetch keymaps by user and mode
CREATE INDEX idx_keymaps_user_mode
    ON keymaps(user_id, mode)
    WHERE deleted_at IS NULL;

-- Serves: daily queue generation — fetch keymaps for specific IDs
-- No index needed: UUID[] lookup by IN (?,?) uses idx_keymaps_user_mode or PK scan
-- The keymap_ids array in daily_queues is used with: WHERE id = ANY(keymap_ids)
-- This query uses the keymaps PK efficiently.
```

**practice_sessions** — queried for analytics and profile stats:

```sql
-- Serves: GetRecentByUserID, accuracy/time aggregations
CREATE INDEX idx_sessions_user_started
    ON practice_sessions(user_id, started_at DESC)
    WHERE user_id IS NOT NULL AND completed_at IS NOT NULL;
```

### 3.2 Index Maintenance Notes

- All partial indexes use `WHERE user_id IS NOT NULL` to exclude guest session rows from user-scoped indexes. Guest session data is transient (24-hour expiry) and does not need fast analytics access.
- Indexes on `practice_attempts` are the most critical for query performance. Monitor their size and bloat as the table grows.
- The `achievements` table has no indexes beyond the PK and `code` unique constraint — 10 rows never benefit from an index.
- `settings` has no index beyond the PK — all lookups are by `user_id` (PK).

---

## 4. Query Patterns

### Query 1: Fetch Today's Practice Queue for User

**Frequency**: Once per day per active user, on dashboard load.
**Expected result size**: 1 row (the queue) containing an array of 20 keymap IDs.

```sql
SELECT id, date, keymap_ids, completed_count, is_complete
FROM daily_queues
WHERE user_id = $1
  AND date = CURRENT_DATE AT TIME ZONE 'UTC'
LIMIT 1;
```

**Indexes used**: `idx_daily_queues_user_date` (user_id + date = composite lookup)
**If row missing**: Go service generates queue (Query 10 below) and inserts it.
**N+1 risk**: None. Single query.

---

### Query 2: Record a Practice Attempt

**Frequency**: 20–30 times per session, potentially 200–300 per day per active user.
**Expected result size**: 1 row inserted.

```sql
INSERT INTO practice_attempts
    (session_id, user_id, keymap_id, entered_sequence, is_correct, response_time_ms, attempted_at)
VALUES
    ($1, $2, $3, $4, $5, $6, NOW());
```

**Indexes used**: None on insert (indexes are updated, not queried).
**Overhead**: Each insert updates 3 indexes on `practice_attempts`. Acceptable at this volume.
**N+1 risk**: None. One insert per user action.

---

### Query 3: Update Spaced Repetition Record After Attempt

**Frequency**: Same as Query 2 — runs immediately after each attempt is recorded.
**Expected result size**: 1 row upserted.

```sql
INSERT INTO spaced_repetition_records
    (user_id, keymap_id, ease_factor, interval, due_date, total_attempts, correct_attempts, last_attempted_at)
VALUES
    ($1, $2, $3, $4, $5, 1, $6, NOW())
ON CONFLICT (user_id, keymap_id)
DO UPDATE SET
    ease_factor       = EXCLUDED.ease_factor,
    interval          = EXCLUDED.interval,
    due_date          = EXCLUDED.due_date,
    total_attempts    = spaced_repetition_records.total_attempts + 1,
    correct_attempts  = spaced_repetition_records.correct_attempts + $7::int,
    last_attempted_at = NOW();
```

Where `$7` is `1` if correct, `0` if incorrect.

**Indexes used**: Unique constraint `uq_srs_user_keymap` (for ON CONFLICT resolution).
**N+1 risk**: None. One UPSERT per attempt.

---

### Query 4: Analytics — Accuracy Trend Over 30 Days

**Frequency**: Once per analytics dashboard load, or when date range changes.
**Expected result size**: Up to 30 rows (one per day in range).

```sql
SELECT
    DATE(started_at AT TIME ZONE 'UTC')  AS date,
    AVG(accuracy)                         AS avg_accuracy,
    COUNT(*)                              AS session_count
FROM practice_sessions
WHERE user_id    = $1
  AND started_at > NOW() - INTERVAL '30 days'
  AND completed_at IS NOT NULL
GROUP BY DATE(started_at AT TIME ZONE 'UTC')
ORDER BY date ASC;
```

**Indexes used**: `idx_sessions_user_started` — covers `user_id + started_at` range scan.
**Expected execution**: < 10ms. A user doing 1 session/day for 30 days = 30 rows scanned.
**N+1 risk**: None. Single query.

---

### Query 5: Analytics — Most Missed Commands (Last 30 Days)

**Frequency**: Once per analytics dashboard load.
**Expected result size**: Up to 10 rows.

```sql
SELECT
    k.id           AS keymap_id,
    k.description  AS description,
    k.lhs          AS lhs,
    k.category     AS category,
    COUNT(*) FILTER (WHERE NOT pa.is_correct)::FLOAT
        / NULLIF(COUNT(*), 0)  AS error_rate,
    COUNT(*)                   AS total_count
FROM practice_attempts pa
JOIN keymaps k ON k.id = pa.keymap_id
WHERE pa.user_id    = $1
  AND pa.attempted_at > NOW() - INTERVAL '30 days'
HAVING COUNT(*) >= 3
GROUP BY k.id, k.description, k.lhs, k.category
ORDER BY error_rate DESC
LIMIT 10;
```

**Indexes used**: `idx_attempts_user_date_keymap` — covers the WHERE clause, allows GROUP BY keymap_id without a full scan.
**Expected execution**: < 50ms. For a user with 100 attempts/day × 30 days = 3,000 rows, this is fast with the index.
**N+1 risk**: None. Single query with JOIN.

---

### Query 6: Fetch Keymaps for Practice Session

**Frequency**: Once at session start.
**Expected result size**: 10–30 rows (session length).

```sql
-- For "My Keymaps" mode: fetch random sample of user's keymaps
SELECT id, lhs, mode, description, category
FROM keymaps
WHERE user_id    = $1
  AND deleted_at IS NULL
  AND ($2::text IS NULL OR mode = $2)  -- optional mode filter
ORDER BY RANDOM()
LIMIT $3;
```

**Indexes used**: `idx_keymaps_user_mode` for the WHERE clause. `ORDER BY RANDOM()` with LIMIT is a sequential scan of the filtered set — acceptable when the result set is < 500 rows (typical for user keymaps).
**Expected execution**: < 5ms.
**N+1 risk**: None. Single query. The `lhs` (correct answer) is NOT included — it is fetched per-attempt in Query 2's companion validation query.

---

### Query 7: Check and Unlock Achievements After Session

**Frequency**: Once after each completed session.
**Expected result size**: 0–3 newly unlocked achievements.

The `AchievementService` runs multiple targeted queries. Example for `FIRST_SESSION`:

```sql
-- Already earned?
SELECT 1 FROM user_achievements
WHERE user_id = $1 AND achievement_id = (SELECT id FROM achievements WHERE code = 'FIRST_SESSION');

-- Condition met?
SELECT 1 FROM practice_sessions
WHERE user_id = $1 AND completed_at IS NOT NULL
LIMIT 1;

-- Unlock if not already earned
INSERT INTO user_achievements (user_id, achievement_id, earned_at)
SELECT $1, id, NOW() FROM achievements WHERE code = 'FIRST_SESSION'
ON CONFLICT (user_id, achievement_id) DO NOTHING;
```

**Indexes used**: `idx_user_achievements_user` for earned check; `idx_sessions_user_started` for condition check.
**Total queries**: 2 per achievement × number of unearned achievements (max 10, typical < 5).
**N+1 risk**: Low. Bounded at 10 achievements, each requires at most 2 queries. Total: ≤ 20 queries per session completion.

---

### Query 8: Get User Profile Stats (Aggregated)

**Frequency**: Once per profile page load.
**Expected result size**: 1 row of aggregated data.

```sql
SELECT
    u.current_streak,
    u.longest_streak,
    u.created_at                              AS member_since,
    COUNT(DISTINCT ps.id)                     AS total_sessions,
    COALESCE(SUM(ps.length * ps.avg_response_ms / 1000.0 / 60), 0)
                                              AS total_practice_minutes,
    COALESCE(AVG(ps.accuracy), 0)             AS all_time_accuracy,
    COALESCE(AVG(ps.avg_response_ms), 0)      AS all_time_avg_response_ms,
    COUNT(DISTINCT k.id)                      AS keymaps_imported,
    COUNT(DISTINCT sr.keymap_id)
        FILTER (WHERE sr.correct_attempts::float / NULLIF(sr.total_attempts,0) >= 0.8
                  AND sr.total_attempts >= 5) AS commands_mastered
FROM users u
LEFT JOIN practice_sessions ps ON ps.user_id = u.id AND ps.completed_at IS NOT NULL
LEFT JOIN keymaps k ON k.user_id = u.id AND k.deleted_at IS NULL AND NOT k.is_built_in
LEFT JOIN spaced_repetition_records sr ON sr.user_id = u.id
WHERE u.id = $1
GROUP BY u.id;
```

**Indexes used**: `idx_sessions_user_started`, `idx_keymaps_user_mode`, `idx_srs_user_keymap`.
**Expected execution**: < 50ms. This is a multi-join aggregation but all tables are filtered to a single user_id.
**N+1 risk**: None. Single query.

---

### Query 9: Fetch Flashcard Set for User

**Frequency**: Once per flashcard session start.
**Expected result size**: Up to 50 rows (cards due today).

```sql
-- Cards due for review today (SRS due_date <= NOW())
SELECT
    sr.id,
    sr.keymap_id,
    sr.ease_factor,
    sr.interval,
    sr.due_date,
    k.lhs,
    k.mode,
    k.description,
    k.category
FROM spaced_repetition_records sr
JOIN keymaps k ON k.id = sr.keymap_id
WHERE sr.user_id     = $1
  AND sr.due_date    <= NOW()
  AND k.deleted_at   IS NULL
ORDER BY sr.due_date ASC  -- most overdue first
LIMIT 50;
```

**Indexes used**: `idx_srs_user_due` — covers `user_id + due_date` range scan.
**Expected execution**: < 10ms.
**N+1 risk**: None. Single query with JOIN.

---

### Query 10: Daily Queue Generation Query

**Frequency**: Once per user per UTC day (generated on first dashboard visit of the day).
**Expected result size**: 20 keymap IDs assembled from 3 sub-queries.

**Sub-query A: 10 weakest keymaps (lowest accuracy, last 14 days)**

```sql
SELECT
    pa.keymap_id,
    COUNT(*) FILTER (WHERE NOT pa.is_correct)::FLOAT / NULLIF(COUNT(*), 0) AS error_rate
FROM practice_attempts pa
WHERE pa.user_id     = $1
  AND pa.attempted_at > NOW() - INTERVAL '14 days'
GROUP BY pa.keymap_id
HAVING COUNT(*) >= 2  -- needs at least 2 attempts to measure weakness
ORDER BY error_rate DESC
LIMIT 10;
```

**Indexes used**: `idx_attempts_user_date_keymap`.

**Sub-query B: 5 never-practiced keymaps**

```sql
SELECT k.id
FROM keymaps k
WHERE k.user_id    = $1
  AND k.deleted_at IS NULL
  AND NOT EXISTS (
      SELECT 1 FROM spaced_repetition_records sr
      WHERE sr.user_id   = $1
        AND sr.keymap_id = k.id
  )
ORDER BY RANDOM()
LIMIT 5;
```

**Indexes used**: `idx_keymaps_user_mode` for outer query; `idx_srs_user_keymap` for NOT EXISTS.
**Alternative**: An anti-join (`LEFT JOIN ... WHERE sr.id IS NULL`) is often faster than `NOT EXISTS` at scale, but at MVP user volumes the planner handles both correctly.

**Sub-query C: 5 random from practiced set (excluding A and B)**

```sql
SELECT k.id
FROM keymaps k
WHERE k.user_id    = $1
  AND k.deleted_at IS NULL
  AND k.id != ALL($2::uuid[])  -- exclude already-selected keymaps
  AND EXISTS (
      SELECT 1 FROM spaced_repetition_records sr
      WHERE sr.user_id = $1 AND sr.keymap_id = k.id
  )
ORDER BY RANDOM()
LIMIT 5;
```

The three sub-queries are executed sequentially in Go. The result sets are combined, deduplicated, and the final 20-item ordered array is inserted into `daily_queues` in one INSERT. Total execution: < 100ms.

---

## 5. Migration Strategy

### 5.1 Migration Tool

Tool: `golang-migrate/migrate` (CLI and Go library).
Migration files: Plain SQL in `backend/migrations/`.
Naming convention: `{NNN}_{description}.{up|down}.sql`

```
backend/migrations/
├── 001_initial_schema.up.sql
├── 001_initial_schema.down.sql
├── 002_add_achievements.up.sql
├── 002_add_achievements.down.sql
├── 003_add_settings.up.sql
├── 003_add_settings.down.sql
└── seeds/
    └── seed.sql
```

**File 001_initial_schema.up.sql**: Contains all `CREATE TABLE`, `CREATE INDEX`, and `CREATE UNIQUE INDEX` statements in dependency order: users → keymap_sources → keymaps → practice_sessions → practice_attempts → spaced_repetition_records → achievements → user_achievements → daily_queues → settings.

**File 002_add_achievements.up.sql**: Seeds the 10 achievement definitions (the static data rows).

### 5.2 Migration Execution

**Local development**: Migrations run automatically via Docker Compose's `initdb.d` mechanism on first container start. When the `postgres_data` volume already exists, the initdb scripts are skipped. To reset: `docker-compose down -v && docker-compose up`.

**Production (Cloud Run)**:
Migrations do NOT run automatically on server startup. This prevents parallel migration execution when Cloud Run scales to multiple instances simultaneously.

Instead, migrations run as a one-shot job in the CI/CD pipeline before the new Cloud Run revision is deployed:

```yaml
# .github/workflows/deploy.yml (pseudocode)
jobs:
  deploy:
    steps:
      - name: Run migrations
        run: |
          go run ./cmd/migrate up
          # or: migrate -path ./migrations -database $DATABASE_URL up
      - name: Deploy to Cloud Run
        run: gcloud run deploy ...
```

The migration job uses the production `DATABASE_URL` from a GitHub secret. If the migration fails, the deployment step does not run and the previous version continues serving traffic.

**Down migrations**: Down migrations are written for every up migration, but are only run manually in staging environments. Never run `migrate down` in production — it drops data. Data removal in production always goes through a forward migration (soft delete, column drop with data preservation, etc.).

### 5.3 Zero-Downtime Migration Rules

Follow these rules to avoid locking tables while Cloud Run continues serving traffic:

1. **Adding a nullable column**: Safe — no table lock, no data rewrite.
2. **Adding a NOT NULL column**: Requires a default value in the migration. Two-step: add column with default, then add NOT NULL constraint in a later migration after all rows have the value.
3. **Adding an index**: Use `CREATE INDEX CONCURRENTLY`. Note: `golang-migrate` runs migrations in transactions by default; `CREATE INDEX CONCURRENTLY` cannot run inside a transaction. Use `-- migrate no transaction` annotation in the migration file.
4. **Dropping a column**: Three-step: (1) stop reading the column in code, (2) deploy, (3) then drop the column in a migration.
5. **Renaming a column**: Never rename — add the new column, migrate data, deprecate old column.

### 5.4 Schema Version Tracking

`golang-migrate` stores the applied migration version in a `schema_migrations` table it creates automatically:

```
schema_migrations
├── version (bigint, the migration number)
└── dirty (boolean, true if the last migration failed mid-execution)
```

If `dirty = true`, the deployment halts and requires manual intervention: fix the migration, run `migrate force {version}` to reset the dirty flag, then re-run.

---

## 6. Connection Pooling

### 6.1 Architecture Overview

```
Cloud Run Instance (Go API)
  GORM + pgx driver
  MaxOpenConns: 10 (per instance)
  MaxIdleConns: 5
  ConnMaxLifetime: 300s
        │
        │ (up to 10 connections per instance)
        ▼
Supabase pgBouncer
  Mode: transaction pooling
  Max client connections: 200
  Max server connections: 25 (Supabase Pro limit)
        │
        │ (25 physical connections to PostgreSQL)
        ▼
Supabase PostgreSQL 15
  max_connections: 25 (Pro tier)
```

### 6.2 Pool Size Rationale

**Why 10 MaxOpenConns per Go instance**:

At Cloud Run `max-instances: 10`, the maximum total Go→pgBouncer connections is `10 × 10 = 100`. pgBouncer in transaction mode multiplexes these 100 client connections onto 25 server connections. In transaction mode, a server connection is held only for the duration of a transaction — not the entire HTTP request. For most API requests, the actual transaction time is < 5ms. At 80 concurrent requests per instance (Cloud Run `concurrency: 80`), only a fraction will be simultaneously executing a DB transaction.

**Connection lifetime**: `ConnMaxLifetime: 300s` (5 minutes) forces periodic connection recycling. This prevents the app from holding stale connections after pgBouncer or PostgreSQL restarts.

**Connection timeout**: `ConnMaxIdleTime: 60s` — idle connections are closed after 60 seconds. This reduces the effective pool size during low-traffic periods, avoiding holding server connections unnecessarily.

### 6.3 pgBouncer Configuration Notes

Supabase manages pgBouncer configuration. The key parameters for our use case:

- `pool_mode = transaction` — server connection released after each transaction (best throughput for short transactions)
- `max_client_conn = 200` — supports up to 20 Cloud Run instances at 10 connections each
- `default_pool_size = 25` — matches Supabase Pro's server connection limit

**IMPORTANT — Prepared statements**: pgBouncer in transaction mode does not support prepared statements that span transactions. GORM with pgx driver uses prepared statements by default. Disable them in the connection string:

```
postgres://user:pass@host:5432/dbname?sslmode=require&statement_cache_mode=describe
```

Or disable in GORM's pgx driver config:
```go
dsn := cfg.DatabaseURL + "&default_query_exec_mode=simple_protocol"
```

Using `simple_protocol` disables pgx's prepared statement caching, making it compatible with pgBouncer transaction mode at a minor performance cost (acceptable at our scale).

### 6.4 Local Development Connection

In Docker Compose, the Go API connects directly to PostgreSQL (no pgBouncer):

```
DATABASE_URL=postgres://vimtrainer:vimtrainer_dev@postgres:5432/vimtrainer?sslmode=disable
```

`sslmode=disable` is valid for localhost connections. In production, always use `sslmode=require`.

Prepared statements are enabled in local development (no pgBouncer in the path).

---

## 7. Data Retention and Cleanup

### 7.1 Guest Session Data

Guest sessions expire after 24 hours. A scheduled cleanup job (implemented as a Cron job or Cloud Scheduler trigger) runs daily:

```sql
-- Delete expired guest practice attempts (guest_id not null, session older than 24h)
DELETE FROM practice_attempts
WHERE guest_id IS NOT NULL
  AND attempted_at < NOW() - INTERVAL '24 hours';

-- Delete expired guest SRS records
DELETE FROM spaced_repetition_records
WHERE guest_id IS NOT NULL
  AND last_attempted_at < NOW() - INTERVAL '24 hours';

-- Delete expired guest practice sessions
DELETE FROM practice_sessions
WHERE guest_id IS NOT NULL
  AND started_at < NOW() - INTERVAL '24 hours';
```

This cleanup prevents unbounded growth of guest data. For MVP, this can run as a daily `DELETE` triggered by a Cloud Scheduler → Cloud Run job. Expected volume: small (guest data expires within 24 hours of creation).

### 7.2 Soft Delete Behavior

User accounts and keymaps use soft delete (`deleted_at` column). Hard deletes are not performed immediately. A background job (run weekly) hard-deletes records where `deleted_at < NOW() - INTERVAL '30 days'`, cascading to child records. This provides a 30-day recovery window if a user deletes their account accidentally.

The "Delete Account" flow sets `deleted_at = NOW()` on the user and schedules a confirmation email. After 30 days, the cleanup job purges the record and all related data.
