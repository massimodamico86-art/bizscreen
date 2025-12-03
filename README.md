# BizScreen

Digital signage and TV display management platform for vacation rentals and hospitality businesses.

## Quick Start

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your Supabase credentials

# Start development server
npm run dev
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |
| `npm test` | Run unit/integration tests |
| `npm run test:e2e` | Run Playwright E2E tests |
| `npm run test:all` | Run all tests (unit + E2E) |
| `npm run test:ci` | Simulate CI locally (with Supabase seeding) |

## Testing

Run quick unit tests:
```bash
npm test
```

Run all tests locally:
```bash
npm run test:all
```

See **[TESTING.md](TESTING.md)** for complete testing documentation, including CI setup and troubleshooting.

## Contributing

We welcome contributions! See **[CONTRIBUTING.md](CONTRIBUTING.md)** for:
- Development setup
- Git workflow
- Code style guidelines

## Tech Stack

- **Frontend**: React 19, Vite, Tailwind CSS
- **Backend**: Supabase (PostgreSQL, Auth, Storage)
- **Testing**: Vitest, Playwright
- **CI/CD**: GitHub Actions

## Production Readiness

- **Health Check**: `GET /api/health` returns status, version, and timestamp
- **Error Boundary**: Global error boundary with centralized logging
- **Smoke Tests**: Critical-path E2E tests run on every CI build
- **Browser Logging**: Frontend errors are captured and forwarded to `/api/logs/browser`

## Documentation

- [CONTRIBUTING.md](CONTRIBUTING.md) - Contributor guide
- [TESTING.md](TESTING.md) - Testing guide
- [GIT_WORKFLOW_CHECKLIST.md](GIT_WORKFLOW_CHECKLIST.md) - Git workflow

## License

Private - All rights reserved.
