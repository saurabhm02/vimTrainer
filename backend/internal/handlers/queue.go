package handlers

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/lib/pq"
	"github.com/vimtrainer/api/internal/models"
	"github.com/vimtrainer/api/internal/repository"
)

type QueueHandler struct {
	sessionRepo repository.SessionRepository
	srsRepo     repository.SRSRepository
	keymapRepo  repository.KeymapRepository
}

func NewQueueHandler(sessionRepo repository.SessionRepository, srsRepo repository.SRSRepository, keymapRepo repository.KeymapRepository) *QueueHandler {
	return &QueueHandler{sessionRepo: sessionRepo, srsRepo: srsRepo, keymapRepo: keymapRepo}
}

const dailyQueueSize = 20

func (h *QueueHandler) GetToday(c *gin.Context) {
	userID := c.MustGet("userID").(uuid.UUID)
	today := time.Now().Truncate(24 * time.Hour)

	queue, err := h.sessionRepo.GetDailyQueue(c.Request.Context(), userID, today)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"code": "INTERNAL_ERROR", "message": "failed to get queue"}, "data": nil, "meta": gin.H{}})
		return
	}

	if queue != nil {
		keymaps := h.fetchKeymapsFromIDs(c, queue.KeymapIDs)
		c.JSON(http.StatusOK, gin.H{"data": gin.H{"queue": queue, "keymaps": keymaps}, "meta": gin.H{}, "error": nil})
		return
	}

	// Generate new queue
	queue, keymaps, err := h.generateQueue(c, userID, today)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"code": "INTERNAL_ERROR", "message": "failed to generate queue"}, "data": nil, "meta": gin.H{}})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"data": gin.H{"queue": queue, "keymaps": keymaps}, "meta": gin.H{}, "error": nil})
}

func (h *QueueHandler) Regenerate(c *gin.Context) {
	userID := c.MustGet("userID").(uuid.UUID)
	today := time.Now().Truncate(24 * time.Hour)

	queue, keymaps, err := h.generateQueue(c, userID, today)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"code": "INTERNAL_ERROR", "message": "failed to regenerate queue"}, "data": nil, "meta": gin.H{}})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": gin.H{"queue": queue, "keymaps": keymaps}, "meta": gin.H{}, "error": nil})
}

func (h *QueueHandler) generateQueue(c *gin.Context, userID uuid.UUID, date time.Time) (*models.DailyQueue, []models.Keymap, error) {
	ctx := c.Request.Context()
	var selectedKeymaps []models.Keymap

	// 60% SRS due
	dueTarget := int(float64(dailyQueueSize) * 0.6)
	dueRecords, err := h.srsRepo.FindDue(ctx, userID)
	if err == nil {
		for _, r := range dueRecords {
			if len(selectedKeymaps) >= dueTarget {
				break
			}
			km, err := h.keymapRepo.FindByID(ctx, r.KeymapID)
			if err == nil && km != nil {
				selectedKeymaps = append(selectedKeymaps, *km)
			}
		}
	}

	// 20% weakest
	weakTarget := int(float64(dailyQueueSize) * 0.2)
	weakRecords, err := h.srsRepo.FindWeakest(ctx, userID, weakTarget*2)
	if err == nil {
		existingIDs := make(map[uuid.UUID]bool)
		for _, km := range selectedKeymaps {
			existingIDs[km.ID] = true
		}
		for _, r := range weakRecords {
			if len(selectedKeymaps) >= dueTarget+weakTarget {
				break
			}
			if existingIDs[r.KeymapID] {
				continue
			}
			km, err := h.keymapRepo.FindByID(ctx, r.KeymapID)
			if err == nil && km != nil {
				selectedKeymaps = append(selectedKeymaps, *km)
				existingIDs[km.ID] = true
			}
		}
	}

	// 20% new/unpracticed
	remaining := dailyQueueSize - len(selectedKeymaps)
	if remaining > 0 {
		newKeymaps, err := h.srsRepo.FindUnpracticed(ctx, userID, remaining)
		if err == nil {
			selectedKeymaps = append(selectedKeymaps, newKeymaps...)
		}
	}

	keymapIDs := make(pq.StringArray, len(selectedKeymaps))
	for i, km := range selectedKeymaps {
		keymapIDs[i] = km.ID.String()
	}

	queue := &models.DailyQueue{
		UserID:    userID,
		QueueDate: date,
		KeymapIDs: keymapIDs,
		Completed: false,
	}
	if err := h.sessionRepo.CreateDailyQueue(ctx, queue); err != nil {
		return nil, nil, err
	}

	return queue, selectedKeymaps, nil
}

func (h *QueueHandler) fetchKeymapsFromIDs(c *gin.Context, ids pq.StringArray) []models.Keymap {
	keymaps := make([]models.Keymap, 0, len(ids))
	for _, idStr := range ids {
		kid, err := uuid.Parse(idStr)
		if err != nil {
			continue
		}
		km, err := h.keymapRepo.FindByID(c.Request.Context(), kid)
		if err == nil && km != nil {
			keymaps = append(keymaps, *km)
		}
	}
	return keymaps
}
