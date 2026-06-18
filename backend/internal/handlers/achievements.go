package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/vimtrainer/api/internal/models"
	"github.com/vimtrainer/api/internal/repository"
)

type AchievementHandler struct {
	achievementRepo repository.AchievementRepository
}

func NewAchievementHandler(achievementRepo repository.AchievementRepository) *AchievementHandler {
	return &AchievementHandler{achievementRepo: achievementRepo}
}

type achievementWithStatus struct {
	models.Achievement
	Unlocked   bool   `json:"unlocked"`
	UnlockedAt string `json:"unlocked_at,omitempty"`
}

func (h *AchievementHandler) List(c *gin.Context) {
	userID := c.MustGet("userID").(uuid.UUID)

	all, err := h.achievementRepo.FindAll(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"code": "INTERNAL_ERROR", "message": "failed to fetch achievements"}, "data": nil, "meta": gin.H{}})
		return
	}

	unlocked, err := h.achievementRepo.FindUnlocked(c.Request.Context(), userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"code": "INTERNAL_ERROR", "message": "failed to fetch user achievements"}, "data": nil, "meta": gin.H{}})
		return
	}

	unlockedMap := make(map[uuid.UUID]models.UserAchievement)
	for _, ua := range unlocked {
		unlockedMap[ua.AchievementID] = ua
	}

	result := make([]achievementWithStatus, 0, len(all))
	for _, ach := range all {
		item := achievementWithStatus{Achievement: ach}
		if ua, ok := unlockedMap[ach.ID]; ok {
			item.Unlocked = true
			item.UnlockedAt = ua.UnlockedAt.Format("2006-01-02T15:04:05Z")
		}
		result = append(result, item)
	}

	c.JSON(http.StatusOK, gin.H{"data": result, "meta": gin.H{}, "error": nil})
}
