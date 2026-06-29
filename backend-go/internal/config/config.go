package config

import "os"

// Config holds runtime configuration loaded from environment variables.
// Defaults target a local Laragon setup (MySQL on 3306, Redis on 6379).
type Config struct {
	Port         string
	DBDSN        string // MySQL DSN, shared with Laravel's database
	RedisURL     string
	AIServiceURL string // app.py FastAPI
	OSRMURL      string
	JWTSecret    string // MUST match Laravel's JWT secret
}

func Load() Config {
	return Config{
		Port:         env("PORT", "8080"),
		DBDSN:        env("DB_DSN", "root:@tcp(127.0.0.1:3306)/logieat?parseTime=true&loc=UTC"),
		RedisURL:     env("REDIS_URL", "redis://127.0.0.1:6379"),
		AIServiceURL: env("AI_SERVICE_URL", "http://127.0.0.1:9000"),
		OSRMURL:      env("OSRM_URL", "http://127.0.0.1:5000"),
		JWTSecret:    env("JWT_SECRET", "logieat-dev-shared-secret-change-in-prod"), // must match Laravel
	}
}

func env(key, def string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return def
}
