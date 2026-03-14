SHELL := /bin/zsh
HOST ?= localhost
PORT ?= 5173
BROWSER_URL ?= http://$(HOST):$(PORT)
PORT_CHECK_CMD = lsof -nP -iTCP:$(PORT) -sTCP:LISTEN

.PHONY: check dev agentation

check:
	@set -a; \
		[ -f ./.env ] && source ./.env; \
		[ -f ./.env.local ] && source ./.env.local; \
		set +a; \
		pnpm test:run && pnpm lint && pnpm build

dev:
	@pids="$$($(PORT_CHECK_CMD) | tail -n +2)"; \
		if [ -n "$$pids" ]; then \
			printf '%s\n' "Port $(PORT) is already in use. Stop the existing process before running make dev."; \
			$(PORT_CHECK_CMD); \
			exit 1; \
		fi
	@$(MAKE) check
	@set -a; \
		[ -f ./.env ] && source ./.env; \
		[ -f ./.env.local ] && source ./.env.local; \
		set +a; \
		pnpm dev --host $(HOST) --port $(PORT) --strictPort

agentation:
	@pids="$$($(PORT_CHECK_CMD) | tail -n +2)"; \
		if [ -n "$$pids" ]; then \
			printf '%s\n' "Port $(PORT) is already in use. Stop the existing process before running make agentation."; \
			$(PORT_CHECK_CMD); \
			exit 1; \
		fi
	@$(MAKE) check
	@printf '%s\n' "Starting Nurimap with Agentation enabled in development mode."
	@printf '%s\n' "App URL: $(BROWSER_URL)"
	@printf '%s\n' "Agentation MCP endpoint: http://localhost:4747"
	@printf '%s\n' "VITE_ENABLE_AGENTATION=true"
	@if curl -fsS http://localhost:4747 >/dev/null 2>&1; then \
		printf '%s\n' "Agentation MCP server is reachable."; \
	else \
		printf '%s\n' "Agentation MCP server is not responding on http://localhost:4747."; \
		printf '%s\n' "Start it separately if you need live annotation sync."; \
	fi
	@set -a; \
		[ -f ./.env ] && source ./.env; \
		[ -f ./.env.local ] && source ./.env.local; \
		set +a; \
		VITE_ENABLE_AGENTATION=true pnpm dev --host $(HOST) --port $(PORT) --strictPort
