package db

import (
	"database/sql"
	"time"

	_ "github.com/go-sql-driver/mysql"
)

// Open returns a pooled MySQL connection (shared DB with Laravel).
func Open(dsn string) (*sql.DB, error) {
	d, err := sql.Open("mysql", dsn)
	if err != nil {
		return nil, err
	}
	d.SetConnMaxLifetime(3 * time.Minute)
	d.SetMaxOpenConns(10)
	d.SetMaxIdleConns(10)
	return d, d.Ping()
}
