package server

import "net/http"

// routes registers all HTTP handlers. Go 1.22+ method-pattern routing (stdlib).
func (s *Server) routes(mux *http.ServeMux) {
	mux.HandleFunc("GET /healthz", s.handleHealth)

	// --- Phase 2: AI dispatch bridge (→ app.py /routing/optimize) ---
	mux.HandleFunc("POST /dispatch/optimize", s.tenant(s.handleOptimize)) // preview
	mux.HandleFunc("POST /dispatch/assign", s.tenant(s.handleAssign))     // persist + notify

	// --- Phase 3: realtime ---
	mux.HandleFunc("GET /ws", s.handleWS) // auth via ?token= inside the handler

	// --- Phase 3: courier execution (also handled by Laravel today) ---
	// mux.HandleFunc("POST /gps",                        s.tenant(s.handleGPS))
	// mux.HandleFunc("POST /assignments/{id}/pickup",    s.tenant(s.handlePickup))
	// mux.HandleFunc("POST /assignments/{id}/arrive",    s.tenant(s.handleArrive))
	// mux.HandleFunc("POST /assignments/{id}/deliver",   s.tenant(s.handleDeliver))
	// mux.HandleFunc("POST /assignments/{id}/complete",  s.tenant(s.handleComplete))
	// mux.HandleFunc("POST /chat/messages",              s.tenant(s.handleChat))
}
