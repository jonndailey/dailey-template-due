import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mysql from 'mysql2/promise';
import { env } from '../config/env.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const pool = mysql.createPool({
  host: env.mysql.host,
  port: env.mysql.port,
  user: env.mysql.user,
  password: env.mysql.password,
  database: env.mysql.database,
  waitForConnections: true,
  connectionLimit: 10,
  namedPlaceholders: true,
});

export async function withTx(fn) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const result = await fn(conn);
    await conn.commit();
    return result;
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}

// MySQL has no `IF NOT EXISTS` for ADD COLUMN / CREATE INDEX (that is MariaDB
// syntax and a parse error here), so idempotency is enforced at the runner
// instead: an object that already exists is a satisfied precondition, not a
// failure. Without this, a migration that dies half-way — or one re-applied
// against a database that already has the objects — wedges the retry loop
// forever and the app silently serves with an un-migrated schema.
const ALREADY_APPLIED_ERRORS = new Set([
  'ER_TABLE_EXISTS_ERROR',   // 1050 CREATE TABLE
  'ER_DUP_FIELDNAME',        // 1060 ADD COLUMN
  'ER_DUP_KEYNAME',          // 1061 CREATE INDEX / ADD KEY
  'ER_DUP_ENTRY',            // 1062 UNIQUE backfill
  'ER_CANT_DROP_FIELD_OR_KEY', // 1091 DROP COLUMN/INDEX that is already gone
  'ER_FK_DUP_NAME',          // 1826 duplicate FOREIGN KEY constraint name
]);

export async function runSqlFile(conn, filename) {
  const sql = await fs.readFile(filename, 'utf8');
  for (const statement of sql
    .split(/;\s*\n/g)
    .map((part) => part.trim())
    .filter(Boolean)) {
    try {
      await conn.query(statement);
    } catch (error) {
      if (ALREADY_APPLIED_ERRORS.has(error?.code)) {
        console.warn(
          `${path.basename(filename)}: skipping already-applied statement (${error.code})`,
        );
        continue;
      }
      throw error;
    }
  }
}

export function resolveMigrationDir() {
  return path.resolve(__dirname, '../../migrations');
}
