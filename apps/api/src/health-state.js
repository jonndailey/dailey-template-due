// Readiness state shared between index.js (which runs the migrations in the
// background) and app.js (which reports them over HTTP).
//
// Why this exists: the API deliberately fail-softs. It boots and serves the web
// bundle even when the database is unreachable or its migrations blew up, so
// that a half-provisioned project still shows something instead of a blank
// error page. That is good for the human looking at the page and terrible for
// anything trying to decide whether the deploy WORKED: `GET /` answered 200
// with a perfectly healthy-looking app while every task operation was broken
// against a frozen schema.
//
// So the process keeps its real state here and /health/ready tells the truth
// about it. Liveness (is the process up) and readiness (is the app actually
// able to do its job) are separate questions and now have separate answers.

const MAX_ERROR_CHARS = 400;

const state = {
  // 'pending'  — migrations have not completed a successful run yet and the
  //              last attempt has not failed either (first boot, still trying).
  // 'applied'  — every migration file is recorded as applied. The app works.
  // 'failed'   — the last attempt threw. The schema is NOT what the code
  //              expects. Retries continue in the background.
  migrations: 'pending',
  migrationAttempts: 0,
  migrationError: null,
  migrationErrorCode: null,
  appliedAt: null,
};

/** Trim and flatten an error into something safe to put in a JSON response. */
function describeError(error) {
  const raw =
    error?.sqlMessage ||
    error?.message ||
    (error == null ? '' : String(error));
  return String(raw).replace(/\s+/g, ' ').trim().slice(0, MAX_ERROR_CHARS) || 'unknown error';
}

export function markMigrationAttempt() {
  state.migrationAttempts += 1;
}

export function markMigrationsApplied() {
  state.migrations = 'applied';
  state.migrationError = null;
  state.migrationErrorCode = null;
  state.appliedAt = new Date().toISOString();
}

export function markMigrationsFailed(error) {
  state.migrations = 'failed';
  state.migrationError = describeError(error);
  state.migrationErrorCode = error?.code ? String(error.code) : null;
}

export function migrationsApplied() {
  return state.migrations === 'applied';
}

/**
 * The readiness answer.
 *
 * Shape is deliberately generic so that anything checking a Dailey app (the
 * installer's post-deploy readiness gate, the platform canary, a human with
 * curl) can read it without knowing anything about this template:
 *
 *   { ok: boolean, service: string, checks: { <name>: 'ok'|'pending'|'failed' },
 *     error?: string }
 *
 * `ok` is the single field a caller has to understand.
 */
export function readinessReport(service) {
  const ok = state.migrations === 'applied';
  const report = {
    ok,
    service,
    checks: {
      // The database check is derived: migrations can only be 'applied' if the
      // database was reachable, and a connection failure surfaces as a failed
      // migration attempt.
      database: state.migrations === 'applied' ? 'ok' : state.migrations === 'failed' ? 'failed' : 'pending',
      migrations: state.migrations,
    },
    migrations: {
      status: state.migrations,
      attempts: state.migrationAttempts,
      applied_at: state.appliedAt,
    },
  };
  if (!ok && state.migrationError) {
    report.error = `database setup has not completed: ${state.migrationError}`;
    if (state.migrationErrorCode) report.error_code = state.migrationErrorCode;
  } else if (!ok) {
    report.error = 'database setup has not completed yet';
  }
  return report;
}
