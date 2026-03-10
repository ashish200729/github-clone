package repostore

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"slices"
	"time"

	_ "github.com/jackc/pgx/v5/stdlib"

	"github-clone/apps/git-service/internal/apperror"
)

type Repository struct {
	ID            string
	OwnerID       string
	OwnerHandle   string
	Name          string
	Visibility    string
	StorageKey    string
	DefaultBranch string
	IsEmpty       bool
}

type Store struct {
	db *sql.DB
}

func New(databaseURL string) (*Store, error) {
	db, err := sql.Open("pgx", databaseURL)
	if err != nil {
		return nil, fmt.Errorf("open postgres connection: %w", err)
	}

	db.SetConnMaxIdleTime(30 * time.Second)
	db.SetConnMaxLifetime(5 * time.Minute)

	return &Store{db: db}, nil
}

func (store *Store) Close() error {
	if store == nil || store.db == nil {
		return nil
	}

	return store.db.Close()
}

func (store *Store) Ping(ctx context.Context) error {
	return store.db.PingContext(ctx)
}

func (store *Store) GetByOwnerAndRepo(ctx context.Context, owner string, repo string) (*Repository, error) {
	const query = `
		SELECT
			repositories.id,
			repositories.owner_id,
			auth.users.handle,
			repositories.name,
			repositories.visibility,
			repositories.storage_key,
			repositories.default_branch,
			repositories.is_empty
		FROM public.repositories AS repositories
		INNER JOIN auth.users ON auth.users.id = repositories.owner_id
		WHERE auth.users.handle = $1 AND repositories.name = $2
		LIMIT 1
	`

	return scanRepository(store.db.QueryRowContext(ctx, query, owner, repo))
}

func (store *Store) GetByStorageKey(ctx context.Context, storageKey string) (*Repository, error) {
	const query = `
		SELECT
			repositories.id,
			repositories.owner_id,
			auth.users.handle,
			repositories.name,
			repositories.visibility,
			repositories.storage_key,
			repositories.default_branch,
			repositories.is_empty
		FROM public.repositories AS repositories
		INNER JOIN auth.users ON auth.users.id = repositories.owner_id
		WHERE repositories.storage_key = $1
		LIMIT 1
	`

	return scanRepository(store.db.QueryRowContext(ctx, query, storageKey))
}

func (store *Store) SyncRepositoryAfterWrite(ctx context.Context, repository *Repository, pushedBranch string, branches []string) error {
	if repository == nil {
		return errors.New("repository is required")
	}

	defaultBranch := repository.DefaultBranch
	isEmpty := len(branches) == 0
	initializedAt := !isEmpty

	if !isEmpty && (defaultBranch == "" || !slices.Contains(branches, defaultBranch)) {
		if pushedBranch != "" && slices.Contains(branches, pushedBranch) {
			defaultBranch = pushedBranch
		} else {
			defaultBranch = branches[0]
		}
	}

	const query = `
		UPDATE public.repositories
		SET
			default_branch = CASE
				WHEN $2 <> '' THEN $2
				ELSE default_branch
			END,
			is_empty = $3,
			last_pushed_at = CASE
				WHEN $3 THEN last_pushed_at
				ELSE NOW()
			END,
			initialized_at = CASE
				WHEN $4 THEN COALESCE(initialized_at, NOW())
				ELSE initialized_at
			END,
			updated_at = NOW()
		WHERE id = $1
	`

	_, err := store.db.ExecContext(ctx, query, repository.ID, defaultBranch, isEmpty, initializedAt)
	if err != nil {
		return fmt.Errorf("update repository metadata: %w", err)
	}

	return nil
}

type scanner interface {
	Scan(dest ...any) error
}

func scanRepository(row scanner) (*Repository, error) {
	var repository Repository
	var defaultBranch sql.NullString

	err := row.Scan(
		&repository.ID,
		&repository.OwnerID,
		&repository.OwnerHandle,
		&repository.Name,
		&repository.Visibility,
		&repository.StorageKey,
		&defaultBranch,
		&repository.IsEmpty,
	)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, apperror.New("REPO_NOT_FOUND", 404, "The requested repository does not exist.")
		}

		return nil, fmt.Errorf("query repository metadata: %w", err)
	}

	if defaultBranch.Valid {
		repository.DefaultBranch = defaultBranch.String
	}

	return &repository, nil
}
