package storage

import "testing"

func TestNormalizeRepoRelativePathRejectsTraversal(t *testing.T) {
	if _, err := NormalizeRepoRelativePath("../secret.txt", false); err == nil {
		t.Fatal("NormalizeRepoRelativePath() accepted traversal input")
	}
}

func TestNormalizeRepoRelativePathAcceptsNestedPath(t *testing.T) {
	normalized, err := NormalizeRepoRelativePath("docs/intro.md", false)
	if err != nil {
		t.Fatalf("NormalizeRepoRelativePath() returned unexpected error: %v", err)
	}

	if normalized != "docs/intro.md" {
		t.Fatalf("NormalizeRepoRelativePath() returned %q, want %q", normalized, "docs/intro.md")
	}
}
