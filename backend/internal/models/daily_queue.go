package models

import (
	"time"

	"github.com/google/uuid"
	"github.com/lib/pq"
)

type DailyQueue struct {
	ID        uuid.UUID      `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	UserID    uuid.UUID      `gorm:"type:uuid;not null;uniqueIndex:uq_daily_queue_user_date" json:"user_id"`
	QueueDate time.Time      `gorm:"type:date;not null;uniqueIndex:uq_daily_queue_user_date" json:"queue_date"`
	KeymapIDs pq.StringArray `gorm:"type:uuid[];not null" json:"keymap_ids"`
	Completed bool           `gorm:"not null;default:false" json:"completed"`
	CreatedAt time.Time      `json:"created_at"`
}
