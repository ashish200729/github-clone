package config

import (
	"fmt"
	"net/url"
	"os"
	"path/filepath"
	"strings"
)

type DatabaseSSLMode string

const (
	DatabaseSSLDisable DatabaseSSLMode = "disable"
	DatabaseSSLRequire DatabaseSSLMode = "require"
)

type Config struct {
	Port                 string
	RepositoryRoot       string
	InternalToken        string
	DatabaseURL          string
	DatabaseSSL          DatabaseSSLMode
	TransportTokenSecret string
	HTTPBasePath         string
}

func Load() (Config, error) {
	if err := loadEnvFiles(); err != nil {
		return Config{}, err
	}

	repositoryRoot, err := requireAbsolutePath("GIT_REPOSITORY_ROOT")
	if err != nil {
		return Config{}, err
	}

	databaseURL, err := requireDatabaseURL("DATABASE_URL")
	if err != nil {
		return Config{}, err
	}

	databaseSSL, err := parseDatabaseSSL(os.Getenv("DATABASE_SSL"))
	if err != nil {
		return Config{}, err
	}

	databaseURL, err = applyDatabaseSSLMode(databaseURL, databaseSSL)
	if err != nil {
		return Config{}, err
	}

	httpBasePath, err := normalizeBasePath(getDefault("GIT_HTTP_BASE_PATH", "/git"))
	if err != nil {
		return Config{}, err
	}

	internalToken, err := requireNonEmpty("GIT_SERVICE_INTERNAL_TOKEN")
	if err != nil {
		return Config{}, err
	}

	transportTokenSecret, err := requireNonEmpty("GIT_TRANSPORT_TOKEN_SECRET")
	if err != nil {
		return Config{}, err
	}

	return Config{
		Port:                 getDefault("GIT_SERVICE_PORT", "8080"),
		RepositoryRoot:       repositoryRoot,
		InternalToken:        internalToken,
		DatabaseURL:          databaseURL,
		DatabaseSSL:          databaseSSL,
		TransportTokenSecret: transportTokenSecret,
		HTTPBasePath:         httpBasePath,
	}, nil
}

func getDefault(key string, fallback string) string {
	value := strings.TrimSpace(os.Getenv(key))
	if value == "" {
		return fallback
	}

	return value
}

func requireNonEmpty(key string) (string, error) {
	value := strings.TrimSpace(os.Getenv(key))
	if value == "" {
		return "", fmt.Errorf("%s is required", key)
	}

	return value, nil
}

func requireAbsolutePath(key string) (string, error) {
	value := strings.TrimSpace(os.Getenv(key))
	if value == "" {
		return "", fmt.Errorf("%s is required", key)
	}

	absolutePath, err := filepath.Abs(value)
	if err != nil {
		return "", fmt.Errorf("%s must be a valid path: %w", key, err)
	}

	return filepath.Clean(absolutePath), nil
}

func requireDatabaseURL(key string) (string, error) {
	value := strings.TrimSpace(os.Getenv(key))
	if value == "" {
		return "", fmt.Errorf("%s is required", key)
	}

	parsedURL, err := url.Parse(value)
	if err != nil {
		return "", fmt.Errorf("%s must be a valid PostgreSQL connection string: %w", key, err)
	}

	if parsedURL.Scheme != "postgres" && parsedURL.Scheme != "postgresql" {
		return "", fmt.Errorf("%s must use postgres:// or postgresql://", key)
	}

	return value, nil
}

func parseDatabaseSSL(value string) (DatabaseSSLMode, error) {
	if strings.TrimSpace(value) == "" {
		return DatabaseSSLDisable, nil
	}

	switch DatabaseSSLMode(value) {
	case DatabaseSSLDisable, DatabaseSSLRequire:
		return DatabaseSSLMode(value), nil
	default:
		return "", fmt.Errorf("DATABASE_SSL must be either disable or require")
	}
}

func applyDatabaseSSLMode(connectionString string, sslMode DatabaseSSLMode) (string, error) {
	parsedURL, err := url.Parse(connectionString)
	if err != nil {
		return "", err
	}

	query := parsedURL.Query()
	if query.Get("sslmode") == "" {
		query.Set("sslmode", string(sslMode))
		parsedURL.RawQuery = query.Encode()
	}

	return parsedURL.String(), nil
}

func normalizeBasePath(value string) (string, error) {
	normalized := strings.TrimSpace(value)
	if normalized == "" {
		return "", fmt.Errorf("GIT_HTTP_BASE_PATH must not be empty")
	}

	if !strings.HasPrefix(normalized, "/") {
		normalized = "/" + normalized
	}

	normalized = strings.TrimRight(normalized, "/")
	if normalized == "" {
		normalized = "/"
	}

	return normalized, nil
}
