# Changelog

## Unreleased

- Tightened workspace release hygiene by making CI use an explicit frozen-lockfile install after toolchain bootstrap.
- Normalized the root environment example so it matches the shared authority and runtime variables used by the deployable services.
- Switched root workspace scripts to the repository-local Turbo binary to avoid environment-dependent task runner drift.

## 0.1.0 - 2026-03-19

- Established the current devnet private alpha baseline for the web app, API, gateway, worker, and protocol-adjacent operational docs.
