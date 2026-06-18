package models

import (
	"time"

	"github.com/google/uuid"
)

type UserAchievement struct {
	ID            uuid.UUID `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	UserID        uuid.UUID `gorm:"type:uuid;not null;uniqueIndex:uq_user_achievement" json:"user_id"`
	AchievementID uuid.UUID `gorm:"type:uuid;not null;uniqueIndex:uq_user_achievement" json:"achievement_id"`
	UnlockedAt    time.Time `gorm:"not null" json:"unlocked_at"`
}
