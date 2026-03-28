SHELL := /bin/zsh
LOOPBACK_HOST ?= localhost
PORT ?= 5173
SUPABASE_STUDIO_HOST ?= 127.0.0.1
SUPABASE_STUDIO_PORT ?= 54323
SUPABASE_STUDIO_URL ?= http://$(SUPABASE_STUDIO_HOST):$(SUPABASE_STUDIO_PORT)
PORT_CHECK_CMD = lsof -nP -iTCP:$(PORT) -sTCP:LISTEN
VITE_DEV_CMD = pnpm dev -- --port $(PORT)
VERCEL_DEV_HOST ?= localhost
VERCEL_DEV_CMD = pnpm dev:vercel -- --listen $(VERCEL_DEV_HOST):$(PORT)
LAN_HOST_DETECTION_CMD = node -e "const os = require('node:os'); const isPrivate = (address) => /^10\\./.test(address) || /^192\\.168\\./.test(address) || /^172\\.(1[6-9]|2\\d|3[0-1])\\./.test(address); for (const infos of Object.values(os.networkInterfaces())) { for (const info of infos ?? []) { if (info.family === 'IPv4' && !info.internal && isPrivate(info.address)) { console.log(info.address); process.exit(0); } } }"
ENV_BOOTSTRAP = set -a; \
	[ -f ./.env ] && source ./.env; \
	[ -f ./.env.local ] && source ./.env.local; \
	set +a;

.PHONY: check dev dev-vercel agentation

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
	@$(ENV_BOOTSTRAP) \
		lan_host="$${NURIMAP_DEV_LAN_HOST:-$$($(LAN_HOST_DETECTION_CMD))}"; \
		printf '%s\n' "Starting Nurimap integrated Vite runtime in local development mode."; \
		printf '%s\n' "Loopback URL: http://$(LOOPBACK_HOST):$(PORT)"; \
		if [ -n "$$lan_host" ]; then \
			printf '%s\n' "LAN URL: http://$$lan_host:$(PORT)"; \
		else \
			printf '%s\n' "LAN URL: Vite will also print a detected Network URL when a private LAN IPv4 is available."; \
			printf '%s\n' "Set NURIMAP_DEV_LAN_HOST in .env.local to override this hint if needed."; \
		fi; \
		printf '%s\n' "Supabase Studio: $(SUPABASE_STUDIO_URL)"; \
		printf '%s\n' "Make sure local Supabase is already running before exercising backend flows."; \
		$(VITE_DEV_CMD)

dev-vercel:
	@pids="$$($(PORT_CHECK_CMD) | tail -n +2)"; \
		if [ -n "$$pids" ]; then \
			printf '%s\n' "Port $(PORT) is already in use. Stop the existing process before running make dev-vercel."; \
			$(PORT_CHECK_CMD); \
			exit 1; \
		fi
	@$(MAKE) check
	@printf '%s\n' "Starting Nurimap integrated runtime with opt-in vercel dev local debug mode."
	@printf '%s\n' "Loopback URL: http://$(VERCEL_DEV_HOST):$(PORT)"
	@printf '%s\n' "Supabase Studio: $(SUPABASE_STUDIO_URL)"
	@printf '%s\n' "Make sure local Supabase is already running before exercising backend flows."
	@$(ENV_BOOTSTRAP) \
		$(VERCEL_DEV_CMD)

agentation:
	@pids="$$($(PORT_CHECK_CMD) | tail -n +2)"; \
		if [ -n "$$pids" ]; then \
			printf '%s\n' "Port $(PORT) is already in use. Stop the existing process before running make agentation."; \
			$(PORT_CHECK_CMD); \
			exit 1; \
		fi
	@$(MAKE) check
	@printf '%s\n' "Starting Nurimap with Agentation enabled in Vite development mode."
	@printf '%s\n' "Loopback URL: http://$(LOOPBACK_HOST):$(PORT)"
	@printf '%s\n' "Supabase Studio: $(SUPABASE_STUDIO_URL)"
	@printf '%s\n' "Make sure local Supabase is already running before exercising backend flows."
	@printf '%s\n' "Agentation MCP endpoint: http://localhost:4747"
	@printf '%s\n' "VITE_ENABLE_AGENTATION=true"
	@if curl -fsS http://localhost:4747 >/dev/null 2>&1; then \
		printf '%s\n' "Agentation MCP server is reachable."; \
	else \
		printf '%s\n' "Agentation MCP server is not responding on http://localhost:4747."; \
		printf '%s\n' "Start it separately if you need live annotation sync."; \
	fi
	@$(ENV_BOOTSTRAP) \
		lan_host="$${NURIMAP_DEV_LAN_HOST:-$$($(LAN_HOST_DETECTION_CMD))}"; \
		if [ -n "$$lan_host" ]; then \
			printf '%s\n' "LAN URL: http://$$lan_host:$(PORT)"; \
		else \
			printf '%s\n' "LAN URL: Vite will also print a detected Network URL when a private LAN IPv4 is available."; \
			printf '%s\n' "Set NURIMAP_DEV_LAN_HOST in .env.local to override this hint if needed."; \
		fi; \
		VITE_ENABLE_AGENTATION=true $(VITE_DEV_CMD)
