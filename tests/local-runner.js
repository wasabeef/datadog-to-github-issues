#!/usr/bin/env node
/* eslint-env node */

/**
 * Local test runner for the Datadog to GitHub Issues action
 * This simulates the GitHub Actions environment for local testing
 */

require('dotenv').config();

// Simulate GitHub Actions environment
process.env.GITHUB_ACTIONS = 'true';

// Map .env variables to GitHub Actions inputs
process.env['INPUT_DATADOG-API-KEY'] = process.env.DATADOG_API_KEY;
process.env['INPUT_DATADOG-APP-KEY'] = process.env.DATADOG_APP_KEY;
process.env['INPUT_DATADOG-SITE'] = process.env.DATADOG_SITE || 'datadoghq.com';
process.env['INPUT_GITHUB-TOKEN'] = process.env.GITHUB_TOKEN;
process.env['INPUT_SERVICE'] = process.env.SERVICE_NAME || '';
process.env['INPUT_DATE-FROM'] = process.env.DATE_FROM || 'now-24h';
process.env['INPUT_DATE-TO'] = process.env.DATE_TO || 'now';
process.env['INPUT_ERROR-HANDLING'] = process.env.ERROR_HANDLING || 'unhandled';
process.env['INPUT_ERROR-SOURCE'] = process.env.ERROR_SOURCE || '';
process.env['INPUT_EXCLUDE-NOISE'] = process.env.EXCLUDE_NOISE || 'true';
process.env['INPUT_MAX-ISSUES-PER-RUN'] =
  process.env.MAX_ISSUES_PER_RUN || '10';
process.env['INPUT_UPDATE-EXISTING'] = process.env.UPDATE_EXISTING || 'true';
process.env['INPUT_REOPEN-CLOSED'] = process.env.REOPEN_CLOSED || 'true';
process.env['INPUT_LABELS'] = process.env.LABELS || 'datadog-error,frontend';

// Set GitHub context
if (process.env.GITHUB_REPOSITORY) {
  const [owner] = process.env.GITHUB_REPOSITORY.split('/');
  process.env.GITHUB_REPOSITORY_OWNER = owner;
}

console.log('🚀 Starting local test runner...\n');
console.log('Configuration:');
console.log(`- Datadog Site: ${process.env['INPUT_DATADOG-SITE']}`);
console.log(`- Service: ${process.env['INPUT_SERVICE'] || '(all services)'}`);
console.log(
  `- Date Range: ${process.env['INPUT_DATE-FROM']} to ${process.env['INPUT_DATE-TO']}`
);
console.log(`- Error Handling: ${process.env['INPUT_ERROR-HANDLING']}`);
console.log(`- Exclude Noise: ${process.env['INPUT_EXCLUDE-NOISE']}`);
console.log(`- Max Issues: ${process.env['INPUT_MAX-ISSUES-PER-RUN']}`);
console.log(`- Repository: ${process.env.GITHUB_REPOSITORY}`);
console.log('\n');

// Check for required environment variables
const required = [
  'DATADOG_API_KEY',
  'DATADOG_APP_KEY',
  'GITHUB_TOKEN',
  'GITHUB_REPOSITORY',
];
const missing = required.filter((key) => !process.env[key]);

if (missing.length > 0) {
  console.error(
    '❌ Missing required environment variables:',
    missing.join(', ')
  );
  console.error('\nPlease create a .env file with the required variables.');
  console.error('See .env.example for reference.');
  process.exit(1);
}

// Import and run the action
console.log('Running action...\n');

try {
  require('../dist/index.js');
} catch (error) {
  console.error('❌ Failed to run action:', error.message);
  console.error('\nMake sure to build the action first: npm run build');
  process.exit(1);
}
