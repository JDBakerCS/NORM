# NORM

NORM is a GitHub-connected pull-request triage dashboard. It imports open pull requests, decides what action each one needs, and ranks the human-review queue with visible rules based on urgency, risk, change size, and waiting time.

NORM does not review code, clone repositories, use an LLM, or write to GitHub.

## Architecture

```text
React / Vite (5173)
        │ JWT + JSON over HTTPS
        ▼
Express API (8080) ───── read-only Octokit ────► GitHub API
        │
        ▼
Sequelize ─────► PostgreSQL locally or Neon
```

The source is deliberately split into `frontend/` and `backend/`. See [ARCHITECTURE.md](./ARCHITECTURE.md) for the model, request flow, synchronization behavior, and decision rules.

## Technology

- React, Vite, React Router, Axios, plain CSS
- Node.js, Express, Sequelize, PostgreSQL
- Octokit for read-only GitHub requests
- bcrypt password hashes and eight-hour JWT sessions
- Node's built-in test runner and Supertest

## Requirements

- Node.js 20 or newer
- npm
- PostgreSQL 14+ locally, or a Neon PostgreSQL connection string

## Local setup

1. Create a PostgreSQL database named `norm`, or create a Neon project.
2. Copy `backend/.env.example` to `backend/.env` and supply the values described below.
3. Copy `frontend/.env.example` to `frontend/.env`. The example value already targets the local backend.
4. Install dependencies and create the schema:

```bash
cd norm/backend
npm install
npm run db:sync

cd ../frontend
npm install
```

5. Start each application in its own terminal:

```bash
cd norm/backend
npm run dev
```

```bash
cd norm/frontend
npm run dev
```

Open `http://localhost:5173`. The API health endpoint is `http://localhost:8080/api/health`.

Normal backend startup only authenticates with PostgreSQL. It does not create, alter, or reset tables. `npm run db:sync` explicitly creates missing tables without forcing a reset.

## Environment variables

### Backend

| Variable | Required | Purpose |
| --- | --- | --- |
| `PORT` | No | API port; defaults to `8080` |
| `NODE_ENV` | Yes in production | Enables production-safe errors and PostgreSQL SSL |
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `JWT_SECRET` | Yes | Private signing secret, at least 16 characters; use a long random value |
| `GITHUB_TOKEN` | For Sync | Fine-grained personal access token, held only by the backend |
| `FRONTEND_URL` | Yes | Exact allowed browser origin, without a trailing slash |

### Frontend

| Variable | Required | Purpose |
| --- | --- | --- |
| `VITE_API_URL` | Yes | Public API base URL ending in `/api` |

Never put the GitHub token, JWT secret, or database URL in a `VITE_` variable. `.env` files are ignored by Git.

## GitHub token setup

Create a fine-grained personal access token scoped only to the repositories NORM needs. Give it read-only access to repository metadata, [pull requests](https://docs.github.com/en/rest/pulls/reviews), [checks](https://docs.github.com/en/rest/checks/runs), and [commit statuses](https://docs.github.com/en/rest/commits/statuses). No write permission is needed. Store it as `GITHUB_TOKEN` in `backend/.env`; do not paste it into the browser or commit it.

For a private repository, the token's repository access must include that repository. If an organization requires token approval, an organization owner must approve it before Sync can read the repository.

## Seed and demo mode

The seed is intentionally destructive and is the only workflow that calls `sync({ force: true })`. It refuses to run unless invoked through the explicit reset form:

```bash
cd norm/backend
npm run seed
```

It creates ten realistic PRs and runs every one through the production queue and priority services.

- Email: `demo@norm.local`
- Password: `norm-demo-password`

Do not use the demo password for a real account.

## Commands

Backend:

```bash
npm run dev       # restart on backend changes
npm start         # production-style startup
npm run db:sync   # non-destructive schema creation
npm run seed      # explicit destructive demo reset
npm test          # unit and service tests
```

Frontend:

```bash
npm run dev
npm run build
npm run preview
```

## Manual synchronization

After adding an owner and repository name, press **Sync from GitHub**. The backend:

1. verifies repository access;
2. retrieves open PRs, changed files, reviews, check runs, commit statuses, and mergeability;
3. normalizes GitHub's responses;
4. detects configured agent signals;
5. calculates queue status and priority;
6. upserts each PR in one database transaction; and
7. marks previously imported PRs closed when GitHub no longer returns them as open.

Repeated syncs update the same rows using database uniqueness constraints; they do not create duplicates.
When a pull request is merged or closed on GitHub, the next sync removes it from NORM's active queues and records it as closed. NORM triages pull requests; it does not merge them.

## Webhook synchronization

Manual Sync remains available as a reconciliation and recovery path. To keep a registered repository fresh between manual syncs, NORM also accepts signed GitHub webhook deliveries at:

```text
https://YOUR-RENDER-SERVICE.onrender.com/api/github/webhook
```

Set the same strong random value as `GITHUB_WEBHOOK_SECRET` in the backend environment and in GitHub's webhook **Secret** field. NORM verifies GitHub's `X-Hub-Signature-256` against the original request body before it parses or records a delivery. It stores the delivery ID to ignore duplicates, then refetches the affected PR from GitHub rather than trusting an event's possibly stale payload.

In the GitHub repository's **Settings → Webhooks**, use JSON content and subscribe to these individual events:

- Pull requests
- Pull request reviews
- Check runs
- Check suites
- Statuses

Webhook delivery tests should focus on queue-relevant PR, review, and CI events rather than branch-push traffic.

The endpoint responds quickly and serializes refreshes for each configured NORM repository. Unsupported events, repositories not registered in NORM, and status events that do not match a stored open PR are recorded as ignored. A restart resumes pending work; Manual Sync remains the fallback for a failed delivery.

This feature adds the `webhook_deliveries` table. Run the explicit, non-destructive `npm run db:sync` against the deployed database after deploying the feature and before creating the GitHub webhook.

## Testing

```bash
cd norm/backend
npm test

cd ../frontend
npm run build
```

Database startup and live sync checks require real environment values:

```bash
cd norm/backend
npm run db:sync
npm start
```

Then request `/api/health`, sign in, add an accessible GitHub repository, and press Sync.

## Deployment

### Neon

1. Create a Neon PostgreSQL project.
2. Copy its pooled connection string into Render as `DATABASE_URL`.
3. Run `npm run db:sync` once against that connection before starting normal traffic. Run `npm run seed` only if you intentionally want to erase and replace its contents with demo data.

### Render backend

- Root directory: `norm/backend` when the Git repository root is the parent workspace, or `backend` when `norm` itself is the root.
- Runtime: Node
- Build command: `npm install`
- Start command: `npm start`
- Health path: `/api/health`
- Environment: `NODE_ENV=production`, `DATABASE_URL`, `JWT_SECRET`, `GITHUB_TOKEN`, and the stable Vercel URL as `FRONTEND_URL`.

The included `render.yaml` is a blueprint reference. Secret values are marked `sync: false`.

### Vercel frontend

- Root directory: `norm/frontend` or `frontend`, matching the chosen Git root.
- Framework preset: Vite
- Build command: `npm run build`
- Output directory: `dist`
- Environment: `VITE_API_URL=https://YOUR-RENDER-SERVICE.onrender.com/api`

`frontend/vercel.json` rewrites browser routes to the React entry point. After Vercel assigns the stable production domain, use that exact origin as Render's `FRONTEND_URL` and redeploy the backend.

Vite embeds `VITE_API_URL` when it builds the frontend. After changing that variable in Vercel, redeploy the frontend so the new API URL reaches the browser bundle.

## Security boundaries

- GitHub and database secrets exist only in backend environment variables.
- Password hashes are excluded from serialized users.
- Every team, repository, and PR route derives access from the authenticated user rather than trusting a frontend `teamId`.
- Owner/admin roles protect repository changes; only owners add members.
- GitHub integration is read-only and logs neither credentials nor raw responses.
- Production errors omit stack traces and internal GitHub error bodies.

## MVP limitations

- Sync is manual and runs one registered repository at a time.
- The interface uses the first team returned for the current user.
- Large repositories may take time because detailed GitHub data is fetched per PR.
- GitHub may report mergeability as unknown temporarily.
- No checks and no reviews remain explicit `NOT_AVAILABLE` states.
- There are no invitations, webhooks, GitHub OAuth/App installation, automatic actions, or code-quality analysis.

## Deferred stretch features

Signed GitHub webhooks, Smee forwarding, multi-repository sync progress, and more configurable scoring are intentionally deferred until the manual-sync MVP is proven in a real deployment.
