SHELL := /bin/zsh
LOOPBACK_HOST ?= localhost
PORT ?= 5173
SUPABASE_STUDIO_HOST ?= 127.0.0.1
SUPABASE_STUDIO_PORT ?= 54323
SUPABASE_STUDIO_URL ?= http://$(SUPABASE_STUDIO_HOST):$(SUPABASE_STUDIO_PORT)
PORT_CHECK_CMD = lsof -nP -iTCP:$(PORT) -sTCP:LISTEN
VITE_DEV_CMD = pnpm exec vite --port $(PORT)
VERCEL_DEV_HOST ?= localhost
VERCEL_DEV_CMD = pnpm exec vercel dev --local --listen $(VERCEL_DEV_HOST):$(PORT) --yes
AGENTATION_HTTP_HOST ?= localhost
AGENTATION_HTTP_PORT ?= 4747
AGENTATION_HTTP_URL ?= http://$(AGENTATION_HTTP_HOST):$(AGENTATION_HTTP_PORT)
AGENTATION_SERVER_START_CMD ?= npx -y agentation-mcp server
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
		NURIMAP_SHOW_SUPABASE_STUDIO_BANNER=true SUPABASE_STUDIO_URL="$(SUPABASE_STUDIO_URL)" $(VITE_DEV_CMD)

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
	@$(ENV_BOOTSTRAP) \
		agentation_endpoint="$${VITE_AGENTATION_ENDPOINT:-$(AGENTATION_HTTP_URL)}"; \
		agentation_health_url="$${agentation_endpoint%/}/health"; \
		agentation_port="$$(node -e 'const url = new URL(process.argv[1]); const port = url.port || (url.protocol === "https:" ? "443" : "80"); process.stdout.write(port);' "$$agentation_endpoint")"; \
		agentation_pid=""; \
		agentation_started="false"; \
		cleanup() { \
			if [ "$$agentation_started" = "true" ] && [ -n "$$agentation_pid" ] && kill -0 "$$agentation_pid" >/dev/null 2>&1; then \
				kill "$$agentation_pid" >/dev/null 2>&1 || true; \
				wait "$$agentation_pid" >/dev/null 2>&1 || true; \
			fi; \
		}; \
		trap cleanup EXIT INT TERM; \
		printf '%s\n' "Agentation MCP endpoint: $$agentation_endpoint"; \
		printf '%s\n' "VITE_ENABLE_AGENTATION=true"; \
		if curl -fsS "$$agentation_health_url" >/dev/null 2>&1; then \
			printf '%s\n' "Agentation MCP server is reachable."; \
		else \
			printf '%s\n' "Agentation MCP server is not responding on $$agentation_health_url. Starting a local server on port $$agentation_port..."; \
			$(AGENTATION_SERVER_START_CMD) --port "$$agentation_port" >/tmp/nurimap-agentation.log 2>&1 & \
			agentation_pid="$$!"; \
			agentation_started="true"; \
			for attempt in $$(seq 1 20); do \
				if curl -fsS "$$agentation_health_url" >/dev/null 2>&1; then \
					printf '%s\n' "Agentation MCP server is reachable."; \
					break; \
				fi; \
				if ! kill -0 "$$agentation_pid" >/dev/null 2>&1; then \
					printf '%s\n' "Agentation MCP server exited before becoming healthy. See /tmp/nurimap-agentation.log"; \
					exit 1; \
				fi; \
				sleep 0.5; \
				if [ "$$attempt" -eq 20 ]; then \
					printf '%s\n' "Agentation MCP server did not become healthy in time. See /tmp/nurimap-agentation.log"; \
					exit 1; \
				fi; \
			done; \
		fi; \
		lan_host="$${NURIMAP_DEV_LAN_HOST:-$$($(LAN_HOST_DETECTION_CMD))}"; \
		if [ -n "$$lan_host" ]; then \
			printf '%s\n' "LAN URL: http://$$lan_host:$(PORT)"; \
		else \
			printf '%s\n' "LAN URL: Vite will also print a detected Network URL when a private LAN IPv4 is available."; \
			printf '%s\n' "Set NURIMAP_DEV_LAN_HOST in .env.local to override this hint if needed."; \
		fi; \
		SUPABASE_STUDIO_URL="$(SUPABASE_STUDIO_URL)" VITE_ENABLE_AGENTATION=true $(VITE_DEV_CMD)
