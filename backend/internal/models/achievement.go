package models

import (
	"time"

	"github.com/google/uuid"
)

type Achievement struct {
	ID             uuid.UUID `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	Slug           string    `gorm:"uniqueIndex;not null" json:"slug"`
	Name           string    `gorm:"not null" json:"name"`
	Description    string    `gorm:"not null" json:"description"`
	Category       string    `gorm:"not null" json:"category"`
	ConditionType  string    `gorm:"not null" json:"condition_type"`
	ConditionValue int       `gorm:"not null" json:"condition_value"`
	CreatedAt      time.Time `json:"created_at"`
}
