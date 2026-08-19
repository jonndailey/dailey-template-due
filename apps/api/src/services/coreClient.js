import { env } from '../config/env.js';

async function readBody(response) {
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    try {
      return await response.json();
    } catch {
      return null;
    }
  }

  try {
    return await response.text();
  } catch {
    return null;
  }
}

export async function coreFetch(path, { method = 'GET', token = null, json = undefined, headers = {} } = {}) {
  const url = new URL(path, env.core.authUrl);
  const finalHeaders = {
    'x-application': env.core.appSlug,
    'x-client-id': env.core.appSlug,
    'x-app-name': env.core.appName,
    ...headers,
  };

  if (token) {
    finalHeaders.authorization = `Bearer ${token}`;
  }

  let body;
  if (json !== undefined) {
    finalHeaders['content-type'] = 'application/json';
    body = JSON.stringify(json);
  }

  const response = await fetch(url, { method, headers: finalHeaders, body });
  const data = await readBody(response);
  if (!response.ok) {
    const error = new Error(`Core HTTP ${response.status}`);
    error.statusCode = response.status;
    error.data = data;
    throw error;
  }
  return data;
}

export function isMissingEndpointError(error) {
  return Number(error?.statusCode || 0) === 404;
}

export function extractCoreUserId(payload) {
  return (
    payload?.user?.id ||
    payload?.user?.user_id ||
    payload?.token_info?.sub ||
    payload?.sub ||
    null
  );
}

export function extractCoreTenantId(payload) {
  return (
    payload?.token_info?.tenant ||
    payload?.token_info?.tenant_id ||
    payload?.user?.tenant_id ||
    payload?.tenant_id ||
    null
  );
}
