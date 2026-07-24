# GitHub Workflow Modernization Implementation Plan

**Goal:** Land PR CI, main smoke, CodeRabbit config, Dependabot, PR template, shared gitignore for private paths, and a `main` ruleset.

**Status:** Implemented on `main` (PRs #3, #11).

## Deliverables

| Path | Role |
|------|------|
| `.gitignore` | Ignore unpublished tooling/brief paths |
| `.nvmrc` | Aligned with `.node-version` (`20.9.0`) |
| `.github/actions/setup-app/action.yml` | Ruby + Node + deps |
| `.github/workflows/ci.yml` | PR jobs: `lint`, `test`, `system`, `seeds` |
| `.github/workflows/ci-main.yml` | Main smoke |
| `.coderabbit.yaml` | Soft PR App config |
| `.github/dependabot.yml` | Weekly bundler / npm / actions |
| `.github/pull_request_template.md` | Summary + test plan |

## Ops (post-merge)

1. Ruleset `main-pr-required` — active.
2. Install CodeRabbit GitHub App on the repo if missing.
3. Sibling worktrees for parallel slices: `../gelbhart-dev-<slice>`.

## Success criteria

- Merges to `main` require green `lint` / `test` / `system` / `seeds` (+ GitGuardian).
- Private tooling paths stay out of git via `.gitignore`.
- Render remains the only production deploy path.
