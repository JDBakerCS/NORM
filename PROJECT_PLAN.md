# NORM Project Plan

## Assumptions

- This repository started empty on August 3, 2026.
- The MVP uses one active team at a time in the interface while the database supports many teams.
- PostgreSQL is required. Normal server startup never creates, alters, or resets tables.
- `npm run db:sync` is the explicit, non-destructive schema creation command.
- `npm run seed` is the explicit demo reset command and is the only command that uses `force: true`.
- GitHub access uses a backend-only fine-grained personal access token and remains read-only.
- Manual Sync remains the reconciliation mechanism; signed webhooks now provide targeted freshness between manual syncs.

## Phases

| Phase | Scope | Status |
| --- | --- | --- |
| 0 | Inspect repository, record assumptions, confirm structure | Complete |
| 1 | React/Express foundation, environment configuration, PostgreSQL, health route | Complete |
| 2 | Seeded PostgreSQL PR to API to React dashboard | Complete |
| 3 | Queue and priority engines with tests and explanations | Complete |
| 4 | JWT authentication, default teams, membership enforcement | Complete |
| 5 | Repository CRUD, selection, editable rules | Complete |
| 6 | Octokit normalization and idempotent manual synchronization | Complete |
| 7 | Resilience, responsive UI, validation, docs, deployment preparation | Complete |
| 8 | Signed webhooks, reviewer routing, and named check results | Complete in code; live setup remains |

## Follow-ups

### Webhook-driven freshness — Complete in code

- `POST /api/github/webhook` verifies the raw-body signature before parsing and retains Manual Sync.
- Pull-request, review, check-run/check-suite, and commit-status deliveries trigger targeted refetches.
- Delivery IDs are stored idempotently; repository work is serialized and pending work resumes after restart.
- The targeted path reuses `syncPullRequest()` and stores the synchronized head SHA and freshness time.
- Live deployment still requires the human webhook and secret setup in `HUMAN_ACTIONS.md`.

### Reviewer coordination — Complete in code

- Import active requested GitHub users and teams without sending notifications or writing to GitHub.
- Preserve individual check-run and commit-status names, states, sources, and destination links.
- Show reviewer routing and actionable named-check results on queue cards and PR details.
- Keep CODEOWNERS matching and reviewer workload balancing as later read-only enhancements.

### Fast Lane policy exploration — Deferred

- Keep priority score and safety eligibility separate: a low score does not prove a PR is safe.
- Start with a recommendation-only `Fast Lane candidate` state, not a GitHub approval or merge action.
- Require explicit repository opt-in, a documentation/safe-path allowlist, passed checks, mergeability, no draft, no requested changes, a recent sync, and no blocked paths.
- Block dependency, lockfile, workflow, deployment, environment, permission, migration, payment, and billing changes by default.
- Add clear eligibility reasons, an audit record, a kill switch, and random human sampling before considering any write-capable GitHub integration.

### Trustworthy scoring and label provenance — Deferred

- Keep review priority separate from approval eligibility; a low score alone must never approve a pull request.
- Treat agent-applied labels as low-trust claims with a small capped contribution, not as queue-jumping evidence.
- Add webhook/audit provenance for labels so NORM can distinguish a human, approved automation, and an agent.
- Weight repository-controlled evidence—critical paths, changed-file risk, CI, review state, age, and verified incident/security links—more heavily than labels.
- Define hard safety gates for Fast Lane, including a safe-path allowlist, fresh data, passed CI, no requested changes, and blocked sensitive file categories.

## Current Progress

The complete MVP code, read-only reviewer-coordination expansion, data-layer impact classification, and importance-first queue ordering are present. On August 8, 2026, all 43 backend tests and 11 frontend tests passed, and the Vite production build completed successfully.

## Remaining Work

- Supply local or Neon `DATABASE_URL`, a strong `JWT_SECRET`, and a fine-grained `GITHUB_TOKEN`.
- Run `npm run db:sync` for a new database, or the additive reviewer-coordination migration for an existing database. Run the destructive seed only when demo data is intentional.
- Verify manual synchronization against a repository the token can read.
- Create Render, Vercel, and Neon resources when ready to deploy.

## Known Issues

- GitHub sometimes reports mergeability as unknown while it computes the result; NORM displays `UNKNOWN` honestly.
- GitHub repositories without checks or reviews display `NOT_AVAILABLE`; this does not block the review queue.
- Manual sync makes several GitHub requests per open PR and may encounter token rate limits on very large repositories.
- Live database startup and GitHub sync cannot be exercised until the backend secrets in `HUMAN_ACTIONS.md` are supplied.
- `npm audit --omit=dev` reports an indirect moderate `uuid` advisory through Sequelize 6. NORM defines no UUID fields and does not call the affected buffered UUID APIs; npm offers only a breaking downgrade to obsolete Sequelize 3.
- The current React Router 7.18.2 audit reports an RSC-mode advisory. NORM is a client-only Vite SPA and does not use React Server Components or server actions; no currently published 7.x package resolves that RSC advisory.
