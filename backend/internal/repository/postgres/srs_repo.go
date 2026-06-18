package postgres

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/vimtrainer/api/internal/models"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type SRSRepository struct {
	db *gorm.DB
}

func NewSRSRepository(db *gorm.DB) *SRSRepository {
	return &SRSRepository{db: db}
}

func (r *SRSRepository) FindOrCreate(ctx context.Context, userID, keymapID uuid.UUID) (*models.SpacedRepetitionRecord, error) {
	record := models.SpacedRepetitionRecord{
		UserID:   userID,
		KeymapID: keymapID,
	}
	err := r.db.WithContext(ctx).
		Where(models.SpacedRepetitionRecord{UserID: userID, KeymapID: keymapID}).
		Attrs(models.SpacedRepetitionRecord{
			EaseFactor:   2.50,
			IntervalDays: 1,
			NextReviewAt: time.Now(),
		}).
		FirstOrCreate(&record).Error
	return &record, err
}

func (r *SRSRepository) Update(ctx context.Context, record *models.SpacedRepetitionRecord) error {
	return r.db.WithContext(ctx).Omit(clause.Associations).Save(record).Error
}

func (r *SRSRepository) FindWeakest(ctx context.Context, userID uuid.UUID, limit int) ([]models.SpacedRepetitionRecord, error) {
	var records []models.SpacedRepetitionRecord
	err := r.db.WithContext(ctx).
		Where("user_id = ?", userID).
		Order("ease_factor ASC, total_reviews DESC").
		Limit(limit).
		Find(&records).Error
	return records, err
}

func (r *SRSRepository) FindUnpracticed(ctx context.Context, userID uuid.UUID, limit int) ([]models.Keymap, error) {
	var keymaps []models.Keymap
	err := r.db.WithContext(ctx).
		Where(`id NOT IN (
			SELECT keymap_id FROM spaced_repetition_records WHERE user_id = ?
		) AND (user_id = ? OR is_builtin = true)`, userID, userID).
		Order("RANDOM()").
		Limit(limit).
		Find(&keymaps).Error
	return keymaps, err
}

func (r *SRSRepository) FindDue(ctx context.Context, userID uuid.UUID) ([]models.SpacedRepetitionRecord, error) {
	var records []models.SpacedRepetitionRecord
	err := r.db.WithContext(ctx).
		Where("user_id = ? AND next_review_at <= ?", userID, time.Now()).
		Order("next_review_at ASC").
		Find(&records).Error
	return records, err
}
