package models

import (
	"time"

	"github.com/google/uuid"
)

type KeymapSource struct {
	ID         uuid.UUID `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	UserID     uuid.UUID `gorm:"type:uuid;not null;index" json:"user_id"`
	SourceType string    `gorm:"not null" json:"source_type"`
	SourceName string    `gorm:"not null" json:"source_name"`
	GithubURL  *string   `json:"github_url"`
	ParsedAt   time.Time `gorm:"not null" json:"parsed_at"`
}
