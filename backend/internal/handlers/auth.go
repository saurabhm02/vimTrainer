package handlers

import (
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/vimtrainer/api/internal/models"
	"github.com/vimtrainer/api/internal/repository"
	"github.com/vimtrainer/api/internal/services"
)

type AuthHandler struct {
	userRepo     repository.UserRepository
	settingsRepo repository.SettingsRepository
	authSvc      *services.AuthService
}

func NewAuthHandler(userRepo repository.UserRepository, settingsRepo repository.SettingsRepository, authSvc *services.AuthService) *AuthHandler {
	return &AuthHandler{userRepo: userRepo, settingsRepo: settingsRepo, authSvc: authSvc}
}

func setRefreshCookie(c *gin.Context, token string) {
	c.SetCookie("refresh_token", token, 30*24*60*60, "/", "", false, true)
}

func clearRefreshCookie(c *gin.Context) {
	c.SetCookie("refresh_token", "", -1, "/", "", false, true)
}

type registerRequest struct {
	Email       string `json:"email" binding:"required,email"`
	Password    string `json:"password" binding:"required,min=8"`
	DisplayName string `json:"display_name" binding:"required"`
}

func (h *AuthHandler) Register(c *gin.Context) {
	var req registerRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": gin.H{"code": "VALIDATION_ERROR", "message": err.Error()}, "data": nil, "meta": gin.H{}})
		return
	}

	existing, _ := h.userRepo.FindByEmail(c.Request.Context(), req.Email)
	if existing != nil {
		c.JSON(http.StatusConflict, gin.H{"error": gin.H{"code": "EMAIL_TAKEN", "message": "email already registered"}, "data": nil, "meta": gin.H{}})
		return
	}

	hash, err := h.authSvc.HashPassword(req.Password)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"code": "INTERNAL_ERROR", "message": "failed to hash password"}, "data": nil, "meta": gin.H{}})
		return
	}

	email := req.Email
	user := &models.User{
		Email:        &email,
		PasswordHash: &hash,
		DisplayName:  req.DisplayName,
		IsGuest:      false,
	}
	if err := h.userRepo.Create(c.Request.Context(), user); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"code": "INTERNAL_ERROR", "message": "failed to create user"}, "data": nil, "meta": gin.H{}})
		return
	}

	if _, err := h.settingsRepo.CreateDefault(c.Request.Context(), user.ID); err != nil {
		// Non-fatal: settings can be created on first access
	}

	h.issueTokensAndRespond(c, user)
}

type loginRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required"`
}

func (h *AuthHandler) Login(c *gin.Context) {
	var req loginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": gin.H{"code": "VALIDATION_ERROR", "message": err.Error()}, "data": nil, "meta": gin.H{}})
		return
	}

	user, err := h.userRepo.FindByEmail(c.Request.Context(), req.Email)
	if err != nil || user == nil || user.PasswordHash == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": gin.H{"code": "INVALID_CREDENTIALS", "message": "invalid email or password"}, "data": nil, "meta": gin.H{}})
		return
	}

	if !h.authSvc.CheckPassword(*user.PasswordHash, req.Password) {
		c.JSON(http.StatusUnauthorized, gin.H{"error": gin.H{"code": "INVALID_CREDENTIALS", "message": "invalid email or password"}, "data": nil, "meta": gin.H{}})
		return
	}

	h.issueTokensAndRespond(c, user)
}

func (h *AuthHandler) Refresh(c *gin.Context) {
	tokenStr, _ := c.Cookie("refresh_token")
	if tokenStr == "" {
		authHeader := c.GetHeader("Authorization")
		if strings.HasPrefix(authHeader, "Bearer ") {
			tokenStr = strings.TrimPrefix(authHeader, "Bearer ")
		}
	}
	if tokenStr == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": gin.H{"code": "UNAUTHORIZED", "message": "missing refresh token"}, "data": nil, "meta": gin.H{}})
		return
	}

	claims, err := h.authSvc.ValidateToken(tokenStr)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": gin.H{"code": "UNAUTHORIZED", "message": "invalid refresh token"}, "data": nil, "meta": gin.H{}})
		return
	}

	accessToken, err := h.authSvc.GenerateAccessToken(claims.UserID, claims.IsGuest)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"code": "INTERNAL_ERROR", "message": "failed to generate token"}, "data": nil, "meta": gin.H{}})
		return
	}

	user, err := h.userRepo.FindByID(c.Request.Context(), claims.UserID)
	if err != nil || user == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": gin.H{"code": "UNAUTHORIZED", "message": "user not found"}, "data": nil, "meta": gin.H{}})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": gin.H{"user": user, "access_token": accessToken}, "meta": gin.H{}, "error": nil})
}

func (h *AuthHandler) Logout(c *gin.Context) {
	clearRefreshCookie(c)
	c.JSON(http.StatusOK, gin.H{"data": gin.H{"message": "logged out"}, "meta": gin.H{}, "error": nil})
}

func (h *AuthHandler) CreateGuest(c *gin.Context) {
	token := uuid.New().String()
	displayName := "Guest_" + token[:8]
	user := &models.User{
		DisplayName: displayName,
		IsGuest:     true,
		GuestToken:  &token,
	}
	if err := h.userRepo.Create(c.Request.Context(), user); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"code": "INTERNAL_ERROR", "message": "failed to create guest"}, "data": nil, "meta": gin.H{}})
		return
	}

	if _, err := h.settingsRepo.CreateDefault(c.Request.Context(), user.ID); err != nil {
		// Non-fatal
	}

	h.issueTokensAndRespond(c, user)
}

type migrateGuestRequest struct {
	Email       string `json:"email" binding:"required,email"`
	Password    string `json:"password" binding:"required,min=8"`
	DisplayName string `json:"display_name"`
}

func (h *AuthHandler) MigrateGuest(c *gin.Context) {
	userID := c.MustGet("userID").(uuid.UUID)
	isGuest := c.MustGet("isGuest").(bool)

	if !isGuest {
		c.JSON(http.StatusBadRequest, gin.H{"error": gin.H{"code": "NOT_GUEST", "message": "user is not a guest"}, "data": nil, "meta": gin.H{}})
		return
	}

	var req migrateGuestRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": gin.H{"code": "VALIDATION_ERROR", "message": err.Error()}, "data": nil, "meta": gin.H{}})
		return
	}

	existing, _ := h.userRepo.FindByEmail(c.Request.Context(), req.Email)
	if existing != nil {
		c.JSON(http.StatusConflict, gin.H{"error": gin.H{"code": "EMAIL_TAKEN", "message": "email already registered"}, "data": nil, "meta": gin.H{}})
		return
	}

	user, err := h.userRepo.FindByID(c.Request.Context(), userID)
	if err != nil || user == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": gin.H{"code": "NOT_FOUND", "message": "user not found"}, "data": nil, "meta": gin.H{}})
		return
	}

	hash, err := h.authSvc.HashPassword(req.Password)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"code": "INTERNAL_ERROR", "message": "failed to hash password"}, "data": nil, "meta": gin.H{}})
		return
	}

	email := req.Email
	user.Email = &email
	user.PasswordHash = &hash
	user.IsGuest = false
	user.GuestToken = nil
	if req.DisplayName != "" {
		user.DisplayName = req.DisplayName
	}

	if err := h.userRepo.Update(c.Request.Context(), user); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"code": "INTERNAL_ERROR", "message": "failed to update user"}, "data": nil, "meta": gin.H{}})
		return
	}

	h.issueTokensAndRespond(c, user)
}

func (h *AuthHandler) issueTokensAndRespond(c *gin.Context, user *models.User) {
	accessToken, err := h.authSvc.GenerateAccessToken(user.ID, user.IsGuest)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"code": "INTERNAL_ERROR", "message": "failed to generate access token"}, "data": nil, "meta": gin.H{}})
		return
	}

	refreshToken, err := h.authSvc.GenerateRefreshToken(user.ID, user.IsGuest)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"code": "INTERNAL_ERROR", "message": "failed to generate refresh token"}, "data": nil, "meta": gin.H{}})
		return
	}

	setRefreshCookie(c, refreshToken)

	// Update last active date
	now := time.Now()
	user.LastActiveDate = &now
	_ = h.userRepo.Update(c.Request.Context(), user)

	c.JSON(http.StatusOK, gin.H{
		"data": gin.H{
			"user":         user,
			"access_token": accessToken,
		},
		"meta":  gin.H{},
		"error": nil,
	})
}
