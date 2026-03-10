SHELL := /bin/zsh
HOST ?= 127.0.0.1
PORT ?= 5173
BROWSER_URL ?= http://localhost:$(PORT)

.PHONY: check dev dev-run agentation

check:
	@set -a; \
		[ -f ./.env ] && source ./.env; \
		[ -f ./.env.local ] && source ./.env.local; \
		set +a; \
		npm run test:run && npm run lint && npm run build

dev: check
	@set -a; \
		[ -f ./.env ] && source ./.env; \
		[ -f ./.env.local ] && source ./.env.local; \
		set +a; \
		npm run dev -- --host $(HOST) --port $(PORT) --strictPort

dev-run: check
	@(for _ in $$(seq 1 60); do \
		if nc -z $(HOST) $(PORT) >/dev/null 2>&1; then \
			open "$(BROWSER_URL)" >/dev/null 2>&1; \
			exit 0; \
		fi; \
		sleep 0.5; \
	done) >/dev/null 2>&1 &
	@set -a; \
		[ -f ./.env ] && source ./.env; \
		[ -f ./.env.local ] && source ./.env.local; \
		set +a; \
		npm run dev -- --host $(HOST) --port $(PORT) --strictPort

agentation: check
	@printf '%s\n' "Starting Nurimap with Agentation enabled in development mode."
	@printf '%s\n' "App URL: $(BROWSER_URL)"
	@printf '%s\n' "Agentation MCP endpoint: http://localhost:4747"
	@if curl -fsS http://localhost:4747 >/dev/null 2>&1; then \
		printf '%s\n' "Agentation MCP server is reachable."; \
	else \
		printf '%s\n' "Agentation MCP server is not responding on http://localhost:4747."; \
		printf '%s\n' "Start it separately if you need live annotation sync."; \
	fi
	@(for _ in $$(seq 1 60); do \
		if nc -z $(HOST) $(PORT) >/dev/null 2>&1; then \
			open "$(BROWSER_URL)" >/dev/null 2>&1; \
			exit 0; \
		fi; \
		sleep 0.5; \
	done) >/dev/null 2>&1 &
	@set -a; \
		[ -f ./.env ] && source ./.env; \
		[ -f ./.env.local ] && source ./.env.local; \
		set +a; \
		npm run dev -- --host $(HOST) --port $(PORT) --strictPort
