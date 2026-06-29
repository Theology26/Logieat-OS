package server

import "net/http"

func (s *Server) routes(mux *http.ServeMux) {
	mux.HandleFunc("GET /healthz", s.handleHealth)

	// AI dispatch bridge to app.py
	mux.HandleFunc("POST /dispatch/optimize", s.tenant(s.handleOptimize))
	mux.HandleFunc("POST /dispatch/assign", s.tenant(s.handleAssign))

	// Realtime fleet GPS, chat and notifications (auth via ?token=)
	mux.HandleFunc("GET /ws", s.handleWS)

	// REST API consumed by the React web client
	mux.HandleFunc("POST /api/auth/login", s.handleLogin)
	mux.HandleFunc("GET /api/me", s.tenant(s.handleMe))
	mux.HandleFunc("GET /api/orders", s.tenant(s.handleOrders))
	mux.HandleFunc("POST /api/orders", s.tenant(s.handleCreateOrder))
	mux.HandleFunc("GET /api/couriers", s.tenant(s.handleCouriers))
	mux.HandleFunc("GET /api/analytics", s.tenant(s.handleAnalytics))
	mux.HandleFunc("GET /api/fleet", s.tenant(s.handleFleet))
	mux.HandleFunc("POST /api/dispatch/optimize", s.tenant(s.handleOptimize))
	mux.HandleFunc("POST /api/dispatch/assign", s.tenant(s.handleAssign))
}
