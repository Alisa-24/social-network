package server

import (
	"net/http"
)

func Auth(h http.HandlerFunc) http.Handler {
	return AuthMiddleware(h)
}

func authHandle(mux *http.ServeMux, path string, h http.HandlerFunc) {
	mux.Handle(path, Auth(h))
}
