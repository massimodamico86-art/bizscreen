# BizScreen Frontend Overview

A comprehensive guide to the BizScreen frontend architecture, development workflow, and testing strategy.

## Tech Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| **React** | 19.x | UI framework |
| **Vite** | 6.x | Build tool & dev server |
| **Tailwind CSS** | 3.x | Utility-first CSS |
| **Supabase** | 2.x | Backend-as-a-Service (auth, database, realtime) |
| **Vitest** | 3.x | Unit & integration testing |
| **Playwright** | 1.x | E2E testing |
| **Framer Motion** | 11.x | Animations |

## Project Structure

```
bizscreen/
├── src/
│   ├── App.jsx              # Main app shell with routing
│   ├── pages/               # Page components (lazy-loaded)
│   │   ├── Admin/           # Admin-only pages
│   │   ├── dashboard/       # Dashboard sub-components
│   │   └── *.jsx            # Individual page components
│   ├── components/          # Shared components
│   ├── design-system/       # Core UI components
│   ├── contexts/            # React contexts (Auth, etc.)
│   ├── hooks/               # Custom React hooks
│   ├── services/            # API/business logic services
│   ├── config/              # Configuration (plans, features)
│   └── utils/               # Utility functions
├── tests/
│   ├── unit/                # Unit tests
│   ├── integration/         # Integration tests
│   └── e2e/                 # Playwright E2E tests
├── docs/                    # Documentation
└── api/                     # Serverless API routes (Vercel)
```

## Architecture Overview

### Navigation Model

BizScreen uses **state-based navigation** instead of URL routing:

```jsx
// App.jsx manages currentPage state
const [currentPage, setCurrentPage] = useState('dashboard');

// Pages render based on currentPage
{pages[currentPage] || <FallbackPage />}
```

### Main Areas

| Area | Pages | Description |
|------|-------|-------------|
| **Dashboard** | dashboard | Main client landing page |
| **Media** | media-all, media-images, media-videos, etc. | Media library with type filters |
| **Content** | playlists, layouts, schedules, campaigns | Content management |
| **Screens** | screens, screen-groups | Device management |
| **Settings** | settings, account-plan, team, branding | User/tenant settings |
| **Admin** | admin-tenants, admin-audit-logs, admin-system-events | Super admin tools |

### Role Hierarchy

```
super_admin → Full platform access (all tenants)
    ↓
admin → Manages assigned clients
    ↓
client → Own tenant only
```

See [ADMIN_NAVIGATION_GUIDE.md](./ADMIN_NAVIGATION_GUIDE.md) for detailed admin navigation.

## Development Workflow

### Getting Started

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Run tests
npm test
```

### Environment Variables

Create `.env.local` with:

```env
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-anon-key
```

For E2E tests, also set:
```env
TEST_USER_EMAIL=test@example.com
TEST_USER_PASSWORD=yourpassword
TEST_CLIENT_EMAIL=client@example.com
TEST_CLIENT_PASSWORD=clientpassword
```

### Code Splitting

All pages use React.lazy for automatic code splitting:

```jsx
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
```

This ensures:
- Initial bundle stays small (~245 KB gzip)
- Admin pages only load for admins
- Heavy pages load on-demand

## Testing Strategy

### Unit Tests (`tests/unit/`)

Test individual functions, hooks, and services:

```bash
npm test                    # Run all unit tests
npm run test:unit           # Run unit tests only
npm run test:watch          # Watch mode
npm run test:coverage       # With coverage report
```

Location: `tests/unit/`
- `services/` - Service function tests
- `hooks/` - React hook tests
- `config/` - Configuration tests

### Integration Tests (`tests/integration/`)

Test API route handlers:

```bash
npm run test:integration    # Run integration tests only
```

Location: `tests/integration/api/`
- Tests for `/api/*` serverless functions

### E2E Tests (`tests/e2e/`)

Test complete user flows with Playwright:

```bash
npm run test:e2e            # Headless
npm run test:e2e:headed     # With browser
npm run test:e2e:ui         # Interactive UI mode
```

Location: `tests/e2e/`
- `auth.spec.js` - Authentication flows
- `dashboard.spec.js` - Dashboard functionality
- `screens.spec.js` - Screen management
- `media.spec.js` - Media library
- `playlists.spec.js` - Playlist management
- `settings.spec.js` - User settings
- `admin.spec.js` - Admin panel

### CI Pipeline

The GitHub Actions workflow runs:
1. **Unit & Integration tests** - Fast feedback (~2 min)
2. **E2E tests** - Full browser tests (~10 min)

Both jobs run in parallel for efficiency.

## Adding a New Page

### 1. Create the Page Component

```jsx
// src/pages/MyNewPage.jsx
export default function MyNewPage({ showToast }) {
  return (
    <PageLayout>
      <PageHeader title="My New Page" />
      <PageContent>
        {/* Your content here */}
      </PageContent>
    </PageLayout>
  );
}
```

### 2. Register in App.jsx

```jsx
// Add lazy import at top
const MyNewPage = lazy(() => import('./pages/MyNewPage'));

// Add to pages object
const pages = {
  // ... existing pages
  'my-new-page': <Suspense fallback={<PageLoader />}><MyNewPage showToast={showToast} /></Suspense>,
};
```

### 3. Add Navigation Link

Add to the `navigation` array or Settings section in App.jsx:

```jsx
{ id: 'my-new-page', label: t('nav.myNewPage', 'My New Page'), icon: SomeIcon },
```

### 4. Add Tests

Create `tests/e2e/my-new-page.spec.js`:

```javascript
import { test, expect } from '@playwright/test';
import { loginAndPrepare } from './helpers.js';

test.describe('My New Page', () => {
  test.beforeEach(async ({ page }) => {
    await loginAndPrepare(page);
  });

  test('renders correctly', async ({ page }) => {
    await page.goto('/app/my-new-page');
    await expect(page.getByText(/my new page/i)).toBeVisible();
  });
});
```

## Design System

The project includes a custom design system in `src/design-system/`:

### Core Components

- **Layout**: `PageLayout`, `PageHeader`, `PageContent`, `Grid`, `Stack`
- **Cards**: `Card`, `CardHeader`, `CardTitle`, `CardContent`, `StatCard`
- **Forms**: `Input`, `Select`, `Textarea`, `Switch`, `Checkbox`
- **Buttons**: `Button` with variants (primary, secondary, outline, destructive)
- **Modal**: Full-featured modal with focus trap and animations
- **Feedback**: `Toast`, `Alert`, `Badge`, `EmptyState`

### Usage Example

```jsx
import { PageLayout, PageHeader, PageContent, Card, Button } from '../design-system';

function MyPage() {
  return (
    <PageLayout>
      <PageHeader
        title="My Page"
        actions={<Button onClick={handleAction}>Action</Button>}
      />
      <PageContent>
        <Card>
          <CardHeader>
            <CardTitle>Section Title</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Content */}
          </CardContent>
        </Card>
      </PageContent>
    </PageLayout>
  );
}
```

## Key Services

| Service | Location | Purpose |
|---------|----------|---------|
| `authService` | `services/authService.js` | Authentication helpers |
| `screenService` | `services/screenService.js` | Screen CRUD, pairing |
| `mediaService` | `services/mediaService.js` | Media library operations |
| `playlistService` | `services/playlistService.js` | Playlist management |
| `scheduleService` | `services/scheduleService.js` | Schedule management |
| `adminService` | `services/adminService.js` | Admin operations |
| `dashboardService` | `services/dashboardService.js` | Dashboard stats |

## Accessibility

The frontend includes:
- Skip link to main content
- Proper heading hierarchy
- ARIA labels on interactive elements
- Focus management in modals
- Keyboard navigation support

## Performance

Bundle optimization:
- All pages lazy-loaded with React.lazy
- Vendor libraries in separate chunks
- Heavy pages load on-demand
- Total initial bundle: ~78 KB gzipped

## Common Patterns

### Toast Notifications

```jsx
showToast('Action completed successfully');
showToast('Something went wrong', 'error');
```

### Navigation

```jsx
// From any page with setCurrentPage prop
setCurrentPage('screens');

// Or use onNavigate prop
onNavigate?.('media-all');
```

### Feature Gating

```jsx
import { FeatureGate, Feature } from '../components/FeatureGate';

<FeatureGate
  feature={Feature.AI_ASSISTANT}
  fallback={<UpgradePrompt />}
>
  <PremiumFeature />
</FeatureGate>
```

## Further Reading

- [ADMIN_NAVIGATION_GUIDE.md](./ADMIN_NAVIGATION_GUIDE.md) - Admin/Super Admin navigation details
- [TESTING_GUIDE.md](./TESTING_GUIDE.md) - Detailed testing documentation
- [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) - Deployment procedures
