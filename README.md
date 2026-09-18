# LT Employ Assistant

LT Employ Assistant is a separated Next.js and FastAPI application for resume creation, AI-assisted editing, candidate profiles, sharing, exporting, and simulated interviews.

## Stack

- Frontend: Next.js 16, React 19, TypeScript, Tailwind CSS, Zustand, AI SDK
- Backend: FastAPI, SQLAlchemy, LangChain, LangGraph
- AI transports: OpenAI-compatible, Anthropic, and Gemini
- Voice interviews: browser speech recognition and DashScope duplex streaming TTS
- Persistence: PostgreSQL, configured by `DATABASE_URL` in the root `.env`. First startup creates missing application tables.

Next.js serves UI and Better Auth at `/api/auth/*`. Other `/api/*` requests are owned by FastAPI; `frontend/src/proxy.ts` preserves same-origin access and streaming during local development.

## Development

Requirements: Node.js 26+, pnpm 10.29.2, Python 3.12+, and uv.

```bash
pnpm install
uv sync --directory backend
pnpm dev:api
pnpm dev:web
```

The web application runs on `http://localhost:3000`; FastAPI runs on `http://localhost:8000`.

Copy `.env.example` to the ignored root `.env` and configure PostgreSQL and the model provider. Both processes load the root `.env`; process environment variables take precedence. The backend also accepts `APP_*` aliases. Configure AUTH_SECRET, APP_URL, SMTP and GitHub OAuth variables for login. Users keep model and voice API keys in their browser; every web request requires the user’s own credentials, even during local development. Database ownership fields, foreign keys, and resource ownership checks remain intact. See [authentication setup](docs/authentication.md).

## Validation

```bash
pnpm type-check
pnpm test
pnpm lint
pnpm test:api
pnpm check:api
pnpm build
```

## Layout

```text
frontend/                 Next.js pages, components, hooks and client state
backend/                  FastAPI routes, services, persistence and AI workflows
deploy/nginx.conf         same-origin production routing
docker-compose.yml        gateway, frontend and backend services
.env.example              environment variable template
ARCHITECTURE.md           current system boundaries and design rules
```

See [ARCHITECTURE.md](./ARCHITECTURE.md) for workflow and ownership details.
