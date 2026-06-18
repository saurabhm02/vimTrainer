package models

import (
	"time"

	"github.com/google/uuid"
)

type Keymap struct {
	ID          uuid.UUID  `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	UserID      *uuid.UUID `gorm:"type:uuid;index" json:"user_id"`
	SourceID    *uuid.UUID `gorm:"type:uuid" json:"source_id"`
	KeySequence string     `gorm:"not null" json:"key_sequence"`
	Mode        string     `gorm:"type:char(1);not null" json:"mode"`
	Description string     `gorm:"not null" json:"description"`
	Category    string     `gorm:"not null;default:other" json:"category"`
	Difficulty  string     `gorm:"not null;default:intermediate" json:"difficulty"`
	IsBuiltin   bool       `gorm:"not null;default:false" json:"is_builtin"`
	CreatedAt   time.Time  `json:"created_at"`
}
