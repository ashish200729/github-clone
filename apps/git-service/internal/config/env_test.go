package config

import (
	"os"
	"path/filepath"
	"testing"
)

func TestLoadEnvFileSetsUnsetValuesAndPreservesExistingOnes(t *testing.T) {
	tempDir := t.TempDir()
	envPath := filepath.Join(tempDir, ".env")

	content := "GIT_REPOSITORY_ROOT=/tmp/repos\nGIT_SERVICE_PORT=9090\nQUOTED_VALUE=\"hello\"\n"
	if err := os.WriteFile(envPath, []byte(content), 0o644); err != nil {
		t.Fatalf("write env file: %v", err)
	}

	t.Setenv("GIT_SERVICE_PORT", "8080")

	if err := loadEnvFile(envPath); err != nil {
		t.Fatalf("load env file: %v", err)
	}

	if got := os.Getenv("GIT_REPOSITORY_ROOT"); got != "/tmp/repos" {
		t.Fatalf("expected repository root to be loaded, got %q", got)
	}

	if got := os.Getenv("GIT_SERVICE_PORT"); got != "8080" {
		t.Fatalf("expected existing env to win, got %q", got)
	}

	if got := os.Getenv("QUOTED_VALUE"); got != "hello" {
		t.Fatalf("expected quotes to be stripped, got %q", got)
	}
}
