.PHONY: help install dev build test seed run-api run-web docker-up docker-down

help:
	@echo "DEV PULSE AI - Developer Commands"
	@echo "  make install     Install frontend & backend dependencies"
	@echo "  make dev         Run backend & frontend concurrently"
	@echo "  make seed        Seed demo project, API keys & simulated traffic"
	@echo "  make test        Run backend & frontend test suites"
	@echo "  make docker-up   Start full stack in Docker Compose"

install:
	cd apps/api && pip install -r requirements.txt
	cd apps/web && npm install
	cd packages/devpulse-sdk && pip install -e .

run-api:
	cd apps/api && uvicorn app.main:app --reload --port 8000

run-web:
	cd apps/web && npm run dev

seed:
	cd apps/api && python ../../scripts/seed.py

test:
	cd apps/api && pytest
	cd apps/web && npm run typecheck && npm run test

docker-up:
	docker-compose up --build -d

docker-down:
	docker-compose down
