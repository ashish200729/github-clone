package token

import (
	"crypto/hmac"
	"crypto/sha256"
	"crypto/subtle"
	"encoding/base64"
	"encoding/json"
	"net/http"
	"regexp"
	"strings"
	"time"

	"github-clone/apps/git-service/internal/apperror"
)

const (
	expectedAudience = "github-clone-git"
	expectedIssuer   = "github-clone-api"
	clockSkew        = 5 * time.Second
)

var uuidPattern = regexp.MustCompile(`^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$`)

type Payload struct {
	Audience string   `json:"aud"`
	Issuer   string   `json:"iss"`
	Subject  string   `json:"sub"`
	Owner    string   `json:"owner"`
	Repo     string   `json:"repo"`
	Scope    []string `json:"scope"`
	IssuedAt int64    `json:"iat"`
	Expiry   int64    `json:"exp"`
}

func Verify(token string, secret string, owner string, repo string, requireWrite bool, now time.Time) (*Payload, error) {
	parts := strings.Split(token, ".")
	if len(parts) != 2 || parts[0] == "" || parts[1] == "" {
		return nil, apperror.New("UNAUTHORIZED", http.StatusUnauthorized, "The Git transport token format is invalid.")
	}

	expectedSignature := sign(parts[0], secret)
	actualSignature, err := base64.RawURLEncoding.DecodeString(parts[1])
	if err != nil {
		return nil, apperror.New("UNAUTHORIZED", http.StatusUnauthorized, "The Git transport token signature is invalid.")
	}

	if len(actualSignature) != len(expectedSignature) || subtle.ConstantTimeCompare(actualSignature, expectedSignature) != 1 {
		return nil, apperror.New("UNAUTHORIZED", http.StatusUnauthorized, "The Git transport token signature is invalid.")
	}

	payloadBytes, err := base64.RawURLEncoding.DecodeString(parts[0])
	if err != nil {
		return nil, apperror.New("UNAUTHORIZED", http.StatusUnauthorized, "The Git transport token payload is invalid.")
	}

	var payload Payload
	if err := json.Unmarshal(payloadBytes, &payload); err != nil {
		return nil, apperror.New("UNAUTHORIZED", http.StatusUnauthorized, "The Git transport token payload is invalid.")
	}

	if payload.Audience != expectedAudience || payload.Issuer != expectedIssuer {
		return nil, apperror.New("UNAUTHORIZED", http.StatusUnauthorized, "The Git transport token audience or issuer is invalid.")
	}

	if !uuidPattern.MatchString(payload.Subject) {
		return nil, apperror.New("UNAUTHORIZED", http.StatusUnauthorized, "The Git transport token subject is invalid.")
	}

	if payload.Owner != owner || payload.Repo != repo {
		return nil, apperror.New("FORBIDDEN", http.StatusForbidden, "The Git transport token does not match this repository.")
	}

	issuedAt := time.Unix(payload.IssuedAt, 0)
	expiresAt := time.Unix(payload.Expiry, 0)

	if expiresAt.Before(issuedAt) {
		return nil, apperror.New("UNAUTHORIZED", http.StatusUnauthorized, "The Git transport token expiration is invalid.")
	}

	if now.After(expiresAt.Add(clockSkew)) {
		return nil, apperror.New("UNAUTHORIZED", http.StatusUnauthorized, "The Git transport token has expired.")
	}

	if now.Before(issuedAt.Add(-clockSkew)) {
		return nil, apperror.New("UNAUTHORIZED", http.StatusUnauthorized, "The Git transport token was issued in the future.")
	}

	if !hasScope(payload.Scope, "read") {
		return nil, apperror.New("FORBIDDEN", http.StatusForbidden, "The Git transport token does not allow repository reads.")
	}

	if requireWrite && !hasScope(payload.Scope, "write") {
		return nil, apperror.New("FORBIDDEN", http.StatusForbidden, "The Git transport token does not allow repository writes.")
	}

	return &payload, nil
}

func hasScope(scopes []string, scope string) bool {
	for _, candidate := range scopes {
		if candidate == scope {
			return true
		}
	}

	return false
}

func sign(encodedPayload string, secret string) []byte {
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write([]byte(encodedPayload))
	return mac.Sum(nil)
}
