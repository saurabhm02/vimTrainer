CREATE TABLE IF NOT EXISTS site_visits (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    visit_date  DATE NOT NULL DEFAULT CURRENT_DATE,
    ip_hash     TEXT NOT NULL,
    user_id     UUID REFERENCES users(id) ON DELETE SET NULL,
    path        TEXT NOT NULL DEFAULT '/',
    user_agent  TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_site_visits_daily_ip_path
    ON site_visits (visit_date, ip_hash, path);

CREATE INDEX IF NOT EXISTS idx_site_visits_date ON site_visits (visit_date);
CREATE INDEX IF NOT EXISTS idx_site_visits_user ON site_visits (user_id);
