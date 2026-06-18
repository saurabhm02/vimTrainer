package repository

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/vimtrainer/api/internal/models"
)

type UserRepository interface {
	Create(ctx context.Context, user *models.User) error
	FindByID(ctx context.Context, id uuid.UUID) (*models.User, error)
	FindByEmail(ctx context.Context, email string) (*models.User, error)
	FindByGuestToken(ctx context.Context, token string) (*models.User, error)
	Update(ctx context.Context, user *models.User) error
	SoftDelete(ctx context.Context, id uuid.UUID) error
}

type KeymapFilters struct {
	Mode           string
	Category       string
	SourceID       *uuid.UUID
	Search         string
	IncludeBuiltin bool
	Limit          int
	Cursor         string
}

type KeymapRepository interface {
	Create(ctx context.Context, keymap *models.Keymap) error
	CreateBatch(ctx context.Context, keymaps []models.Keymap) error
	FindByUserID(ctx context.Context, userID uuid.UUID, filters KeymapFilters) ([]models.Keymap, string, error)
	FindBuiltin(ctx context.Context, category, mode string) ([]models.Keymap, error)
	FindByID(ctx context.Context, id uuid.UUID) (*models.Keymap, error)
	Delete(ctx context.Context, id uuid.UUID) error
}

type KeymapSourceRepository interface {
	Create(ctx context.Context, source *models.KeymapSource) error
	FindByUserID(ctx context.Context, userID uuid.UUID) ([]models.KeymapSource, error)
	FindByID(ctx context.Context, id uuid.UUID) (*models.KeymapSource, error)
	Delete(ctx context.Context, id uuid.UUID) error
}

type SessionRepository interface {
	Create(ctx context.Context, session *models.PracticeSession) error
	FindByID(ctx context.Context, id uuid.UUID) (*models.PracticeSession, error)
	Update(ctx context.Context, session *models.PracticeSession) error
	CreateAttempt(ctx context.Context, attempt *models.PracticeAttempt) error
	GetDailyQueue(ctx context.Context, userID uuid.UUID, date time.Time) (*models.DailyQueue, error)
	CreateDailyQueue(ctx context.Context, queue *models.DailyQueue) error
}

type SRSRepository interface {
	FindOrCreate(ctx context.Context, userID, keymapID uuid.UUID) (*models.SpacedRepetitionRecord, error)
	Update(ctx context.Context, record *models.SpacedRepetitionRecord) error
	FindWeakest(ctx context.Context, userID uuid.UUID, limit int) ([]models.SpacedRepetitionRecord, error)
	FindUnpracticed(ctx context.Context, userID uuid.UUID, limit int) ([]models.Keymap, error)
	FindDue(ctx context.Context, userID uuid.UUID) ([]models.SpacedRepetitionRecord, error)
}

type AchievementRepository interface {
	FindAll(ctx context.Context) ([]models.Achievement, error)
	FindUnlocked(ctx context.Context, userID uuid.UUID) ([]models.UserAchievement, error)
	Unlock(ctx context.Context, userID, achievementID uuid.UUID) error
}

type SettingsRepository interface {
	FindByUserID(ctx context.Context, userID uuid.UUID) (*models.Settings, error)
	CreateDefault(ctx context.Context, userID uuid.UUID) (*models.Settings, error)
	Update(ctx context.Context, settings *models.Settings) error
}
