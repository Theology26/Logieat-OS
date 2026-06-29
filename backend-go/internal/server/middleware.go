package server

import (
	"context"
	"log/slog"
	"net/http"
	"strings"
	"time"

	"github.com/logieatos/core/internal/auth"
)

type ctxKey string

const (
	companyKey ctxKey = "company_id"
	roleKey    ctxKey = "role"
	userKey    ctxKey = "user_id"
)

// logging logs each request with method, path and duration.
func logging(log *slog.Logger, next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		next.ServeHTTP(w, r)
		log.Info("req", "method", r.Method, "path", r.URL.Path, "dur_ms", time.Since(start).Milliseconds())
	})
}

// tenant validates the shared JWT and injects company_id/role/user_id into the context.
// Mirrors Laravel's JwtAuthenticate — never trusts a client-sent company id.
func (s *Server) tenant(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		token := bearer(r)
		if token == "" {
			writeJSON(w, http.StatusUnauthorized, map[string]string{"message": "Unauthenticated."})
			return
		}
		claims, err := auth.VerifyHS256(token, s.cfg.JWTSecret)
		if err != nil {
			writeJSON(w, http.StatusUnauthorized, map[string]string{"message": "Invalid or expired token."})
			return
		}
		ctx := context.WithValue(r.Context(), companyKey, claims.CompanyID)
		ctx = context.WithValue(ctx, roleKey, claims.Role)
		ctx = context.WithValue(ctx, userKey, claims.Sub)
		next(w, r.WithContext(ctx))
	}
}

func bearer(r *http.Request) string {
	h := r.Header.Get("Authorization")
	if after, ok := strings.CutPrefix(h, "Bearer "); ok {
		return after
	}
	return ""
}

func companyID(r *http.Request) string {
	v, _ := r.Context().Value(companyKey).(string)
	return v
}

func role(r *http.Request) string {
	v, _ := r.Context().Value(roleKey).(string)
	return v
}

func userID(r *http.Request) string {
	v, _ := r.Context().Value(userKey).(string)
	return v
}

// cors allows the React web client (different origin) to call the API and
// answers preflight requests. Bearer-token auth, so a wildcard origin is fine.
func cors(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Authorization, Content-Type, X-Company-ID")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}
