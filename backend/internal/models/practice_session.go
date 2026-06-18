package models

import (
	"time"

	"github.com/google/uuid"
	"github.com/lib/pq"
)

type PracticeSession struct {
	ID                  uuid.UUID      `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	UserID              uuid.UUID      `gorm:"type:uuid;not null;index" json:"user_id"`
	Mode                string         `gorm:"not null" json:"mode"`
	Status              string         `gorm:"not null;default:active" json:"status"`
	KeymapIDs           pq.StringArray `gorm:"type:uuid[];not null" json:"keymap_ids"`
	TotalChallenges     int            `gorm:"not null;default:0" json:"total_challenges"`
	CompletedChallenges int            `gorm:"not null;default:0" json:"completed_challenges"`
	CorrectCount        int            `gorm:"not null;default:0" json:"correct_count"`
	AvgResponseMs       *int           `json:"avg_response_ms"`
	StartedAt           time.Time      `gorm:"not null" json:"started_at"`
	CompletedAt         *time.Time     `json:"completed_at"`
	CreatedAt           time.Time      `json:"created_at"`
}
