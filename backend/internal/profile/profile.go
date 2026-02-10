package profile

import "net/http"

func ProfileHandler(w http.ResponseWriter, r *http.Request) {
	method := r.Method
	switch method {
	case http.MethodPut:
		EditProfile(w, r)
	case http.MethodDelete:
		DeleteProfile(w, r)
	default:
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	}
}
