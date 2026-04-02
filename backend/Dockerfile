# backend/Dockerfile

# ---------------------
# Build Stage
# ---------------------
FROM golang:1.23-alpine AS builder

WORKDIR /app

# Install build essentials for CGO (required for sqlite3)
RUN apk add --no-cache gcc musl-dev

# Copy go.mod and go.sum first for caching
COPY go.mod go.sum ./

# Set Go proxy in case of network issues
ENV GOPROXY=https://proxy.golang.org,direct

# Enable CGO for sqlite3
ENV CGO_ENABLED=1

# Download dependencies
RUN go mod download

# Copy all backend files
COPY . .

# Build the server binary
RUN go build -o server ./cmd/server/main.go

# ---------------------
# Runtime Stage
# ---------------------
FROM alpine:latest

WORKDIR /app

# Copy built binary
COPY --from=builder /app/server .

# Copy migrations directory
COPY --from=builder /app/internal/db/migrations ./internal/db/migrations

# Copy uploads directory
COPY --from=builder /app/uploads ./uploads

# Copy the database if needed (optional)
COPY social-network.db .

EXPOSE 8080

CMD ["./server"]