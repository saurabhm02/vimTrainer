package handlers

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/lib/pq"
	"github.com/vimtrainer/api/internal/models"
	"github.com/vimtrainer/api/internal/repository"
	"github.com/vimtrainer/api/internal/services"
)

type SessionHandler struct {
	sessionRepo     repository.SessionRepository
	keymapRepo      repository.KeymapRepository
	srsRepo         repository.SRSRepository
	achievementRepo repository.AchievementRepository
	userRepo        repository.UserRepository
}

func NewSessionHandler(
	sessionRepo repository.SessionRepository,
	keymapRepo repository.KeymapRepository,
	srsRepo repository.SRSRepository,
	achievementRepo repository.AchievementRepository,
	userRepo repository.UserRepository,
) *SessionHandler {
	return &SessionHandler{
		sessionRepo:     sessionRepo,
		keymapRepo:      keymapRepo,
		srsRepo:         srsRepo,
		achievementRepo: achievementRepo,
		userRepo:        userRepo,
	}
}

type createSessionRequest struct {
	Mode   string `json:"mode" binding:"required"`
	Length int    `json:"length"`
}

func (h *SessionHandler) Create(c *gin.Context) {
	userID := c.MustGet("userID").(uuid.UUID)
	var req createSessionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": gin.H{"code": "VALIDATION_ERROR", "message": err.Error()}, "data": nil, "meta": gin.H{}})
		return
	}

	length := req.Length
	if length <= 0 {
		length = 20
	}

	keymapIDs, keymaps, err := h.selectKeymapsForMode(c, userID, req.Mode, length)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"code": "INTERNAL_ERROR", "message": "failed to select keymaps"}, "data": nil, "meta": gin.H{}})
		return
	}

	now := time.Now()
	session := &models.PracticeSession{
		UserID:          userID,
		Mode:            req.Mode,
		Status:          "active",
		KeymapIDs:       keymapIDs,
		TotalChallenges: len(keymapIDs),
		StartedAt:       now,
	}
	if err := h.sessionRepo.Create(c.Request.Context(), session); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"code": "INTERNAL_ERROR", "message": "failed to create session"}, "data": nil, "meta": gin.H{}})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"data": gin.H{
			"session": session,
			"keymaps": keymaps,
		},
		"meta":  gin.H{},
		"error": nil,
	})
}

func (h *SessionHandler) selectKeymapsForMode(c *gin.Context, userID uuid.UUID, mode string, length int) (pq.StringArray, []models.Keymap, error) {
	ctx := c.Request.Context()
	var keymaps []models.Keymap

	switch mode {
	case "srs":
		dueRecords, err := h.srsRepo.FindDue(ctx, userID)
		if err != nil {
			return nil, nil, err
		}
		for _, r := range dueRecords {
			km, err := h.keymapRepo.FindByID(ctx, r.KeymapID)
			if err == nil && km != nil {
				keymaps = append(keymaps, *km)
			}
			if len(keymaps) >= length {
				break
			}
		}
		if len(keymaps) < length {
			weakest, err := h.srsRepo.FindWeakest(ctx, userID, length-len(keymaps))
			if err == nil {
				for _, r := range weakest {
					km, err := h.keymapRepo.FindByID(ctx, r.KeymapID)
					if err == nil && km != nil {
						keymaps = append(keymaps, *km)
					}
				}
			}
		}

	case "leader":
		kms, _, err := h.keymapRepo.FindByUserID(ctx, userID, repository.KeymapFilters{
			Search:         "<leader>",
			IncludeBuiltin: true,
			Limit:          length,
		})
		if err != nil {
			return nil, nil, err
		}
		keymaps = kms

	default: // "normal", "flashcard"
		kms, _, err := h.keymapRepo.FindByUserID(ctx, userID, repository.KeymapFilters{
			IncludeBuiltin: true,
			Limit:          length,
		})
		if err != nil {
			return nil, nil, err
		}
		keymaps = kms
	}

	ids := make(pq.StringArray, len(keymaps))
	for i, km := range keymaps {
		ids[i] = km.ID.String()
	}
	return ids, keymaps, nil
}

func (h *SessionHandler) Get(c *gin.Context) {
	sessionID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": gin.H{"code": "INVALID_ID", "message": "invalid session id"}, "data": nil, "meta": gin.H{}})
		return
	}

	session, err := h.sessionRepo.FindByID(c.Request.Context(), sessionID)
	if err != nil || session == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": gin.H{"code": "NOT_FOUND", "message": "session not found"}, "data": nil, "meta": gin.H{}})
		return
	}

	userID := c.MustGet("userID").(uuid.UUID)
	if session.UserID != userID {
		c.JSON(http.StatusForbidden, gin.H{"error": gin.H{"code": "FORBIDDEN", "message": "access denied"}, "data": nil, "meta": gin.H{}})
		return
	}

	keymaps := make([]models.Keymap, 0, len(session.KeymapIDs))
	for _, idStr := range session.KeymapIDs {
		kid, err := uuid.Parse(idStr)
		if err != nil {
			continue
		}
		km, err := h.keymapRepo.FindByID(c.Request.Context(), kid)
		if err == nil && km != nil {
			keymaps = append(keymaps, *km)
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"data": gin.H{"session": session, "keymaps": keymaps},
		"meta": gin.H{}, "error": nil,
	})
}

type submitAttemptRequest struct {
	KeymapID      string `json:"keymap_id" binding:"required"`
	TypedSequence string `json:"typed_sequence" binding:"required"`
	IsCorrect     bool   `json:"is_correct"`
	ResponseMs    int    `json:"response_ms"`
}

func (h *SessionHandler) SubmitAttempt(c *gin.Context) {
	userID := c.MustGet("userID").(uuid.UUID)
	sessionID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": gin.H{"code": "INVALID_ID", "message": "invalid session id"}, "data": nil, "meta": gin.H{}})
		return
	}

	var req submitAttemptRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": gin.H{"code": "VALIDATION_ERROR", "message": err.Error()}, "data": nil, "meta": gin.H{}})
		return
	}

	keymapID, err := uuid.Parse(req.KeymapID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": gin.H{"code": "INVALID_ID", "message": "invalid keymap id"}, "data": nil, "meta": gin.H{}})
		return
	}

	session, err := h.sessionRepo.FindByID(c.Request.Context(), sessionID)
	if err != nil || session == nil || session.UserID != userID {
		c.JSON(http.StatusNotFound, gin.H{"error": gin.H{"code": "NOT_FOUND", "message": "session not found"}, "data": nil, "meta": gin.H{}})
		return
	}

	attempt := &models.PracticeAttempt{
		SessionID:     sessionID,
		UserID:        userID,
		KeymapID:      keymapID,
		TypedSequence: req.TypedSequence,
		IsCorrect:     req.IsCorrect,
		ResponseMs:    req.ResponseMs,
	}
	if err := h.sessionRepo.CreateAttempt(c.Request.Context(), attempt); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"code": "INTERNAL_ERROR", "message": "failed to save attempt"}, "data": nil, "meta": gin.H{}})
		return
	}

	// Update SRS record
	srsRecord, err := h.srsRepo.FindOrCreate(c.Request.Context(), userID, keymapID)
	if err == nil {
		quality := 1
		if req.IsCorrect {
			quality = 4
		}
		services.UpdateSRS(srsRecord, quality, req.ResponseMs)
		_ = h.srsRepo.Update(c.Request.Context(), srsRecord)
	}

	// Update session stats
	session.CompletedChallenges++
	if req.IsCorrect {
		session.CorrectCount++
	}
	_ = h.sessionRepo.Update(c.Request.Context(), session)

	c.JSON(http.StatusCreated, gin.H{
		"data": gin.H{
			"attempt":    attempt,
			"srs_record": srsRecord,
		},
		"meta":  gin.H{},
		"error": nil,
	})
}

func (h *SessionHandler) Complete(c *gin.Context) {
	userID := c.MustGet("userID").(uuid.UUID)
	sessionID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": gin.H{"code": "INVALID_ID", "message": "invalid session id"}, "data": nil, "meta": gin.H{}})
		return
	}

	session, err := h.sessionRepo.FindByID(c.Request.Context(), sessionID)
	if err != nil || session == nil || session.UserID != userID {
		c.JSON(http.StatusNotFound, gin.H{"error": gin.H{"code": "NOT_FOUND", "message": "session not found"}, "data": nil, "meta": gin.H{}})
		return
	}

	now := time.Now()
	session.Status = "completed"
	session.CompletedAt = &now
	if err := h.sessionRepo.Update(c.Request.Context(), session); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"code": "INTERNAL_ERROR", "message": "failed to complete session"}, "data": nil, "meta": gin.H{}})
		return
	}

	// Update streak
	user, err := h.userRepo.FindByID(c.Request.Context(), userID)
	if err == nil && user != nil {
		today := now.Truncate(24 * time.Hour)
		if user.LastActiveDate == nil {
			user.CurrentStreak = 1
		} else {
			lastActive := user.LastActiveDate.Truncate(24 * time.Hour)
			yesterday := today.AddDate(0, 0, -1)
			if lastActive.Equal(yesterday) {
				user.CurrentStreak++
			} else if lastActive.Equal(today) {
				// Already counted today
			} else {
				user.CurrentStreak = 1
			}
		}
		if user.CurrentStreak > user.LongestStreak {
			user.LongestStreak = user.CurrentStreak
		}
		user.LastActiveDate = &today
		_ = h.userRepo.Update(c.Request.Context(), user)

		// Check achievements
		newAchievements := h.checkAchievements(c, user, session)

		c.JSON(http.StatusOK, gin.H{
			"data": gin.H{
				"session":          session,
				"new_achievements": newAchievements,
				"current_streak":   user.CurrentStreak,
				"longest_streak":   user.LongestStreak,
			},
			"meta":  gin.H{},
			"error": nil,
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data": gin.H{"session": session, "new_achievements": []interface{}{}},
		"meta": gin.H{}, "error": nil,
	})
}

func (h *SessionHandler) checkAchievements(c *gin.Context, user *models.User, session *models.PracticeSession) []models.Achievement {
	ctx := c.Request.Context()
	allAchievements, err := h.achievementRepo.FindAll(ctx)
	if err != nil {
		return nil
	}
	unlocked, err := h.achievementRepo.FindUnlocked(ctx, user.ID)
	if err != nil {
		return nil
	}
	unlockedMap := make(map[uuid.UUID]bool)
	for _, ua := range unlocked {
		unlockedMap[ua.AchievementID] = true
	}

	sources, _ := h.achievementRepo.FindUnlocked(ctx, user.ID)
	sourceCount := len(sources)

	var newAchievements []models.Achievement
	for _, ach := range allAchievements {
		if unlockedMap[ach.ID] {
			continue
		}
		unlock := false
		switch ach.ConditionType {
		case "sessions_completed":
			// We'd need a count query here; simplified check
			unlock = false
		case "streak_days":
			unlock = user.CurrentStreak >= ach.ConditionValue
		case "import_count":
			unlock = sourceCount >= ach.ConditionValue
		}
		if unlock {
			if err := h.achievementRepo.Unlock(ctx, user.ID, ach.ID); err == nil {
				newAchievements = append(newAchievements, ach)
			}
		}
	}
	return newAchievements
}
