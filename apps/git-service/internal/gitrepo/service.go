package gitrepo

import (
	"bytes"
	"context"
	"encoding/base64"
	"errors"
	"fmt"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"strconv"
	"strings"
	"time"
	"unicode/utf8"

	"github-clone/apps/git-service/internal/apperror"
	"github-clone/apps/git-service/internal/storage"
)

const (
	defaultBlobPreviewLimit = 256 * 1024
	defaultCommitLimit      = 25
)

type Service struct {
	repositoryRoot   string
	blobPreviewLimit int64
}

type Author struct {
	Name  string `json:"name"`
	Email string `json:"email"`
}

type Branch struct {
	Name          string    `json:"name"`
	CommitSHA     string    `json:"commitSha"`
	CommittedAt   time.Time `json:"committedAt"`
	AuthorName    string    `json:"authorName"`
	AuthorEmail   string    `json:"authorEmail"`
	CommitSubject string    `json:"commitSubject"`
}

type Commit struct {
	SHA         string    `json:"sha"`
	ShortSHA    string    `json:"shortSha"`
	AuthorName  string    `json:"authorName"`
	AuthorEmail string    `json:"authorEmail"`
	OccurredAt  time.Time `json:"occurredAt"`
	Subject     string    `json:"subject"`
	Body        string    `json:"body"`
}

type TreeEntry struct {
	Name string `json:"name"`
	Path string `json:"path"`
	Type string `json:"type"`
	SHA  string `json:"sha"`
	Size int64  `json:"size,omitempty"`
}

type Blob struct {
	Path    string `json:"path"`
	SHA     string `json:"sha"`
	Size    int64  `json:"size"`
	Content string `json:"content"`
}

type CommitFile struct {
	Path          string `json:"path"`
	ContentBase64 string `json:"contentBase64"`
}

func NewService(repositoryRoot string) *Service {
	return &Service{
		repositoryRoot:   repositoryRoot,
		blobPreviewLimit: defaultBlobPreviewLimit,
	}
}

func (service *Service) CreateBareRepo(ctx context.Context, storageKey string, defaultBranch string) error {
	if err := validateBranchName(ctx, defaultBranch); err != nil {
		return err
	}

	repositoryPath, err := storage.BareRepositoryPath(service.repositoryRoot, storageKey)
	if err != nil {
		return err
	}

	if err := os.MkdirAll(service.repositoryRoot, 0o755); err != nil {
		return apperror.Wrap("INTERNAL_ERROR", http.StatusInternalServerError, "Failed to prepare repository storage.", err)
	}

	if _, err := os.Stat(repositoryPath); err == nil {
		return apperror.New("CONFLICT", http.StatusConflict, "A bare repository already exists for this storage key.")
	} else if !errors.Is(err, os.ErrNotExist) {
		return apperror.Wrap("INTERNAL_ERROR", http.StatusInternalServerError, "Failed to check repository storage state.", err)
	}

	if _, err := runGit(ctx, "", "init", "--bare", "--initial-branch", defaultBranch, repositoryPath); err != nil {
		return mapGitError(err, "Failed to initialize the bare repository.")
	}

	if _, err := runGit(ctx, "", "--git-dir", repositoryPath, "config", "http.receivepack", "true"); err != nil {
		return mapGitError(err, "Failed to enable Git HTTP pushes for the bare repository.")
	}

	return nil
}

func (service *Service) DeleteBareRepo(ctx context.Context, storageKey string) error {
	repositoryPath, err := storage.BareRepositoryPath(service.repositoryRoot, storageKey)
	if err != nil {
		return err
	}

	if err := os.RemoveAll(repositoryPath); err != nil {
		return apperror.Wrap("INTERNAL_ERROR", http.StatusInternalServerError, "Failed to remove the bare repository.", err)
	}

	return nil
}

func (service *Service) InitializeReadme(
	ctx context.Context,
	storageKey string,
	defaultBranch string,
	readmeContent string,
	commitMessage string,
	author Author,
) (string, error) {
	branches, err := service.ListBranches(ctx, storageKey)
	if err != nil && apperror.From(err).Code != "EMPTY_REPOSITORY" {
		return "", err
	}

	if len(branches) > 0 {
		return "", apperror.New("CONFLICT", http.StatusConflict, "The repository already has content and cannot be re-initialized.")
	}

	if strings.TrimSpace(readmeContent) == "" {
		readmeContent = "# Repository\n"
	}

	return service.CommitFiles(ctx, storageKey, defaultBranch, commitMessage, author, []CommitFile{
		{
			Path:          "README.md",
			ContentBase64: base64.StdEncoding.EncodeToString([]byte(readmeContent)),
		},
	})
}

func (service *Service) CommitFiles(
	ctx context.Context,
	storageKey string,
	branch string,
	commitMessage string,
	author Author,
	files []CommitFile,
) (string, error) {
	if err := validateBranchName(ctx, branch); err != nil {
		return "", err
	}

	if err := validateAuthor(author); err != nil {
		return "", err
	}

	if strings.TrimSpace(commitMessage) == "" {
		return "", apperror.New("INVALID_COMMIT_MESSAGE", http.StatusBadRequest, "A commit message is required.")
	}

	if len(files) == 0 {
		return "", apperror.New("INVALID_REQUEST", http.StatusBadRequest, "At least one file is required to create a commit.")
	}

	repositoryPath, err := storage.BareRepositoryPath(service.repositoryRoot, storageKey)
	if err != nil {
		return "", err
	}

	branches, err := service.ListBranches(ctx, storageKey)
	if err != nil && apperror.From(err).Code != "EMPTY_REPOSITORY" {
		return "", err
	}

	repositoryEmpty := len(branches) == 0
	branchExists := false
	for _, existingBranch := range branches {
		if existingBranch.Name == branch {
			branchExists = true
			break
		}
	}

	if !repositoryEmpty && !branchExists {
		return "", apperror.New("BRANCH_NOT_FOUND", http.StatusNotFound, "The requested branch does not exist.")
	}

	workspace, err := os.MkdirTemp("", "github-clone-git-worktree-*")
	if err != nil {
		return "", apperror.Wrap("INTERNAL_ERROR", http.StatusInternalServerError, "Failed to create a temporary Git workspace.", err)
	}
	defer os.RemoveAll(workspace)

	if _, err := runGit(ctx, workspace, "init", "--initial-branch", branch); err != nil {
		return "", mapGitError(err, "Failed to initialize the temporary Git workspace.")
	}

	if _, err := runGit(ctx, workspace, "remote", "add", "origin", repositoryPath); err != nil {
		return "", mapGitError(err, "Failed to configure the Git remote for the temporary workspace.")
	}

	if branchExists {
		if _, err := runGit(ctx, workspace, "fetch", "--depth", "1", "origin", "refs/heads/"+branch); err != nil {
			return "", mapGitError(err, "Failed to fetch the branch before writing a commit.")
		}

		if _, err := runGit(ctx, workspace, "checkout", "-B", branch, "FETCH_HEAD"); err != nil {
			return "", mapGitError(err, "Failed to check out the branch before writing a commit.")
		}
	}

	for _, file := range files {
		normalizedPath, err := storage.NormalizeRepoRelativePath(file.Path, false)
		if err != nil {
			return "", err
		}

		decodedContent, err := base64.StdEncoding.DecodeString(file.ContentBase64)
		if err != nil {
			return "", apperror.New("INVALID_REQUEST", http.StatusBadRequest, "A file payload was not valid base64.")
		}

		absolutePath := filepath.Join(workspace, filepath.FromSlash(normalizedPath))
		if err := os.MkdirAll(filepath.Dir(absolutePath), 0o755); err != nil {
			return "", apperror.Wrap("INTERNAL_ERROR", http.StatusInternalServerError, "Failed to create directories for a file write.", err)
		}

		if err := os.WriteFile(absolutePath, decodedContent, 0o644); err != nil {
			return "", apperror.Wrap("INTERNAL_ERROR", http.StatusInternalServerError, "Failed to write a file into the temporary workspace.", err)
		}
	}

	if _, err := runGit(ctx, workspace, "add", "--all", "."); err != nil {
		return "", mapGitError(err, "Failed to stage repository changes.")
	}

	statusOutput, err := runGit(ctx, workspace, "status", "--porcelain")
	if err != nil {
		return "", mapGitError(err, "Failed to inspect repository changes before committing.")
	}

	if strings.TrimSpace(statusOutput) == "" {
		return "", apperror.New("CONFLICT", http.StatusConflict, "The requested write did not create any repository changes.")
	}

	if _, err := runGit(
		ctx,
		workspace,
		"-c", "user.name="+author.Name,
		"-c", "user.email="+author.Email,
		"commit", "-m", commitMessage,
	); err != nil {
		return "", mapGitError(err, "Failed to create the Git commit.")
	}

	if _, err := runGit(ctx, workspace, "push", "origin", "HEAD:refs/heads/"+branch); err != nil {
		return "", mapPushError(err)
	}

	commitSHA, err := runGit(ctx, workspace, "rev-parse", "HEAD")
	if err != nil {
		return "", mapGitError(err, "Failed to resolve the new commit SHA.")
	}

	return strings.TrimSpace(commitSHA), nil
}

func (service *Service) ListBranches(ctx context.Context, storageKey string) ([]Branch, error) {
	repositoryPath, err := storage.BareRepositoryPath(service.repositoryRoot, storageKey)
	if err != nil {
		return nil, err
	}

	output, err := runGit(
		ctx,
		"",
		"--git-dir", repositoryPath,
		"for-each-ref",
		"--sort=-committerdate",
		"--format=%(refname:short)\x1f%(objectname)\x1f%(committerdate:iso8601-strict)\x1f%(subject)\x1f%(authorname)\x1f%(authoremail)\x1e",
		"refs/heads",
	)
	if err != nil {
		return nil, mapGitError(err, "Failed to list repository branches.")
	}

	output = strings.TrimSpace(output)
	if output == "" {
		return []Branch{}, nil
	}

	lines := strings.Split(strings.TrimSuffix(output, "\x1e"), "\x1e")
	branches := make([]Branch, 0, len(lines))

	for _, line := range lines {
		fields := strings.Split(line, "\x1f")
		if len(fields) != 6 {
			return nil, apperror.New("INTERNAL_ERROR", http.StatusInternalServerError, "Git returned an unexpected branch format.")
		}

		committedAt, err := time.Parse(time.RFC3339, fields[2])
		if err != nil {
			return nil, apperror.Wrap("INTERNAL_ERROR", http.StatusInternalServerError, "Git returned an invalid branch timestamp.", err)
		}

		branches = append(branches, Branch{
			Name:          fields[0],
			CommitSHA:     fields[1],
			CommittedAt:   committedAt,
			CommitSubject: fields[3],
			AuthorName:    fields[4],
			AuthorEmail:   strings.Trim(fields[5], "<>"),
		})
	}

	return branches, nil
}

func (service *Service) ListCommits(ctx context.Context, storageKey string, branch string, limit int) ([]Commit, error) {
	if err := validateBranchName(ctx, branch); err != nil {
		return nil, err
	}

	repositoryPath, err := storage.BareRepositoryPath(service.repositoryRoot, storageKey)
	if err != nil {
		return nil, err
	}

	if err := ensureBranchExists(ctx, repositoryPath, branch); err != nil {
		return nil, err
	}

	if limit <= 0 || limit > 100 {
		limit = defaultCommitLimit
	}

	output, err := runGit(
		ctx,
		"",
		"--git-dir", repositoryPath,
		"log",
		"--max-count", strconv.Itoa(limit),
		"--format=%H%x00%h%x00%an%x00%ae%x00%aI%x00%s%x00%b%x1e",
		"refs/heads/"+branch,
	)
	if err != nil {
		return nil, mapGitError(err, "Failed to read repository commit history.")
	}

	normalizedOutput := strings.TrimSpace(output)
	if normalizedOutput == "" {
		return []Commit{}, nil
	}

	rawEntries := strings.Split(strings.TrimSuffix(normalizedOutput, "\x1e"), "\x1e")
	commits := make([]Commit, 0, len(rawEntries))

	for _, entry := range rawEntries {
		fields := strings.Split(entry, "\x00")
		if len(fields) != 7 {
			return nil, apperror.New("INTERNAL_ERROR", http.StatusInternalServerError, "Git returned an unexpected commit format.")
		}

		occurredAt, err := time.Parse(time.RFC3339, fields[4])
		if err != nil {
			return nil, apperror.Wrap("INTERNAL_ERROR", http.StatusInternalServerError, "Git returned an invalid commit timestamp.", err)
		}

		commits = append(commits, Commit{
			SHA:         fields[0],
			ShortSHA:    fields[1],
			AuthorName:  fields[2],
			AuthorEmail: fields[3],
			OccurredAt:  occurredAt,
			Subject:     fields[5],
			Body:        strings.TrimRight(fields[6], "\n"),
		})
	}

	return commits, nil
}

func (service *Service) GetTree(ctx context.Context, storageKey string, branch string, targetPath string) ([]TreeEntry, error) {
	if err := validateBranchName(ctx, branch); err != nil {
		return nil, err
	}

	normalizedPath, err := storage.NormalizeRepoRelativePath(targetPath, true)
	if err != nil {
		return nil, err
	}

	repositoryPath, err := storage.BareRepositoryPath(service.repositoryRoot, storageKey)
	if err != nil {
		return nil, err
	}

	if err := ensureBranchExists(ctx, repositoryPath, branch); err != nil {
		return nil, err
	}

	treeSpec := "refs/heads/" + branch
	prefix := ""
	if normalizedPath != "" {
		objectType, err := readObjectType(ctx, repositoryPath, treeSpec+":"+normalizedPath)
		if err != nil {
			return nil, err
		}

		if objectType != "tree" {
			return nil, apperror.New("PATH_IS_FILE", http.StatusConflict, "The requested path points to a file, not a directory.")
		}

		treeSpec += ":" + normalizedPath
		prefix = normalizedPath + "/"
	}

	output, err := runGit(ctx, "", "--git-dir", repositoryPath, "ls-tree", "--long", treeSpec)
	if err != nil {
		return nil, mapGitError(err, "Failed to read the repository tree.")
	}

	if strings.TrimSpace(output) == "" {
		return []TreeEntry{}, nil
	}

	lines := strings.Split(strings.TrimSpace(output), "\n")
	entries := make([]TreeEntry, 0, len(lines))

	for _, line := range lines {
		tabIndex := strings.Index(line, "\t")
		if tabIndex < 0 {
			return nil, apperror.New("INTERNAL_ERROR", http.StatusInternalServerError, "Git returned an unexpected tree entry format.")
		}

		headerFields := strings.Fields(line[:tabIndex])
		if len(headerFields) != 4 {
			return nil, apperror.New("INTERNAL_ERROR", http.StatusInternalServerError, "Git returned an unexpected tree entry format.")
		}

		name := line[tabIndex+1:]
		entry := TreeEntry{
			Name: name,
			Path: prefix + name,
			Type: headerFields[1],
			SHA:  headerFields[2],
		}

		if headerFields[1] == "blob" && headerFields[3] != "-" {
			size, err := strconv.ParseInt(headerFields[3], 10, 64)
			if err != nil {
				return nil, apperror.Wrap("INTERNAL_ERROR", http.StatusInternalServerError, "Git returned an invalid blob size.", err)
			}
			entry.Size = size
		}

		entries = append(entries, entry)
	}

	return entries, nil
}

func (service *Service) GetBlob(ctx context.Context, storageKey string, branch string, targetPath string) (*Blob, error) {
	if err := validateBranchName(ctx, branch); err != nil {
		return nil, err
	}

	normalizedPath, err := storage.NormalizeRepoRelativePath(targetPath, false)
	if err != nil {
		return nil, err
	}

	repositoryPath, err := storage.BareRepositoryPath(service.repositoryRoot, storageKey)
	if err != nil {
		return nil, err
	}

	if err := ensureBranchExists(ctx, repositoryPath, branch); err != nil {
		return nil, err
	}

	objectSpec := "refs/heads/" + branch + ":" + normalizedPath

	objectType, err := readObjectType(ctx, repositoryPath, objectSpec)
	if err != nil {
		return nil, err
	}

	if objectType != "blob" {
		return nil, apperror.New("PATH_IS_DIRECTORY", http.StatusConflict, "The requested path points to a directory, not a file.")
	}

	sizeOutput, err := runGit(ctx, "", "--git-dir", repositoryPath, "cat-file", "-s", objectSpec)
	if err != nil {
		return nil, mapGitError(err, "Failed to read the repository blob size.")
	}

	size, err := strconv.ParseInt(strings.TrimSpace(sizeOutput), 10, 64)
	if err != nil {
		return nil, apperror.Wrap("INTERNAL_ERROR", http.StatusInternalServerError, "Git returned an invalid blob size.", err)
	}

	if size > service.blobPreviewLimit {
		return nil, apperror.WithDetails(
			apperror.New("BLOB_TOO_LARGE", http.StatusRequestEntityTooLarge, "The requested blob is too large to preview safely."),
			map[string]any{"size": size, "previewLimit": service.blobPreviewLimit},
		)
	}

	content, err := runGitBytes(ctx, "", "--git-dir", repositoryPath, "cat-file", "-p", objectSpec)
	if err != nil {
		return nil, mapGitError(err, "Failed to read the repository blob.")
	}

	if bytes.IndexByte(content, 0) >= 0 || !utf8.Valid(content) {
		return nil, apperror.WithDetails(
			apperror.New("BLOB_NOT_TEXT", http.StatusUnsupportedMediaType, "The requested blob is not previewable as text."),
			map[string]any{"size": size},
		)
	}

	sha, err := runGit(ctx, "", "--git-dir", repositoryPath, "rev-parse", objectSpec)
	if err != nil {
		return nil, mapGitError(err, "Failed to resolve the blob SHA.")
	}

	return &Blob{
		Path:    normalizedPath,
		SHA:     strings.TrimSpace(sha),
		Size:    size,
		Content: string(content),
	}, nil
}

func (service *Service) ArchiveRepository(ctx context.Context, storageKey string, branch string) ([]byte, error) {
	if err := validateBranchName(ctx, branch); err != nil {
		return nil, err
	}

	repositoryPath, err := storage.BareRepositoryPath(service.repositoryRoot, storageKey)
	if err != nil {
		return nil, err
	}

	archive, err := runGitBytes(ctx, "", "--git-dir", repositoryPath, "archive", "--format=zip", "refs/heads/"+branch)
	if err != nil {
		return nil, mapGitError(err, "Failed to build the repository archive.")
	}

	return archive, nil
}

func (service *Service) HasBranch(ctx context.Context, storageKey string, branch string) (bool, error) {
	repositoryPath, err := storage.BareRepositoryPath(service.repositoryRoot, storageKey)
	if err != nil {
		return false, err
	}

	exists, err := branchExists(ctx, repositoryPath, branch)
	if err != nil {
		return false, err
	}

	return exists, nil
}

func validateAuthor(author Author) error {
	if strings.TrimSpace(author.Name) == "" {
		return apperror.New("INVALID_AUTHOR", http.StatusBadRequest, "A Git author name is required.")
	}

	if strings.TrimSpace(author.Email) == "" || !strings.Contains(author.Email, "@") {
		return apperror.New("INVALID_AUTHOR", http.StatusBadRequest, "A valid Git author email is required.")
	}

	return nil
}

func validateBranchName(ctx context.Context, branch string) error {
	if strings.TrimSpace(branch) == "" {
		return apperror.New("INVALID_BRANCH", http.StatusBadRequest, "A branch name is required.")
	}

	if _, err := runGit(ctx, "", "check-ref-format", "--branch", branch); err != nil {
		return apperror.New("INVALID_BRANCH", http.StatusBadRequest, "The branch name is invalid.")
	}

	return nil
}

func ensureBranchExists(ctx context.Context, repositoryPath string, branch string) error {
	exists, err := branchExists(ctx, repositoryPath, branch)
	if err != nil {
		return err
	}

	if !exists {
		branchesOutput, listErr := runGit(ctx, "", "--git-dir", repositoryPath, "for-each-ref", "--format=%(refname)", "refs/heads")
		if listErr != nil {
			return mapGitError(listErr, "Failed to inspect repository branches.")
		}

		if strings.TrimSpace(branchesOutput) == "" {
			return apperror.New("EMPTY_REPOSITORY", http.StatusNotFound, "The repository does not have any commits yet.")
		}

		return apperror.New("BRANCH_NOT_FOUND", http.StatusNotFound, "The requested branch does not exist.")
	}

	return nil
}

func branchExists(ctx context.Context, repositoryPath string, branch string) (bool, error) {
	command := exec.CommandContext(ctx, "git", "--git-dir", repositoryPath, "show-ref", "--verify", "--quiet", "refs/heads/"+branch)
	if err := command.Run(); err != nil {
		var exitError *exec.ExitError
		if errors.As(err, &exitError) && exitError.ExitCode() == 1 {
			return false, nil
		}

		return false, apperror.Wrap("INTERNAL_ERROR", http.StatusInternalServerError, "Failed to verify the Git branch state.", err)
	}

	return true, nil
}

func readObjectType(ctx context.Context, repositoryPath string, objectSpec string) (string, error) {
	output, err := runGit(ctx, "", "--git-dir", repositoryPath, "cat-file", "-t", objectSpec)
	if err != nil {
		if gitErr, ok := err.(*gitCommandError); ok {
			stderr := strings.ToLower(gitErr.stderr)
			if strings.Contains(stderr, "not a valid object name") || strings.Contains(stderr, "does not exist in") {
				return "", apperror.New("PATH_NOT_FOUND", http.StatusNotFound, "The requested path does not exist.")
			}
		}
		return "", mapGitError(err, "Failed to resolve the repository object type.")
	}

	return strings.TrimSpace(output), nil
}

type gitCommandError struct {
	command  string
	stderr   string
	exitCode int
	err      error
}

func (error *gitCommandError) Error() string {
	return fmt.Sprintf("%s failed with exit code %d: %s", error.command, error.exitCode, strings.TrimSpace(error.stderr))
}

func (error *gitCommandError) Unwrap() error {
	return error.err
}

func runGit(ctx context.Context, directory string, args ...string) (string, error) {
	output, err := runGitBytes(ctx, directory, args...)
	if err != nil {
		return "", err
	}

	return string(output), nil
}

func runGitBytes(ctx context.Context, directory string, args ...string) ([]byte, error) {
	command := exec.CommandContext(ctx, "git", args...)
	if directory != "" {
		command.Dir = directory
	}

	var stdout bytes.Buffer
	var stderr bytes.Buffer
	command.Stdout = &stdout
	command.Stderr = &stderr

	if err := command.Run(); err != nil {
		exitCode := 1
		var exitError *exec.ExitError
		if errors.As(err, &exitError) {
			exitCode = exitError.ExitCode()
		}

		return nil, &gitCommandError{
			command:  "git " + strings.Join(args, " "),
			stderr:   stderr.String(),
			exitCode: exitCode,
			err:      err,
		}
	}

	return stdout.Bytes(), nil
}

func mapPushError(err error) error {
	if gitErr, ok := err.(*gitCommandError); ok {
		stderr := strings.ToLower(gitErr.stderr)
		if strings.Contains(stderr, "non-fast-forward") || strings.Contains(stderr, "[rejected]") {
			return apperror.New("CONFLICT", http.StatusConflict, "The branch changed before the commit could be pushed.")
		}
	}

	return mapGitError(err, "Failed to push the Git commit into the bare repository.")
}

func mapGitError(err error, message string) error {
	if err == nil {
		return nil
	}

	var appError *apperror.Error
	if errors.As(err, &appError) {
		return appError
	}

	if gitErr, ok := err.(*gitCommandError); ok {
		stderr := strings.ToLower(gitErr.stderr)
		if strings.Contains(stderr, "not a git repository") || strings.Contains(stderr, "does not appear to be a git repository") {
			return apperror.New("REPO_NOT_FOUND", http.StatusNotFound, "The requested repository does not exist.")
		}

		if strings.Contains(stderr, "unknown revision") || strings.Contains(stderr, "bad revision") {
			return apperror.New("BRANCH_NOT_FOUND", http.StatusNotFound, "The requested branch does not exist.")
		}

		if strings.Contains(stderr, "does not exist in") {
			return apperror.New("PATH_NOT_FOUND", http.StatusNotFound, "The requested path does not exist.")
		}
	}

	return apperror.Wrap("INTERNAL_ERROR", http.StatusInternalServerError, message, err)
}
