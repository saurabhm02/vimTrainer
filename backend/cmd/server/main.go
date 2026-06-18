package main

import (
	"context"
	"fmt"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/rs/zerolog"
	"github.com/rs/zerolog/log"

	"github.com/vimtrainer/api/internal/config"
	"github.com/vimtrainer/api/internal/database"
	"github.com/vimtrainer/api/internal/handlers"
	"github.com/vimtrainer/api/internal/repository/postgres"
	"github.com/vimtrainer/api/internal/router"
	"github.com/vimtrainer/api/internal/services"
)

const version = "0.1.0"

func main() {
	log.Logger = log.Output(zerolog.ConsoleWriter{Out: os.Stderr, TimeFormat: "15:04:05"})

	cfg := config.Load()

	gin.DebugPrintRouteFunc = func(string, string, string, int) {}
	gin.DebugPrintFunc = func(string, ...any) {}

	if cfg.Environment == "production" {
		gin.SetMode(gin.ReleaseMode)
	}

	db := database.Connect(cfg.DatabaseURL)
	database.RunMigrations(cfg.DatabaseURL, "migrations")

	userRepo        := postgres.NewUserRepository(db)
	keymapRepo      := postgres.NewKeymapRepository(db)
	sourceRepo      := postgres.NewKeymapSourceRepository(db)
	sessionRepo     := postgres.NewSessionRepository(db)
	srsRepo         := postgres.NewSRSRepository(db)
	achievementRepo := postgres.NewAchievementRepository(db)
	settingsRepo    := postgres.NewSettingsRepository(db)

	authSvc := services.NewAuthService(cfg.JWTSecret)

	deps := router.Deps{
		AuthSvc:     authSvc,
		Health:      handlers.NewHealthHandler(version, cfg.Environment),
		Auth:        handlers.NewAuthHandler(userRepo, settingsRepo, authSvc),
		User:        handlers.NewUserHandler(userRepo, authSvc),
		Keymap:      handlers.NewKeymapHandler(keymapRepo, sourceRepo),
		Session:     handlers.NewSessionHandler(sessionRepo, keymapRepo, srsRepo, achievementRepo, userRepo),
		Queue:       handlers.NewQueueHandler(sessionRepo, srsRepo, keymapRepo),
		Analytics:   handlers.NewAnalyticsHandler(db),
		Achievement: handlers.NewAchievementHandler(achievementRepo),
		Settings:    handlers.NewSettingsHandler(settingsRepo),
		CORSOrigins: cfg.CORSAllowedOrigins,
	}

	srv := &http.Server{
		Addr:         ":" + cfg.Port,
		Handler:      router.New(deps),
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 30 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	go func() {
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatal().Err(err).Msg("server error")
		}
	}()

	fmt.Printf("\n  vimtrainer api %s\n  ─────────────────────────────────────\n  Listening on  http://localhost:%s\n  Health check  http://localhost:%s/health\n  Environment   %s\n\n",
		version, cfg.Port, cfg.Port, cfg.Environment)

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Info().Msg("shutting down…")
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if err := srv.Shutdown(ctx); err != nil {
		log.Error().Err(err).Msg("forced shutdown")
	}
}
