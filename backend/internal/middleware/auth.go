package middleware

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/vimtrainer/api/internal/services"
)

func AuthRequired(authSvc *services.AuthService) gin.HandlerFunc {
	return func(c *gin.Context) {
		header := c.GetHeader("Authorization")
		if !strings.HasPrefix(header, "Bearer ") {
			c.JSON(http.StatusUnauthorized, gin.H{
				"error": gin.H{"code": "UNAUTHORIZED", "message": "missing token"},
				"data":  nil,
				"meta":  gin.H{},
			})
			c.Abort()
			return
		}
		tokenStr := strings.TrimPrefix(header, "Bearer ")
		claims, err := authSvc.ValidateToken(tokenStr)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{
				"error": gin.H{"code": "UNAUTHORIZED", "message": "invalid token"},
				"data":  nil,
				"meta":  gin.H{},
			})
			c.Abort()
			return
		}
		c.Set("userID", claims.UserID)
		c.Set("isGuest", claims.IsGuest)
		c.Next()
	}
}

func RefreshTokenFromCookie(authSvc *services.AuthService) gin.HandlerFunc {
	return func(c *gin.Context) {
		tokenStr, err := c.Cookie("refresh_token")
		if err != nil || tokenStr == "" {
			c.JSON(http.StatusUnauthorized, gin.H{
				"error": gin.H{"code": "UNAUTHORIZED", "message": "missing refresh token"},
				"data":  nil,
				"meta":  gin.H{},
			})
			c.Abort()
			return
		}
		claims, err := authSvc.ValidateToken(tokenStr)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{
				"error": gin.H{"code": "UNAUTHORIZED", "message": "invalid refresh token"},
				"data":  nil,
				"meta":  gin.H{},
			})
			c.Abort()
			return
		}
		c.Set("userID", claims.UserID)
		c.Set("isGuest", claims.IsGuest)
		c.Next()
	}
}

func AuthOptional(authSvc *services.AuthService) gin.HandlerFunc {
	return func(c *gin.Context) {
		header := c.GetHeader("Authorization")
		if !strings.HasPrefix(header, "Bearer ") {
			c.Next()
			return
		}

		tokenStr := strings.TrimPrefix(header, "Bearer ")
		claims, err := authSvc.ValidateToken(tokenStr)
		if err == nil {
			c.Set("userID", claims.UserID)
			c.Set("isGuest", claims.IsGuest)
		}
		c.Next()
	}
}
