package server

import (
	"context"
	"crypto/subtle"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"slices"
	"strconv"
	"strings"
	"time"

	"github-clone/apps/git-service/internal/apperror"
	"github-clone/apps/git-service/internal/config"
	"github-clone/apps/git-service/internal/gitrepo"
	"github-clone/apps/git-service/internal/repostore"
	"github-clone/apps/git-service/internal/token"
)

const internalAuthHeader = "x-github-clone-git-service-token"

type App struct {
	config     config.Config
	repos      *repostore.Store
	git        *gitrepo.Service
	httpServer *http.Server
}

func New(cfg config.Config, store *repostore.Store, gitService *gitrepo.Service) *App {
	return &App{
		config: cfg,
		repos:  store,
		git:    gitService,
	}
}

func (app *App) Handler() http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("/health", app.handleHealth)
	mux.HandleFunc("/internal/repos", app.handleInternalRoot)
	mux.HandleFunc("/internal/repos/", app.handleInternalRepository)
	mux.HandleFunc(app.config.HTTPBasePath+"/", app.handleTransport)

	return http.HandlerFunc(func(writer http.ResponseWriter, request *http.Request) {
		startedAt := time.Now()
		mux.ServeHTTP(writer, request)
		log.Printf("%s %s in %s", request.Method, request.URL.Path, time.Since(startedAt).Round(time.Millisecond))
	})
}

func (app *App) handleHealth(writer http.ResponseWriter, request *http.Request) {
	if request.Method != http.MethodGet {
		apperror.WriteJSON(writer, apperror.New("METHOD_NOT_ALLOWED", http.StatusMethodNotAllowed, "Only GET is allowed for /health."))
		return
	}

	ctx, cancel := context.WithTimeout(request.Context(), 5*time.Second)
	defer cancel()

	databaseStatus := "ok"
	databaseMessage := "PostgreSQL connection is healthy."
	if err := app.repos.Ping(ctx); err != nil {
		databaseStatus = "error"
		databaseMessage = err.Error()
	}

	status := "ok"
	httpStatus := http.StatusOK
	if databaseStatus != "ok" {
		status = "degraded"
		httpStatus = http.StatusServiceUnavailable
	}

	apperror.WritePayload(writer, httpStatus, map[string]any{
		"status":  status,
		"service": "git-service",
		"database": map[string]any{
			"status":  databaseStatus,
			"message": databaseMessage,
		},
		"httpBasePath": app.config.HTTPBasePath,
	})
}

func (app *App) handleInternalRoot(writer http.ResponseWriter, request *http.Request) {
	if request.URL.Path != "/internal/repos" {
		apperror.WriteJSON(writer, apperror.New("REPO_NOT_FOUND", http.StatusNotFound, "The requested repository does not exist."))
		return
	}

	if request.Method != http.MethodPost {
		apperror.WriteJSON(writer, apperror.New("METHOD_NOT_ALLOWED", http.StatusMethodNotAllowed, "Only POST is allowed for this route."))
		return
	}

	if err := app.requireInternalToken(request); err != nil {
		apperror.WriteJSON(writer, err)
		return
	}

	type createRepoRequest struct {
		StorageKey    string `json:"storageKey"`
		DefaultBranch string `json:"defaultBranch"`
	}

	var payload createRepoRequest
	if err := decodeJSONBody(request, &payload); err != nil {
		apperror.WriteJSON(writer, err)
		return
	}

	if payload.DefaultBranch == "" {
		payload.DefaultBranch = "main"
	}

	if err := app.git.CreateBareRepo(request.Context(), payload.StorageKey, payload.DefaultBranch); err != nil {
		apperror.WriteJSON(writer, err)
		return
	}

	apperror.WritePayload(writer, http.StatusCreated, map[string]any{
		"storageKey":    payload.StorageKey,
		"defaultBranch": payload.DefaultBranch,
		"status":        "created",
	})
}

func (app *App) handleInternalRepository(writer http.ResponseWriter, request *http.Request) {
	if err := app.requireInternalToken(request); err != nil {
		apperror.WriteJSON(writer, err)
		return
	}

	remainder := strings.TrimPrefix(request.URL.Path, "/internal/repos/")
	parts := strings.Split(remainder, "/")
	if len(parts) < 1 || parts[0] == "" {
		apperror.WriteJSON(writer, apperror.New("INVALID_STORAGE_KEY", http.StatusBadRequest, "A repository storage key is required."))
		return
	}

	storageKey := parts[0]
	action := ""
	if len(parts) > 1 {
		action = strings.Join(parts[1:], "/")
	}

	switch {
	case request.Method == http.MethodDelete && action == "":
		app.handleDeleteRepository(writer, request, storageKey)
	case request.Method == http.MethodPost && action == "initialize-readme":
		app.handleInitializeReadme(writer, request, storageKey)
	case request.Method == http.MethodGet && action == "branches":
		app.handleBranches(writer, request, storageKey)
	case request.Method == http.MethodGet && action == "commits":
		app.handleCommits(writer, request, storageKey)
	case request.Method == http.MethodGet && action == "tree":
		app.handleTree(writer, request, storageKey)
	case request.Method == http.MethodGet && action == "blob":
		app.handleBlob(writer, request, storageKey)
	case request.Method == http.MethodGet && action == "archive":
		app.handleArchive(writer, request, storageKey)
	case request.Method == http.MethodPost && action == "commit-files":
		app.handleCommitFiles(writer, request, storageKey)
	default:
		apperror.WriteJSON(writer, apperror.New("ROUTE_NOT_FOUND", http.StatusNotFound, "The requested internal Git route does not exist."))
	}
}

func (app *App) handleDeleteRepository(writer http.ResponseWriter, request *http.Request, storageKey string) {
	if err := app.git.DeleteBareRepo(request.Context(), storageKey); err != nil {
		apperror.WriteJSON(writer, err)
		return
	}

	apperror.WritePayload(writer, http.StatusOK, map[string]any{
		"storageKey": storageKey,
		"status":     "deleted",
	})
}

func (app *App) handleInitializeReadme(writer http.ResponseWriter, request *http.Request, storageKey string) {
	type initializeRequest struct {
		DefaultBranch string `json:"defaultBranch"`
		ReadmeContent string `json:"readmeContent"`
		AuthorName    string `json:"authorName"`
		AuthorEmail   string `json:"authorEmail"`
		CommitMessage string `json:"commitMessage"`
	}

	var payload initializeRequest
	if err := decodeJSONBody(request, &payload); err != nil {
		apperror.WriteJSON(writer, err)
		return
	}

	if payload.DefaultBranch == "" {
		payload.DefaultBranch = "main"
	}

	commitSHA, err := app.git.InitializeReadme(
		request.Context(),
		storageKey,
		payload.DefaultBranch,
		payload.ReadmeContent,
		payload.CommitMessage,
		gitrepo.Author{Name: payload.AuthorName, Email: payload.AuthorEmail},
	)
	if err != nil {
		apperror.WriteJSON(writer, err)
		return
	}

	if err := app.syncRepositoryMetadata(request.Context(), storageKey, payload.DefaultBranch); err != nil {
		apperror.WriteJSON(writer, err)
		return
	}

	apperror.WritePayload(writer, http.StatusCreated, map[string]any{
		"branch":    payload.DefaultBranch,
		"commitSha": commitSHA,
	})
}

func (app *App) handleBranches(writer http.ResponseWriter, request *http.Request, storageKey string) {
	branches, err := app.git.ListBranches(request.Context(), storageKey)
	if err != nil {
		apperror.WriteJSON(writer, err)
		return
	}

	apperror.WritePayload(writer, http.StatusOK, map[string]any{
		"branches": branches,
	})
}

func (app *App) handleCommits(writer http.ResponseWriter, request *http.Request, storageKey string) {
	branch := request.URL.Query().Get("branch")
	limit := 25
	if rawLimit := request.URL.Query().Get("limit"); rawLimit != "" {
		parsedLimit, err := strconv.Atoi(rawLimit)
		if err != nil {
			apperror.WriteJSON(writer, apperror.New("INVALID_REQUEST", http.StatusBadRequest, "The commit limit must be a number."))
			return
		}
		limit = parsedLimit
	}

	commits, err := app.git.ListCommits(request.Context(), storageKey, branch, limit)
	if err != nil {
		apperror.WriteJSON(writer, err)
		return
	}

	apperror.WritePayload(writer, http.StatusOK, map[string]any{
		"branch":  branch,
		"commits": commits,
	})
}

func (app *App) handleTree(writer http.ResponseWriter, request *http.Request, storageKey string) {
	branch := request.URL.Query().Get("branch")
	targetPath := request.URL.Query().Get("path")

	entries, err := app.git.GetTree(request.Context(), storageKey, branch, targetPath)
	if err != nil {
		apperror.WriteJSON(writer, err)
		return
	}

	apperror.WritePayload(writer, http.StatusOK, map[string]any{
		"branch": branch,
		"path":   targetPath,
		"tree":   entries,
	})
}

func (app *App) handleBlob(writer http.ResponseWriter, request *http.Request, storageKey string) {
	branch := request.URL.Query().Get("branch")
	targetPath := request.URL.Query().Get("path")

	blob, err := app.git.GetBlob(request.Context(), storageKey, branch, targetPath)
	if err != nil {
		apperror.WriteJSON(writer, err)
		return
	}

	apperror.WritePayload(writer, http.StatusOK, map[string]any{
		"branch": branch,
		"blob":   blob,
	})
}

func (app *App) handleArchive(writer http.ResponseWriter, request *http.Request, storageKey string) {
	branch := request.URL.Query().Get("branch")
	if strings.TrimSpace(branch) == "" {
		apperror.WriteJSON(writer, apperror.New("INVALID_BRANCH", http.StatusBadRequest, "A branch name is required."))
		return
	}

	archive, err := app.git.ArchiveRepository(request.Context(), storageKey, branch)
	if err != nil {
		apperror.WriteJSON(writer, err)
		return
	}

	writer.Header().Set("Content-Type", "application/zip")
	writer.Header().Set("Content-Disposition", fmt.Sprintf(`attachment; filename="%s-%s.zip"`, storageKey, branch))
	writer.Header().Set("Content-Length", strconv.Itoa(len(archive)))
	writer.WriteHeader(http.StatusOK)

	if _, err := writer.Write(archive); err != nil {
		log.Printf("failed to write repository archive response: %v", err)
	}
}

func (app *App) handleCommitFiles(writer http.ResponseWriter, request *http.Request, storageKey string) {
	type commitFilesRequest struct {
		Branch        string               `json:"branch"`
		CommitMessage string               `json:"commitMessage"`
		AuthorName    string               `json:"authorName"`
		AuthorEmail   string               `json:"authorEmail"`
		Files         []gitrepo.CommitFile `json:"files"`
	}

	var payload commitFilesRequest
	if err := decodeJSONBody(request, &payload); err != nil {
		apperror.WriteJSON(writer, err)
		return
	}

	commitSHA, err := app.git.CommitFiles(
		request.Context(),
		storageKey,
		payload.Branch,
		payload.CommitMessage,
		gitrepo.Author{Name: payload.AuthorName, Email: payload.AuthorEmail},
		payload.Files,
	)
	if err != nil {
		apperror.WriteJSON(writer, err)
		return
	}

	if err := app.syncRepositoryMetadata(request.Context(), storageKey, payload.Branch); err != nil {
		apperror.WriteJSON(writer, err)
		return
	}

	apperror.WritePayload(writer, http.StatusCreated, map[string]any{
		"branch":    payload.Branch,
		"commitSha": commitSHA,
	})
}

func (app *App) handleTransport(writer http.ResponseWriter, request *http.Request) {
	owner, repo, pathInfoSuffix, err := parseTransportPath(request.URL.Path, app.config.HTTPBasePath)
	if err != nil {
		apperror.WriteJSON(writer, err)
		return
	}

	repository, err := app.repos.GetByOwnerAndRepo(request.Context(), owner, repo)
	if err != nil {
		apperror.WriteJSON(writer, err)
		return
	}

	isWrite := isWriteTransportRequest(request)

	var verifiedToken *token.Payload
	username, password, hasBasicAuth := request.BasicAuth()
	if repository.Visibility != "public" || isWrite {
		if !hasBasicAuth || strings.TrimSpace(password) == "" {
			writer.Header().Set("WWW-Authenticate", `Basic realm="github-clone-git"`)
			apperror.WriteJSON(writer, apperror.New("UNAUTHORIZED", http.StatusUnauthorized, "Git transport credentials are required."))
			return
		}

		verifiedToken, err = token.Verify(password, app.config.TransportTokenSecret, owner, repo, isWrite, time.Now())
		if err != nil {
			if apperror.From(err).HTTPStatus == http.StatusUnauthorized {
				writer.Header().Set("WWW-Authenticate", `Basic realm="github-clone-git"`)
			}
			apperror.WriteJSON(writer, err)
			return
		}

		if verifiedToken.Subject != repository.OwnerID {
			apperror.WriteJSON(writer, apperror.New("FORBIDDEN", http.StatusForbidden, "Only the repository owner may use this Git transport token."))
			return
		}
	}

	if repository.Visibility == "public" && isWrite && verifiedToken == nil {
		writer.Header().Set("WWW-Authenticate", `Basic realm="github-clone-git"`)
		apperror.WriteJSON(writer, apperror.New("UNAUTHORIZED", http.StatusUnauthorized, "Git push requires credentials."))
		return
	}

	pathInfo := "/" + repository.StorageKey + ".git" + pathInfoSuffix
	statusCode, backendErr := app.git.ServeHTTPBackend(request.Context(), pathInfo, request, writer, username)
	if backendErr != nil {
		log.Printf("git-http-backend failed for %s/%s: %v", owner, repo, backendErr)
		return
	}

	if isWrite && statusCode >= 200 && statusCode < 400 {
		if err := app.syncRepositoryMetadata(request.Context(), repository.StorageKey, repository.DefaultBranch); err != nil {
			log.Printf("failed to sync repository metadata after push: %v", err)
		}
	}
}

func (app *App) requireInternalToken(request *http.Request) error {
	tokenValue := strings.TrimSpace(request.Header.Get(internalAuthHeader))
	if tokenValue == "" {
		return apperror.New("UNAUTHORIZED", http.StatusUnauthorized, "A valid internal Git service token is required.")
	}

	if subtle.ConstantTimeCompare([]byte(tokenValue), []byte(app.config.InternalToken)) != 1 {
		return apperror.New("UNAUTHORIZED", http.StatusUnauthorized, "The internal Git service token is invalid.")
	}

	return nil
}

func (app *App) syncRepositoryMetadata(ctx context.Context, storageKey string, preferredBranch string) error {
	repository, err := app.repos.GetByStorageKey(ctx, storageKey)
	if err != nil {
		return err
	}

	branches, err := app.git.ListBranches(ctx, storageKey)
	if err != nil {
		return err
	}

	branchNames := make([]string, 0, len(branches))
	for _, branch := range branches {
		branchNames = append(branchNames, branch.Name)
	}

	targetBranch := preferredBranch
	if targetBranch == "" || !slices.Contains(branchNames, targetBranch) {
		targetBranch = repository.DefaultBranch
	}

	return app.repos.SyncRepositoryAfterWrite(ctx, repository, targetBranch, branchNames)
}

func decodeJSONBody(request *http.Request, destination any) error {
	decoder := json.NewDecoder(request.Body)
	decoder.DisallowUnknownFields()

	if err := decoder.Decode(destination); err != nil {
		return apperror.Wrap("INVALID_REQUEST", http.StatusBadRequest, "The request body must be valid JSON.", err)
	}

	var trailingContent any
	if err := decoder.Decode(&trailingContent); err != nil {
		if errors.Is(err, io.EOF) {
			return nil
		}

		return apperror.New("INVALID_REQUEST", http.StatusBadRequest, "The request body must contain exactly one JSON object.")
	}

	return apperror.New("INVALID_REQUEST", http.StatusBadRequest, "The request body must contain exactly one JSON object.")
}

func parseTransportPath(requestPath string, basePath string) (string, string, string, error) {
	if !strings.HasPrefix(requestPath, basePath+"/") {
		return "", "", "", apperror.New("REPO_NOT_FOUND", http.StatusNotFound, "The requested repository does not exist.")
	}

	relativePath := strings.TrimPrefix(requestPath, basePath+"/")
	parts := strings.Split(relativePath, "/")
	if len(parts) < 2 {
		return "", "", "", apperror.New("REPO_NOT_FOUND", http.StatusNotFound, "The requested repository does not exist.")
	}

	owner := parts[0]
	repoSegment := parts[1]
	if owner == "" || !strings.HasSuffix(repoSegment, ".git") {
		return "", "", "", apperror.New("REPO_NOT_FOUND", http.StatusNotFound, "The requested repository does not exist.")
	}

	repo := strings.TrimSuffix(repoSegment, ".git")
	pathInfoSuffix := "/"
	if len(parts) > 2 {
		pathInfoSuffix += strings.Join(parts[2:], "/")
	}

	return owner, repo, pathInfoSuffix, nil
}

func isWriteTransportRequest(request *http.Request) bool {
	service := request.URL.Query().Get("service")
	if service == "git-receive-pack" {
		return true
	}

	return strings.HasSuffix(request.URL.Path, "/git-receive-pack")
}

func Run() error {
	cfg, err := config.Load()
	if err != nil {
		return err
	}

	store, err := repostore.New(cfg.DatabaseURL)
	if err != nil {
		return fmt.Errorf("initialize repository store: %w", err)
	}
	defer store.Close()

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if err := store.Ping(ctx); err != nil {
		return fmt.Errorf("ping postgres: %w", err)
	}

	if err := os.MkdirAll(cfg.RepositoryRoot, 0o755); err != nil {
		return fmt.Errorf("create repository root: %w", err)
	}

	gitService := gitrepo.NewService(cfg.RepositoryRoot)
	app := New(cfg, store, gitService)

	server := &http.Server{
		Addr:              ":" + cfg.Port,
		Handler:           app.Handler(),
		ReadHeaderTimeout: 10 * time.Second,
	}

	log.Printf("git-service listening on http://localhost:%s", cfg.Port)
	return server.ListenAndServe()
}
