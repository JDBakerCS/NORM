# Human Actions

These steps require a secret or an external website. All application code and local configuration examples are already present.

## 1. Create the database

1. In local PostgreSQL or [Neon](https://neon.tech), create a database for NORM.
2. Obtain its PostgreSQL connection string with permission to create tables and read/write rows.
3. Put the value after `DATABASE_URL=` in `norm/backend/.env` (create it from `.env.example`). Do not paste it into chat.
4. Also create a long random value for `JWT_SECRET` in the same file.
5. Codex can verify afterward by running `npm run db:sync`, starting the backend, and requesting `GET /api/health`.

## 2. Create the GitHub token

1. In GitHub, create a fine-grained personal access token.
2. Scope repository access to the exact repositories NORM should import.
3. Grant read-only repository metadata, pull requests, checks, and commit-status access. Grant no write permissions.
4. Put the token after `GITHUB_TOKEN=` in `norm/backend/.env`. Do not paste it into chat or any frontend file.
5. Add one accessible repository by owner/name in NORM. Codex can verify afterward by exercising the Sync endpoint and checking that a second sync updates rather than duplicates rows.

## 3. Create deployment services when ready

1. Create a Render web service rooted at `norm/backend`, using the settings in `README.md`.
2. Add backend secrets directly in Render and set `FRONTEND_URL` after Vercel supplies its stable domain.
3. Create a Vercel project rooted at `norm/frontend` and set `VITE_API_URL` to the Render URL plus `/api`.
4. Codex can verify afterward with the production health URL, registration/login, a manual Sync, and direct navigation to a PR details route.

