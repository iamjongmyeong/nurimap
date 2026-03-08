SHELL := /bin/zsh
HOST ?= 127.0.0.1
PORT ?= 5173
BROWSER_URL ?= http://localhost:$(PORT)

.PHONY: check dev dev-run

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
	@(python3 - <<'PY' "$(HOST)" "$(PORT)" "$(BROWSER_URL)" &
import socket
import sys
import time
import webbrowser

host, port, url = sys.argv[1], int(sys.argv[2]), sys.argv[3]
deadline = time.time() + 30
while time.time() < deadline:
    sock = socket.socket()
    sock.settimeout(0.5)
    try:
        sock.connect((host, port))
        sock.close()
        webbrowser.open(url)
        break
    except OSError:
        time.sleep(0.5)
    finally:
        try:
            sock.close()
        except OSError:
            pass
PY
	) >/dev/null 2>&1 &
	@set -a; \
		[ -f ./.env ] && source ./.env; \
		[ -f ./.env.local ] && source ./.env.local; \
		set +a; \
		npm run dev -- --host $(HOST) --port $(PORT) --strictPort
