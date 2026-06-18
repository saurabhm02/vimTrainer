package postgres

import (
	"context"
	"errors"
	"time"

	"github.com/google/uuid"
	"github.com/vimtrainer/api/internal/models"
	"gorm.io/gorm"
)

type SessionRepository struct {
	db *gorm.DB
}

func NewSessionRepository(db *gorm.DB) *SessionRepository {
	return &SessionRepository{db: db}
}

func (r *SessionRepository) Create(ctx context.Context, session *models.PracticeSession) error {
	return r.db.WithContext(ctx).Create(session).Error
}

func (r *SessionRepository) FindByID(ctx context.Context, id uuid.UUID) (*models.PracticeSession, error) {
	var session models.PracticeSession
	err := r.db.WithContext(ctx).First(&session, "id = ?", id).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, nil
	}
	return &session, err
}

func (r *SessionRepository) Update(ctx context.Context, session *models.PracticeSession) error {
	return r.db.WithContext(ctx).Save(session).Error
}

func (r *SessionRepository) CreateAttempt(ctx context.Context, attempt *models.PracticeAttempt) error {
	return r.db.WithContext(ctx).Create(attempt).Error
}

func (r *SessionRepository) GetDailyQueue(ctx context.Context, userID uuid.UUID, date time.Time) (*models.DailyQueue, error) {
	var queue models.DailyQueue
	dateStr := date.Format("2006-01-02")
	err := r.db.WithContext(ctx).
		Where("user_id = ? AND queue_date::date = ?::date", userID, dateStr).
		First(&queue).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, nil
	}
	return &queue, err
}

func (r *SessionRepository) CreateDailyQueue(ctx context.Context, queue *models.DailyQueue) error {
	return r.db.WithContext(ctx).Create(queue).Error
}
