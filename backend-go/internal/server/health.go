package server

import (
	"encoding/json"
	"net/http"
	"time"
)

func (s *Server) handleHealth(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]any{
		"status":  "healthy",
		"service": "logieat-go-core",
		"time":    time.Now().UTC().Format(time.RFC3339),
		"deps": map[string]string{
			"ai_service": s.cfg.AIServiceURL,
			"osrm":       s.cfg.OSRMURL,
		},
	})
}

func writeJSON(w http.ResponseWriter, code int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	_ = json.NewEncoder(w).Encode(v)
}
