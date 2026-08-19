import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  apiFetch,
  AUTH_STORAGE_EVENT,
  clearSession,
  readStored,
  storeSession,
} from '../api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const initial = readStored();
  const [accessToken, setAccessToken] = useState(initial.accessToken);
  const [refreshToken, setRefreshToken] = useState(initial.refreshToken);
  const [workspaceId, setWorkspaceId] = useState(initial.workspaceId);
  const [user, setUser] = useState(null);
  const [workspaces, setWorkspaces] = useState([]);
  const [loading, setLoading] = useState(true);

  async function applySession(payload) {
    const nextAccessToken = payload?.access_token || accessToken;
    const nextRefreshToken = payload?.refresh_token ?? refreshToken;
    const nextWorkspaceId = payload?.selected_workspace_id ? String(payload.selected_workspace_id) : workspaceId;
    if (nextAccessToken) {
      storeSession({
        accessToken: nextAccessToken,
        refreshToken: nextRefreshToken,
        workspaceId: nextWorkspaceId,
      }, payload);
      setAccessToken(nextAccessToken);
      setRefreshToken(nextRefreshToken);
    }
    setWorkspaceId(nextWorkspaceId || '');
    setUser(payload?.user || null);
    setWorkspaces(payload?.workspaces || []);
  }

  async function refreshMe(activeToken = accessToken) {
    if (!activeToken) {
      setLoading(false);
      return;
    }

    try {
      const me = await apiFetch('/auth/me', { token: activeToken });
      setUser(me.user || null);
      setWorkspaces(me.workspaces || []);
      const selected = me.selected_workspace_id ? String(me.selected_workspace_id) : '';
      if (selected) {
        storeSession({ workspaceId: selected }, me);
        setWorkspaceId(selected);
      }
    } catch (error) {
      if (refreshToken) {
        try {
          const refreshed = await apiFetch('/auth/refresh', {
            method: 'POST',
            json: { refresh_token: refreshToken },
          });
          await applySession(refreshed);
        } catch {
          clearSession();
          setAccessToken('');
          setRefreshToken('');
          setWorkspaceId('');
          setUser(null);
          setWorkspaces([]);
        }
      } else {
        clearSession();
        setAccessToken('');
        setRefreshToken('');
        setWorkspaceId('');
        setUser(null);
        setWorkspaces([]);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refreshMe(initial.accessToken);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    function handleStorageChange(event) {
      const stored = event?.detail?.stored || readStored();
      setAccessToken(stored.accessToken || '');
      setRefreshToken(stored.refreshToken || '');
      setWorkspaceId(stored.workspaceId || '');

      if (event?.detail?.type === 'cleared') {
        setUser(null);
        setWorkspaces([]);
        return;
      }

      const payload = event?.detail?.payload;
      if (payload?.user !== undefined) {
        setUser(payload.user || null);
      }
      if (Array.isArray(payload?.workspaces)) {
        setWorkspaces(payload.workspaces);
      }
    }

    window.addEventListener(AUTH_STORAGE_EVENT, handleStorageChange);
    return () => window.removeEventListener(AUTH_STORAGE_EVENT, handleStorageChange);
  }, []);

  async function login({ email, password }) {
    const payload = await apiFetch('/auth/login', {
      method: 'POST',
      json: { email, password },
    });
    if (payload?.mfa_required) return payload;
    await applySession(payload);
    window.scrollTo(0, 0);
    return payload;
  }

  async function submitMfa({ challenge_token, challenge_id, code, backup_code }) {
    const payload = await apiFetch('/auth/mfa/challenge', {
      method: 'POST',
      json: { challenge_token, challenge_id, code, backup_code },
    });
    await applySession(payload);
    return payload;
  }

  async function switchWorkspace(nextWorkspaceId) {
    const payload = await apiFetch('/auth/switch-tenant', {
      method: 'POST',
      token: accessToken,
      json: { workspace_id: Number(nextWorkspaceId) },
    });
    await applySession(payload);
    return payload;
  }

  async function logout() {
    try {
      await apiFetch('/auth/logout', { method: 'POST', token: accessToken });
    } catch {
      // ignore
    }
    clearSession();
    setAccessToken('');
    setRefreshToken('');
    setWorkspaceId('');
    setUser(null);
    setWorkspaces([]);
  }

  const value = useMemo(
    () => ({
      loading,
      isAuthenticated: Boolean(accessToken),
      accessToken,
      refreshToken,
      user,
      workspaces,
      workspaceId,
      setWorkspaceId,
      login,
      submitMfa,
      switchWorkspace,
      refreshMe,
      logout,
    }),
    [loading, accessToken, refreshToken, user, workspaces, workspaceId],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
