# syntax=docker/dockerfile:1.7

FROM node:26-bookworm-slim AS renderer-build
WORKDIR /workspace
RUN npm install --global pnpm@10.29.2
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY frontend/package.json ./frontend/package.json
RUN pnpm install --frozen-lockfile
COPY frontend ./frontend
RUN pnpm --dir frontend build:renderer
# The compiled renderer bundles everything except Chromium's driver.
RUN mkdir /renderer && cd /renderer && npm install --omit=dev --ignore-scripts --no-package-lock puppeteer-core@24.43.1

FROM python:3.12-slim-bookworm AS runtime

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy

ENV RESUME_RENDERER_PATH=/opt/resume-renderer/resume-renderer.cjs \
    RESUME_PUBLIC_DIR=/opt/resume-renderer/public \
    CHROME_PATH=/usr/bin/chromium
COPY --from=renderer-build /usr/local/bin/node /usr/local/bin/node
COPY --from=renderer-build /renderer/node_modules /opt/resume-renderer/node_modules
COPY --from=renderer-build /workspace/frontend/dist/resume-renderer.cjs /opt/resume-renderer/resume-renderer.cjs
COPY --from=renderer-build /workspace/frontend/public /opt/resume-renderer/public
# Node is copied from another image; its shared libraries must be installed here.
RUN apt-get update && apt-get install -y --no-install-recommends libatomic1 chromium fonts-noto-cjk fonts-liberation \
    && rm -rf /var/lib/apt/lists/* \
    && node --version

WORKDIR /app

RUN pip install --no-cache-dir uv==0.11.26

COPY backend/pyproject.toml backend/uv.lock ./
RUN uv sync --frozen --no-dev

COPY backend/app ./app

RUN useradd --create-home --uid 10001 appuser && chown -R appuser:appuser /app
USER appuser

EXPOSE 8000
HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=5 \
  CMD ["/app/.venv/bin/python", "-c", "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/api/v1/health/live', timeout=3)"]

CMD ["/app/.venv/bin/uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
