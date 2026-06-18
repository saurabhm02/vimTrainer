package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

type HealthHandler struct {
	version     string
	environment string
}

func NewHealthHandler(version, environment string) *HealthHandler {
	return &HealthHandler{version: version, environment: environment}
}

func (h *HealthHandler) GetHealth(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"data": gin.H{
			"status":      "ok",
			"version":     h.version,
			"environment": h.environment,
		},
		"meta":  gin.H{},
		"error": nil,
	})
}
