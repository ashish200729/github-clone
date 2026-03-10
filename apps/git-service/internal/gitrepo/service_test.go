package gitrepo

import (
	"context"
	"encoding/base64"
	"path/filepath"
	"testing"
)

func TestRepositoryLifecycle(t *testing.T) {
	ctx := context.Background()
	root := t.TempDir()
	service := NewService(root)

	if err := service.CreateBareRepo(ctx, "repo-core-test", "main"); err != nil {
		t.Fatalf("CreateBareRepo() returned unexpected error: %v", err)
	}

	commitSHA, err := service.InitializeReadme(
		ctx,
		"repo-core-test",
		"main",
		"# Demo\n",
		"Initial commit",
		Author{Name: "Ashish", Email: "ashish@example.com"},
	)
	if err != nil {
		t.Fatalf("InitializeReadme() returned unexpected error: %v", err)
	}

	if commitSHA == "" {
		t.Fatal("InitializeReadme() returned an empty commit SHA")
	}

	branches, err := service.ListBranches(ctx, "repo-core-test")
	if err != nil {
		t.Fatalf("ListBranches() returned unexpected error: %v", err)
	}

	if len(branches) != 1 || branches[0].Name != "main" {
		t.Fatalf("ListBranches() returned %+v, want a single main branch", branches)
	}

	commits, err := service.ListCommits(ctx, "repo-core-test", "main", 10)
	if err != nil {
		t.Fatalf("ListCommits() returned unexpected error: %v", err)
	}

	if len(commits) != 1 || commits[0].Subject != "Initial commit" {
		t.Fatalf("ListCommits() returned %+v, want the initial commit", commits)
	}

	tree, err := service.GetTree(ctx, "repo-core-test", "main", "")
	if err != nil {
		t.Fatalf("GetTree() returned unexpected error: %v", err)
	}

	if len(tree) != 1 || tree[0].Path != "README.md" {
		t.Fatalf("GetTree() returned %+v, want README.md at the root", tree)
	}

	blob, err := service.GetBlob(ctx, "repo-core-test", "main", "README.md")
	if err != nil {
		t.Fatalf("GetBlob() returned unexpected error: %v", err)
	}

	if blob.Content != "# Demo\n" {
		t.Fatalf("GetBlob() returned %q, want %q", blob.Content, "# Demo\n")
	}

	secondCommit, err := service.CommitFiles(
		ctx,
		"repo-core-test",
		"main",
		"Add docs",
		Author{Name: "Ashish", Email: "ashish@example.com"},
		[]CommitFile{
			{
				Path:          filepath.ToSlash("docs/intro.md"),
				ContentBase64: base64.StdEncoding.EncodeToString([]byte("Hello docs\n")),
			},
		},
	)
	if err != nil {
		t.Fatalf("CommitFiles() returned unexpected error: %v", err)
	}

	if secondCommit == "" {
		t.Fatal("CommitFiles() returned an empty commit SHA")
	}

	nestedTree, err := service.GetTree(ctx, "repo-core-test", "main", "docs")
	if err != nil {
		t.Fatalf("GetTree(docs) returned unexpected error: %v", err)
	}

	if len(nestedTree) != 1 || nestedTree[0].Path != "docs/intro.md" {
		t.Fatalf("GetTree(docs) returned %+v, want docs/intro.md", nestedTree)
	}
}
