package main

import (
	"log/slog"
	"os"

	"github.com/logieatos/core/internal/ai"
	"github.com/logieatos/core/internal/config"
	"github.com/logieatos/core/internal/db"
	"github.com/logieatos/core/internal/server"
	"github.com/logieatos/core/internal/ws"
)

func main() {
	logger := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelInfo}))
	cfg := config.Load()

	database, err := db.Open(cfg.DBDSN)
	if err != nil {
		logger.Error("database connection failed", "err", err)
		os.Exit(1)
	}
	defer database.Close()
	logger.Info("database connected")

	aiClient := ai.NewClient(cfg.AIServiceURL)

	hub := ws.NewHub(logger)
	go hub.Run()

	srv := server.New(cfg, logger, database, aiClient, hub)
	if err := srv.Run(); err != nil {
		logger.Error("server stopped", "err", err)
		os.Exit(1)
	}
}
