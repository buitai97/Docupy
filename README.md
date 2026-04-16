# Docupy — AI Document Chat Platform

Upload a document and chat with its content using AI. Supports PDF, DOCX, and TXT files with real-time streaming responses powered by OpenAI and pgvector semantic search.

## Features

- **Document chat** — Upload PDF, DOCX, or TXT files and ask questions about their content
- **Multi-document chat** — Ask questions across your entire document library
- **Streaming responses** — Real-time token-by-token AI responses with source citations
- **Guest mode** — Chat with documents without creating an account (2-hour session)
- **Authentication** — Email/password and Google OAuth 2.0
- **Document management** — Rename and delete documents
- **Chat history** — Persistent per-document chat history

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js, React, Tailwind CSS, shadcn/ui |
| Backend | Node.js, Express, TypeScript |
| Database | PostgreSQL + pgvector |
| AI | OpenAI (GPT-4o-mini + text-embedding-3-small) |
| Auth | JWT, Passport.js, Google OAuth 2.0 |
| Cloud | AWS EC2, RDS, SSM Parameter Store |
| CI/CD | GitHub Actions |

## Getting Started

### Prerequisites

- Node.js 20+
- Docker (for local PostgreSQL with pgvector)
- OpenAI API key
- Google OAuth credentials (optional)

### Installation

```bash
# Install all dependencies
npm install
npm install --prefix backend
npm install --prefix frontend
```

### Environment Variables

Create `backend/.env`:

```env
OPENAI_API_KEY=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
JWT_SECRET=
FRONTEND_URL=http://localhost:3000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=rag_app
DB_USER=postgres
DB_PASSWORD=
PORT=5000
```

Create `frontend/.env`:

```env
BACKEND_URL=http://localhost:5000
```

### Run Locally

```bash
# Start PostgreSQL with pgvector
docker-compose up -d

# Start both frontend and backend
npm run dev
```

- Frontend: http://localhost:3000
- Backend: http://localhost:5000
- Health check: http://localhost:5000/api/health

## Project Structure

```
ai-doc-platform/
├── backend/
│   ├── config/         # OpenAI, Passport, rate limiting, SSM
│   ├── controllers/    # Route handlers
│   ├── middleware/     # Auth, file upload
│   ├── models/         # Sequelize models (User, Document, ChatMessage)
│   ├── routes/         # API route definitions
│   ├── services/       # Business logic (AI, chunking, embeddings, auth)
│   └── index.ts        # Server entry point
├── frontend/
│   └── src/app/
│       ├── components/ # Auth provider, chat interface, sidebar
│       ├── documents/  # Per-document chat page
│       ├── chat/       # All-documents chat page
│       ├── guest/      # Guest mode chat page
│       └── settings/   # User profile settings
└── .github/workflows/
    └── cicd.yml        # CI/CD pipeline
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register with email/password |
| POST | `/api/auth/login` | Login |
| GET | `/api/auth/google` | Google OAuth |
| GET | `/api/auth/me` | Current user |
| POST | `/api/upload` | Upload document (auth required) |
| POST | `/api/upload/guest` | Upload document (guest) |
| GET | `/api/documents` | List documents |
| DELETE | `/api/documents/:id` | Delete document |
| POST | `/api/chat/stream` | Streaming chat |
| POST | `/api/chat/all/stream` | Chat across all documents |
| GET | `/api/chat/:id/history` | Chat history |
| GET | `/api/health` | Health check |

## Deployment

The CI/CD pipeline (GitHub Actions) automatically:
1. Runs TypeScript build and ESLint on every push
2. Deploys to AWS EC2 on pushes to `main` (after CI passes)

### Required GitHub Secrets

| Secret | Description |
|--------|-------------|
| `EC2_HOST` | EC2 public IP or domain |
| `EC2_USER` | SSH username (e.g. `ubuntu`) |
| `EC2_SSH_KEY` | Private SSH key contents |

### Production Configuration

On EC2 with `USE_SSM=true`, secrets are loaded from AWS SSM Parameter Store instead of `.env` files. The EC2 instance must have an IAM role with SSM read permissions.

```
PM2 processes:
  - backend  → node dist/index.js (port 5000)
  - frontend → next start (port 3000)

Nginx reverse proxy:
  - /api/*   → localhost:5000
  - /*       → localhost:3000
```
