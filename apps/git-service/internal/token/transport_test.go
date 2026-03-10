package token

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"testing"
	"time"
)

func TestVerifyAcceptsValidReadWriteToken(t *testing.T) {
	secret := "transport-secret"
	now := time.Date(2026, 3, 9, 12, 0, 0, 0, time.UTC)
	token := signToken(t, secret, Payload{
		Audience: expectedAudience,
		Issuer:   expectedIssuer,
		Subject:  "0d4516f5-b524-4d3a-aebf-8d3fe1f7a304",
		Owner:    "ashish",
		Repo:     "demo",
		Scope:    []string{"read", "write"},
		IssuedAt: now.Add(-time.Minute).Unix(),
		Expiry:   now.Add(time.Hour).Unix(),
	})

	payload, err := Verify(token, secret, "ashish", "demo", true, now)
	if err != nil {
		t.Fatalf("Verify() returned unexpected error: %v", err)
	}

	if payload.Subject != "0d4516f5-b524-4d3a-aebf-8d3fe1f7a304" {
		t.Fatalf("Verify() returned wrong subject: %s", payload.Subject)
	}
}

func TestVerifyRejectsWrongRepository(t *testing.T) {
	secret := "transport-secret"
	now := time.Date(2026, 3, 9, 12, 0, 0, 0, time.UTC)
	token := signToken(t, secret, Payload{
		Audience: expectedAudience,
		Issuer:   expectedIssuer,
		Subject:  "0d4516f5-b524-4d3a-aebf-8d3fe1f7a304",
		Owner:    "ashish",
		Repo:     "demo",
		Scope:    []string{"read", "write"},
		IssuedAt: now.Add(-time.Minute).Unix(),
		Expiry:   now.Add(time.Hour).Unix(),
	})

	if _, err := Verify(token, secret, "ashish", "other", false, now); err == nil {
		t.Fatal("Verify() succeeded for a token bound to a different repository")
	}
}

func signToken(t *testing.T, secret string, payload Payload) string {
	t.Helper()

	payloadBytes, err := json.Marshal(payload)
	if err != nil {
		t.Fatalf("json.Marshal(): %v", err)
	}

	encodedPayload := base64.RawURLEncoding.EncodeToString(payloadBytes)
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write([]byte(encodedPayload))
	encodedSignature := base64.RawURLEncoding.EncodeToString(mac.Sum(nil))
	return encodedPayload + "." + encodedSignature
}
