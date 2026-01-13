# Frontend Navigation Pattern

## Overview

BizScreen uses a **state-based navigation pattern** rather than URL-based routing for the main application pages. This document explains the pattern and how to work with it.

## How It Works

### The `currentPage` State

Navigation is controlled by a single `currentPage` state in `App.jsx`:

```javascript
const [currentPage, setCurrentPage] = useState('dashboard');
```

Each page component receives `setCurrentPage` as a prop to enable navigation:

```javascript
<DashboardPage setCurrentPage={setCurrentPage} showToast={showToast} />
```

### Page Rendering

The `renderPage()` function in `App.jsx` maps `currentPage` values to components:

```javascript
function renderPage() {
  switch (currentPage) {
    case 'dashboard':
      return <DashboardPage setCurrentPage={setCurrentPage} showToast={showToast} />;
    case 'screens':
      return <ScreensPage setCurrentPage={setCurrentPage} showToast={showToast} />;
    case 'playlists':
      return <PlaylistsPage setCurrentPage={setCurrentPage} showToast={showToast} />;
    // ... more pages
  }
}
```

### Dynamic Page IDs

Some pages use dynamic IDs embedded in the `currentPage` string:

```javascript
// Navigate to a specific playlist editor
setCurrentPage(`playlist-editor-${playlistId}`);

// In renderPage(), extract the ID:
if (currentPage.startsWith('playlist-editor-')) {
  const playlistId = currentPage.replace('playlist-editor-', '');
  return <PlaylistEditorPage playlistId={playlistId} ... />;
}
```

## Navigation Examples

### From a Page Component

```javascript
// Navigate to screens page
<Button onClick={() => setCurrentPage('screens')}>
  View Screens
</Button>

// Navigate to a specific editor
<Button onClick={() => setCurrentPage(`layout-editor-${layoutId}`)}>
  Edit Layout
</Button>
```

### From the Sidebar

The sidebar in `App.jsx` uses the same pattern:

```javascript
<SidebarItem
  icon={<Monitor />}
  label="Screens"
  active={currentPage === 'screens'}
  onClick={() => setCurrentPage('screens')}
/>
```

## Page ID Reference

### Main Pages
| Page ID | Component | Description |
|---------|-----------|-------------|
| `dashboard` | DashboardPage | Main client dashboard |
| `screens` | ScreensPage | Screen management |
| `playlists` | PlaylistsPage | Playlist management |
| `media-all` | MediaLibraryPage | Media library |
| `apps` | AppsPage | App/widget management |
| `layouts` | LayoutsPage | Layout management |
| `campaigns` | CampaignsPage | Campaign management |
| `schedules` | SchedulesPage | Schedule management |
| `analytics` | AnalyticsPage | Analytics dashboard |

### Editor Pages (Dynamic)
| Pattern | Component | Usage |
|---------|-----------|-------|
| `playlist-editor-{id}` | PlaylistEditorPage | Edit specific playlist |
| `layout-editor-{id}` | LayoutEditorPage | Edit specific layout |
| `campaign-editor-{id}` | CampaignEditorPage | Edit specific campaign |

### Account Pages
| Page ID | Component | Description |
|---------|-----------|-------------|
| `account-settings` | AccountSettingsPage | User settings |
| `account-plan` | BillingPage | Subscription management |
| `developer-settings` | DeveloperSettingsPage | API keys, webhooks |
| `feature-flags` | FeatureFlagsPage | Feature flag settings |

### Admin Pages
| Page ID | Component | Description |
|---------|-----------|-------------|
| `admin` | AdminDashboardPage | Admin overview |
| `admin-clients` | ClientsPage | Client management |
| `admin-tenant` | TenantAdminPage | Tenant details |
| `admin-audit` | AdminAuditLogsPage | Audit logs |
| `admin-system-events` | AdminSystemEventsPage | System events |
| `admin-service-quality` | ServiceQualityPage | Service monitoring |

### Super Admin Pages
| Page ID | Component | Description |
|---------|-----------|-------------|
| `super-admin` | SuperAdminDashboardPage | Super admin overview |
| `super-admin-tenants` | TenantManagementPage | Tenant management |
| `super-admin-tenant-{id}` | AdminTenantDetailPage | Specific tenant |

## Why State-Based Navigation?

### Advantages
1. **Simplicity**: No router configuration needed
2. **Fast transitions**: No URL parsing or route matching
3. **State preservation**: Page state can persist across navigation
4. **Flexible**: Easy to add conditional navigation logic

### Tradeoffs
1. **No deep linking**: Users can't bookmark specific pages (except `/app`)
2. **No browser history**: Back button doesn't navigate between pages
3. **URL doesn't reflect state**: All pages show `/app` in the URL

## Adding a New Page

1. Create the page component in `src/pages/`
2. Add a case to `renderPage()` in `App.jsx`
3. Add sidebar item if needed
4. Pass `setCurrentPage` and `showToast` props

```javascript
// In App.jsx renderPage()
case 'my-new-page':
  return <MyNewPage setCurrentPage={setCurrentPage} showToast={showToast} />;
```

## Hash-Based Navigation

For specific scenarios like deep linking from modals, hash-based navigation is supported:

```javascript
// Navigate via URL hash
window.location.hash = '#account-plan';

// App.jsx listens for hash changes
useEffect(() => {
  const handleHashChange = () => {
    const hash = window.location.hash;
    if (hash === '#account-plan') {
      setCurrentPage('account-plan');
      window.history.replaceState(null, '', window.location.pathname);
    }
  };
  window.addEventListener('hashchange', handleHashChange);
  return () => window.removeEventListener('hashchange', handleHashChange);
}, []);
```

## Related Files

- [App.jsx](../src/App.jsx) - Main navigation logic and `renderPage()`
- [DashboardPage.jsx](../src/pages/DashboardPage.jsx) - Example of navigation usage
- [dashboard/](../src/pages/dashboard/) - Dashboard sub-components
