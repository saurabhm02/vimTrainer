package handlers

import (
	"fmt"
	"net/http"
	"regexp"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/vimtrainer/api/internal/models"
	"github.com/vimtrainer/api/internal/repository"
)

type KeymapHandler struct {
	keymapRepo repository.KeymapRepository
	sourceRepo repository.KeymapSourceRepository
}

func NewKeymapHandler(keymapRepo repository.KeymapRepository, sourceRepo repository.KeymapSourceRepository) *KeymapHandler {
	return &KeymapHandler{keymapRepo: keymapRepo, sourceRepo: sourceRepo}
}

func (h *KeymapHandler) List(c *gin.Context) {
	userID := c.MustGet("userID").(uuid.UUID)

	filters := repository.KeymapFilters{
		Mode:           c.Query("mode"),
		Category:       c.Query("category"),
		Search:         c.Query("search"),
		Cursor:         c.Query("cursor"),
		IncludeBuiltin: c.Query("include_builtin") != "false",
	}

	if sid := c.Query("source_id"); sid != "" {
		parsed, err := uuid.Parse(sid)
		if err == nil {
			filters.SourceID = &parsed
		}
	}

	limitVal := 50
	if l := c.Query("limit"); l != "" {
		if n, err := parseInt(l); err == nil && n > 0 && n <= 200 {
			limitVal = n
		}
	}
	filters.Limit = limitVal

	keymaps, nextCursor, err := h.keymapRepo.FindByUserID(c.Request.Context(), userID, filters)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"code": "INTERNAL_ERROR", "message": "failed to fetch keymaps"}, "data": nil, "meta": gin.H{}})
		return
	}

	meta := gin.H{"next_cursor": nextCursor}
	c.JSON(http.StatusOK, gin.H{"data": keymaps, "meta": meta, "error": nil})
}

func (h *KeymapHandler) ListBuiltin(c *gin.Context) {
	keymaps, err := h.keymapRepo.FindBuiltin(c.Request.Context(), c.Query("category"), c.Query("mode"))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"code": "INTERNAL_ERROR", "message": "failed to fetch builtin keymaps"}, "data": nil, "meta": gin.H{}})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": keymaps, "meta": gin.H{}, "error": nil})
}

type uploadRequest struct {
	Content    string `json:"content" binding:"required"`
	SourceName string `json:"source_name" binding:"required"`
	SourceType string `json:"source_type"` // "lua" or "vimscript"
	GithubURL  string `json:"github_url"`
}

type parsedKeymap struct {
	Mode        string
	KeySequence string
	Description string
}

func (h *KeymapHandler) Upload(c *gin.Context) {
	isGuest := c.MustGet("isGuest").(bool)
	if isGuest {
		c.JSON(http.StatusForbidden, gin.H{"error": gin.H{"code": "LOGIN_REQUIRED", "message": "sign in to import custom keymaps"}, "data": nil, "meta": gin.H{}})
		return
	}

	userID := c.MustGet("userID").(uuid.UUID)

	var req uploadRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": gin.H{"code": "VALIDATION_ERROR", "message": err.Error()}, "data": nil, "meta": gin.H{}})
		return
	}

	sourceType := strings.ToLower(req.SourceType)
	if sourceType == "" {
		if strings.Contains(req.Content, "vim.keymap.set") || strings.Contains(req.Content, "vim.api.nvim_set_keymap") {
			sourceType = "lua"
		} else {
			sourceType = "vimscript"
		}
	}

	var parsed []parsedKeymap
	if sourceType == "lua" {
		parsed = parseLua(req.Content)
	} else {
		parsed = parseVimscript(req.Content)
	}

	source := &models.KeymapSource{
		UserID:     userID,
		SourceType: sourceType,
		SourceName: req.SourceName,
		ParsedAt:   time.Now(),
	}
	if req.GithubURL != "" {
		source.GithubURL = &req.GithubURL
	}
	if err := h.sourceRepo.Create(c.Request.Context(), source); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"code": "INTERNAL_ERROR", "message": "failed to create source"}, "data": nil, "meta": gin.H{}})
		return
	}

	keymaps := make([]models.Keymap, 0, len(parsed))
	for _, p := range parsed {
		keymaps = append(keymaps, models.Keymap{
			UserID:      &userID,
			SourceID:    &source.ID,
			KeySequence: p.KeySequence,
			Mode:        p.Mode,
			Description: p.Description,
			Category:    "other",
			Difficulty:  "intermediate",
			IsBuiltin:   false,
		})
	}

	if len(keymaps) > 0 {
		if err := h.keymapRepo.CreateBatch(c.Request.Context(), keymaps); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"code": "INTERNAL_ERROR", "message": "failed to save keymaps"}, "data": nil, "meta": gin.H{}})
			return
		}
	}

	c.JSON(http.StatusCreated, gin.H{
		"data": gin.H{
			"source_id":     source.ID,
			"keymaps_count": len(keymaps),
			"keymaps":       keymaps,
		},
		"meta":  gin.H{},
		"error": nil,
	})
}

func (h *KeymapHandler) ListSources(c *gin.Context) {
	isGuest := c.MustGet("isGuest").(bool)
	if isGuest {
		c.JSON(http.StatusForbidden, gin.H{"error": gin.H{"code": "LOGIN_REQUIRED", "message": "sign in to access import sources"}, "data": nil, "meta": gin.H{}})
		return
	}

	userID := c.MustGet("userID").(uuid.UUID)
	sources, err := h.sourceRepo.FindByUserID(c.Request.Context(), userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"code": "INTERNAL_ERROR", "message": "failed to fetch sources"}, "data": nil, "meta": gin.H{}})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": sources, "meta": gin.H{}, "error": nil})
}

func (h *KeymapHandler) DeleteSource(c *gin.Context) {
	isGuest := c.MustGet("isGuest").(bool)
	if isGuest {
		c.JSON(http.StatusForbidden, gin.H{"error": gin.H{"code": "LOGIN_REQUIRED", "message": "sign in to manage import sources"}, "data": nil, "meta": gin.H{}})
		return
	}

	userID := c.MustGet("userID").(uuid.UUID)
	sourceID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": gin.H{"code": "INVALID_ID", "message": "invalid source id"}, "data": nil, "meta": gin.H{}})
		return
	}

	source, err := h.sourceRepo.FindByID(c.Request.Context(), sourceID)
	if err != nil || source == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": gin.H{"code": "NOT_FOUND", "message": "source not found"}, "data": nil, "meta": gin.H{}})
		return
	}
	if source.UserID != userID {
		c.JSON(http.StatusForbidden, gin.H{"error": gin.H{"code": "FORBIDDEN", "message": "access denied"}, "data": nil, "meta": gin.H{}})
		return
	}

	if err := h.sourceRepo.Delete(c.Request.Context(), sourceID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"code": "INTERNAL_ERROR", "message": "failed to delete source"}, "data": nil, "meta": gin.H{}})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": gin.H{"message": "source deleted"}, "meta": gin.H{}, "error": nil})
}

// parseLua extracts key mappings from Lua config (Neovim style)
func parseLua(content string) []parsedKeymap {
	var results []parsedKeymap

	// vim.keymap.set('n', '<leader>ff', ..., { desc = 'Find files' })
	// vim.keymap.set({'n','v'}, 'gd', ...)
	reSet := regexp.MustCompile(`vim\.keymap\.set\s*\(\s*['"\{]([^'"}\s,]+)['"\}]?,?\s*['"]([^'"]+)['"](?:[^)]*desc\s*=\s*['"]([^'"]+)['"])?`)
	matches := reSet.FindAllStringSubmatch(content, -1)
	for _, m := range matches {
		mode := normalizeLuaMode(m[1])
		key := m[2]
		desc := m[3]
		if desc == "" {
			desc = key
		}
		results = append(results, parsedKeymap{Mode: mode, KeySequence: key, Description: desc})
	}

	// vim.api.nvim_set_keymap('n', 'gd', ...)
	reAPI := regexp.MustCompile(`vim\.api\.nvim_set_keymap\s*\(\s*['"]([nvxsotilc])['"],\s*['"]([^'"]+)['"](?:[^)]*desc\s*=\s*['"]([^'"]+)['"])?`)
	for _, m := range reAPI.FindAllStringSubmatch(content, -1) {
		desc := m[3]
		if desc == "" {
			desc = m[2]
		}
		results = append(results, parsedKeymap{Mode: m[1], KeySequence: m[2], Description: desc})
	}

	return results
}

func normalizeLuaMode(raw string) string {
	raw = strings.Trim(raw, `'"{}`)
	if len(raw) > 0 {
		return string(raw[0])
	}
	return "n"
}

// parseVimscript extracts key mappings from vimscript
func parseVimscript(content string) []parsedKeymap {
	var results []parsedKeymap
	re := regexp.MustCompile(`(?m)^(n|v|i|x|s|o|c|t)?(noremap|map|nmap|vmap|imap|xmap|omap|tmap|smap)\s+(\S+)\s+(.+)$`)
	prefixMode := map[string]string{
		"nmap": "n", "vmap": "v", "imap": "i", "xmap": "x",
		"omap": "o", "tmap": "t", "smap": "s",
	}

	for _, m := range re.FindAllStringSubmatch(content, -1) {
		modePrefix := m[1]
		cmd := m[2]
		key := m[3]
		rhs := strings.TrimSpace(m[4])

		mode := modePrefix
		if mode == "" {
			if mapped, ok := prefixMode[cmd]; ok {
				mode = mapped
			} else {
				mode = "n"
			}
		}

		results = append(results, parsedKeymap{Mode: mode, KeySequence: key, Description: rhs})
	}
	return results
}

func parseInt(s string) (int, error) {
	var n int
	_, err := fmt.Sscanf(s, "%d", &n)
	return n, err
}
