package gitrepo

import (
	"bufio"
	"bytes"
	"context"
	"fmt"
	"io"
	"net/http"
	"os"
	"os/exec"
	"strconv"
	"strings"

	"github-clone/apps/git-service/internal/apperror"
)

func (service *Service) ServeHTTPBackend(
	ctx context.Context,
	pathInfo string,
	request *http.Request,
	writer http.ResponseWriter,
	remoteUser string,
) (int, error) {
	command := exec.CommandContext(ctx, "git", "http-backend")

	command.Env = append(
		os.Environ(),
		"GIT_PROJECT_ROOT="+service.repositoryRoot,
		"GIT_HTTP_EXPORT_ALL=1",
		"PATH_INFO="+pathInfo,
		"QUERY_STRING="+request.URL.RawQuery,
		"REQUEST_METHOD="+request.Method,
		"REMOTE_USER="+remoteUser,
		"REMOTE_ADDR="+request.RemoteAddr,
	)

	if contentType := request.Header.Get("Content-Type"); contentType != "" {
		command.Env = append(command.Env, "CONTENT_TYPE="+contentType)
	}

	if request.ContentLength >= 0 {
		command.Env = append(command.Env, "CONTENT_LENGTH="+strconv.FormatInt(request.ContentLength, 10))
	}

	if gitProtocol := request.Header.Get("Git-Protocol"); gitProtocol != "" {
		command.Env = append(command.Env, "GIT_PROTOCOL="+gitProtocol)
	}

	stdin, err := command.StdinPipe()
	if err != nil {
		return 0, apperror.Wrap("INTERNAL_ERROR", http.StatusInternalServerError, "Failed to open the Git HTTP backend stdin pipe.", err)
	}

	stdout, err := command.StdoutPipe()
	if err != nil {
		return 0, apperror.Wrap("INTERNAL_ERROR", http.StatusInternalServerError, "Failed to open the Git HTTP backend stdout pipe.", err)
	}

	var stderr bytes.Buffer
	command.Stderr = &stderr

	if err := command.Start(); err != nil {
		return 0, apperror.Wrap("INTERNAL_ERROR", http.StatusInternalServerError, "Failed to start the Git HTTP backend.", err)
	}

	copyErrChannel := make(chan error, 1)
	go func() {
		_, copyErr := io.Copy(stdin, request.Body)
		closeErr := stdin.Close()
		if copyErr != nil {
			copyErrChannel <- copyErr
			return
		}
		copyErrChannel <- closeErr
	}()

	bufferedReader := bufio.NewReader(stdout)
	statusCode, headers, err := readCGIHeaders(bufferedReader)
	if err != nil {
		return 0, apperror.Wrap("INTERNAL_ERROR", http.StatusInternalServerError, "The Git HTTP backend returned an invalid response.", err)
	}

	for key, values := range headers {
		for _, value := range values {
			writer.Header().Add(key, value)
		}
	}
	writer.WriteHeader(statusCode)

	if _, err := io.Copy(writer, bufferedReader); err != nil {
		return statusCode, apperror.Wrap("INTERNAL_ERROR", http.StatusInternalServerError, "Failed to stream the Git HTTP backend response.", err)
	}

	if err := <-copyErrChannel; err != nil {
		return statusCode, apperror.Wrap("INTERNAL_ERROR", http.StatusInternalServerError, "Failed to stream the Git HTTP backend request body.", err)
	}

	if err := command.Wait(); err != nil {
		return statusCode, apperror.Wrap(
			"INTERNAL_ERROR",
			http.StatusInternalServerError,
			"Git HTTP backend execution failed.",
			fmt.Errorf("%w: %s", err, strings.TrimSpace(stderr.String())),
		)
	}

	return statusCode, nil
}

func readCGIHeaders(reader *bufio.Reader) (int, http.Header, error) {
	headers := http.Header{}
	statusCode := http.StatusOK

	for {
		line, err := reader.ReadString('\n')
		if err != nil {
			return 0, nil, err
		}

		line = strings.TrimRight(line, "\r\n")
		if line == "" {
			return statusCode, headers, nil
		}

		parts := strings.SplitN(line, ":", 2)
		if len(parts) != 2 {
			return 0, nil, fmt.Errorf("invalid CGI header line: %q", line)
		}

		key := strings.TrimSpace(parts[0])
		value := strings.TrimSpace(parts[1])
		if strings.EqualFold(key, "Status") {
			fields := strings.Fields(value)
			if len(fields) == 0 {
				return 0, nil, fmt.Errorf("invalid CGI status header: %q", value)
			}

			parsedStatus, err := strconv.Atoi(fields[0])
			if err != nil {
				return 0, nil, fmt.Errorf("invalid CGI status code: %w", err)
			}
			statusCode = parsedStatus
			continue
		}

		headers.Add(key, value)
	}
}
