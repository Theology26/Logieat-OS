package server

import (
	"context"
	"encoding/json"
	"net/http"
	"time"

	"github.com/gorilla/websocket"
	"github.com/logieatos/core/internal/auth"
	"github.com/logieatos/core/internal/ws"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool { return true }, // dev; tighten in prod
}

// GET /ws?token=JWT — realtime channel (fleet GPS, chat, notifications).
func (s *Server) handleWS(w http.ResponseWriter, r *http.Request) {
	token := r.URL.Query().Get("token")
	if token == "" {
		token = bearer(r)
	}
	claims, err := auth.VerifyHS256(token, s.cfg.JWTSecret)
	if err != nil {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"message": "Invalid token."})
		return
	}

	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		return
	}

	client := &ws.Client{Conn: conn, Company: claims.CompanyID, User: claims.Sub, Role: claims.Role}
	s.hub.Add(client)
	go client.WritePump()
	go client.ReadPump()
}

type inbound struct {
	Type    string  `json:"type"`
	Lat     float64 `json:"lat"`
	Lng     float64 `json:"lng"`
	Heading float64 `json:"heading"`
	Speed   float64 `json:"speed"`
	RouteID string  `json:"route_id"`
	Body    string  `json:"body"`
}

// handleWSMessage routes inbound client messages (set as the hub's onMessage).
func (s *Server) handleWSMessage(c *ws.Client, raw []byte) {
	var in inbound
	if json.Unmarshal(raw, &in) != nil {
		return
	}
	ctx := context.Background()

	switch in.Type {
	case "gps":
		_ = s.store.UpsertLocation(ctx, c.Company, c.User, in.RouteID, in.Lat, in.Lng, in.Heading, in.Speed)
		out, _ := json.Marshal(map[string]any{
			"type": "gps", "courier_id": c.User, "lat": in.Lat, "lng": in.Lng,
			"heading": in.Heading, "speed": in.Speed, "route_id": in.RouteID,
			"at": time.Now().UTC(),
		})
		// only managers watch the fleet
		s.hub.Broadcast(c.Company, out, func(cl *ws.Client) bool { return cl.Role == "owner" || cl.Role == "admin" })

	case "chat":
		if in.Body == "" {
			return
		}
		id, ts, err := s.store.InsertMessage(ctx, c.Company, in.RouteID, c.User, in.Body)
		if err != nil {
			s.log.Error("chat persist", "err", err)
			return
		}
		out, _ := json.Marshal(map[string]any{
			"type": "chat", "id": id, "sender_id": c.User, "sender_role": c.Role,
			"body": in.Body, "route_id": in.RouteID, "created_at": ts,
		})
		s.hub.Broadcast(c.Company, out, nil) // both sides of the company
	}
}
