# NORM Architecture

## Data relationships

```text
Users ──< TeamMembers >── Teams
                            │
                            └──< Repositories ──< PullRequests
```

`TeamMember` carries `OWNER`, `ADMIN`, or `MEMBER`. A pull request belongs to its repository, not to a NORM user, because its GitHub author may be a bot, app, agent, or external contributor.

Two unique indexes protect synchronization: `(repositoryId, githubPullRequestId)` and `(repositoryId, number)`.

## Request flow

1. Axios reads the JWT from local storage and sends `Authorization: Bearer …`.
2. `authenticateUser` verifies the signature and expiry and loads the user.
3. Access services resolve team ownership through `TeamMember`. Repository and PR endpoints do not trust a supplied team identifier alone.
4. Controllers validate small request bodies and call focused services.
5. Errors use `{ "error": { "message", "code", "details" } }`. Production never returns stacks.

The frontend clears an expired session after any authenticated `401` and returns the user to login.

## GitHub synchronization flow

```text
POST /api/repositories/:id/sync
  → membership check
  → get repository metadata
  → list open pull requests
  → for each PR: details + files + reviews + checks + commit statuses
  → normalize raw GitHub objects
  → detect agent signals
  → calculate priority and queue
  → transactionally update repository, close stale rows, and upsert open rows
  → return summary
  → dashboard reloads its stored PR rows
```

The Octokit layer is the only service that understands GitHub response structures. The sync layer receives a stable internal object and supplies it to pure decision functions. Network work finishes before the transaction begins so database locks are short.

## Status normalization

CI status is `RUNNING` if any check is queued or active, `FAILED` if a completed check has a failing conclusion, `PASSED` only when all available checks are successful/neutral/skipped, and `NOT_AVAILABLE` when no checks exist.

Review normalization keeps the latest meaningful review per reviewer. Any active latest change request wins; otherwise an approval wins; otherwise the result is pending or unavailable.

Mergeability is `MERGEABLE`, `CONFLICTING`, or `UNKNOWN`. A temporary GitHub `null` becomes `UNKNOWN`.

## Queue logic

Rules are evaluated in this order:

1. Draft → `WAITING`
2. Running checks → `WAITING`
3. Failed checks → `RETURN_TO_AGENT`
4. Changes requested → `RETURN_TO_AGENT`
5. Conflict → `RETURN_TO_AGENT`
6. Documentation-only, within the repository line limit, with no critical path → `LOW_RISK`
7. Everything else → `REVIEW_NOW`

`NOT_AVAILABLE` checks can enter `REVIEW_NOW`, but the interface says that no checks are available.

## Priority formula

Priority is deterministic and capped at 100:

```text
urgency (0–40) + impact (0–25) + size (0–20) + age (0–15)
```

- Urgency uses the highest `priority:critical`, `high`, `medium`, or `normal` label.
- Impact uses the maximum matching class: configured critical/security/data paths, operations, backend, frontend, documentation, or unknown.
- Size uses changed-line boundaries at 50, 200, 500, and 1000.
- Age uses boundaries at 1, 3, and 6 days.

Each component and its human-readable reason are stored with the PR. Queue status is separate from priority, so a high-score draft still remains in `WAITING`.

A low priority score means a PR needs less attention than its peers; it does not by itself declare the change safe or correct.

## Security boundaries

- `GITHUB_TOKEN`, `DATABASE_URL`, and `JWT_SECRET` are backend-only.
- Octokit methods only read repository content and metadata.
- Passwords are hashed with bcrypt cost 12.
- CORS permits only `FRONTEND_URL`.
- Repository identifiers accept GitHub owner/name syntax, not arbitrary URLs.
- Normal startup never mutates the schema or resets data.
- The explicit seed command is the only destructive database path.
