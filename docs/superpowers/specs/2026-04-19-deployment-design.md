# Deployment Design: Vercel + Basic Auth

**Date:** 2026-04-19
**Status:** Approved
**Scope:** Deploy the Deutsch Tutor app to a custom domain with HTTPS and password protection

---

## Context

Deutsch Tutor is a Next.js 15 / React 19 app. It is entirely frontend — all content is hardcoded in `src/content/catalog.ts` and all user progress is stored in `localStorage` via Zustand persist. There are no API routes and no database. It is for personal use by a single user.

The goal is to make it accessible at a custom domain with:
1. HTTPS (automatic TLS)
2. A password gate so only the owner can access it

No backend is required.

---

## Architecture

The app code is unchanged. Two things are added:

1. **`src/middleware.ts`** — Next.js Edge middleware that enforces HTTP Basic Auth on every request before any content is served.
2. **Vercel environment variables** — `AUTH_USERNAME` and `AUTH_PASSWORD` stored in the Vercel dashboard, never committed to git.

Cloudflare or any other service is not used. Vercel handles both hosting and TLS.

---

## Middleware

**File:** `src/middleware.ts`

**Behaviour:**
- Runs on the Vercel Edge network before any page or asset is served
- Reads the `Authorization` header from each incoming request
- If the header is absent or the decoded credentials do not match `AUTH_USERNAME` / `AUTH_PASSWORD`, responds with HTTP `401` and a `WWW-Authenticate: Basic realm="Deutsch Tutor"` header — the browser displays its native login prompt
- If credentials match, calls `NextResponse.next()` to pass the request through

**Matcher:**
```
matcher: ['/((?!_next/static|_next/image|favicon.ico).*)']
```
All routes including static assets are protected. No HTML, JS, CSS, or data leaks to an unauthenticated request.

**Security properties:**
- Credentials are only ever compared server-side on the Edge — they never reach the client
- No session cookie is issued; credentials are re-checked on every request
- `AUTH_PASSWORD` is marked Sensitive in Vercel — not visible after saving, not in git history

---

## Deployment Steps

### 1. Vercel Project Setup
- Connect the GitHub repository to a new Vercel project
- Vercel auto-detects Next.js — no `vercel.json` config needed
- In Project Settings → Environment Variables → Production, add:
  - `AUTH_USERNAME` — chosen username (e.g. `tarandeep`)
  - `AUTH_PASSWORD` — a strong password, marked as Sensitive

### 2. Custom Domain
- In Vercel dashboard → Domains, add the custom domain
- At the domain registrar, set either:
  - An **A record** pointing to Vercel's IP (provided in the dashboard), or
  - A **CNAME** pointing to `cname.vercel-dns.com`
- Vercel automatically provisions a Let's Encrypt TLS certificate — HTTPS is live within minutes of DNS propagation

### 3. Deploy
- Push to `main` → Vercel builds and deploys automatically
- Every subsequent push to `main` triggers a new zero-downtime deploy

---

## What Is Not Changing

- No pages, components, content, or store logic are modified
- No new dependencies are added to `package.json`
- No login page is built — the browser's native Basic Auth dialog is the UI
- No backend, database, or auth service is introduced

---

## Files Affected

| File | Change |
|---|---|
| `src/middleware.ts` | New file — Edge Basic Auth implementation |

---

## Out of Scope

- Multi-user accounts or server-side progress storage
- OAuth / SSO
- Rate limiting or brute-force protection (acceptable for personal use; the domain is not publicly advertised)
