package database

import (
	"github.com/golang-migrate/migrate/v4"
	_ "github.com/golang-migrate/migrate/v4/database/postgres"
	_ "github.com/golang-migrate/migrate/v4/source/file"
	"github.com/rs/zerolog/log"
)

func RunMigrations(databaseURL, migrationsPath string) {
	m, err := migrate.New("file://"+migrationsPath, databaseURL)
	if err != nil {
		log.Fatal().Err(err).Msg("failed to create migrate instance")
	}
	defer m.Close()

	if err := m.Up(); err != nil && err != migrate.ErrNoChange {
		log.Fatal().Err(err).Msg("failed to run migrations")
	}

	log.Info().Msg("migrations complete")
}
