package store

import (
	"context"
	"database/sql"
	"strings"
	"time"

	"github.com/logieatos/core/internal/uuid"
)

// ---- Auth ----

type UserAuth struct {
	ID, CompanyID, Role, Status, Name, Email, PasswordHash string
}

func (s *Store) GetUserByEmail(ctx context.Context, email string) (*UserAuth, error) {
	var u UserAuth
	var em sql.NullString
	err := s.db.QueryRowContext(ctx,
		`SELECT id, company_id, role, status, name, COALESCE(email,''), password
		   FROM users WHERE email = ? LIMIT 1`, email,
	).Scan(&u.ID, &u.CompanyID, &u.Role, &u.Status, &u.Name, &em, &u.PasswordHash)
	if err != nil {
		return nil, err
	}
	u.Email = em.String
	// Laravel hashes with the $2y$ bcrypt variant; Go's bcrypt expects $2a$/$2b$.
	if strings.HasPrefix(u.PasswordHash, "$2y$") {
		u.PasswordHash = "$2a$" + u.PasswordHash[4:]
	}
	return &u, nil
}

func (s *Store) GetUserByID(ctx context.Context, id string) (map[string]any, error) {
	var name, role string
	var email, phone, plate sql.NullString
	err := s.db.QueryRowContext(ctx,
		`SELECT name, role, COALESCE(email,''), COALESCE(phone,''), COALESCE(vehicle_plate,'')
		   FROM users WHERE id = ?`, id,
	).Scan(&name, &role, &email, &phone, &plate)
	if err != nil {
		return nil, err
	}
	return map[string]any{"id": id, "name": name, "role": role,
		"email": email.String, "phone": phone.String, "vehicle_plate": plate.String}, nil
}

func (s *Store) GetCompanyByID(ctx context.Context, id string) (map[string]any, error) {
	var name, code string
	var addr sql.NullString
	var lat, lng sql.NullFloat64
	var sub string
	err := s.db.QueryRowContext(ctx,
		`SELECT name, catering_code, COALESCE(depot_address,''), depot_lat, depot_lng, subscription_status
		   FROM companies WHERE id = ?`, id,
	).Scan(&name, &code, &addr, &lat, &lng, &sub)
	if err != nil {
		return nil, err
	}
	return map[string]any{"id": id, "name": name, "catering_code": code,
		"depot_address": addr.String, "depot_lat": lat.Float64, "depot_lng": lng.Float64,
		"subscription_status": sub}, nil
}

// ---- Orders ----

func (s *Store) ListOrders(ctx context.Context, companyID string) ([]map[string]any, error) {
	rows, err := s.db.QueryContext(ctx,
		`SELECT id, code, recipient_name, menu_name, COALESCE(food_category,''), quantity,
		        COALESCE(price,0), latitude, longitude, status, COALESCE(spoilage_risk,''), created_at
		   FROM orders WHERE company_id = ? ORDER BY created_at DESC`, companyID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []map[string]any{}
	for rows.Next() {
		var id, code, rn, menu, fc, status, risk string
		var qty int
		var price, lat, lng float64
		var created time.Time
		if err := rows.Scan(&id, &code, &rn, &menu, &fc, &qty, &price, &lat, &lng, &status, &risk, &created); err != nil {
			return nil, err
		}
		out = append(out, map[string]any{"id": id, "code": code, "recipient_name": rn,
			"menu_name": menu, "food_category": fc, "quantity": qty, "price": price,
			"latitude": lat, "longitude": lng, "status": status, "spoilage_risk": risk,
			"created_at": created})
	}
	return out, rows.Err()
}

type NewOrder struct {
	RecipientName, Menu, FoodCategory, Address string
	Quantity                                   int
	Price                                      float64
	Latitude, Longitude                        float64
}

func (s *Store) CreateOrder(ctx context.Context, companyID string, o NewOrder) (map[string]any, error) {
	var count int
	if err := s.db.QueryRowContext(ctx, `SELECT COUNT(*) FROM orders WHERE company_id = ?`, companyID).Scan(&count); err != nil {
		return nil, err
	}
	id := uuid.New()
	code := "#" + itoa(1021+count)
	now := time.Now().UTC()
	deadline := now.Add(3 * time.Hour)
	_, err := s.db.ExecContext(ctx,
		`INSERT INTO orders (id, company_id, code, recipient_name, menu_name, food_category,
		   quantity, price, address, latitude, longitude, deadline_at, status, created_at, updated_at)
		 VALUES (?,?,?,?,?,?,?,?,?,?,?,?,'pending',?,?)`,
		id, companyID, code, o.RecipientName, o.Menu, nullStr(o.FoodCategory), o.Quantity,
		o.Price, o.Address, o.Latitude, o.Longitude, deadline, now, now)
	if err != nil {
		return nil, err
	}
	return map[string]any{"id": id, "code": code, "recipient_name": o.RecipientName,
		"menu_name": o.Menu, "food_category": o.FoodCategory, "quantity": o.Quantity,
		"price": o.Price, "latitude": o.Latitude, "longitude": o.Longitude, "status": "pending"}, nil
}

// ---- Couriers ----

func (s *Store) ListCouriers(ctx context.Context, companyID string) ([]map[string]any, error) {
	rows, err := s.db.QueryContext(ctx,
		`SELECT id, name, role, status, COALESCE(phone,''), COALESCE(vehicle_plate,'')
		   FROM users WHERE company_id = ? AND role = 'courier' ORDER BY name`, companyID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []map[string]any{}
	for rows.Next() {
		var id, name, role, status, phone, plate string
		if err := rows.Scan(&id, &name, &role, &status, &phone, &plate); err != nil {
			return nil, err
		}
		out = append(out, map[string]any{"id": id, "name": name, "role": role,
			"status": status, "phone": phone, "vehicle_plate": plate})
	}
	return out, rows.Err()
}

// ---- Fleet ----

func (s *Store) Fleet(ctx context.Context, companyID string) (map[string]any, error) {
	depot, _ := s.GetDepot(ctx, companyID)
	couriers, err := s.ListCouriers(ctx, companyID)
	if err != nil {
		return nil, err
	}
	rows, err := s.db.QueryContext(ctx,
		`SELECT courier_id, latitude, longitude, COALESCE(heading,0), COALESCE(speed_kmh,0)
		   FROM current_locations WHERE company_id = ?`, companyID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	locs := []map[string]any{}
	for rows.Next() {
		var cid string
		var lat, lng, hd, sp float64
		if err := rows.Scan(&cid, &lat, &lng, &hd, &sp); err != nil {
			return nil, err
		}
		locs = append(locs, map[string]any{"courier_id": cid, "latitude": lat,
			"longitude": lng, "heading": hd, "speed_kmh": sp})
	}
	d := map[string]any{}
	if depot != nil {
		d = map[string]any{"lat": depot.Lat, "lng": depot.Lng}
	}
	return map[string]any{"couriers": couriers, "locations": locs, "depot": d}, nil
}

// ---- Analytics ----

func (s *Store) Analytics(ctx context.Context, companyID string) (map[string]any, error) {
	var salesToday, ordersToday, deliveries, dispatched int
	var salesSum float64
	s.db.QueryRowContext(ctx, `SELECT COALESCE(SUM(price),0), COUNT(*) FROM orders WHERE company_id=? AND DATE(created_at)=CURDATE()`, companyID).Scan(&salesSum, &ordersToday)
	salesToday = int(salesSum)
	s.db.QueryRowContext(ctx, `SELECT COUNT(*) FROM orders WHERE company_id=? AND status='delivered'`, companyID).Scan(&deliveries)
	s.db.QueryRowContext(ctx, `SELECT COUNT(*) FROM orders WHERE company_id=? AND status IN ('assigned','picked_up','delivered')`, companyID).Scan(&dispatched)
	onTime := 100
	if dispatched > 0 {
		onTime = deliveries * 100 / dispatched
	}

	// 12-month trend
	trend := make([]map[string]any, 12)
	now := time.Now()
	idx := map[string]int{}
	for i := 0; i < 12; i++ {
		m := now.AddDate(0, -(11 - i), 0)
		key := m.Format("2006-01")
		idx[key] = i
		trend[i] = map[string]any{"month": m.Format("Jan"), "sales": 0.0}
	}
	rows, err := s.db.QueryContext(ctx,
		`SELECT DATE_FORMAT(created_at,'%Y-%m') ym, COALESCE(SUM(price),0)
		   FROM orders WHERE company_id=? AND created_at >= DATE_SUB(CURDATE(), INTERVAL 11 MONTH)
		  GROUP BY ym`, companyID)
	if err == nil {
		defer rows.Close()
		for rows.Next() {
			var ym string
			var sum float64
			rows.Scan(&ym, &sum)
			if i, ok := idx[ym]; ok {
				trend[i]["sales"] = sum
			}
		}
	}

	// courier km recap
	crows, err := s.db.QueryContext(ctx,
		`SELECT u.name, COALESCE(SUM(r.total_distance_km),0) km
		   FROM users u LEFT JOIN routes r ON r.courier_id = u.id AND r.company_id = u.company_id
		  WHERE u.company_id = ? AND u.role = 'courier' GROUP BY u.id, u.name ORDER BY km DESC`, companyID)
	couriers := []map[string]any{}
	if err == nil {
		defer crows.Close()
		for crows.Next() {
			var name string
			var km float64
			crows.Scan(&name, &km)
			couriers = append(couriers, map[string]any{"name": name, "km": km})
		}
	}

	return map[string]any{
		"kpis": map[string]any{"sales_today": salesToday, "orders_today": ordersToday,
			"deliveries": deliveries, "on_time_pct": onTime},
		"trend":    map[string]any{"month": trend},
		"couriers": couriers,
	}, nil
}

func nullStr(s string) any {
	if s == "" {
		return nil
	}
	return s
}

func itoa(n int) string {
	if n == 0 {
		return "0"
	}
	neg := n < 0
	if neg {
		n = -n
	}
	b := [20]byte{}
	i := len(b)
	for n > 0 {
		i--
		b[i] = byte('0' + n%10)
		n /= 10
	}
	if neg {
		i--
		b[i] = '-'
	}
	return string(b[i:])
}
