# BizScreen

Digital signage platform for managing screen content across locations. Build playlists, design templates, schedule campaigns, and deploy to screens - all from a single dashboard.

## Quick Start

### Prerequisites

- Node.js 20+ (LTS recommended)
- Supabase CLI (for local development)
- Git

### Installation

```bash
# Clone and install
git clone <repository-url>
cd bizscreen
npm install

# Set up environment
cp .env.example .env.local
# Edit .env.local with your Supabase credentials

# Start development server
npm run dev
```

Visit `http://localhost:5173` to see the app.

### Running Tests

```bash
npm test              # Unit tests (Vitest)
npm run test:e2e      # E2E tests (Playwright)
npm run test:all      # All tests
npm run lint          # ESLint check
```

## Architecture

### Tech Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| Frontend | React 19 + Vite | UI framework and build tool |
| Styling | TailwindCSS | Utility-first CSS |
| State | React Context + Supabase Realtime | Auth, data subscriptions |
| Backend | Supabase | PostgreSQL, Auth, Storage, Edge Functions |
| Editor | Polotno | Visual template editor |
| Testing | Vitest + Playwright | Unit and E2E testing |
| CI/CD | GitHub Actions + Vercel | Automated testing and deployment |

### Project Structure

```
src/
├── components/       # Reusable UI components (Button, Card, Modal, etc.)
├── design-system/    # Design system components with consistent styling
├── pages/            # Route pages (Dashboard, Screens, Playlists, etc.)
├── services/         # API services and business logic
│   ├── authService.js        # Authentication operations
│   ├── screenService.js      # Screen CRUD and status
│   ├── playlistService.js    # Playlist management
│   ├── scheduleService.js    # Schedule and time-based content
│   ├── campaignService.js    # Campaign management
│   └── playerService.js      # Player-side content resolution
├── hooks/            # React hooks (useMedia, useFeatureFlag, etc.)
├── contexts/         # React contexts (Auth, Emergency, Features)
├── player/           # Player app (runs on display screens)
│   ├── pages/        # Player routes (ViewPage, PairPage)
│   └── hooks/        # Player-specific hooks
├── config/           # Feature flags, plans, app configuration
├── utils/            # Helper functions
├── i18n/             # Internationalization
├── __fixtures__/     # Test fixtures and factories
└── types/            # TypeScript-like JSDoc types
```

### Key Concepts

| Concept | Description |
|---------|-------------|
| **Scenes** | Visual layouts created in the Polotno template editor |
| **Playlists** | Ordered collections of scenes/media with display durations |
| **Screens** | Physical display devices paired to the platform |
| **Screen Groups** | Logical groupings of screens for bulk operations |
| **Campaigns** | Scheduled content delivery with targeting and priority |
| **Schedules** | Time-based rules for when content plays |

### Data Flow

```
User creates content (Scenes/Playlists)
         │
         ▼
Content assigned to Screens/Groups via Campaigns or Schedules
         │
         ▼
Player fetches resolved content via get_resolved_player_content RPC
         │
         ▼
Player displays content, sends heartbeats, reports playback
```

## Development

### Code Quality

ESLint runs on pre-commit via Husky + lint-staged:

- **PropTypes** required for React components
- **JSDoc** required for exported service functions
- **Unused imports** are auto-removed

```bash
# Check lint status
npm run lint

# Auto-fix issues
npm run lint -- --fix
```

### Key Services

| Service | Responsibility |
|---------|----------------|
| `authService.js` | Sign in, sign up, password reset, user management |
| `screenService.js` | Screen CRUD, pairing, status tracking |
| `playlistService.js` | Playlist CRUD, item ordering, shuffling |
| `scheduleService.js` | Schedule entries, conflict detection, timezone handling |
| `campaignService.js` | Campaign CRUD, targeting, weighted rotation |
| `playerService.js` | Content resolution, caching, offline support |

### Testing Patterns

```bash
# Run specific test file
npm test -- src/services/authService.test.js

# Run tests matching pattern
npm test -- --grep "campaign"

# Watch mode
npm test -- --watch
```

See `TEST-PATTERNS.md` for fixture factories, mocking patterns, and test organization.

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_SUPABASE_URL` | Yes | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Yes | Supabase anonymous key |
| `VITE_POLOTNO_KEY` | No | Polotno editor license key |
| `VITE_SENTRY_DSN` | No | Sentry error tracking |

## Player App

The player runs on display screens (Smart TVs, tablets, Raspberry Pi).

### Player Routes

- `/player` - Pairing screen (enter code to pair device)
- `/player/view` - Content playback (after pairing)

### Offline Support

The player caches content to IndexedDB for offline playback:
1. **Prefetch**: Downloads playlist content on pairing
2. **Background sync**: Periodic updates every 5 minutes
3. **Reconnect sync**: Full sync when connection restored

### Content Resolution Priority

1. **Emergency campaigns** - Highest priority, bypasses all other content
2. **Active campaigns** - Scheduled campaigns targeting this screen
3. **Device scene** - Default content assigned directly to device

## Deployment

### Production (Vercel)

Push to `main` triggers automatic deployment to production.

```bash
# Manual deploy
vercel --prod
```

### Environment Setup

1. Create Vercel project
2. Link Supabase project
3. Set environment variables in Vercel dashboard
4. Deploy

## Documentation

| Document | Purpose |
|----------|---------|
| `TESTING.md` | Test setup, fixtures, CI configuration |
| `CONTRIBUTING.md` | Development workflow, PR guidelines |
| `TEST-PATTERNS.md` | Mock factories, test organization |
| `PRODUCTION_RUNBOOK.md` | Operations and monitoring |
| `PERFORMANCE_BUDGET.md` | Bundle size and performance targets |

## Scripts Reference

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |
| `npm test` | Run unit tests |
| `npm run test:e2e` | Run E2E tests |
| `npm run test:all` | Run all tests |
| `npm run lint` | Run ESLint |
| `npm run lint:fix` | Auto-fix lint issues |
| `npm run analyze` | Analyze bundle size |

## License

Private - All rights reserved.
