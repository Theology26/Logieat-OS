package server

import (
	"encoding/json"
	"errors"
	"net/http"
	"strconv"
	"time"

	"github.com/logieatos/core/internal/ai"
	"github.com/logieatos/core/internal/push"
	"github.com/logieatos/core/internal/store"
	"github.com/logieatos/core/internal/ws"
)

var errNoOrders = errors.New("no pending orders for the given ids")

type dispatchBody struct {
	CourierID       string   `json:"courier_id"`
	OrderIDs        []string `json:"order_ids"`
	Temperature     float64  `json:"temperature"`
	MaxTimeMinutes  float64  `json:"max_time_minutes"`
	VehicleCapacity int      `json:"vehicle_capacity"`
}

type stepOut struct {
	Sequence             int     `json:"sequence"`
	OrderID              string  `json:"order_id"`
	Code                 string  `json:"code"`
	Recipient            string  `json:"recipient"`
	DistanceKm           float64 `json:"distance_km"`
	EstimatedMinutes     float64 `json:"estimated_minutes"`
	SpoilageRisk         string  `json:"spoilage_risk"`
	MinutesUntilSpoilage float64 `json:"minutes_until_spoilage"`
}

// optimizeFor maps orders → SchoolNodes, calls app.py, and returns the response
// plus the orders indexed by the integer id we sent (1..N).
func (s *Server) optimizeFor(r *http.Request, body dispatchBody) (*ai.RouteOptimizeResponse, []store.Order, *store.Depot, error) {
	ctx := r.Context()
	cid := companyID(r)

	depot, err := s.store.GetDepot(ctx, cid)
	if err != nil {
		return nil, nil, nil, err
	}
	orders, err := s.store.GetPendingOrders(ctx, cid, body.OrderIDs)
	if err != nil {
		return nil, nil, nil, err
	}
	if len(orders) == 0 {
		return nil, nil, nil, errNoOrders
	}

	temp := body.Temperature
	if temp == 0 {
		temp = 28
	}
	maxT := body.MaxTimeMinutes
	if maxT == 0 {
		maxT = 180
	}
	capacity := body.VehicleCapacity
	if capacity == 0 {
		capacity = depot.Capacity
	}
	if capacity == 0 {
		capacity = 100
	}

	now := time.Now()
	nodes := make([]ai.SchoolNode, len(orders))
	for i, o := range orders {
		tw := 60.0
		if o.DeadlineAt != nil {
			if m := o.DeadlineAt.Sub(now).Minutes(); m > 5 {
				tw = m
			} else {
				tw = 5
			}
		}
		nodes[i] = ai.SchoolNode{
			ID:                i + 1, // integer id for app.py; mapped back via orders[id-1]
			Name:              o.RecipientName,
			Latitude:          o.Latitude,
			Longitude:         o.Longitude,
			Demand:            o.Quantity,
			TimeWindowMinutes: tw,
			FoodCategory:      o.FoodCategory,
		}
	}

	resp, err := s.ai.Optimize(ctx, ai.RouteOptimizeRequest{
		DepotLat:        depot.Lat,
		DepotLng:        depot.Lng,
		Schools:         nodes,
		VehicleCapacity: capacity,
		MaxTimeMinutes:  maxT,
		Temperature:     temp,
	})
	if err != nil {
		return nil, nil, nil, err
	}
	return resp, orders, depot, nil
}

func buildSteps(resp *ai.RouteOptimizeResponse, orders []store.Order) []stepOut {
	steps := make([]stepOut, 0, len(resp.Route))
	for _, st := range resp.Route {
		idx := st.SchoolID - 1
		if idx < 0 || idx >= len(orders) {
			continue
		}
		o := orders[idx]
		steps = append(steps, stepOut{
			Sequence:             st.Sequence,
			OrderID:              o.ID,
			Code:                 o.Code,
			Recipient:            o.RecipientName,
			DistanceKm:           st.DistanceKm,
			EstimatedMinutes:     st.EstimatedMinutes,
			SpoilageRisk:         st.SpoilageRisk,
			MinutesUntilSpoilage: st.MinutesUntilSpoilage,
		})
	}
	return steps
}

// POST /dispatch/optimize — preview only, no persistence.
func (s *Server) handleOptimize(w http.ResponseWriter, r *http.Request) {
	if !isManager(r) {
		writeJSON(w, http.StatusForbidden, map[string]string{"message": "Hanya owner/admin."})
		return
	}
	var body dispatchBody
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"message": "Invalid JSON."})
		return
	}

	resp, orders, _, err := s.optimizeFor(r, body)
	if err != nil {
		s.dispatchError(w, err)
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"route":             buildSteps(resp, orders),
		"total_distance_km": resp.TotalDistanceKm,
		"total_time_minutes": resp.TotalTimeMinutes,
		"spoilage_summary":  resp.SpoilageRiskSummary,
		"model_type":        resp.ModelType,
	})
}

// POST /dispatch/assign — optimize then persist route + assignments + mark orders assigned.
func (s *Server) handleAssign(w http.ResponseWriter, r *http.Request) {
	if !isManager(r) {
		writeJSON(w, http.StatusForbidden, map[string]string{"message": "Hanya owner/admin."})
		return
	}
	var body dispatchBody
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"message": "Invalid JSON."})
		return
	}
	if body.CourierID == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"message": "courier_id wajib diisi."})
		return
	}

	resp, orders, depot, err := s.optimizeFor(r, body)
	if err != nil {
		s.dispatchError(w, err)
		return
	}

	steps := buildSteps(resp, orders)
	persistSteps := make([]store.PersistStep, len(steps))
	for i, st := range steps {
		persistSteps[i] = store.PersistStep{
			OrderID:              st.OrderID,
			Sequence:             st.Sequence,
			EstimatedMinutes:     st.EstimatedMinutes,
			DistanceKm:           st.DistanceKm,
			SpoilageRisk:         st.SpoilageRisk,
			MinutesUntilSpoilage: st.MinutesUntilSpoilage,
		}
	}
	riskJSON, _ := json.Marshal(resp.SpoilageRiskSummary)

	routeID, err := s.store.PersistAssignment(r.Context(), store.PersistRouteParams{
		CompanyID:        companyID(r),
		CourierID:        body.CourierID,
		DepotLat:         depot.Lat,
		DepotLng:         depot.Lng,
		Temperature:      defFloat(body.Temperature, 28),
		TotalDistanceKm:  resp.TotalDistanceKm,
		TotalTimeMinutes: resp.TotalTimeMinutes,
		ModelType:        resp.ModelType,
		RiskSummary:      riskJSON,
		Steps:            persistSteps,
	})
	if err != nil {
		s.log.Error("persist assignment", "err", err)
		writeJSON(w, http.StatusInternalServerError, map[string]string{"message": "Gagal menyimpan tugas."})
		return
	}

	// realtime: push a "new task" notification to the assigned courier
	notif, _ := json.Marshal(map[string]any{
		"type": "notif", "kind": "new_task", "color": "danger",
		"title": "Tugas baru", "body": "Kamu mendapat " + strconv.Itoa(len(steps)) + " pengantaran.",
		"route_id": routeID,
	})
	s.hub.Broadcast(companyID(r), notif, func(cl *ws.Client) bool { return cl.User == body.CourierID })

	// background push (app closed) via Expo
	if tok, _ := s.store.GetPushToken(r.Context(), body.CourierID); tok != "" {
		go push.SendExpo(tok, "Tugas baru", "Kamu mendapat "+strconv.Itoa(len(steps))+" pengantaran.",
			map[string]any{"route_id": routeID, "kind": "new_task"})
	}

	writeJSON(w, http.StatusCreated, map[string]any{
		"route_id":          routeID,
		"courier_id":        body.CourierID,
		"route":             steps,
		"total_distance_km": resp.TotalDistanceKm,
		"total_time_minutes": resp.TotalTimeMinutes,
		"model_type":        resp.ModelType,
	})
}

func (s *Server) dispatchError(w http.ResponseWriter, err error) {
	if errors.Is(err, errNoOrders) {
		writeJSON(w, http.StatusUnprocessableEntity, map[string]string{"message": "Tidak ada pesanan pending yang cocok."})
		return
	}
	s.log.Error("dispatch", "err", err)
	writeJSON(w, http.StatusBadGateway, map[string]string{"message": "AI dispatch gagal: " + err.Error()})
}

func isManager(r *http.Request) bool {
	switch role(r) {
	case "owner", "admin":
		return true
	}
	return false
}

func defFloat(v, def float64) float64 {
	if v == 0 {
		return def
	}
	return v
}
