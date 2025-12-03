# Load Testing Suite

Phase 13: Predictive Load Simulation for BizScreen

## Overview

This folder contains load testing scripts to verify application scalability and identify bottlenecks before production deployment.

## Test Scenarios

| Test | Tool | Description | Target |
|------|------|-------------|--------|
| `auth-burst.js` | autocannon | Login burst simulation | < 200ms p95 |
| `heartbeat.js` | k6 | Screen heartbeat at scale | < 100ms p95 |
| `playlist-resolution.js` | k6 | Content resolution for players | < 150ms p95 |
| `media-library.js` | autocannon | Media library listing | < 300ms p95 |

## Prerequisites

```bash
# Install autocannon globally
npm install -g autocannon

# Install k6 (macOS)
brew install k6

# Or install k6 (npm wrapper)
npm install -g k6
```

## Running Tests

### Quick Run (All Tests)

```bash
npm run load-test
```

### Individual Tests

```bash
# Auth burst test (autocannon)
npm run load-test:auth

# Heartbeat test (k6)
npm run load-test:heartbeat

# Playlist resolution test (k6)
npm run load-test:playlist

# Media library test (autocannon)
npm run load-test:media
```

### Custom Configuration

```bash
# Set custom base URL
BASE_URL=https://staging.bizscreen.app npm run load-test

# Set custom duration
DURATION=60s npm run load-test:heartbeat

# Set custom virtual users
VUS=100 npm run load-test:heartbeat
```

## Test Configuration

Environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `BASE_URL` | `http://localhost:5173` | Application base URL |
| `DURATION` | `30s` | Test duration |
| `VUS` | `50` | Virtual users (k6) |
| `CONNECTIONS` | `10` | Concurrent connections (autocannon) |

## Interpreting Results

### Pass Criteria

- **p95 Response Time**: Must be below threshold (varies by endpoint)
- **Error Rate**: Must be < 1%
- **Requests/Second**: Should match expected throughput

### Performance Thresholds

```
| Metric        | Target     | Warning    | Critical   |
|---------------|------------|------------|------------|
| p95 latency   | < 200ms    | < 500ms    | > 1000ms   |
| p99 latency   | < 500ms    | < 1000ms   | > 2000ms   |
| Error rate    | < 0.1%     | < 1%       | > 5%       |
| RPS           | > 100      | > 50       | < 20       |
```

## Baseline Report

After running tests, a baseline report is generated at `load-tests/results/baseline-report.json`.

Example:

```json
{
  "timestamp": "2024-01-15T10:30:00Z",
  "environment": "local",
  "results": {
    "auth-burst": { "p95": 145, "p99": 234, "errorRate": 0 },
    "heartbeat": { "p95": 67, "p99": 123, "errorRate": 0 },
    "playlist": { "p95": 89, "p99": 156, "errorRate": 0 },
    "media": { "p95": 198, "p99": 345, "errorRate": 0 }
  }
}
```

## Notes

- These tests simulate Supabase latency with mock delays
- Tests do not depend on production database
- Run tests in isolated environment to avoid affecting real users
- Results may vary based on local machine resources
