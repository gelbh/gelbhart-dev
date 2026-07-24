# GitHub / Agent Workflow Modernization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Land jetlag-style PR gates and ship process on gelbhart-dev (CI, ruleset, CodeRabbit hybrid, Dependabot) while keeping Cursor/agent kits off git.

**Architecture:** One modernization PR from `chore/github-workflow-modernization` adds committed quality surface (`.gitignore` excludes, GHA PR CI + main smoke, `.coderabbit.yaml`, Dependabot, PR template). After merge, enable GitHub ruleset + CodeRabbit App, then bootstrap local-only `.cursor/` kit. Render stays CD.

**Tech Stack:** GitHub Actions, Ruby 3.3.10 / Rails 8, Node 20.9.0, PostgreSQL service, Selenium Chrome, CodeRabbit CLI + App, `gh` rulesets API.

**Spec:** `docs/superpowers/specs/2026-07-24-github-workflow-modernization-design.md`

## Global Constraints

- Never commit `.cursor/`, `.impeccable/`, `PRODUCT.md`, `DESIGN.md`, `AGENTS.md`, `CLAUDE.md` — shared `.gitignore` must block them.
- README stays badge-minimal; do **not** mention `docs/superpowers/` or add a workflow essay.
- No Cursor/AI co-author footers on commits (`Co-authored-by: Cursor`, `Made-with: Cursor`).
- Do not fold this work into `feat/jetlag-portfolio` — stay on `chore/github-workflow-modernization` (or rebase it onto latest `main`).
- Do not add GHA deploy; Render remains production CD (`render.yaml`).
- Do not make CodeRabbit a required GitHub status check.
- Do not touch `~/.cursor/skills-cursor/`, `~/.cursor/plugins/cache/`, or unrelated global skills.
- Conventional commits; pin third-party Actions to commit SHAs with version comments.
- Required PR check job names must be exactly: `lint`, `test`, `system`, `seeds` (plus existing `GitGuardian Security Checks`).

## File map

| File | Responsibility |
|------|----------------|
| `.gitignore` | Shared ignore for agent/Cursor/local design kit |
| `.nvmrc` | Align Node pin with `.node-version` (`20.9.0`) |
| `.github/actions/setup-app/action.yml` | Composite: Ruby, Node, Postgres-ready env, bundle + npm |
| `.github/workflows/ci.yml` | PR full suite: `lint`, `test`, `system`, `seeds` |
| `.github/workflows/ci-main.yml` | Main smoke: RuboCop + `CI=true bin/test-changed` |
| `.coderabbit.yaml` | Soft App + Rails/Silicon path instructions |
| `.github/dependabot.yml` | Weekly bundler, npm, github-actions |
| `.github/pull_request_template.md` | Thin Summary + Test plan |
| Local only (never git): `.cursor/rules/impeccable.mdc`, `.cursor/skills/coderabbit/SKILL.md`, `.cursor/ship/` | Agent ship kit |

## Out of scope (deferred)

| Item | Notes |
|------|--------|
| Dependabot automerge workflow | Deferred; track in future ship Notes if desired (same as jetlag optional polish) |
| Lighthouse required check | Spec out of scope |
| Sentry ship triage | Spec out of scope (no jetlag Sentry loop here) |
| Committed `AGENTS.md` / `.cursor/` | Spec forbids |
| README CI documentation section | Spec forbids |

---

### Task 1: Shared `.gitignore` for agent kit

**Files:**
- Modify: `.gitignore`
- Test: `git check-ignore -v` (shell verification)

**Interfaces:**
- Consumes: Current `.gitignore`; local excludes currently in `.git/info/exclude`
- Produces: Repo-wide ignore of `.cursor/`, `.impeccable/`, `PRODUCT.md`, `DESIGN.md`, `AGENTS.md`, `CLAUDE.md`

- [ ] **Step 1: Confirm paths are not ignored by shared `.gitignore` yet**

```bash
git check-ignore -v .cursor/foo PRODUCT.md DESIGN.md AGENTS.md CLAUDE.md .impeccable/config.json || true
```

Expected: either no output, or matches only from `.git/info/exclude` (not `.gitignore`).

- [ ] **Step 2: Append agent-kit block to `.gitignore`**

Add at end of `.gitignore`:

```gitignore
# Agent / Cursor / Impeccable — local only (never commit)
.cursor/
.impeccable/
PRODUCT.md
DESIGN.md
AGENTS.md
CLAUDE.md
```

- [ ] **Step 3: Verify shared ignore**

```bash
git check-ignore -v .cursor/foo PRODUCT.md DESIGN.md AGENTS.md CLAUDE.md .impeccable/config.json
```

Expected: each line cites `.gitignore` with the matching pattern.

- [ ] **Step 4: Commit**

```bash
git add .gitignore
git commit -m "chore(git): ignore Cursor and agent local kits"
```

---

### Task 2: Align Node version pins

**Files:**
- Modify: `.nvmrc`
- Test: `diff` / `cat` verification

**Interfaces:**
- Consumes: `.node-version` (`20.9.0`)
- Produces: `.nvmrc` equal to `20.9.0` so CI and local nvm agree

- [ ] **Step 1: Show current mismatch**

```bash
echo -n "node-version="; cat .node-version; echo -n "nvmrc="; cat .nvmrc
```

Expected: `20.9.0` vs `18.19.0`.

- [ ] **Step 2: Set `.nvmrc` to `20.9.0`**

```bash
printf '20.9.0\n' > .nvmrc
```

- [ ] **Step 3: Verify**

```bash
diff -u .node-version .nvmrc
```

Expected: no diff (both `20.9.0`).

- [ ] **Step 4: Commit**

```bash
git add .nvmrc
git commit -m "chore(node): align .nvmrc with .node-version 20.9.0"
```

---

### Task 3: Composite setup action

**Files:**
- Create: `.github/actions/setup-app/action.yml`
- Test: YAML parse (`ruby -ryaml`)

**Interfaces:**
- Consumes: `.ruby-version`, `.node-version`, `Gemfile.lock`, `package-lock.json`
- Produces: Composite action `setup-app` with inputs none; sets up Ruby bundler cache, Node npm cache, installs deps
- Env contract for callers: Postgres service hostname `localhost`, user/password `postgres`/`postgres`, DB `gelbhart_dev_test`; unset `DATABASE_URL` so `config/database.yml` test stanza wins

- [ ] **Step 1: Create composite action**

Create `.github/actions/setup-app/action.yml`:

```yaml
name: Setup gelbhart-dev app
description: Ruby, Node, bundle, npm for CI jobs
runs:
  using: composite
  steps:
    - uses: ruby/setup-ruby@6aaa311d81eba98ae12eaffbcb63296ace0efcde # v1.307.0
      with:
        ruby-version: "3.3.10"
        bundler-cache: true
    - uses: actions/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020 # v4
      with:
        node-version-file: ".node-version"
        cache: npm
    - name: Install npm dependencies
      shell: bash
      run: npm ci
```

Doc cite for `ruby/setup-ruby` pin: https://github.com/ruby/setup-ruby/releases/tag/v1.307.0 (SHA `6aaa311d81eba98ae12eaffbcb63296ace0efcde`).  
Doc cite for `actions/setup-node@v4`: same pin as jetlag CI (`49933ea5288caeca8642d1e84afbd3f7d6820020`).

- [ ] **Step 2: Parse YAML**

```bash
ruby -ryaml -e "YAML.load_file('.github/actions/setup-app/action.yml'); puts 'ok'"
```

Expected: `ok`

- [ ] **Step 3: Commit**

```bash
git add .github/actions/setup-app/action.yml
git commit -m "ci: add composite setup-app action"
```

---

### Task 4: PR CI workflow (`lint`, `test`, `system`, `seeds`)

**Files:**
- Create: `.github/workflows/ci.yml`
- Test: YAML parse; later live PR run (Task 8)

**Interfaces:**
- Consumes: `.github/actions/setup-app`; `bin/rubocop`, `bin/importmap`, `bin/brakeman`, `bin/test-changed`, `bin/rails test:system`, `db:seed:replant`
- Produces: Required check contexts `lint`, `test`, `system`, `seeds`
- Postgres: service `postgres:16`, schemas created via existing `config/initializers/optional_postgres_extensions.rb` on `db:prepare` / schema load

- [ ] **Step 1: Write `.github/workflows/ci.yml`**

```yaml
name: CI

on:
  pull_request:
    branches: [main]
  workflow_dispatch:

concurrency:
  group: ci-${{ github.workflow }}-${{ github.event.pull_request.number || github.ref }}
  cancel-in-progress: true

permissions:
  contents: read

env:
  RAILS_ENV: test
  CI: "true"
  PGHOST: localhost
  PGUSER: postgres
  PGPASSWORD: postgres
  # Keep DATABASE_URL unset so test DB name from database.yml is used

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@11d5960a326750d5838078e36cf38b85af677262 # v4
        with:
          persist-credentials: false
      - uses: ./.github/actions/setup-app
      - run: bin/rubocop
      - run: bin/importmap audit
      - run: bin/brakeman --quiet --no-pager --exit-on-warn --exit-on-error

  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_USER: postgres
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: gelbhart_dev_test
        ports:
          - 5432:5432
        options: >-
          --health-cmd "pg_isready -U postgres"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    steps:
      - uses: actions/checkout@11d5960a326750d5838078e36cf38b85af677262 # v4
        with:
          persist-credentials: false
      - uses: ./.github/actions/setup-app
      - name: Prepare database
        run: bin/rails db:prepare
      - name: Rails + Jest
        run: env -u DATABASE_URL CI=true bin/test-changed

  system:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_USER: postgres
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: gelbhart_dev_test
        ports:
          - 5432:5432
        options: >-
          --health-cmd "pg_isready -U postgres"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    steps:
      - uses: actions/checkout@11d5960a326750d5838078e36cf38b85af677262 # v4
        with:
          persist-credentials: false
      - uses: ./.github/actions/setup-app
      - uses: browser-actions/setup-chrome@c785b87e244131f27c9f19c1a33e2ead956ab7ce # v1
      - name: Prepare database
        run: bin/rails db:prepare
      - name: System tests
        run: env -u DATABASE_URL bin/rails test:system

  seeds:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_USER: postgres
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: gelbhart_dev_test
        ports:
          - 5432:5432
        options: >-
          --health-cmd "pg_isready -U postgres"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    steps:
      - uses: actions/checkout@11d5960a326750d5838078e36cf38b85af677262 # v4
        with:
          persist-credentials: false
      - uses: ./.github/actions/setup-app
      - name: Prepare database
        run: bin/rails db:prepare
      - name: Replant seeds
        run: env -u DATABASE_URL RAILS_ENV=test bin/rails db:seed:replant
```

Doc cite for Chrome action pin: `browser-actions/setup-chrome` `@v1` → SHA `c785b87e244131f27c9f19c1a33e2ead956ab7ce` (resolved via GitHub API `repos/browser-actions/setup-chrome/commits/v1`).  
Doc cite for checkout pin: same as jetlag (`actions/checkout@11d5960a326750d5838078e36cf38b85af677262` # v4).

- [ ] **Step 2: Parse YAML**

```bash
ruby -ryaml -e "YAML.load_file('.github/workflows/ci.yml'); puts 'ok'"
```

Expected: `ok`

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: add PR workflow with lint test system seeds"
```

---

### Task 5: Main smoke workflow

**Files:**
- Create: `.github/workflows/ci-main.yml`
- Test: YAML parse

**Interfaces:**
- Consumes: `setup-app`, Postgres service
- Produces: Non-required post-merge smoke on `push` to `main`

- [ ] **Step 1: Write `.github/workflows/ci-main.yml`**

```yaml
name: CI main smoke

on:
  push:
    branches: [main]

concurrency:
  group: ci-main-${{ github.sha }}
  cancel-in-progress: true

permissions:
  contents: read

env:
  RAILS_ENV: test
  CI: "true"
  PGHOST: localhost
  PGUSER: postgres
  PGPASSWORD: postgres

jobs:
  smoke:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_USER: postgres
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: gelbhart_dev_test
        ports:
          - 5432:5432
        options: >-
          --health-cmd "pg_isready -U postgres"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    steps:
      - uses: actions/checkout@11d5960a326750d5838078e36cf38b85af677262 # v4
        with:
          persist-credentials: false
      - uses: ./.github/actions/setup-app
      - name: Prepare database
        run: bin/rails db:prepare
      - run: bin/rubocop
      - run: env -u DATABASE_URL CI=true bin/test-changed
```

- [ ] **Step 2: Parse YAML**

```bash
ruby -ryaml -e "YAML.load_file('.github/workflows/ci-main.yml'); puts 'ok'"
```

Expected: `ok`

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/ci-main.yml
git commit -m "ci: add main branch smoke workflow"
```

---

### Task 6: CodeRabbit soft config

**Files:**
- Create: `.coderabbit.yaml`
- Test: YAML parse

**Interfaces:**
- Consumes: Spec path-instruction intent for Rails/Silicon
- Produces: Repo YAML with `request_changes_workflow: false` (CLI remains agent merge gate)

- [ ] **Step 1: Write `.coderabbit.yaml`**

```yaml
# yaml-language-server: $schema=https://coderabbit.ai/integrations/schema.v2.json
language: en-US

reviews:
  # Soft PR App: comment/summary trail only. Agent merge gate is CodeRabbit CLI (cr_gate).
  profile: assertive
  request_changes_workflow: false
  pre_merge_checks:
    docstrings:
      mode: "off"
    title:
      mode: "off"
    description:
      mode: "off"
    issue_assessment:
      mode: "off"
  high_level_summary: true
  high_level_summary_placeholder: "@coderabbitai summary"
  auto_title_placeholder: "@coderabbitai"
  poem: false
  review_status: true
  comment_placeholder: false
  disable_placeholder_comment_notifications: false
  collapse_walkthrough: false
  sequence_diagrams: true
  changed_files_summary: true
  path_filters:
    - "!**/*.lock"
    - "!**/node_modules/**"
    - "!**/coverage/**"
    - "!**/app/assets/builds/**"
    - "!**/public/assets/**"
    - "!**/log/**"
    - "!**/tmp/**"
  instructions: |
    gelbhart.dev — personal portfolio on Ruby on Rails 8, Silicon theme,
    Bootstrap 5, Stimulus, Minitest, Jest.

    Conventions:
    - Conventional Commits for PR titles
    - Prefer Silicon theme components and Bootstrap utilities before custom CSS
    - Theme priority: Silicon components → Bootstrap utilities → minimal _custom.scss

    Focus on bugs, security, accessibility, SEO regressions, and broken project
    showcases. De-prioritize style-only nits when behavior is correct. Do not
    suggest unrelated refactors.
  path_instructions:
    - path: "app/views/**"
      instructions: |
        Review views for:
        - Silicon/Bootstrap patterns before custom markup
        - Accessibility on interactive controls and landmarks
        - Consistent meta/SEO helpers where other project pages use them
    - path: "app/assets/stylesheets/**"
      instructions: |
        Review styles for:
        - Theme variables (--bs-*) and existing _custom.scss patterns
        - Minimal scoped overrides; avoid reimplementing Silicon components
        - Motion and reduced-motion preferences
    - path: "app/javascript/**"
      instructions: |
        Review Stimulus/JS for:
        - Controller lifecycle cleanup
        - No broken analytics or easter-egg regressions (Pac-Man)
        - Jest coverage for non-trivial behavior changes
    - path: "test/**"
      instructions: |
        Review tests for:
        - Behavior-focused assertions on changed paths
        - Request/system coverage for new routes/pages
    - path: ".github/workflows/**"
      instructions: |
        Review CI for:
        - Required job names lint/test/system/seeds on PRs
        - Main smoke stays non-gating
        - Action SHA pins preserved

chat:
  auto_reply: true

knowledge_base:
  opt_out: false
  learnings:
    scope: auto
```

- [ ] **Step 2: Parse YAML**

```bash
ruby -ryaml -e "YAML.load_file('.coderabbit.yaml'); puts 'ok'"
```

Expected: `ok`

- [ ] **Step 3: Commit**

```bash
git add .coderabbit.yaml
git commit -m "chore(coderabbit): add soft PR App config for Rails portfolio"
```

---

### Task 7: Dependabot + PR template

**Files:**
- Create: `.github/dependabot.yml`
- Create: `.github/pull_request_template.md`
- Test: YAML parse for dependabot

**Interfaces:**
- Consumes: Spec weekly ecosystems
- Produces: Dependabot PRs for bundler/npm/actions; thin PR body scaffold

- [ ] **Step 1: Write `.github/dependabot.yml`**

```yaml
version: 2
updates:
  - package-ecosystem: bundler
    directory: "/"
    schedule:
      interval: weekly
      day: monday
    open-pull-requests-limit: 5
    groups:
      bundler-minor-patch:
        update-types:
          - minor
          - patch

  - package-ecosystem: npm
    directory: "/"
    schedule:
      interval: weekly
      day: monday
    open-pull-requests-limit: 5
    groups:
      production-dependencies:
        dependency-type: production
        update-types:
          - minor
          - patch
      development-dependencies:
        dependency-type: development
        update-types:
          - minor
          - patch

  - package-ecosystem: github-actions
    directory: "/"
    schedule:
      interval: weekly
      day: monday
    open-pull-requests-limit: 5
```

Doc cite: https://docs.github.com/en/code-security/dependabot/working-with-dependabot/dependabot-options-reference

- [ ] **Step 2: Write `.github/pull_request_template.md`**

```markdown
## Summary
-

## Test plan
- [ ]
```

- [ ] **Step 3: Parse Dependabot YAML**

```bash
ruby -ryaml -e "YAML.load_file('.github/dependabot.yml'); puts 'ok'"
```

Expected: `ok`

- [ ] **Step 4: Commit**

```bash
git add .github/dependabot.yml .github/pull_request_template.md
git commit -m "chore(github): add Dependabot and PR template"
```

---

### Task 8: Push PR and green CI

**Files:**
- Modify: none (git remote / PR only)
- Test: GitHub Actions run on the PR

**Interfaces:**
- Consumes: All committed workflow files on `chore/github-workflow-modernization`
- Produces: Open PR into `main` with green `lint` / `test` / `system` / `seeds`

- [ ] **Step 1: Ensure branch is based on latest `main`**

```bash
git fetch origin main
git rebase origin/main
```

Expected: rebase succeeds (resolve conflicts if any; keep workflow files).

- [ ] **Step 2: Push branch**

```bash
git push -u origin HEAD
```

- [ ] **Step 3: Open draft PR**

```bash
gh pr create --draft --base main --title "ci: GitHub workflow modernization" --body "$(cat <<'EOF'
## Summary
- PR CI (`lint` / `test` / `system` / `seeds`) + main smoke
- Soft CodeRabbit config, Dependabot, PR template
- Shared gitignore for Cursor/agent local kits

## Test plan
- [ ] PR checks green
- [ ] `git check-ignore` blocks `.cursor/` and `PRODUCT.md`
- [ ] README unchanged (badge-only)
EOF
)"
```

- [ ] **Step 4: Watch CI**

```bash
gh pr checks --watch
```

Expected: `lint`, `test`, `system`, `seeds` success (GitGuardian may also run).

If `system` fails on Chrome/Selenium: confirm `browser-actions/setup-chrome` ran; ensure `CI=true` headless args from `test/system_test_helper.rb` apply; fix workflow env only (do not weaken required checks).

If `db:prepare` fails on schemas: ensure Postgres service healthy; optional extensions initializer should create `extensions`/`graphql`/`vault` — fix CI env, not production schema.

- [ ] **Step 5: Merge when green**

```bash
gh pr merge --squash --delete-branch
```

Use merge/rebase only if squash is undesirable; prefer squash for this chore PR.

---

### Task 9: Ruleset + CodeRabbit App (post-merge ops)

**Files:**
- None in git (GitHub settings / App install)
- Test: `gh api` ruleset readback; `@coderabbitai configuration` on a test PR later

**Interfaces:**
- Consumes: Job names present in Actions history on `main`/PRs; GitGuardian integration
- Produces: Active `main-pr-required` ruleset

Doc cite: https://docs.github.com/en/rest/repos/rules#create-a-repository-ruleset

- [ ] **Step 1: Create ruleset via API**

```bash
gh api --method POST repos/gelbh/gelbhart-dev/rulesets --input - <<'EOF'
{
  "name": "main-pr-required",
  "target": "branch",
  "enforcement": "active",
  "bypass_actors": [],
  "conditions": {
    "ref_name": {
      "include": ["~DEFAULT_BRANCH"],
      "exclude": []
    }
  },
  "rules": [
    {
      "type": "pull_request",
      "parameters": {
        "required_approving_review_count": 0,
        "dismiss_stale_reviews_on_push": false,
        "require_code_owner_review": false,
        "require_last_push_approval": false,
        "required_review_thread_resolution": false,
        "allowed_merge_methods": ["squash", "merge", "rebase"]
      }
    },
    {
      "type": "required_status_checks",
      "parameters": {
        "strict_required_status_checks_policy": true,
        "do_not_enforce_on_create": false,
        "required_status_checks": [
          { "context": "lint", "integration_id": 15368 },
          { "context": "test", "integration_id": 15368 },
          { "context": "system", "integration_id": 15368 },
          { "context": "seeds", "integration_id": 15368 },
          { "context": "GitGuardian Security Checks", "integration_id": 46505 }
        ]
      }
    },
    { "type": "non_fast_forward" },
    { "type": "deletion" }
  ]
}
EOF
```

If `integration_id` 15368/46505 reject on this repo, list check runs from a green PR (`gh api repos/gelbh/gelbhart-dev/commits/<sha>/check-runs`) and substitute the correct `app.id` / integration ids — **unverified until first green PR on this repo**.

- [ ] **Step 2: Verify ruleset**

```bash
gh api repos/gelbh/gelbhart-dev/rulesets --jq '.[] | {name, enforcement}'
```

Expected: `main-pr-required` / `active`.

- [ ] **Step 3: Confirm direct push blocked**

```bash
# On a throwaway clone or after stash — expect rejection
git push origin HEAD:main
```

Expected: rejected by ruleset (or ask user to confirm in GitHub UI if using admin bypass). Prefer not force-testing with real commits; UI “Rules” page is enough if push test is risky.

- [ ] **Step 4: Install CodeRabbit GitHub App on `gelbh/gelbhart-dev`**

Manual in browser: https://github.com/apps/coderabbitai — grant repo access.

- [ ] **Step 5: Verify configuration comment on next PR**

Comment: `@coderabbitai configuration`  
Expected: soft App, `request_changes_workflow: false`, YAML from repo.

CLI gate (local, documented): verified flags from `coderabbit --help` on this machine:

```bash
coderabbit doctor
coderabbit review --base main --type committed --agent 2>&1 | tee /tmp/cr-agent.json
coderabbit review findings
```

---

### Task 10: Local agent bootstrap (never commit)

**Files:**
- Create locally only: `.cursor/rules/impeccable.mdc`
- Create locally only: `.cursor/skills/coderabbit/SKILL.md`
- Create locally only: `.cursor/ship/_template.md` (optional copy from jetlag template)
- Do **not** `git add` any of these

**Interfaces:**
- Consumes: Global `~/.cursor/skills/impeccable`, `~/.cursor/skills/plan-thermos-ship`, CodeRabbit CLI
- Produces: Project globs + ship board home for gelbhart-dev

- [ ] **Step 1: Confirm gitignore still blocks**

```bash
git check-ignore -v .cursor/rules/impeccable.mdc
```

Expected: `.gitignore` match for `.cursor/`.

- [ ] **Step 2: Write `.cursor/rules/impeccable.mdc`**

```markdown
---
description: Invoke impeccable for UI/UX craft when editing views, styles, or JS
globs: app/views/**,app/assets/stylesheets/**,app/javascript/**
alwaysApply: false
---

# UI / UX

When editing visitor-facing UI or UX, read `~/.cursor/skills/impeccable/SKILL.md` and follow its setup before shipping visual changes.

Match Silicon/Bootstrap and existing `_custom.scss` patterns first; use impeccable for craft, contrast, motion, and polish. Prefer theme components over new custom CSS.
```

- [ ] **Step 3: Write thin `.cursor/skills/coderabbit/SKILL.md`**

Write this file with a markdown editor or heredoc. Contents:

~~~~
---
name: coderabbit
description: CodeRabbit CLI merge gate for gelbh/gelbhart-dev — pre-push review, cr_gate, advisory PR App only.
disable-model-invocation: true
---

# CodeRabbit CLI review (gelbhart-dev)

Repo: `gelbh/gelbhart-dev`. Config: `.coderabbit.yaml` at repo root.

Global SSOT: `~/.cursor/skills/plan-thermos-ship/reference/coderabbit.md`.

Before every push:

    coderabbit doctor
    coderabbit review --base main --type committed --agent 2>&1 | tee /tmp/cr-agent.json
    coderabbit review findings

Triage bugs/security/tests; skip style/false-positive/out-of-scope with reason. Re-run until clean. Quota → `cr_gate: ⏭️` with note.

Do not `@coderabbitai approve`. Do not block merge on PR App threads.
~~~~

- [ ] **Step 4: Ensure `git status` is clean of agent kit**

```bash
git status --porcelain
```

Expected: no `.cursor/`, `.impeccable/`, `PRODUCT.md`, or `DESIGN.md` listed.

- [ ] **Step 5: Worktree convention (document in ship board Notes when first used)**

```bash
# Example — run only when starting a slice
git fetch origin main
git worktree add -b feat/<slice> ../gelbhart-dev-<slice> origin/main
```

---

### Task 11: Bring open PR #2 under the new gates

**Files:**
- None required in this chore (work on `feat/jetlag-portfolio` separately)
- Test: `gh pr checks 2`

**Interfaces:**
- Consumes: Merged workflows on `main` (PR workflows also apply from merge base once `main` has them; for open PR, rebase onto `main`)
- Produces: PR #2 green under `lint`/`test`/`system`/`seeds` before merge

- [ ] **Step 1: Rebase portfolio branch onto updated `main`**

```bash
git fetch origin
git checkout feat/jetlag-portfolio
git rebase origin/main
git push --force-with-lease
```

Only force-with-lease if this branch is solo-owned (it is).

- [ ] **Step 2: Watch checks**

```bash
gh pr checks 2 --watch
```

Expected: required checks green (or fix failures on the portfolio branch — out of scope for workflow files unless CI YAML itself is wrong).

---

## Self-review (plan author)

| Spec requirement | Task |
|------------------|------|
| Shared gitignore agent boundary | Task 1 |
| Node pin alignment | Task 2 |
| PR full CI ≈ `bin/ci` | Tasks 3–4 |
| Main smoke | Task 5 |
| CodeRabbit hybrid YAML | Task 6 |
| Dependabot + PR template | Task 7 |
| One modernization PR | Task 8 |
| Ruleset + App install | Task 9 |
| Local kit / worktrees / CLI gate | Task 10 |
| Open PR #2 refresh | Task 11 |
| README minimal / no superpowers mention | Global Constraints + Task 8 body (no README edit) |
| No GHA deploy / Render stays | Global Constraints |
| Out-of-scope trail | Deferred table above |

Placeholder scan: none intentional. Action SHAs cited from GitHub API / jetlag pins / release pages.
