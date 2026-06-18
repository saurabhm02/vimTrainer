package postgres

import (
	"context"
	"errors"

	"github.com/google/uuid"
	"github.com/vimtrainer/api/internal/models"
	"gorm.io/gorm"
)

type KeymapSourceRepository struct {
	db *gorm.DB
}

func NewKeymapSourceRepository(db *gorm.DB) *KeymapSourceRepository {
	return &KeymapSourceRepository{db: db}
}

func (r *KeymapSourceRepository) Create(ctx context.Context, source *models.KeymapSource) error {
	return r.db.WithContext(ctx).Create(source).Error
}

func (r *KeymapSourceRepository) FindByUserID(ctx context.Context, userID uuid.UUID) ([]models.KeymapSource, error) {
	var sources []models.KeymapSource
	err := r.db.WithContext(ctx).Where("user_id = ?", userID).Order("parsed_at DESC").Find(&sources).Error
	return sources, err
}

func (r *KeymapSourceRepository) FindByID(ctx context.Context, id uuid.UUID) (*models.KeymapSource, error) {
	var source models.KeymapSource
	err := r.db.WithContext(ctx).First(&source, "id = ?", id).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, nil
	}
	return &source, err
}

func (r *KeymapSourceRepository) Delete(ctx context.Context, id uuid.UUID) error {
	return r.db.WithContext(ctx).Delete(&models.KeymapSource{}, "id = ?", id).Error
}
