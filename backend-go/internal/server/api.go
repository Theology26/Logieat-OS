package server

import (
	"encoding/json"
	"net/http"
	"time"

	"github.com/logieatos/core/internal/auth"
	"github.com/logieatos/core/internal/store"
	"golang.org/x/crypto/bcrypt"
)

// POST /api/auth/login — verify against the shared users table, issue a JWT.
func (s *Server) handleLogin(w http.ResponseWriter, r *http.Request) {
	var body struct{ Email, Password string }
	if json.NewDecoder(r.Body).Decode(&body) != nil || body.Email == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"message": "Email & password wajib."})
		return
	}
	u, err := s.store.GetUserByEmail(r.Context(), body.Email)
	if err != nil {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"message": "Email atau kata sandi salah."})
		return
	}
	if u.Status != "active" {
		writeJSON(w, http.StatusForbidden, map[string]string{"message": "Akun belum aktif / menunggu persetujuan."})
		return
	}
	if bcrypt.CompareHashAndPassword([]byte(u.PasswordHash), []byte(body.Password)) != nil {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"message": "Email atau kata sandi salah."})
		return
	}
	token, err := auth.SignHS256(auth.Claims{
		Sub: u.ID, CompanyID: u.CompanyID, Role: u.Role,
		Exp: time.Now().Add(7 * 24 * time.Hour).Unix(),
	}, s.cfg.JWTSecret)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"message": "Gagal membuat token."})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"token": token,
		"user": map[string]any{"id": u.ID, "name": u.Name, "email": u.Email, "role": u.Role}})
}

func (s *Server) handleMe(w http.ResponseWriter, r *http.Request) {
	user, err := s.store.GetUserByID(r.Context(), userID(r))
	if err != nil {
		writeJSON(w, http.StatusNotFound, map[string]string{"message": "User tidak ditemukan."})
		return
	}
	company, _ := s.store.GetCompanyByID(r.Context(), companyID(r))
	writeJSON(w, http.StatusOK, map[string]any{"user": user, "company": company})
}

func (s *Server) handleOrders(w http.ResponseWriter, r *http.Request) {
	orders, err := s.store.ListOrders(r.Context(), companyID(r))
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"message": err.Error()})
		return
	}
	writeJSON(w, http.StatusOK, orders)
}

func (s *Server) handleCreateOrder(w http.ResponseWriter, r *http.Request) {
	if !isManager(r) {
		writeJSON(w, http.StatusForbidden, map[string]string{"message": "Hanya owner/admin."})
		return
	}
	var b store.NewOrder
	if json.NewDecoder(r.Body).Decode(&b) != nil || b.RecipientName == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"message": "Data pesanan tidak lengkap."})
		return
	}
	o, err := s.store.CreateOrder(r.Context(), companyID(r), b)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"message": err.Error()})
		return
	}
	writeJSON(w, http.StatusCreated, o)
}

func (s *Server) handleCouriers(w http.ResponseWriter, r *http.Request) {
	c, err := s.store.ListCouriers(r.Context(), companyID(r))
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"message": err.Error()})
		return
	}
	writeJSON(w, http.StatusOK, c)
}

func (s *Server) handleAnalytics(w http.ResponseWriter, r *http.Request) {
	a, err := s.store.Analytics(r.Context(), companyID(r))
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"message": err.Error()})
		return
	}
	writeJSON(w, http.StatusOK, a)
}

func (s *Server) handleFleet(w http.ResponseWriter, r *http.Request) {
	f, err := s.store.Fleet(r.Context(), companyID(r))
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"message": err.Error()})
		return
	}
	writeJSON(w, http.StatusOK, f)
}
