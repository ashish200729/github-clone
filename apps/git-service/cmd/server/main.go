package main

import (
	"log"
	"net/http"

	"github-clone/apps/git-service/internal/server"
)

func main() {
	if err := server.Run(); err != nil && err != http.ErrServerClosed {
		log.Fatal(err)
	}
}
