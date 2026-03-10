package storage

import (
	"path"
	"path/filepath"
	"regexp"
	"strings"

	"github-clone/apps/git-service/internal/apperror"
)

var storageKeyPattern = regexp.MustCompile(`^[a-z0-9](?:[a-z0-9._-]{0,127})$`)

func BareRepositoryPath(root string, storageKey string) (string, error) {
	if !storageKeyPattern.MatchString(storageKey) {
		return "", apperror.New("INVALID_STORAGE_KEY", 400, "The repository storage key is invalid.")
	}

	return filepath.Join(root, storageKey+".git"), nil
}

func NormalizeRepoRelativePath(value string, allowEmpty bool) (string, error) {
	if value == "" {
		if allowEmpty {
			return "", nil
		}

		return "", apperror.New("INVALID_PATH", 400, "A repository path is required.")
	}

	if strings.ContainsRune(value, '\x00') {
		return "", apperror.New("INVALID_PATH", 400, "Repository paths may not contain null bytes.")
	}

	if strings.Contains(value, "\\") {
		return "", apperror.New("INVALID_PATH", 400, "Repository paths may not contain backslashes.")
	}

	if strings.HasPrefix(value, "/") || strings.HasSuffix(value, "/") || strings.Contains(value, "//") {
		return "", apperror.New("INVALID_PATH", 400, "Repository paths must be normalized relative paths.")
	}

	cleaned := path.Clean("/" + value)
	normalized := strings.TrimPrefix(cleaned, "/")

	if normalized == "." || normalized == "" {
		if allowEmpty {
			return "", nil
		}

		return "", apperror.New("INVALID_PATH", 400, "A repository path is required.")
	}

	if normalized != value {
		return "", apperror.New("INVALID_PATH", 400, "Repository paths must not contain traversal or duplicate separators.")
	}

	for _, segment := range strings.Split(normalized, "/") {
		if segment == "" || segment == "." || segment == ".." {
			return "", apperror.New("INVALID_PATH", 400, "Repository paths must not contain traversal segments.")
		}
	}

	return normalized, nil
}
