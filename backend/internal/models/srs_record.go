package models

import (
	"time"

	"github.com/google/uuid"
)

type SpacedRepetitionRecord struct {
	ID             uuid.UUID  `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	UserID         uuid.UUID  `gorm:"type:uuid;not null;uniqueIndex:uq_srs_user_keymap" json:"user_id"`
	KeymapID       uuid.UUID  `gorm:"type:uuid;not null;uniqueIndex:uq_srs_user_keymap" json:"keymap_id"`
	EaseFactor     float64    `gorm:"type:numeric(4,2);not null;default:2.50" json:"ease_factor"`
	IntervalDays   int        `gorm:"not null;default:1" json:"interval_days"`
	Repetitions    int        `gorm:"not null;default:0" json:"repetitions"`
	NextReviewAt   time.Time  `gorm:"not null;default:now()" json:"next_review_at"`
	LastReviewedAt *time.Time `json:"last_reviewed_at"`
	CorrectReviews int        `gorm:"not null;default:0" json:"correct_reviews"`
	TotalReviews   int        `gorm:"not null;default:0" json:"total_reviews"`
	AvgResponseMs  *int       `json:"avg_response_ms"`
	CreatedAt      time.Time  `json:"created_at"`
	UpdatedAt      time.Time  `json:"updated_at"`
}
