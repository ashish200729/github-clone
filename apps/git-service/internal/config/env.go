package config

import (
	"bufio"
	"errors"
	"os"
	"path/filepath"
	"strings"
)

func loadEnvFiles() error {
	workingDirectory, err := os.Getwd()
	if err != nil {
		return err
	}

	repositoryRoot := filepath.Clean(filepath.Join(workingDirectory, "..", ".."))
	paths := []string{
		filepath.Join(repositoryRoot, ".env"),
		filepath.Join(workingDirectory, ".env"),
	}

	for _, candidatePath := range paths {
		if err := loadEnvFile(candidatePath); err != nil {
			return err
		}
	}

	return nil
}

func loadEnvFile(path string) error {
	file, err := os.Open(path)
	if err != nil {
		if errors.Is(err, os.ErrNotExist) {
			return nil
		}

		return err
	}
	defer file.Close()

	scanner := bufio.NewScanner(file)
	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())

		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}

		key, value, found := strings.Cut(line, "=")
		if !found {
			continue
		}

		normalizedKey := strings.TrimSpace(key)
		if normalizedKey == "" {
			continue
		}

		if _, exists := os.LookupEnv(normalizedKey); exists {
			continue
		}

		normalizedValue := strings.TrimSpace(value)
		if len(normalizedValue) >= 2 {
			if (strings.HasPrefix(normalizedValue, `"`) && strings.HasSuffix(normalizedValue, `"`)) ||
				(strings.HasPrefix(normalizedValue, `'`) && strings.HasSuffix(normalizedValue, `'`)) {
				normalizedValue = normalizedValue[1 : len(normalizedValue)-1]
			}
		}

		if err := os.Setenv(normalizedKey, normalizedValue); err != nil {
			return err
		}
	}

	return scanner.Err()
}
