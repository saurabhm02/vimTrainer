package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/vimtrainer/api/internal/repository"
)

type SettingsHandler struct {
	settingsRepo repository.SettingsRepository
}

func NewSettingsHandler(settingsRepo repository.SettingsRepository) *SettingsHandler {
	return &SettingsHandler{settingsRepo: settingsRepo}
}

func (h *SettingsHandler) Get(c *gin.Context) {
	userID := c.MustGet("userID").(uuid.UUID)
	settings, err := h.settingsRepo.FindByUserID(c.Request.Context(), userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"code": "INTERNAL_ERROR", "message": "failed to fetch settings"}, "data": nil, "meta": gin.H{}})
		return
	}

	if settings == nil {
		var createErr error
		settings, createErr = h.settingsRepo.CreateDefault(c.Request.Context(), userID)
		if createErr != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"code": "INTERNAL_ERROR", "message": "failed to create settings"}, "data": nil, "meta": gin.H{}})
			return
		}
	}

	c.JSON(http.StatusOK, gin.H{"data": settings, "meta": gin.H{}, "error": nil})
}

type updateSettingsRequest struct {
	Theme          *string `json:"theme"`
	SessionLength  *int    `json:"session_length"`
	PracticeSounds *bool   `json:"practice_sounds"`
	ShowKeyHints   *bool   `json:"show_key_hints"`
	ReducedMotion  *bool   `json:"reduced_motion"`
}

func (h *SettingsHandler) Update(c *gin.Context) {
	userID := c.MustGet("userID").(uuid.UUID)
	var req updateSettingsRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": gin.H{"code": "VALIDATION_ERROR", "message": err.Error()}, "data": nil, "meta": gin.H{}})
		return
	}

	settings, err := h.settingsRepo.FindByUserID(c.Request.Context(), userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"code": "INTERNAL_ERROR", "message": "failed to fetch settings"}, "data": nil, "meta": gin.H{}})
		return
	}
	if settings == nil {
		settings, err = h.settingsRepo.CreateDefault(c.Request.Context(), userID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"code": "INTERNAL_ERROR", "message": "failed to create settings"}, "data": nil, "meta": gin.H{}})
			return
		}
	}

	if req.Theme != nil {
		settings.Theme = *req.Theme
	}
	if req.SessionLength != nil {
		settings.SessionLength = *req.SessionLength
	}
	if req.PracticeSounds != nil {
		settings.PracticeSounds = *req.PracticeSounds
	}
	if req.ShowKeyHints != nil {
		settings.ShowKeyHints = *req.ShowKeyHints
	}
	if req.ReducedMotion != nil {
		settings.ReducedMotion = *req.ReducedMotion
	}

	if err := h.settingsRepo.Update(c.Request.Context(), settings); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"code": "INTERNAL_ERROR", "message": "failed to update settings"}, "data": nil, "meta": gin.H{}})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": settings, "meta": gin.H{}, "error": nil})
}
