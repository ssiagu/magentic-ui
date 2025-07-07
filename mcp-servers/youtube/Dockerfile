FROM ghcr.io/astral-sh/uv:python3.12-bookworm-slim

#################################
# Recommended envs from uv docs #
#################################

# Enable bytecode compilation
ENV UV_COMPILE_BYTECODE=1
ENV UV_LINK_MODE=copy

WORKDIR /app

# Install the project's dependencies using the lockfile and settings
RUN --mount=type=cache,target=/root/.cache/uv \
    --mount=type=bind,source=uv.lock,target=uv.lock \
    --mount=type=bind,source=pyproject.toml,target=pyproject.toml \
    uv sync --locked --no-install-project --no-dev

ENV PATH="/app/.venv/bin:$PATH"

# Install the project itself (with cached deps)
COPY youtube.py youtube.py
COPY pyproject.toml pyproject.toml
COPY uv.lock uv.lock
RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --locked --no-dev

# Set the entrypoint to run the coder MCP server
ENTRYPOINT ["python", "/app/youtube.py"]