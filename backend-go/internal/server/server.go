package server

import (
	"database/sql"
	"log/slog"
	"net/http"
	"time"

	"github.com/logieatos/core/internal/ai"
	"github.com/logieatos/core/internal/config"
	"github.com/logieatos/core/internal/store"
	"github.com/logieatos/core/internal/ws"
)

// Server is the LogiEat OS Go core (realtime + AI-dispatch bridge).
type Server struct {
	cfg   config.Config
	log   *slog.Logger
	store *store.Store
	ai    *ai.Client
	hub   *ws.Hub
}

func New(cfg config.Config, log *slog.Logger, db *sql.DB, aiClient *ai.Client, hub *ws.Hub) *Server {
	s := &Server{
		cfg:   cfg,
		log:   log,
		store: store.New(db),
		ai:    aiClient,
		hub:   hub,
	}
	hub.SetMessageHandler(s.handleWSMessage)
	return s
}

func (s *Server) Run() error {
	mux := http.NewServeMux()
	s.routes(mux)

	addr := ":" + s.cfg.Port
	s.log.Info("listening", "addr", addr, "ai_service", s.cfg.AIServiceURL)

	httpSrv := &http.Server{
		Addr:              addr,
		Handler:           logging(s.log, mux),
		ReadHeaderTimeout: 10 * time.Second,
	}
	return httpSrv.ListenAndServe()
}
