package postgres

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/vimtrainer/api/internal/models"
	"github.com/vimtrainer/api/internal/repository"
	"gorm.io/gorm"
)

type KeymapRepository struct {
	db *gorm.DB
}

func NewKeymapRepository(db *gorm.DB) *KeymapRepository {
	return &KeymapRepository{db: db}
}

func (r *KeymapRepository) Create(ctx context.Context, keymap *models.Keymap) error {
	return r.db.WithContext(ctx).Create(keymap).Error
}

func (r *KeymapRepository) CreateBatch(ctx context.Context, keymaps []models.Keymap) error {
	if len(keymaps) == 0 {
		return nil
	}
	return r.db.WithContext(ctx).CreateInBatches(keymaps, 100).Error
}

type cursorData struct {
	CreatedAt time.Time `json:"ca"`
	ID        uuid.UUID `json:"id"`
}

func encodeCursor(createdAt time.Time, id uuid.UUID) string {
	data, _ := json.Marshal(cursorData{CreatedAt: createdAt, ID: id})
	return base64.StdEncoding.EncodeToString(data)
}

func decodeCursor(cursor string) (*cursorData, error) {
	data, err := base64.StdEncoding.DecodeString(cursor)
	if err != nil {
		return nil, err
	}
	var cd cursorData
	if err := json.Unmarshal(data, &cd); err != nil {
		return nil, err
	}
	return &cd, nil
}

func (r *KeymapRepository) FindByUserID(ctx context.Context, userID uuid.UUID, filters repository.KeymapFilters) ([]models.Keymap, string, error) {
	limit := filters.Limit
	if limit <= 0 {
		limit = 50
	}

	query := r.db.WithContext(ctx).Where("(user_id = ? OR is_builtin = true)", userID)

	if !filters.IncludeBuiltin {
		query = query.Where("user_id = ?", userID)
	}
	if filters.Mode != "" {
		query = query.Where("mode = ?", filters.Mode)
	}
	if filters.Category != "" {
		query = query.Where("category = ?", filters.Category)
	}
	if filters.SourceID != nil {
		query = query.Where("source_id = ?", filters.SourceID)
	}
	if filters.Search != "" {
		pattern := fmt.Sprintf("%%%s%%", filters.Search)
		query = query.Where("key_sequence ILIKE ? OR description ILIKE ?", pattern, pattern)
	}
	if filters.Cursor != "" {
		cd, err := decodeCursor(filters.Cursor)
		if err == nil {
			query = query.Where("(created_at, id) < (?, ?)", cd.CreatedAt, cd.ID)
		}
	}

	var keymaps []models.Keymap
	err := query.Order("created_at DESC, id DESC").Limit(limit + 1).Find(&keymaps).Error
	if err != nil {
		return nil, "", err
	}

	var nextCursor string
	if len(keymaps) > limit {
		last := keymaps[limit-1]
		nextCursor = encodeCursor(last.CreatedAt, last.ID)
		keymaps = keymaps[:limit]
	}

	return keymaps, nextCursor, nil
}

func (r *KeymapRepository) FindBuiltin(ctx context.Context, category, mode string) ([]models.Keymap, error) {
	query := r.db.WithContext(ctx).Where("is_builtin = true")
	if category != "" {
		query = query.Where("category = ?", category)
	}
	if mode != "" {
		query = query.Where("mode = ?", mode)
	}
	var keymaps []models.Keymap
	err := query.Find(&keymaps).Error
	return keymaps, err
}

func (r *KeymapRepository) FindByID(ctx context.Context, id uuid.UUID) (*models.Keymap, error) {
	var keymap models.Keymap
	err := r.db.WithContext(ctx).First(&keymap, "id = ?", id).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, nil
	}
	return &keymap, err
}

func (r *KeymapRepository) Delete(ctx context.Context, id uuid.UUID) error {
	return r.db.WithContext(ctx).Delete(&models.Keymap{}, "id = ?", id).Error
}
