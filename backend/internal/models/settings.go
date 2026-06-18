package models

import (
	"time"

	"github.com/google/uuid"
)

type Settings struct {
	ID             uuid.UUID `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	UserID         uuid.UUID `gorm:"type:uuid;not null;uniqueIndex" json:"user_id"`
	Theme          string    `gorm:"not null;default:dark" json:"theme"`
	SessionLength  int       `gorm:"not null;default:20" json:"session_length"`
	PracticeSounds bool      `gorm:"not null;default:true" json:"practice_sounds"`
	ShowKeyHints   bool      `gorm:"not null;default:true" json:"show_key_hints"`
	ReducedMotion  bool      `gorm:"not null;default:false" json:"reduced_motion"`
	CreatedAt      time.Time `json:"created_at"`
	UpdatedAt      time.Time `json:"updated_at"`
}
