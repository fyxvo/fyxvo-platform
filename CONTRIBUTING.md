# Contributing to Fyxvo

Thank you for your interest in contributing to Fyxvo. This document covers everything you need to get started.

## Development Environment

### Recommended: GitHub Codespaces

The fastest way to get a working environment is to open this repository in GitHub Codespaces. The devcontainer configuration installs all dependencies automatically.

1. Click **Code → Codespaces → Create codespace on main** in the GitHub UI.
2. Wait for the container to build (about 2 minutes the first time).
3. Run `pnpm install` to install dependencies.

### Local Setup

**Prerequisites:**
- Node.js ≥ 18
- pnpm ≥ 8 (`npm install -g pnpm`)
- PostgreSQL 14+
- Redis 7+
- Solana CLI (for Anchor tests only)

**Steps:**

```bash
git clone https://github.com/fyxvo/fyxvo-platform.git
cd fyxvo
pnpm install

# Copy environment files
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.local.example apps/web/.env.local
cp apps/gateway/.env.example apps/gateway/.env

# Set up the database
pnpm --filter @fyxvo/database db:migrate

# Start the full stack (web + api + gateway)
pnpm dev
```

The web app runs at `http://localhost:3000`, the API at `http://localhost:3001`, and the gateway at `http://localhost:3002`.

## Running Tests

```bash
# Run all tests
pnpm test

# Run API tests only
pnpm --filter @fyxvo/api test

# Run web tests only
pnpm --filter @fyxvo/web test

# Run type checking across all packages
pnpm typecheck

# Run linting across all packages
pnpm lint
```

All tests, type checks, and lints must pass before a PR will be merged. The CI runs `pnpm test`, `pnpm typecheck`, and `pnpm lint`.

## Coding Standards

- **TypeScript strict mode** is enabled everywhere. Do not use `any` without a comment explaining why.
- **ESLint `--max-warnings=0`**: every lint warning is treated as an error.
- **No console.log** in production code. Use structured logging where logging is needed.
- **Imports**: use the `@fyxvo/` workspace package aliases instead of relative paths between packages.
- **Tests**: new API endpoints must have at least a happy-path test. Tests live in `apps/api/test/app.test.ts`.
- **Migrations**: Prisma schema changes must include a SQL migration file in `packages/database/prisma/migrations/`.
- **No protocol changes**: changes to `packages/database/prisma/schema.prisma` that affect the Solana program state must be approved by the core team before merging.

## Submitting a Pull Request

1. Fork the repo and create a branch: `git checkout -b feat/my-feature`.
2. Make your changes, keeping commits small and focused.
3. Run `pnpm test && pnpm typecheck && pnpm lint` before pushing.
4. Open a PR against `main` with a clear description of what changed and why.
5. The CI must be green. Fix any failures before requesting review.
6. PRs that change the API surface or database schema require review from the core team.

## Reporting Security Vulnerabilities

Please read [SECURITY.md](./SECURITY.md) before submitting security reports. Do not open public GitHub issues for security vulnerabilities.

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
