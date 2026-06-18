package handlers

import (
	"crypto/sha256"
	"encoding/hex"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type AnalyticsHandler struct {
	db *gorm.DB
}

func NewAnalyticsHandler(db *gorm.DB) *AnalyticsHandler {
	return &AnalyticsHandler{db: db}
}

func (h *AnalyticsHandler) TrackVisit(c *gin.Context) {
	var req struct {
		Path string `json:"path"`
	}
	_ = c.ShouldBindJSON(&req)
	if req.Path == "" {
		req.Path = c.Request.URL.Path
	}

	ip := c.ClientIP()
	userAgent := c.GetHeader("User-Agent")
	hash := sha256.Sum256([]byte(ip))
	ipHash := hex.EncodeToString(hash[:])

	var userID *uuid.UUID
	if v, ok := c.Get("userID"); ok {
		if parsed, ok := v.(uuid.UUID); ok {
			userID = &parsed
		}
	}

	// Best effort tracking; do not fail user request flow.
	_ = h.db.WithContext(c.Request.Context()).Exec(`
		INSERT INTO site_visits (visit_date, ip_hash, user_id, path, user_agent)
		VALUES (CURRENT_DATE, ?, ?, ?, ?)
		ON CONFLICT (visit_date, ip_hash, path) DO NOTHING
	`, ipHash, userID, req.Path, userAgent).Error

	c.JSON(http.StatusOK, gin.H{"data": gin.H{"tracked": true}, "meta": gin.H{}, "error": nil})
}

func (h *AnalyticsHandler) TodayTraffic(c *gin.Context) {
	var stats struct {
		UniqueVisitors int `json:"unique_visitors"`
		UniqueUsers    int `json:"unique_users"`
		TotalHits      int `json:"total_hits"`
	}

	h.db.WithContext(c.Request.Context()).Raw(`
		SELECT
			COUNT(DISTINCT ip_hash) AS unique_visitors,
			COUNT(DISTINCT user_id) AS unique_users,
			COUNT(*) AS total_hits
		FROM site_visits
		WHERE visit_date = CURRENT_DATE
	`).Scan(&stats)

	c.JSON(http.StatusOK, gin.H{"data": stats, "meta": gin.H{}, "error": nil})
}

func (h *AnalyticsHandler) Overview(c *gin.Context) {
	userID := c.MustGet("userID").(uuid.UUID)

	var overview struct {
		TotalSessions  int     `json:"total_sessions"`
		AccuracyRate   float64 `json:"accuracy_rate"`
		AvgResponseMs  float64 `json:"avg_response_ms"`
		CurrentStreak  int     `json:"current_streak"`
		LongestStreak  int     `json:"longest_streak"`
		TotalPracticed int     `json:"total_keymaps_practiced"`
	}

	h.db.WithContext(c.Request.Context()).Raw(`
		SELECT
			COUNT(DISTINCT ps.id) as total_sessions,
			COALESCE(AVG(CASE WHEN pa.is_correct THEN 1.0 ELSE 0.0 END) * 100, 0) as accuracy_rate,
			COALESCE(AVG(pa.response_ms), 0) as avg_response_ms
		FROM practice_sessions ps
		LEFT JOIN practice_attempts pa ON pa.session_id = ps.id
		WHERE ps.user_id = ? AND ps.status = 'completed'
	`, userID).Scan(&overview)

	var streaks struct {
		CurrentStreak int `json:"current_streak"`
		LongestStreak int `json:"longest_streak"`
	}
	h.db.WithContext(c.Request.Context()).Raw(`
		SELECT current_streak, longest_streak FROM users WHERE id = ?
	`, userID).Scan(&streaks)
	overview.CurrentStreak = streaks.CurrentStreak
	overview.LongestStreak = streaks.LongestStreak

	var practiced struct {
		Count int
	}
	h.db.WithContext(c.Request.Context()).Raw(`
		SELECT COUNT(DISTINCT keymap_id) as count FROM spaced_repetition_records WHERE user_id = ?
	`, userID).Scan(&practiced)
	overview.TotalPracticed = practiced.Count

	c.JSON(http.StatusOK, gin.H{"data": overview, "meta": gin.H{}, "error": nil})
}

func (h *AnalyticsHandler) Accuracy(c *gin.Context) {
	userID := c.MustGet("userID").(uuid.UUID)

	var rows []struct {
		KeymapID     string  `json:"keymap_id"`
		KeySequence  string  `json:"key_sequence"`
		Description  string  `json:"description"`
		TotalCount   int     `json:"total_count"`
		CorrectCount int     `json:"correct_count"`
		AccuracyRate float64 `json:"accuracy_rate"`
	}

	h.db.WithContext(c.Request.Context()).Raw(`
		SELECT 
			pa.keymap_id::text,
			k.key_sequence,
			k.description,
			COUNT(*) as total_count,
			SUM(CASE WHEN pa.is_correct THEN 1 ELSE 0 END) as correct_count,
			COALESCE(AVG(CASE WHEN pa.is_correct THEN 1.0 ELSE 0.0 END) * 100, 0) as accuracy_rate
		FROM practice_attempts pa
		JOIN keymaps k ON k.id = pa.keymap_id
		WHERE pa.user_id = ?
		GROUP BY pa.keymap_id, k.key_sequence, k.description
		ORDER BY accuracy_rate ASC
		LIMIT 100
	`, userID).Scan(&rows)

	c.JSON(http.StatusOK, gin.H{"data": rows, "meta": gin.H{}, "error": nil})
}

func (h *AnalyticsHandler) Sessions(c *gin.Context) {
	userID := c.MustGet("userID").(uuid.UUID)

	var sessions []struct {
		ID                  string     `json:"id"`
		Mode                string     `json:"mode"`
		Status              string     `json:"status"`
		TotalChallenges     int        `json:"total_challenges"`
		CompletedChallenges int        `json:"completed_challenges"`
		CorrectCount        int        `json:"correct_count"`
		AvgResponseMs       *int       `json:"avg_response_ms"`
		StartedAt           time.Time  `json:"started_at"`
		CompletedAt         *time.Time `json:"completed_at"`
	}

	h.db.WithContext(c.Request.Context()).Raw(`
		SELECT id::text, mode, status, total_challenges, completed_challenges, correct_count, avg_response_ms, started_at, completed_at
		FROM practice_sessions
		WHERE user_id = ?
		ORDER BY started_at DESC
		LIMIT 30
	`, userID).Scan(&sessions)

	c.JSON(http.StatusOK, gin.H{"data": sessions, "meta": gin.H{}, "error": nil})
}

func (h *AnalyticsHandler) Heatmap(c *gin.Context) {
	userID := c.MustGet("userID").(uuid.UUID)

	var rows []struct {
		Date  string `json:"date"`
		Count int    `json:"count"`
	}

	since := time.Now().AddDate(0, 0, -90)
	h.db.WithContext(c.Request.Context()).Raw(`
		SELECT 
			DATE(started_at) as date,
			COUNT(*) as count
		FROM practice_sessions
		WHERE user_id = ? AND started_at >= ? AND status = 'completed'
		GROUP BY DATE(started_at)
		ORDER BY date ASC
	`, userID, since).Scan(&rows)

	c.JSON(http.StatusOK, gin.H{"data": rows, "meta": gin.H{}, "error": nil})
}

func (h *AnalyticsHandler) Progress(c *gin.Context) {
	userID := c.MustGet("userID").(uuid.UUID)

	var rows []struct {
		Bucket string `json:"bucket"`
		Count  int    `json:"count"`
	}

	h.db.WithContext(c.Request.Context()).Raw(`
		SELECT 
			CASE
				WHEN ease_factor < 1.5 THEN 'struggling'
				WHEN ease_factor < 2.0 THEN 'learning'
				WHEN ease_factor < 2.5 THEN 'familiar'
				WHEN ease_factor < 3.0 THEN 'proficient'
				ELSE 'mastered'
			END as bucket,
			COUNT(*) as count
		FROM spaced_repetition_records
		WHERE user_id = ?
		GROUP BY bucket
		ORDER BY MIN(ease_factor)
	`, userID).Scan(&rows)

	c.JSON(http.StatusOK, gin.H{"data": rows, "meta": gin.H{}, "error": nil})
}
