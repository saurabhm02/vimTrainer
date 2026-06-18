.PHONY: dev build test lint docker-up docker-down tidy

dev:
	go run ./cmd/server

build:
	mkdir -p bin && go build -o bin/server ./cmd/server

test:
	go test ./... -v -race

lint:
	go vet ./...

docker-up:
	docker compose up -d

docker-down:
	docker compose down

tidy:
	go mod tidy
