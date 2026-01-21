#!/bin/bash
#
# BizScreen Deployment Script
#
# Usage:
#   ./scripts/deploy.sh [staging|production]
#
# Prerequisites:
#   - Vercel CLI installed: npm i -g vercel
#   - Supabase CLI installed: npm i -g supabase
#   - Logged in to Vercel: vercel login
#   - Logged in to Supabase: supabase login
#

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Functions
log_info() {
  echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
  echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
  echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
  echo -e "${RED}[ERROR]${NC} $1"
}

# Parse arguments
ENVIRONMENT=${1:-staging}

if [[ "$ENVIRONMENT" != "staging" && "$ENVIRONMENT" != "production" ]]; then
  log_error "Invalid environment: $ENVIRONMENT"
  echo "Usage: ./scripts/deploy.sh [staging|production]"
  exit 1
fi

log_info "Starting deployment to $ENVIRONMENT"

# Check prerequisites
command -v vercel >/dev/null 2>&1 || { log_error "Vercel CLI not installed. Run: npm i -g vercel"; exit 1; }
command -v supabase >/dev/null 2>&1 || { log_error "Supabase CLI not installed. Run: npm i -g supabase"; exit 1; }

# Step 1: Run tests
log_info "Running tests..."
npm test -- --run || { log_error "Tests failed"; exit 1; }
log_success "Tests passed"

# Step 2: Build
log_info "Building application..."
npm run build || { log_error "Build failed"; exit 1; }
log_success "Build completed"

# Step 3: Database migrations
log_info "Checking for pending migrations..."
PENDING_MIGRATIONS=$(supabase db diff --schema public 2>&1 || true)

if [[ -n "$PENDING_MIGRATIONS" && "$PENDING_MIGRATIONS" != *"No changes"* ]]; then
  log_warning "Pending migrations detected:"
  echo "$PENDING_MIGRATIONS"
  echo ""

  if [[ "$ENVIRONMENT" == "production" ]]; then
    read -p "Apply migrations to production? (y/N) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
      log_info "Applying migrations..."
      supabase db push
      log_success "Migrations applied"
    else
      log_warning "Skipping migrations"
    fi
  else
    log_info "Applying migrations to staging..."
    supabase db push
    log_success "Migrations applied"
  fi
else
  log_info "No pending migrations"
fi

# Step 4: Deploy
log_info "Deploying to $ENVIRONMENT..."

if [[ "$ENVIRONMENT" == "production" ]]; then
  # Production deployment requires confirmation
  read -p "Deploy to PRODUCTION? (y/N) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    log_warning "Deployment cancelled"
    exit 0
  fi

  DEPLOY_URL=$(vercel --prod)
  log_success "Deployed to production: $DEPLOY_URL"

  # Create git tag
  VERSION=$(node -p "require('./package.json').version")
  BUILD_ID=$(git rev-parse --short HEAD)
  TAG="deploy-${VERSION}-${BUILD_ID}"

  log_info "Creating deployment tag: $TAG"
  git tag -a "$TAG" -m "Production deployment $VERSION"
  git push origin "$TAG" || log_warning "Failed to push tag"
else
  DEPLOY_URL=$(vercel)
  log_success "Deployed to staging: $DEPLOY_URL"
fi

# Step 5: Smoke test
log_info "Running smoke test..."
sleep 5

HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "${DEPLOY_URL}/api/health")
if [[ "$HTTP_STATUS" == "200" ]]; then
  log_success "Smoke test passed (HTTP $HTTP_STATUS)"
else
  log_warning "Smoke test returned HTTP $HTTP_STATUS"
fi

# Done
echo ""
log_success "Deployment to $ENVIRONMENT completed!"
echo ""
echo "Deployment URL: $DEPLOY_URL"
echo ""
