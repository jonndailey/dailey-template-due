import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '../../../..');

dotenv.config({ path: path.join(repoRoot, '.env') });
dotenv.config();

function optional(name, fallback = undefined) {
  const value = process.env[name];
  return value == null || value === '' ? fallback : value;
}

function toInt(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toBool(value, fallback = false) {
  if (value == null || value === '') return fallback;
  return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase());
}

// Dailey OS injects DATABASE_URL when a database is provisioned for the
// project. Individual MYSQL_*/DB_* variables are supported for local dev.
function parseDatabaseUrl(rawUrl) {
  if (!rawUrl) return null;
  try {
    const url = new URL(rawUrl);
    return {
      host: url.hostname,
      port: toInt(url.port || '3306', 3306),
      user: decodeURIComponent(url.username || ''),
      password: decodeURIComponent(url.password || ''),
      database: url.pathname.replace(/^\//, ''),
    };
  } catch {
    return null;
  }
}

const dbFromUrl = parseDatabaseUrl(optional('DATABASE_URL', ''));

export const env = {
  nodeEnv: optional('NODE_ENV', 'development'),
  port: toInt(optional('PORT', '3000'), 3000),
  publicAppUrl: optional('PUBLIC_APP_URL', ''),
  webOrigin: optional('WEB_ORIGIN', optional('PUBLIC_APP_URL', 'http://localhost:5178')),
  staticDir: optional('STATIC_DIR', '../public'),
  devBypassAuth: toBool(optional('DEV_BYPASS_AUTH', ''), false),
  devCoreUserId: optional('DEV_CORE_USER_ID', '00000000-0000-0000-0000-000000000001'),
  mysql: dbFromUrl || {
    host: optional('MYSQL_HOST', optional('DB_HOST', 'localhost')),
    port: toInt(optional('MYSQL_PORT', optional('DB_PORT', '3306')), 3306),
    user: optional('MYSQL_USER', optional('DB_USER', 'root')),
    password: optional('MYSQL_PASSWORD', optional('DB_PASSWORD', '')),
    database: optional('MYSQL_DATABASE', optional('DB_NAME', 'due')),
  },
  hasDatabaseConfig: Boolean(dbFromUrl || optional('MYSQL_HOST', optional('DB_HOST', ''))),
  core: {
    // Dailey Core self-serve auth. Enable it for your project with the
    // dailey_auth_enable tool, then set DAILEY_APP_ID to your project slug.
    authUrl: optional('CORE_AUTH_URL', optional('DAILEY_AUTH_URL', 'https://core.dailey.cloud')).replace(/\/$/, ''),
    publicUrl: optional('CORE_PUBLIC_URL', '').replace(/\/$/, ''),
    appSlug: optional('CORE_APP_SLUG', optional('DAILEY_APP_ID', '')),
    appName: optional('CORE_APP_NAME', 'Dailey Due'),
    expectedAppId: optional('CORE_EXPECTED_APP_ID', optional('DAILEY_CORE_APP_UUID', '')),
  },
  storage: {
    type: optional('STORAGE_TYPE', 's3'),
    prefix: optional('STORAGE_PREFIX', 'due').replace(/^\/+|\/+$/g, ''),
    s3: {
      endpoint: optional('S3_ENDPOINT', ''),
      region: optional('S3_REGION', 'auto'),
      bucket: optional('S3_BUCKET_NAME', optional('S3_BUCKET', '')),
      accessKeyId: optional('S3_ACCESS_KEY_ID', ''),
      secretAccessKey: optional('S3_SECRET_ACCESS_KEY', ''),
      forcePathStyle: toBool(optional('S3_FORCE_PATH_STYLE', ''), true),
    },
    get enabled() {
      return Boolean(this.s3.endpoint && this.s3.bucket);
    },
  },
};

if (env.nodeEnv === 'production' && env.devBypassAuth) {
  throw new Error('DEV_BYPASS_AUTH must not be enabled in production');
}
