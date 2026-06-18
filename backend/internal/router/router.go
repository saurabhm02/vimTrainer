package router

import (
	"github.com/gin-gonic/gin"
	"github.com/vimtrainer/api/internal/handlers"
	"github.com/vimtrainer/api/internal/middleware"
	"github.com/vimtrainer/api/internal/services"
)

// Deps holds every handler and service the router needs.
type Deps struct {
	AuthSvc        *services.AuthService
	Health         *handlers.HealthHandler
	Auth           *handlers.AuthHandler
	User           *handlers.UserHandler
	Keymap         *handlers.KeymapHandler
	Session        *handlers.SessionHandler
	Queue          *handlers.QueueHandler
	Analytics      *handlers.AnalyticsHandler
	Achievement    *handlers.AchievementHandler
	Settings       *handlers.SettingsHandler
	CORSOrigins    []string
}

// New builds and returns a configured Gin engine.
func New(d Deps) *gin.Engine {
	r := gin.New()
	r.Use(middleware.Recovery())
	r.Use(middleware.Logger())
	r.Use(middleware.CORS(d.CORSOrigins))

	r.GET("/health", d.Health.GetHealth)

	v1 := r.Group("/api/v1")

	registerPublicAnalytics(v1, d)
	registerAuth(v1, d)
	registerProtected(v1, d)

	return r
}

func registerPublicAnalytics(v1 *gin.RouterGroup, d Deps) {
	g := v1.Group("/analytics")
	g.Use(middleware.AuthOptional(d.AuthSvc))
	{
		g.POST("/traffic/track", d.Analytics.TrackVisit)
		g.GET("/traffic/today", d.Analytics.TodayTraffic)
	}
}

func registerAuth(v1 *gin.RouterGroup, d Deps) {
	g := v1.Group("/auth")
	{
		g.POST("/register", d.Auth.Register)
		g.POST("/login", d.Auth.Login)
		g.POST("/refresh", d.Auth.Refresh)
		g.POST("/logout", d.Auth.Logout)
		g.POST("/guest", d.Auth.CreateGuest)
		g.POST("/guest/migrate", middleware.AuthRequired(d.AuthSvc), d.Auth.MigrateGuest)
	}
}

func registerProtected(v1 *gin.RouterGroup, d Deps) {
	g := v1.Group("")
	g.Use(middleware.AuthRequired(d.AuthSvc))
	{
		// Users
		g.GET("/users/me", d.User.GetMe)
		g.PUT("/users/me", d.User.UpdateMe)
		g.PUT("/users/me/password", d.User.ChangePassword)
		g.DELETE("/users/me", d.User.DeleteMe)

		// Keymaps
		g.GET("/keymaps", d.Keymap.List)
		g.GET("/keymaps/builtin", d.Keymap.ListBuiltin)
		g.POST("/keymaps/upload", d.Keymap.Upload)
		g.GET("/sources", d.Keymap.ListSources)
		g.DELETE("/sources/:id", d.Keymap.DeleteSource)

		// Practice sessions
		g.POST("/sessions", d.Session.Create)
		g.GET("/sessions/:id", d.Session.Get)
		g.POST("/sessions/:id/attempts", d.Session.SubmitAttempt)
		g.POST("/sessions/:id/complete", d.Session.Complete)

		// Daily queue
		g.GET("/queue/today", d.Queue.GetToday)
		g.POST("/queue/today/regenerate", d.Queue.Regenerate)

		// Analytics (authenticated)
		g.GET("/analytics/overview", d.Analytics.Overview)
		g.GET("/analytics/accuracy", d.Analytics.Accuracy)
		g.GET("/analytics/sessions", d.Analytics.Sessions)
		g.GET("/analytics/heatmap", d.Analytics.Heatmap)
		g.GET("/analytics/progress", d.Analytics.Progress)

		// Achievements
		g.GET("/achievements", d.Achievement.List)

		// Settings
		g.GET("/settings", d.Settings.Get)
		g.PUT("/settings", d.Settings.Update)
	}
}
