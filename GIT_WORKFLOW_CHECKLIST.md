# Git Workflow Checklist

> **See also**: [TESTING.md](TESTING.md) for how to run tests | [CONTRIBUTING.md](CONTRIBUTING.md) for full contributor guide

## Before starting work
- [ ] `git checkout main`
- [ ] `git pull origin main`
- [ ] `git checkout -b feature/<short-descriptive-name>`

## During work
- [ ] Make small, focused commits
- [ ] `git status` often
- [ ] Keep work confined to the feature branch (do NOT commit to main)

## Before pushing
- [ ] Run tests:
  - `npm test` (unit/integration)
  - `npm run test:e2e` (E2E with Playwright)
  - `npm run test:e2e:retry` (optional: detect flaky tests)
- [ ] `git diff` and review changes
- [ ] `git push -u origin feature/<short-descriptive-name>`

## CI Pipeline

After pushing, two CI jobs run **in parallel**:
1. **Unit & Integration Tests** (~1-2 min) - fast feedback
2. **E2E Tests** (~3-5 min) - full browser tests

Both must pass for the PR to be merge-ready.

## Creating a PR
- [ ] Open PR: `feature/<name>` → `main`
- [ ] Add clear title and summary
- [ ] Mention related commits/links if needed

## After merge
- [ ] `git checkout main`
- [ ] `git pull origin main`
- [ ] `git branch -d feature/<name>`
- [ ] `git push origin --delete feature/<name>` (optional)

---

## Example (announcements + E2E work)

- Commit: `feca97e` – "Add announcement DB function fix and E2E test suite"
- Comparison: https://github.com/massimodamico86-art/bizscreen/compare/f380c23...feca97e
- Note: This work was committed directly to `main`. Future work should use feature branches to avoid "empty PRs".
