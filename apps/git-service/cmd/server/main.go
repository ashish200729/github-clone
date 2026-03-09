package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
)

type healthResponse struct {
	Status  string `json:"status"`
	Service string `json:"service"`
	Message string `json:"message"`
}

func main() {
	port := "8080"

	mux := http.NewServeMux()
	mux.HandleFunc("/health", withCORS(func(writer http.ResponseWriter, request *http.Request) {
		if request.Method != http.MethodGet {
			writeError(writer, http.StatusMethodNotAllowed, "method not allowed")
			return
		}

		writeJSON(writer, http.StatusOK, healthResponse{
			Status:  "ok",
			Service: "git-service",
			Message: "Hello from the Go starter",
		})
	}))
	mux.HandleFunc("/hello", withCORS(func(writer http.ResponseWriter, request *http.Request) {
		if request.Method != http.MethodGet {
			writeError(writer, http.StatusMethodNotAllowed, "method not allowed")
			return
		}

		writeJSON(writer, http.StatusOK, map[string]string{
			"message": "Hello from Go",
		})
	}))

	server := &http.Server{
		Addr:    fmt.Sprintf(":%s", port),
		Handler: mux,
	}

	log.Printf("git-service listening on http://localhost:%s", port)
	if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		log.Fatal(err)
	}
}

func withCORS(next http.HandlerFunc) http.HandlerFunc {
	return func(writer http.ResponseWriter, request *http.Request) {
		writer.Header().Set("Access-Control-Allow-Origin", "*")
		writer.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
		writer.Header().Set("Access-Control-Allow-Headers", "Content-Type")

		if request.Method == http.MethodOptions {
			writer.WriteHeader(http.StatusNoContent)
			return
		}

		next(writer, request)
	}
}

func writeJSON(writer http.ResponseWriter, statusCode int, payload any) {
	writer.Header().Set("Content-Type", "application/json")
	writer.WriteHeader(statusCode)
	if err := json.NewEncoder(writer).Encode(payload); err != nil {
		log.Printf("failed to write response: %v", err)
	}
}

func writeError(writer http.ResponseWriter, statusCode int, message string) {
	writeJSON(writer, statusCode, map[string]string{"message": message})
}
