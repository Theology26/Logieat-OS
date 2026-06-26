// Package ai is the thin client/bridge to the FastAPI service (app.py).
// Types mirror app.py's /routing/optimize schema exactly.
package ai

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"time"
)

type SchoolNode struct {
	ID                int     `json:"id"`
	Name              string  `json:"name"`
	Latitude          float64 `json:"latitude"`
	Longitude         float64 `json:"longitude"`
	Demand            int     `json:"demand"`
	TimeWindowMinutes float64 `json:"time_window_minutes"`
	FoodCategory      *string `json:"food_category,omitempty"`
}

type RouteOptimizeRequest struct {
	DepotLat        float64      `json:"depot_lat"`
	DepotLng        float64      `json:"depot_lng"`
	Schools         []SchoolNode `json:"schools"`
	VehicleCapacity int          `json:"vehicle_capacity"`
	MaxTimeMinutes  float64      `json:"max_time_minutes"`
	Temperature     float64      `json:"temperature"`
}

type RouteStep struct {
	Sequence             int     `json:"sequence"`
	SchoolID             int     `json:"school_id"`
	SchoolName           string  `json:"school_name"`
	EstimatedMinutes     float64 `json:"estimated_minutes"`
	DistanceKm           float64 `json:"distance_km"`
	SpoilageRisk         string  `json:"spoilage_risk"`
	MinutesUntilSpoilage float64 `json:"minutes_until_spoilage"`
}

type RouteOptimizeResponse struct {
	Route               []RouteStep    `json:"route"`
	TotalSchools        int            `json:"total_schools"`
	TotalDistanceKm     float64        `json:"total_distance_km"`
	TotalTimeMinutes    float64        `json:"total_time_minutes"`
	SpoilageRiskSummary map[string]int `json:"spoilage_risk_summary"`
	ModelType           string         `json:"model_type"`
	Device              string         `json:"device"`
	InferenceTimeMs     float64        `json:"inference_time_ms"`
}

type Client struct {
	baseURL string
	http    *http.Client
}

func NewClient(baseURL string) *Client {
	return &Client{baseURL: baseURL, http: &http.Client{Timeout: 30 * time.Second}}
}

func (c *Client) Optimize(ctx context.Context, req RouteOptimizeRequest) (*RouteOptimizeResponse, error) {
	body, err := json.Marshal(req)
	if err != nil {
		return nil, err
	}
	httpReq, err := http.NewRequestWithContext(ctx, http.MethodPost, c.baseURL+"/routing/optimize", bytes.NewReader(body))
	if err != nil {
		return nil, err
	}
	httpReq.Header.Set("Content-Type", "application/json")

	resp, err := c.http.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("ai service unreachable: %w", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("ai service status %d", resp.StatusCode)
	}

	var out RouteOptimizeResponse
	if err := json.NewDecoder(resp.Body).Decode(&out); err != nil {
		return nil, err
	}
	return &out, nil
}
