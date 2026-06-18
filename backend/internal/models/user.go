package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type User struct {
	ID             uuid.UUID      `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	Email          *string        `gorm:"uniqueIndex" json:"email"`
	PasswordHash   *string        `gorm:"->" json:"-"`
	DisplayName    string         `gorm:"not null" json:"display_name"`
	IsGuest        bool           `gorm:"not null;default:false" json:"is_guest"`
	GuestToken     *string        `gorm:"uniqueIndex" json:"-"`
	CurrentStreak  int            `gorm:"not null;default:0" json:"current_streak"`
	LongestStreak  int            `gorm:"not null;default:0" json:"longest_streak"`
	LastActiveDate *time.Time     `gorm:"type:date" json:"last_active_date"`
	DeletedAt      gorm.DeletedAt `gorm:"index" json:"-"`
	CreatedAt      time.Time      `json:"created_at"`
	UpdatedAt      time.Time      `json:"updated_at"`
}
