import { createApp } from './app.js';
import { env } from './config/env.js';
import { runMigrations } from './db/migrate.js';
import {
  markMigrationAttempt,
  markMigrationsApplied,
  markMigrationsFailed,
  migrationsApplied,
} from './health-state.js';
import { generateRecurringTasks } from './jobs/generate-recurring.js';

const MIGRATE_RETRY_MS = 15_000;
const RECURRING_INTERVAL_MS = 60 * 60 * 1000;

// Fail-soft: the server always boots and serves the web app, even when the
// database is not reachable yet. Migrations retry in the background until
// they succeed, which covers the window where Dailey OS is still
// provisioning the project database.
//
// Fail-soft is NOT the same as pretending to be healthy: every outcome here is
// recorded in health-state so /health/ready reports what really happened.
async function migrateWithRetry() {
  markMigrationAttempt();
  try {
    await runMigrations();
    markMigrationsApplied();
    console.log('database migrations are up to date');
  } catch (error) {
    markMigrationsFailed(error);
    console.warn(`database not ready (${error?.code || error?.message || error}); retrying in ${MIGRATE_RETRY_MS / 1000}s`);
    setTimeout(migrateWithRetry, MIGRATE_RETRY_MS).unref();
  }
}

async function runRecurringJob() {
  if (!migrationsApplied()) return;
  try {
    await generateRecurringTasks();
  } catch (error) {
    console.warn(`recurring task generation failed: ${error?.message || error}`);
  }
}

const app = createApp();

app.listen(env.port, () => {
  console.log(`dailey-template-due listening on ${env.port}`);
  migrateWithRetry();
  setInterval(runRecurringJob, RECURRING_INTERVAL_MS).unref();
  setTimeout(runRecurringJob, 30_000).unref();
});
