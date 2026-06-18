package postgres

import (
	"context"

	"github.com/google/uuid"
	"github.com/vimtrainer/api/internal/models"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type AchievementRepository struct {
	db *gorm.DB
}

func NewAchievementRepository(db *gorm.DB) *AchievementRepository {
	return &AchievementRepository{db: db}
}

func (r *AchievementRepository) FindAll(ctx context.Context) ([]models.Achievement, error) {
	var achievements []models.Achievement
	err := r.db.WithContext(ctx).Order("category, name").Find(&achievements).Error
	return achievements, err
}

func (r *AchievementRepository) FindUnlocked(ctx context.Context, userID uuid.UUID) ([]models.UserAchievement, error) {
	var unlocked []models.UserAchievement
	err := r.db.WithContext(ctx).Where("user_id = ?", userID).Find(&unlocked).Error
	return unlocked, err
}

func (r *AchievementRepository) Unlock(ctx context.Context, userID, achievementID uuid.UUID) error {
	ua := models.UserAchievement{
		UserID:        userID,
		AchievementID: achievementID,
	}
	return r.db.WithContext(ctx).
		Clauses(clause.OnConflict{DoNothing: true}).
		Create(&ua).Error
}
