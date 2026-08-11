build:
	docker compose build

up:
	docker compose up

run: up

down:
	docker compose down

compile:
	docker compose run --rm frontend sh -c "npm run build:secure && chown -R $$(id -u):$$(id -g) build"

audit:
	docker compose run --rm frontend npm audit
