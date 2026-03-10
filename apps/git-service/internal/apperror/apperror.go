package apperror

import (
	"encoding/json"
	"errors"
	"log"
	"net/http"
)

type Error struct {
	Code       string
	Message    string
	HTTPStatus int
	Err        error
	Details    map[string]any
}

func (error *Error) Error() string {
	if error.Err == nil {
		return error.Message
	}

	return error.Message + ": " + error.Err.Error()
}

func (error *Error) Unwrap() error {
	return error.Err
}

func New(code string, status int, message string) *Error {
	return &Error{
		Code:       code,
		Message:    message,
		HTTPStatus: status,
	}
}

func Wrap(code string, status int, message string, err error) *Error {
	return &Error{
		Code:       code,
		Message:    message,
		HTTPStatus: status,
		Err:        err,
	}
}

func WithDetails(err *Error, details map[string]any) *Error {
	err.Details = details
	return err
}

func From(err error) *Error {
	if err == nil {
		return nil
	}

	var appError *Error
	if errors.As(err, &appError) {
		return appError
	}

	return Wrap("INTERNAL_ERROR", http.StatusInternalServerError, "An unexpected internal error occurred.", err)
}

func WriteJSON(writer http.ResponseWriter, err error) {
	appError := From(err)
	writer.Header().Set("Content-Type", "application/json")
	writer.WriteHeader(appError.HTTPStatus)

	response := map[string]any{
		"error": map[string]any{
			"code":    appError.Code,
			"message": appError.Message,
		},
	}

	if len(appError.Details) > 0 {
		response["error"].(map[string]any)["details"] = appError.Details
	}

	if encodeErr := json.NewEncoder(writer).Encode(response); encodeErr != nil {
		log.Printf("failed to encode error response: %v", encodeErr)
	}
}

func WritePayload(writer http.ResponseWriter, status int, payload any) {
	writer.Header().Set("Content-Type", "application/json")
	writer.WriteHeader(status)
	if err := json.NewEncoder(writer).Encode(payload); err != nil {
		log.Printf("failed to encode JSON response: %v", err)
	}
}
