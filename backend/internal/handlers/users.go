package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/vimtrainer/api/internal/repository"
	"github.com/vimtrainer/api/internal/services"
)

type UserHandler struct {
	userRepo repository.UserRepository
	authSvc  *services.AuthService
}

func NewUserHandler(userRepo repository.UserRepository, authSvc *services.AuthService) *UserHandler {
	return &UserHandler{userRepo: userRepo, authSvc: authSvc}
}

func (h *UserHandler) GetMe(c *gin.Context) {
	userID := c.MustGet("userID").(uuid.UUID)
	user, err := h.userRepo.FindByID(c.Request.Context(), userID)
	if err != nil || user == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": gin.H{"code": "NOT_FOUND", "message": "user not found"}, "data": nil, "meta": gin.H{}})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": user, "meta": gin.H{}, "error": nil})
}

type updateMeRequest struct {
	DisplayName string `json:"display_name" binding:"required"`
}

func (h *UserHandler) UpdateMe(c *gin.Context) {
	userID := c.MustGet("userID").(uuid.UUID)
	var req updateMeRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": gin.H{"code": "VALIDATION_ERROR", "message": err.Error()}, "data": nil, "meta": gin.H{}})
		return
	}

	user, err := h.userRepo.FindByID(c.Request.Context(), userID)
	if err != nil || user == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": gin.H{"code": "NOT_FOUND", "message": "user not found"}, "data": nil, "meta": gin.H{}})
		return
	}

	user.DisplayName = req.DisplayName
	if err := h.userRepo.Update(c.Request.Context(), user); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"code": "INTERNAL_ERROR", "message": "failed to update user"}, "data": nil, "meta": gin.H{}})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": user, "meta": gin.H{}, "error": nil})
}

type changePasswordRequest struct {
	OldPassword string `json:"old_password" binding:"required"`
	NewPassword string `json:"new_password" binding:"required,min=8"`
}

func (h *UserHandler) ChangePassword(c *gin.Context) {
	userID := c.MustGet("userID").(uuid.UUID)
	var req changePasswordRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": gin.H{"code": "VALIDATION_ERROR", "message": err.Error()}, "data": nil, "meta": gin.H{}})
		return
	}

	user, err := h.userRepo.FindByID(c.Request.Context(), userID)
	if err != nil || user == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": gin.H{"code": "NOT_FOUND", "message": "user not found"}, "data": nil, "meta": gin.H{}})
		return
	}

	if user.PasswordHash == nil || !h.authSvc.CheckPassword(*user.PasswordHash, req.OldPassword) {
		c.JSON(http.StatusUnauthorized, gin.H{"error": gin.H{"code": "INVALID_PASSWORD", "message": "incorrect current password"}, "data": nil, "meta": gin.H{}})
		return
	}

	hash, err := h.authSvc.HashPassword(req.NewPassword)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"code": "INTERNAL_ERROR", "message": "failed to hash password"}, "data": nil, "meta": gin.H{}})
		return
	}

	user.PasswordHash = &hash
	if err := h.userRepo.Update(c.Request.Context(), user); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"code": "INTERNAL_ERROR", "message": "failed to update password"}, "data": nil, "meta": gin.H{}})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": gin.H{"message": "password updated"}, "meta": gin.H{}, "error": nil})
}

func (h *UserHandler) DeleteMe(c *gin.Context) {
	userID := c.MustGet("userID").(uuid.UUID)
	if err := h.userRepo.SoftDelete(c.Request.Context(), userID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"code": "INTERNAL_ERROR", "message": "failed to delete user"}, "data": nil, "meta": gin.H{}})
		return
	}
	clearRefreshCookie(c)
	c.JSON(http.StatusOK, gin.H{"data": gin.H{"message": "account deleted"}, "meta": gin.H{}, "error": nil})
}
