CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS users (
    id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    email         TEXT        UNIQUE,
    password_hash TEXT,
    display_name  TEXT        NOT NULL DEFAULT 'vim_user',
    is_guest      BOOLEAN     NOT NULL DEFAULT FALSE,
    guest_token   TEXT        UNIQUE,
    current_streak INT        NOT NULL DEFAULT 0,
    longest_streak INT        NOT NULL DEFAULT 0,
    last_active_date DATE,
    deleted_at    TIMESTAMPTZ,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_user_identity CHECK (
        (is_guest = FALSE AND email IS NOT NULL AND password_hash IS NOT NULL AND guest_token IS NULL)
        OR
        (is_guest = TRUE AND email IS NULL AND password_hash IS NULL AND guest_token IS NOT NULL)
    )
);

CREATE TABLE IF NOT EXISTS keymap_sources (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    source_type TEXT NOT NULL CHECK (source_type IN ('file_upload','github_import','builtin')),
    source_name TEXT NOT NULL,
    github_url  TEXT,
    parsed_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS keymaps (
    id             UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id        UUID    REFERENCES users(id) ON DELETE CASCADE,
    source_id      UUID    REFERENCES keymap_sources(id) ON DELETE SET NULL,
    key_sequence   TEXT    NOT NULL,
    mode           CHAR(1) NOT NULL CHECK (mode IN ('n','i','v','x','o','t','c')),
    description    TEXT    NOT NULL,
    category       TEXT    NOT NULL DEFAULT 'other' CHECK (category IN ('motion','leader','lsp','navigation','editing','plugin','other')),
    difficulty     TEXT    NOT NULL DEFAULT 'intermediate' CHECK (difficulty IN ('beginner','intermediate','advanced')),
    is_builtin     BOOLEAN NOT NULL DEFAULT FALSE,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_keymaps_user_key_mode
    ON keymaps (user_id, key_sequence, mode)
    WHERE user_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS practice_sessions (
    id                    UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id               UUID    NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    mode                  TEXT    NOT NULL CHECK (mode IN ('practice','motion','leader','flashcard')),
    status                TEXT    NOT NULL DEFAULT 'active' CHECK (status IN ('active','completed','abandoned')),
    keymap_ids            UUID[]  NOT NULL DEFAULT '{}',
    total_challenges      INT     NOT NULL DEFAULT 0,
    completed_challenges  INT     NOT NULL DEFAULT 0,
    correct_count         INT     NOT NULL DEFAULT 0,
    avg_response_ms       INT,
    started_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at          TIMESTAMPTZ,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS practice_attempts (
    id             UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id     UUID    NOT NULL REFERENCES practice_sessions(id) ON DELETE CASCADE,
    user_id        UUID    NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    keymap_id      UUID    NOT NULL REFERENCES keymaps(id) ON DELETE CASCADE,
    typed_sequence TEXT    NOT NULL,
    is_correct     BOOLEAN NOT NULL,
    response_ms    INT     NOT NULL CHECK (response_ms >= 0),
    attempt_number INT     NOT NULL DEFAULT 1,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS spaced_repetition_records (
    id               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id          UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    keymap_id        UUID         NOT NULL REFERENCES keymaps(id) ON DELETE CASCADE,
    ease_factor      NUMERIC(4,2) NOT NULL DEFAULT 2.50 CHECK (ease_factor >= 1.30 AND ease_factor <= 2.50),
    interval_days    INT          NOT NULL DEFAULT 1 CHECK (interval_days >= 1),
    repetitions      INT          NOT NULL DEFAULT 0,
    next_review_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    last_reviewed_at TIMESTAMPTZ,
    correct_reviews  INT          NOT NULL DEFAULT 0,
    total_reviews    INT          NOT NULL DEFAULT 0,
    avg_response_ms  INT,
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_srs_user_keymap UNIQUE (user_id, keymap_id)
);

CREATE TABLE IF NOT EXISTS achievements (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug            TEXT NOT NULL UNIQUE,
    name            TEXT NOT NULL,
    description     TEXT NOT NULL,
    category        TEXT NOT NULL CHECK (category IN ('practice','mastery','streak','import')),
    condition_type  TEXT NOT NULL,
    condition_value INT  NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_achievements (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    achievement_id UUID NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
    unlocked_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, achievement_id)
);

CREATE TABLE IF NOT EXISTS daily_queues (
    id          UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID    NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    queue_date  DATE    NOT NULL DEFAULT CURRENT_DATE,
    keymap_ids  UUID[]  NOT NULL DEFAULT '{}',
    completed   BOOLEAN NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_daily_queue_user_date UNIQUE (user_id, queue_date)
);

CREATE TABLE IF NOT EXISTS settings (
    id              UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID    NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    theme           TEXT    NOT NULL DEFAULT 'dark' CHECK (theme IN ('dark','light','system')),
    session_length  INT     NOT NULL DEFAULT 20 CHECK (session_length IN (10, 20, 30)),
    practice_sounds BOOLEAN NOT NULL DEFAULT TRUE,
    show_key_hints  BOOLEAN NOT NULL DEFAULT TRUE,
    reduced_motion  BOOLEAN NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_keymaps_user_category ON keymaps (user_id, category);
CREATE INDEX IF NOT EXISTS idx_keymaps_builtin ON keymaps (is_builtin) WHERE is_builtin = TRUE;
CREATE INDEX IF NOT EXISTS idx_sessions_user_created ON practice_sessions (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_attempts_session ON practice_attempts (session_id);
CREATE INDEX IF NOT EXISTS idx_attempts_keymap_user ON practice_attempts (keymap_id, user_id);
CREATE INDEX IF NOT EXISTS idx_srs_user_next_review ON spaced_repetition_records (user_id, next_review_at);
CREATE INDEX IF NOT EXISTS idx_srs_user_ease ON spaced_repetition_records (user_id, ease_factor ASC);
