# Deployment Design: Google Cloud Run

**Date:** 2026-04-19
**Status:** Approved
**Scope:** Deploy the Deutsch Tutor app to Google Cloud Run with a custom domain, HTTPS, and HTTP Basic Auth password gate

---

## Context

Deutsch Tutor is a Next.js 15 / React 19 app. It is entirely frontend — all content is hardcoded in `src/content/catalog.ts` and all user progress is stored in `localStorage` via Zustand persist. There are no API routes and no database. It is for personal use by a single user who already has a GCP account.

HTTP Basic Auth is already implemented in `src/middleware.ts`. It reads credentials from `process.env.AUTH_USERNAME` and `process.env.AUTH_PASSWORD` at runtime. No changes to the middleware are needed.

The goal is to run the app on Google Cloud Run, behind the existing auth middleware, accessible at a custom domain with automatic HTTPS.

No backend is required. Vercel is not used.

---

## Architecture

Three changes to the codebase:

1. **`next.config.ts`** — add `output: 'standalone'` so Next.js produces a self-contained server bundle at `.next/standalone`, suitable for containerisation without `node_modules` at runtime.
2. **`Dockerfile`** — multi-stage build: install deps → build app → create lean production image running `node server.js` on port 3000 as a non-root user.
3. **`.dockerignore`** — exclude `node_modules`, `.next`, `.git`, `.env*`, and `docs` from the Docker build context.

Deployment is via the `gcloud` CLI. Credentials are passed as Cloud Run environment variables — never written to any file.

---

## Files Changed

| File | Action | Purpose |
|---|---|---|
| `next.config.ts` | Modify | Enable `output: 'standalone'` |
| `Dockerfile` | Create | Multi-stage container build |
| `.dockerignore` | Create | Keep image small, prevent secret leakage |

No other files are modified.

---

## Dockerfile

Multi-stage build with three stages:

**Stage 1 — deps** (`node:20-alpine`)
- Sets `WORKDIR /app`
- Copies `package.json` and `package-lock.json`
- Runs `npm ci` to install all dependencies

**Stage 2 — builder** (`node:20-alpine`)
- Copies `node_modules` from Stage 1
- Copies all source files
- Runs `npm run build` (Next.js build with standalone output)

**Stage 3 — runner** (`node:20-alpine`)
- Sets `NODE_ENV=production`, `PORT=3000`, `HOSTNAME=0.0.0.0`
- Creates a non-root `nextjs` user and group
- Copies from builder:
  - `.next/standalone` → `/app/` (the self-contained server)
  - `.next/static` → `/app/.next/static` (static assets)
  - `public` → `/app/public`
- Runs as `nextjs` user
- Exposes port 3000
- `CMD ["node", "server.js"]`

---

## .dockerignore

```
node_modules
.next
.git
.env
.env.*
docs
*.md
```

---

## GCP Infrastructure

**Region:** `us-central1` (supports Cloud Run domain mappings)

**Services used:**
- **Artifact Registry** — stores Docker images (`deutsch-tutor` repository)
- **Cloud Run** — runs the containerised Next.js app (managed, serverless)
- **Cloud Run domain mappings** — attaches custom domain and provisions HTTPS via Google-managed certificate

---

## Deployment Steps

### One-time setup

```bash
# Enable required APIs
gcloud services enable run.googleapis.com artifactregistry.googleapis.com

# Create Artifact Registry repository
gcloud artifacts repositories create deutsch-tutor \
  --repository-format=docker \
  --location=us-central1

# Configure Docker to authenticate with Artifact Registry
gcloud auth configure-docker us-central1-docker.pkg.dev
```

### Every deploy

```bash
# Build and push image via Cloud Build (no local Docker required)
gcloud builds submit --tag us-central1-docker.pkg.dev/PROJECT_ID/deutsch-tutor/app

# Deploy to Cloud Run
gcloud run deploy deutsch-tutor \
  --image us-central1-docker.pkg.dev/PROJECT_ID/deutsch-tutor/app \
  --region us-central1 \
  --platform managed \
  --allow-unauthenticated \
  --set-env-vars AUTH_USERNAME=YOUR_USERNAME,AUTH_PASSWORD=YOUR_PASSWORD
```

> `--allow-unauthenticated` means Cloud Run does not add its own Google IAM auth layer — the app's own Basic Auth middleware handles access control instead.

> Replace `PROJECT_ID`, `YOUR_USERNAME`, and `YOUR_PASSWORD` with real values. Never commit these to git.

### Custom domain + HTTPS

```bash
gcloud run domain-mappings create \
  --service deutsch-tutor \
  --domain yourdomain.com \
  --region us-central1
```

The command outputs a DNS record (A or CNAME) to add at your registrar. Once set, Google provisions a managed TLS certificate automatically — HTTPS is live within minutes of DNS propagation.

---

## Verification

1. Open `https://yourdomain.com` — browser shows a padlock and a login prompt
2. Enter correct credentials → app loads
3. Enter wrong credentials → prompt re-appears
4. Open the app in a private/incognito window and confirm the gate still holds

---

## What Is Not Changing

- `src/middleware.ts` — unchanged, already reads from `process.env`
- All pages, components, content, and store logic — unchanged
- No backend, database, or auth service is introduced
- No new npm dependencies

---

## Cost

For personal use (low traffic), Cloud Run stays well within the free tier:
- 2 million requests/month free
- 180,000 vCPU-seconds/month free
- 360,000 GB-seconds/month free

Artifact Registry storage for a single image is negligible (cents/month or free under 0.5 GB).

---

## Out of Scope

- CI/CD pipeline (GitHub Actions auto-deploy on push) — can be added later
- Secret Manager for credentials — env vars are sufficient for personal use
- Multi-region deployment
- Custom Cloud Build triggers
