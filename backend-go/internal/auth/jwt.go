// Package auth verifies the HS256 JWT issued by Laravel (shared secret).
// No external dependency — stdlib crypto is enough for HS256.
package auth

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"errors"
	"strings"
	"time"
)

type Claims struct {
	Sub       string `json:"sub"`
	CompanyID string `json:"company_id"`
	Role      string `json:"role"`
	Exp       int64  `json:"exp"`
}

// SignHS256 issues a JWT with the same shape Laravel and the verifier expect.
func SignHS256(c Claims, secret string) (string, error) {
	enc := func(b []byte) string { return base64.RawURLEncoding.EncodeToString(b) }
	header := enc([]byte(`{"alg":"HS256","typ":"JWT"}`))
	payload, err := json.Marshal(c)
	if err != nil {
		return "", err
	}
	signing := header + "." + enc(payload)
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write([]byte(signing))
	return signing + "." + enc(mac.Sum(nil)), nil
}

// VerifyHS256 validates signature + expiry and returns the claims.
func VerifyHS256(token, secret string) (*Claims, error) {
	parts := strings.Split(token, ".")
	if len(parts) != 3 {
		return nil, errors.New("malformed token")
	}

	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write([]byte(parts[0] + "." + parts[1]))
	expected := base64.RawURLEncoding.EncodeToString(mac.Sum(nil))
	if !hmac.Equal([]byte(expected), []byte(parts[2])) {
		return nil, errors.New("invalid signature")
	}

	payload, err := base64.RawURLEncoding.DecodeString(parts[1])
	if err != nil {
		return nil, err
	}
	var c Claims
	if err := json.Unmarshal(payload, &c); err != nil {
		return nil, err
	}
	if c.Exp > 0 && time.Now().Unix() > c.Exp {
		return nil, errors.New("token expired")
	}
	if c.CompanyID == "" {
		return nil, errors.New("missing company_id")
	}
	return &c, nil
}
