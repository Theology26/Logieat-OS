// Package store holds the MySQL queries for dispatch (shared DB with Laravel).
// Every query is tenant-scoped by company_id.
package store

import (
	"context"
	"database/sql"
	"strings"
	"time"

	"github.com/logieatos/core/internal/uuid"
)

type Store struct{ db *sql.DB }

func New(db *sql.DB) *Store { return &Store{db: db} }

type Depot struct {
	Lat, Lng float64
	Capacity int
}

func (s *Store) GetDepot(ctx context.Context, companyID string) (*Depot, error) {
	var d Depot
	var lat, lng sql.NullFloat64
	err := s.db.QueryRowContext(ctx,
		`SELECT depot_lat, depot_lng, vehicle_capacity_default FROM companies WHERE id = ?`,
		companyID,
	).Scan(&lat, &lng, &d.Capacity)
	if err != nil {
		return nil, err
	}
	d.Lat, d.Lng = lat.Float64, lng.Float64
	return &d, nil
}

type Order struct {
	ID            string
	Code          string
	RecipientName string
	Latitude      float64
	Longitude     float64
	Quantity      int
	FoodCategory  *string
	DeadlineAt    *time.Time
}

// GetPendingOrders returns the given orders that are still pending (tenant-scoped).
func (s *Store) GetPendingOrders(ctx context.Context, companyID string, ids []string) ([]Order, error) {
	if len(ids) == 0 {
		return nil, nil
	}
	placeholders := strings.TrimRight(strings.Repeat("?,", len(ids)), ",")
	args := make([]any, 0, len(ids)+1)
	args = append(args, companyID)
	for _, id := range ids {
		args = append(args, id)
	}

	rows, err := s.db.QueryContext(ctx,
		`SELECT id, code, recipient_name, latitude, longitude, quantity, food_category, deadline_at
		   FROM orders
		  WHERE company_id = ? AND id IN (`+placeholders+`) AND status = 'pending'`,
		args...,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []Order
	for rows.Next() {
		var o Order
		var fc sql.NullString
		var dl sql.NullTime
		if err := rows.Scan(&o.ID, &o.Code, &o.RecipientName, &o.Latitude, &o.Longitude, &o.Quantity, &fc, &dl); err != nil {
			return nil, err
		}
		if fc.Valid {
			v := fc.String
			o.FoodCategory = &v
		}
		if dl.Valid {
			t := dl.Time
			o.DeadlineAt = &t
		}
		out = append(out, o)
	}
	return out, rows.Err()
}

type PersistStep struct {
	OrderID              string
	Sequence             int
	EstimatedMinutes     float64
	DistanceKm           float64
	SpoilageRisk         string
	MinutesUntilSpoilage float64
}

type PersistRouteParams struct {
	CompanyID        string
	CourierID        string
	DepotLat         float64
	DepotLng         float64
	Temperature      float64
	TotalDistanceKm  float64
	TotalTimeMinutes float64
	ModelType        string
	RiskSummary      []byte // JSON
	Steps            []PersistStep
}

// PersistAssignment writes the route + stops and marks orders assigned, in one transaction.
func (s *Store) PersistAssignment(ctx context.Context, p PersistRouteParams) (string, error) {
	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return "", err
	}
	defer tx.Rollback()

	routeID := uuid.New()
	now := time.Now().UTC()

	if _, err := tx.ExecContext(ctx,
		`INSERT INTO routes
		   (id, company_id, courier_id, status, depot_lat, depot_lng, temperature,
		    total_distance_km, total_time_minutes, model_type, risk_summary, created_at, updated_at)
		 VALUES (?, ?, ?, 'assigned', ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		routeID, p.CompanyID, p.CourierID, p.DepotLat, p.DepotLng, p.Temperature,
		p.TotalDistanceKm, p.TotalTimeMinutes, p.ModelType, p.RiskSummary, now, now,
	); err != nil {
		return "", err
	}

	for _, st := range p.Steps {
		if _, err := tx.ExecContext(ctx,
			`INSERT INTO route_assignments
			   (id, company_id, route_id, order_id, sequence, estimated_minutes, distance_km,
			    spoilage_risk, minutes_until_spoilage, status)
			 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
			uuid.New(), p.CompanyID, routeID, st.OrderID, st.Sequence,
			st.EstimatedMinutes, st.DistanceKm, st.SpoilageRisk, st.MinutesUntilSpoilage,
		); err != nil {
			return "", err
		}
		if _, err := tx.ExecContext(ctx,
			`UPDATE orders SET status = 'assigned', spoilage_risk = ?, updated_at = ?
			  WHERE id = ? AND company_id = ?`,
			st.SpoilageRisk, now, st.OrderID, p.CompanyID,
		); err != nil {
			return "", err
		}
	}

	if err := tx.Commit(); err != nil {
		return "", err
	}
	return routeID, nil
}

// UpsertLocation writes the courier's latest position (one row per courier).
func (s *Store) UpsertLocation(ctx context.Context, companyID, courierID, routeID string, lat, lng float64, heading, speed float64) error {
	var rid any
	if routeID != "" {
		rid = routeID
	}
	_, err := s.db.ExecContext(ctx,
		`INSERT INTO current_locations
		   (courier_id, company_id, route_id, latitude, longitude, heading, speed_kmh, recorded_at)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?)
		 ON DUPLICATE KEY UPDATE
		   company_id=VALUES(company_id), route_id=VALUES(route_id),
		   latitude=VALUES(latitude), longitude=VALUES(longitude),
		   heading=VALUES(heading), speed_kmh=VALUES(speed_kmh), recorded_at=VALUES(recorded_at)`,
		courierID, companyID, rid, lat, lng, heading, speed, time.Now().UTC(),
	)
	return err
}

// GetPushToken returns a user's stored Expo/FCM push token (may be empty).
func (s *Store) GetPushToken(ctx context.Context, userID string) (string, error) {
	var t sql.NullString
	if err := s.db.QueryRowContext(ctx, `SELECT fcm_token FROM users WHERE id = ?`, userID).Scan(&t); err != nil {
		return "", err
	}
	return t.String, nil
}

// InsertMessage persists a chat message and returns its id + timestamp.
func (s *Store) InsertMessage(ctx context.Context, companyID, routeID, senderID, body string) (string, time.Time, error) {
	id := uuid.New()
	now := time.Now().UTC()
	var rid any
	if routeID != "" {
		rid = routeID
	}
	_, err := s.db.ExecContext(ctx,
		`INSERT INTO messages (id, company_id, route_id, sender_id, body, created_at, updated_at)
		 VALUES (?, ?, ?, ?, ?, ?, ?)`,
		id, companyID, rid, senderID, body, now, now,
	)
	return id, now, err
}
