.PHONY: migrate-up migrate-down migrate-create dev build test

# Database migrations
migrate-up:
	migrate -path migrations -database "postgres://postgres:postgres@localhost:5432/gastroshop?sslmode=disable" up

migrate-down:
	migrate -path migrations -database "postgres://postgres:postgres@localhost:5432/gastroshop?sslmode=disable" down

migrate-create:
	migrate create -ext sql -dir migrations -seq $(name)

# Development
dev:
	go run cmd/api/main.go

build:
	go build -o bin/api cmd/api/main.go

test:
	go test ./...

test-coverage:
	go test -coverprofile=coverage.out ./...
	go tool cover -html=coverage.out -o coverage.html

test-verbose:
	go test -v ./...

test-integration:
	go test -v ./test/...

# Install dependencies
deps:
	go mod download
	go mod tidy
