#!/usr/bin/env node
/**
 * Developer Test Utility: Trigger Alerts
 *
 * This script allows developers to manually trigger test alerts for development
 * and debugging purposes. It connects directly to Supabase to create alerts.
 *
 * Usage:
 *   node scripts/dev/trigger-alerts.cjs [command] [options]
 *
 * Commands:
 *   device-offline   - Create a device offline alert
 *   screenshot-fail  - Create a screenshot failure alert
 *   data-sync-fail   - Create a data source sync failure alert
 *   social-sync-fail - Create a social feed sync failure alert
 *   cache-stale      - Create a cache stale alert
 *   all              - Create one of each alert type
 *   clear            - Clear all test alerts
 *
 * Options:
 *   --tenant-id=UUID    - Tenant ID (required, or set TENANT_ID env var)
 *   --device-id=UUID    - Device ID for device alerts (optional, will create test device)
 *   --severity=LEVEL    - Severity: info, warning, critical (default: warning)
 *   --minutes=N         - Minutes offline for device alerts (default: 15)
 *   --failures=N        - Failure count for screenshot alerts (default: 3)
 *
 * Examples:
 *   TENANT_ID=abc123 node scripts/dev/trigger-alerts.cjs device-offline --minutes=45
 *   node scripts/dev/trigger-alerts.cjs all --tenant-id=abc123
 *   node scripts/dev/trigger-alerts.cjs clear --tenant-id=abc123
 */

const { createClient } = require('@supabase/supabase-js');

// Load environment variables
require('dotenv').config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Error: Missing Supabase credentials. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const command = args[0] || 'help';
  const options = {
    tenantId: process.env.TENANT_ID,
    deviceId: null,
    severity: 'warning',
    minutes: 15,
    failures: 3,
  };

  for (const arg of args.slice(1)) {
    if (arg.startsWith('--tenant-id=')) {
      options.tenantId = arg.split('=')[1];
    } else if (arg.startsWith('--device-id=')) {
      options.deviceId = arg.split('=')[1];
    } else if (arg.startsWith('--severity=')) {
      options.severity = arg.split('=')[1];
    } else if (arg.startsWith('--minutes=')) {
      options.minutes = parseInt(arg.split('=')[1], 10);
    } else if (arg.startsWith('--failures=')) {
      options.failures = parseInt(arg.split('=')[1], 10);
    }
  }

  return { command, options };
}

// Alert types matching alertEngineService.js
const ALERT_TYPES = {
  DEVICE_OFFLINE: 'device_offline',
  DEVICE_SCREENSHOT_FAILED: 'device_screenshot_failed',
  DEVICE_CACHE_STALE: 'device_cache_stale',
  DATA_SOURCE_SYNC_FAILED: 'data_source_sync_failed',
  SOCIAL_FEED_SYNC_FAILED: 'social_feed_sync_failed',
};

// Create an alert directly in the database
async function createAlert(alertData) {
  const { data, error } = await supabase
    .from('alerts')
    .insert(alertData)
    .select()
    .single();

  if (error) {
    console.error('Failed to create alert:', error.message);
    return null;
  }

  console.log(`Created ${alertData.severity} ${alertData.type} alert: ${alertData.title}`);
  console.log(`  Alert ID: ${data.id}`);
  return data;
}

// Command handlers
const commands = {
  async 'device-offline'(options) {
    const minutesOffline = options.minutes;
    const severity = minutesOffline >= 60 ? 'critical' : minutesOffline >= 15 ? 'warning' : 'info';

    return createAlert({
      tenant_id: options.tenantId,
      device_id: options.deviceId,
      type: ALERT_TYPES.DEVICE_OFFLINE,
      severity: options.severity === 'warning' ? severity : options.severity,
      title: `Test Device is offline`,
      message: `Device has been offline for ${minutesOffline} minutes (test alert)`,
      meta: {
        device_name: 'Test Device',
        minutes_offline: minutesOffline,
        is_test_alert: true,
      },
    });
  },

  async 'screenshot-fail'(options) {
    const failureCount = options.failures;
    const severity = failureCount >= 5 ? 'critical' : 'warning';

    return createAlert({
      tenant_id: options.tenantId,
      device_id: options.deviceId,
      type: ALERT_TYPES.DEVICE_SCREENSHOT_FAILED,
      severity: options.severity === 'warning' ? severity : options.severity,
      title: `Screenshot capture failing for Test Device`,
      message: `${failureCount} consecutive screenshot failures (test alert)`,
      meta: {
        device_name: 'Test Device',
        failure_count: failureCount,
        last_error: 'Test error: Screenshot capture timed out',
        is_test_alert: true,
      },
    });
  },

  async 'data-sync-fail'(options) {
    return createAlert({
      tenant_id: options.tenantId,
      type: ALERT_TYPES.DATA_SOURCE_SYNC_FAILED,
      severity: options.severity,
      title: `Data source "Test Source" sync failed`,
      message: 'Test error: Connection timeout (test alert)',
      meta: {
        data_source_name: 'Test Source',
        data_source_type: 'api',
        error_message: 'Connection timeout',
        is_test_alert: true,
      },
    });
  },

  async 'social-sync-fail'(options) {
    return createAlert({
      tenant_id: options.tenantId,
      type: ALERT_TYPES.SOCIAL_FEED_SYNC_FAILED,
      severity: options.severity,
      title: `Social feed sync failed for Instagram`,
      message: 'Test error: Rate limit exceeded (test alert)',
      meta: {
        provider: 'instagram',
        account_name: 'test_account',
        error_message: 'Rate limit exceeded',
        is_test_alert: true,
      },
    });
  },

  async 'cache-stale'(options) {
    const hoursStale = options.minutes / 60 || 24;
    const severity = hoursStale >= 24 ? 'critical' : 'warning';

    return createAlert({
      tenant_id: options.tenantId,
      device_id: options.deviceId,
      type: ALERT_TYPES.DEVICE_CACHE_STALE,
      severity: options.severity === 'warning' ? severity : options.severity,
      title: `Device cache is stale`,
      message: `Cache has not been updated for ${hoursStale} hours (test alert)`,
      meta: {
        device_name: 'Test Device',
        hours_stale: hoursStale,
        is_test_alert: true,
      },
    });
  },

  async all(options) {
    console.log('Creating all alert types...\n');
    const results = [];

    results.push(await commands['device-offline'](options));
    results.push(await commands['screenshot-fail'](options));
    results.push(await commands['data-sync-fail'](options));
    results.push(await commands['social-sync-fail'](options));
    results.push(await commands['cache-stale'](options));

    const created = results.filter(Boolean).length;
    console.log(`\nCreated ${created} test alerts.`);
    return results;
  },

  async clear(options) {
    console.log('Clearing test alerts...');

    const { data, error } = await supabase
      .from('alerts')
      .delete()
      .eq('tenant_id', options.tenantId)
      .filter('meta->is_test_alert', 'eq', true)
      .select();

    if (error) {
      console.error('Failed to clear alerts:', error.message);
      return;
    }

    console.log(`Cleared ${data?.length || 0} test alerts.`);
  },

  help() {
    console.log(`
Developer Test Utility: Trigger Alerts

Usage:
  node scripts/dev/trigger-alerts.cjs [command] [options]

Commands:
  device-offline   - Create a device offline alert
  screenshot-fail  - Create a screenshot failure alert
  data-sync-fail   - Create a data source sync failure alert
  social-sync-fail - Create a social feed sync failure alert
  cache-stale      - Create a cache stale alert
  all              - Create one of each alert type
  clear            - Clear all test alerts (with is_test_alert=true)
  help             - Show this help message

Options:
  --tenant-id=UUID    - Tenant ID (required, or set TENANT_ID env var)
  --device-id=UUID    - Device ID for device alerts (optional)
  --severity=LEVEL    - Severity: info, warning, critical (default: warning)
  --minutes=N         - Minutes offline for device alerts (default: 15)
  --failures=N        - Failure count for screenshot alerts (default: 3)

Environment Variables:
  TENANT_ID           - Default tenant ID if not provided via --tenant-id
  VITE_SUPABASE_URL   - Supabase project URL
  VITE_SUPABASE_ANON_KEY - Supabase anonymous key

Examples:
  TENANT_ID=abc123 node scripts/dev/trigger-alerts.cjs device-offline --minutes=45
  node scripts/dev/trigger-alerts.cjs all --tenant-id=abc123
  node scripts/dev/trigger-alerts.cjs clear --tenant-id=abc123
`);
  },
};

// Main entry point
async function main() {
  const { command, options } = parseArgs();

  if (command === 'help') {
    commands.help();
    return;
  }

  if (!options.tenantId) {
    console.error('Error: --tenant-id is required or set TENANT_ID environment variable.');
    console.error('Run with "help" for usage information.');
    process.exit(1);
  }

  if (!commands[command]) {
    console.error(`Unknown command: ${command}`);
    console.error('Run with "help" for available commands.');
    process.exit(1);
  }

  try {
    await commands[command](options);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

main();
