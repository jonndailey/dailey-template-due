import fs from 'node:fs/promises';
import path from 'node:path';
import { pool, resolveMigrationDir, runSqlFile } from './pool.js';

async function ensureMigrationsTable(conn) {
  await conn.query(`
    CREATE TABLE IF NOT EXISTS assignments_schema_migrations (
      id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
      filename VARCHAR(255) NOT NULL UNIQUE,
      executed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

export async function runMigrations() {
  const conn = await pool.getConnection();
  try {
    await ensureMigrationsTable(conn);
    const migrationDir = resolveMigrationDir();
    const files = (await fs.readdir(migrationDir))
      .filter((name) => name.endsWith('.sql'))
      .sort();

    for (const file of files) {
      const [rows] = await conn.query(
        'SELECT filename FROM assignments_schema_migrations WHERE filename = ? LIMIT 1',
        [file],
      );
      if (rows.length) continue;

      await runSqlFile(conn, path.join(migrationDir, file));
      await conn.query('INSERT INTO assignments_schema_migrations (filename) VALUES (?)', [file]);
      console.log(`applied migration ${file}`);
    }
  } finally {
    conn.release();
  }
}

async function main() {
  try {
    await runMigrations();
  } finally {
    await pool.end();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
