package main

import (
	"bufio"
	"log/slog"
	"os"
	"strings"

	"github.com/logieatos/core/internal/ai"
	"github.com/logieatos/core/internal/config"
	"github.com/logieatos/core/internal/db"
	"github.com/logieatos/core/internal/server"
	"github.com/logieatos/core/internal/ws"
)

// loadDotEnv reads KEY=VALUE lines from .env (if present) into the process env,
// without overriding variables already set in the shell.
func loadDotEnv(path string) {
	f, err := os.Open(path)
	if err != nil {
		return
	}
	defer f.Close()
	sc := bufio.NewScanner(f)
	for sc.Scan() {
		line := strings.TrimSpace(sc.Text())
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}
		key, val, ok := strings.Cut(line, "=")
		if !ok {
			continue
		}
		key, val = strings.TrimSpace(key), strings.TrimSpace(val)
		if _, exists := os.LookupEnv(key); !exists {
			os.Setenv(key, val)
		}
	}
}

func main() {
	logger := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelInfo}))
	loadDotEnv(".env")
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
