const API_ROOT = '/api/v1';
const ACCESS_TOKEN_KEY = 'da_access_token';
const REFRESH_TOKEN_KEY = 'da_refresh_token';
const WORKSPACE_ID_KEY = 'da_workspace_id';
export const AUTH_STORAGE_EVENT = 'dailey-auth:storage';

let refreshPromise = null;

function dispatchAuthChange(detail = {}) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(AUTH_STORAGE_EVENT, { detail }));
}

export function readStored() {
  return {
    accessToken: sessionStorage.getItem(ACCESS_TOKEN_KEY) || '',
    refreshToken: sessionStorage.getItem(REFRESH_TOKEN_KEY) || '',
    workspaceId: localStorage.getItem(WORKSPACE_ID_KEY) || '',
  };
}

export function storeSession({
  accessToken,
  refreshToken,
  workspaceId,
}, payload = null) {
  if (accessToken !== undefined) {
    if (accessToken) {
      sessionStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
    } else {
      sessionStorage.removeItem(ACCESS_TOKEN_KEY);
    }
  }

  if (refreshToken !== undefined) {
    if (refreshToken) {
      sessionStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    } else {
      sessionStorage.removeItem(REFRESH_TOKEN_KEY);
    }
  }

  if (workspaceId !== undefined) {
    if (workspaceId) {
      localStorage.setItem(WORKSPACE_ID_KEY, String(workspaceId));
    } else {
      localStorage.removeItem(WORKSPACE_ID_KEY);
    }
  }

  dispatchAuthChange({
    type: 'session',
    payload,
    stored: readStored(),
  });
}

export function clearSession(detail = {}) {
  sessionStorage.removeItem(ACCESS_TOKEN_KEY);
  sessionStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(WORKSPACE_ID_KEY);
  dispatchAuthChange({
    type: 'cleared',
    ...detail,
    stored: readStored(),
  });
}

async function readPayload(response) {
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    return response.json();
  }
  return response.text();
}

function buildError(response, payload) {
  const error = new Error(payload?.error || payload?.detail || `HTTP ${response.status}`);
  error.status = response.status;
  error.payload = payload;
  return error;
}

function canRefresh(path, status, retried) {
  if (retried || status !== 401) return false;
  return !path.startsWith('/auth/login')
    && !path.startsWith('/auth/mfa/challenge')
    && !path.startsWith('/auth/refresh')
    && !path.startsWith('/auth/logout');
}

async function refreshSession() {
  const stored = readStored();
  if (!stored.refreshToken) {
    const error = new Error('Session expired. Please sign in again.');
    error.status = 401;
    error.authExpired = true;
    throw error;
  }

  if (!refreshPromise) {
    refreshPromise = (async () => {
      const response = await fetch(`${API_ROOT}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: stored.refreshToken }),
        credentials: 'include',
      });

      const payload = await readPayload(response);
      if (!response.ok) {
        throw buildError(response, payload);
      }

      storeSession({
        accessToken: payload?.access_token || '',
        refreshToken: payload?.refresh_token ?? stored.refreshToken,
        workspaceId: payload?.selected_workspace_id
          ? String(payload.selected_workspace_id)
          : stored.workspaceId,
      }, payload);

      return payload;
    })().finally(() => {
      refreshPromise = null;
    });
  }

  return refreshPromise;
}

export async function apiFetch(path, {
  method = 'GET',
  json,
  token,
  workspaceId,
  formData,
  keepalive = false,
  retried = false,
} = {}) {
  const stored = readStored();
  const headers = {};
  const authToken = token ?? stored.accessToken;
  const activeWorkspaceId = workspaceId ?? stored.workspaceId;

  if (authToken) headers.Authorization = `Bearer ${authToken}`;
  if (activeWorkspaceId) headers['x-workspace-id'] = activeWorkspaceId;

  let body;
  if (formData) {
    body = formData;
  } else if (json !== undefined) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(json);
  }

  const response = await fetch(`${API_ROOT}${path}`, {
    method,
    headers,
    body,
    credentials: 'include',
    keepalive,
  });

  const payload = await readPayload(response);

  if (!response.ok) {
    if (canRefresh(path, response.status, retried)) {
      try {
        const refreshed = await refreshSession();
        return apiFetch(path, {
          method,
          json,
          token: refreshed?.access_token || readStored().accessToken,
          workspaceId: refreshed?.selected_workspace_id
            ? String(refreshed.selected_workspace_id)
            : activeWorkspaceId,
          formData,
          keepalive,
          retried: true,
        });
      } catch (refreshError) {
        clearSession({ reason: 'refresh-failed' });
        const error = buildError(response, payload);
        error.authExpired = true;
        error.refreshError = refreshError;
        throw error;
      }
    }

    throw buildError(response, payload);
  }

  return payload;
}

export async function downloadFile(path) {
  const stored = readStored();
  const headers = {};
  if (stored.accessToken) headers.Authorization = `Bearer ${stored.accessToken}`;
  if (stored.workspaceId) headers['x-workspace-id'] = stored.workspaceId;

  const response = await fetch(`${API_ROOT}${path}`, {
    method: 'GET',
    headers,
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error(`Download failed (${response.status})`);
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.target = '_blank';
  link.rel = 'noreferrer';
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
