# Contributing to BizScreen

Thanks for contributing! This guide will help you get started.

## Quick Start

```bash
# 1. Clone the repo
git clone https://github.com/massimodamico86-art/bizscreen.git
cd bizscreen

# 2. Install dependencies
npm install

# 3. Set up environment variables (see below)
cp .env.example .env.local

# 4. Start the dev server
npm run dev

# 5. Run tests
npm test
```

## Environment Setup

Copy `.env.example` to `.env.local` and fill in your Supabase credentials:

```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

> **Important**: Use a **test/dev Supabase project**, not production.

## Git Workflow

We use feature branches and pull requests. Before starting work:

1. Create a feature branch: `git checkout -b feature/my-feature`
2. Make changes and commit
3. Push and open a PR to `main`
4. Wait for CI to pass and get review

See **[GIT_WORKFLOW_CHECKLIST.md](GIT_WORKFLOW_CHECKLIST.md)** for the full checklist.

## Running Tests

| Command | Description |
|---------|-------------|
| `npm test` | Run unit/integration tests |
| `npm run test:e2e` | Run Playwright E2E tests |
| `npm run test:all` | Run all tests (unit + E2E) |
| `npm run test:ci` | Simulate full CI locally |
| `npm run test:watch` | Run tests in watch mode |

See **[TESTING.md](TESTING.md)** for complete testing documentation, including:
- How to set up test credentials
- How the CI pipeline works
- Troubleshooting common issues

## Code Style

- Use Prettier for formatting
- Follow existing patterns in the codebase
- Write tests for new features

## Pull Request Guidelines

1. **Keep PRs focused** - One feature or fix per PR
2. **Write clear descriptions** - Explain what and why
3. **Ensure CI passes** - All tests must pass
4. **Update docs if needed** - Keep documentation current

## Project Structure

```
bizscreen/
├── src/                    # React application source
│   ├── components/         # Reusable UI components
│   ├── pages/              # Page components
│   ├── services/           # API/business logic
│   └── contexts/           # React contexts
├── tests/                  # Test files
│   ├── e2e/                # Playwright E2E tests
│   ├── integration/        # Integration tests
│   └── unit/               # Unit tests
├── supabase/               # Supabase configuration
│   └── migrations/         # Database migrations
├── scripts/                # Utility scripts
└── .github/workflows/      # CI/CD pipelines
```

## Need Help?

- Check existing issues for similar problems
- Open a new issue with details about your question
- Review the documentation in this repo

## Related Documentation

- [TESTING.md](TESTING.md) - Testing guide
- [GIT_WORKFLOW_CHECKLIST.md](GIT_WORKFLOW_CHECKLIST.md) - Git workflow checklist
