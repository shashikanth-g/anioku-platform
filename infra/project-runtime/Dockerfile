# Base sandbox image every user project runs in (Phase 3).
#
# TODO(Phase 3): flesh this out — pin versions, add common global CLIs the
# in-browser terminal/agents expect (git, curl, ripgrep), and a non-root user
# the docker_manager exec's into. Node + Python are both included so the
# platform can run JS/TS and Python projects out of the box; per-project
# dependency installs (npm/pip) happen inside the running container, not here.

FROM node:20-bookworm-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    python3-pip \
    python3-venv \
    git \
    curl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /workspace

CMD ["sleep", "infinity"]
