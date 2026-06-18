package postgres

import (
	"context"
	"errors"

	"github.com/google/uuid"
	"github.com/vimtrainer/api/internal/models"
	"gorm.io/gorm"
)

type SettingsRepository struct {
	db *gorm.DB
}

func NewSettingsRepository(db *gorm.DB) *SettingsRepository {
	return &SettingsRepository{db: db}
}

func (r *SettingsRepository) FindByUserID(ctx context.Context, userID uuid.UUID) (*models.Settings, error) {
	var settings models.Settings
	err := r.db.WithContext(ctx).First(&settings, "user_id = ?", userID).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, nil
	}
	return &settings, err
}

func (r *SettingsRepository) CreateDefault(ctx context.Context, userID uuid.UUID) (*models.Settings, error) {
	settings := &models.Settings{
		UserID:         userID,
		Theme:          "dark",
		SessionLength:  20,
		PracticeSounds: true,
		ShowKeyHints:   true,
		ReducedMotion:  false,
	}
	err := r.db.WithContext(ctx).Create(settings).Error
	return settings, err
}

func (r *SettingsRepository) Update(ctx context.Context, settings *models.Settings) error {
	return r.db.WithContext(ctx).Save(settings).Error
}
