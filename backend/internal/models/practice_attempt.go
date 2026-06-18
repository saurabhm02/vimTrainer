package models

import (
	"time"

	"github.com/google/uuid"
)

type PracticeAttempt struct {
	ID            uuid.UUID `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	SessionID     uuid.UUID `gorm:"type:uuid;not null;index" json:"session_id"`
	UserID        uuid.UUID `gorm:"type:uuid;not null;index" json:"user_id"`
	KeymapID      uuid.UUID `gorm:"type:uuid;not null;index" json:"keymap_id"`
	TypedSequence string    `gorm:"not null" json:"typed_sequence"`
	IsCorrect     bool      `gorm:"not null" json:"is_correct"`
	ResponseMs    int       `gorm:"not null" json:"response_ms"`
	AttemptNumber int       `gorm:"not null;default:1" json:"attempt_number"`
	CreatedAt     time.Time `json:"created_at"`
}
