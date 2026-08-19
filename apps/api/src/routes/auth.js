import express from 'express';
import { z } from 'zod';
import { withTx } from '../db/pool.js';
import { coreFetch, extractCoreTenantId, extractCoreUserId, isMissingEndpointError } from '../services/coreClient.js';
import { syncWorkspacesFromCoreTenants } from '../services/workspaceBootstrapService.js';

const loginSchema = z.object({
  email: z.string().email().max(320),
  password: z.string().min(1).max(2048),
  tenant_slug: z.string().max(100).optional(),
});

const refreshSchema = z.object({
  refresh_token: z.string().min(1),
});

const mfaSchema = z.object({
  challenge_token: z.string().min(1),
  challenge_id: z.union([z.string(), z.number()]),
  code: z.string().optional(),
  backup_code: z.string().optional(),
});

const switchSchema = z.object({
  tenant_id: z.string().uuid().optional(),
  workspace_id: z.number().int().positive().optional(),
});

async function bootstrapAndSync(accessToken, loginPayload, appSlug) {
  let bootstrap = null;
  try {
    bootstrap = await coreFetch(`/apps/${appSlug}/bootstrap`, {
      method: 'POST',
      token: accessToken,
      json: {},
    });
  } catch (error) {
    if (!isMissingEndpointError(error)) throw error;
  }

  const selectedAccessToken = bootstrap?.selected_access_token || accessToken;
  const selectedRefreshToken = bootstrap?.refresh_token || loginPayload.refresh_token || null;
  const coreMe = await coreFetch('/auth/me', { token: selectedAccessToken });
  const coreUserId = extractCoreUserId(coreMe);
  const currentTenantId = extractCoreTenantId(coreMe);

  const workspaces = await withTx(async (conn) =>
    syncWorkspacesFromCoreTenants(conn, {
      coreUserId,
      userEmail: coreMe?.user?.email || null,
      userName: coreMe?.user?.name || null,
      tenants: bootstrap?.tenants || loginPayload?.tenants || coreMe?.tenants || [],
    }),
  );

  const selectedWorkspace = currentTenantId
    ? workspaces.find((workspace) => String(workspace.core_tenant_id) === String(currentTenantId))
    : workspaces[0] || null;

  return {
    access_token: selectedAccessToken,
    refresh_token: selectedRefreshToken,
    expires_in: loginPayload?.expires_in || null,
    user: coreMe?.user || null,
    token_info: coreMe?.token_info || null,
    workspaces,
    selected_workspace_id: selectedWorkspace?.workspace_id || null,
    needs_tenant_selection: Boolean(bootstrap?.needs_tenant_selection),
  };
}

function extractBearerToken(req) {
  const auth = req.get('authorization') || '';
  if (!auth.toLowerCase().startsWith('bearer ')) return null;
  return auth.slice(7);
}

export function authRouter(appSlug) {
  const router = express.Router();

  router.post('/auth/login', async (req, res, next) => {
    try {
      const parsed = loginSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: 'Invalid body', issues: parsed.error.issues });
      }

      const coreLogin = await coreFetch('/auth/login', {
        method: 'POST',
        json: {
          ...parsed.data,
          app_slug: appSlug,
        },
        headers: {
          'x-client-id': appSlug,
        },
      });

      if (coreLogin?.mfa_required) {
        return res.json(coreLogin);
      }

      if (!coreLogin?.access_token) {
        return res.status(502).json({ error: 'Core login missing access_token' });
      }

      return res.json(await bootstrapAndSync(coreLogin.access_token, coreLogin, appSlug));
    } catch (error) {
      return next(error);
    }
  });

  router.post('/auth/mfa/challenge', async (req, res, next) => {
    try {
      const parsed = mfaSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: 'Invalid body', issues: parsed.error.issues });
      }

      const response = await coreFetch('/auth/mfa/challenge', {
        method: 'POST',
        json: {
          token: parsed.data.challenge_token,
          challenge_id: parsed.data.challenge_id,
          code: parsed.data.code,
          backup_code: parsed.data.backup_code,
          app_slug: appSlug,
        },
      });

      if (!response?.access_token) {
        return res.status(502).json({ error: 'Core MFA missing access_token' });
      }

      return res.json(await bootstrapAndSync(response.access_token, response, appSlug));
    } catch (error) {
      return next(error);
    }
  });

  router.post('/auth/refresh', async (req, res, next) => {
    try {
      const parsed = refreshSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: 'Invalid body', issues: parsed.error.issues });
      }

      const response = await coreFetch('/auth/refresh', {
        method: 'POST',
        json: { refresh_token: parsed.data.refresh_token },
      });

      if (!response?.access_token) {
        return res.status(502).json({ error: 'Core refresh missing access_token' });
      }

      return res.json(await bootstrapAndSync(response.access_token, response, appSlug));
    } catch (error) {
      return next(error);
    }
  });

  router.get('/auth/me', async (req, res, next) => {
    try {
      const token = extractBearerToken(req);
      if (!token) return res.status(401).json({ error: 'Missing bearer token' });

      const coreMe = await coreFetch('/auth/me', { token });
      const coreUserId = extractCoreUserId(coreMe);
      const workspaces = await withTx(async (conn) =>
        syncWorkspacesFromCoreTenants(conn, {
          coreUserId,
          userEmail: coreMe?.user?.email || null,
          userName: coreMe?.user?.name || null,
          tenants: coreMe?.tenants || [],
        }),
      );

      const selectedTenantId = extractCoreTenantId(coreMe);
      const selectedWorkspace = selectedTenantId
        ? workspaces.find((workspace) => String(workspace.core_tenant_id) === String(selectedTenantId))
        : workspaces[0] || null;

      return res.json({
        user: coreMe?.user || null,
        token_info: coreMe?.token_info || null,
        workspaces,
        selected_workspace_id: selectedWorkspace?.workspace_id || null,
      });
    } catch (error) {
      return next(error);
    }
  });

  router.post('/auth/switch-tenant', async (req, res, next) => {
    try {
      const token = extractBearerToken(req);
      if (!token) return res.status(401).json({ error: 'Missing bearer token' });

      const parsed = switchSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: 'Invalid body', issues: parsed.error.issues });
      }

      let tenantId = parsed.data.tenant_id || null;
      if (!tenantId && parsed.data.workspace_id) {
        const [rows] = await withTx((conn) =>
          conn.query('SELECT core_tenant_id FROM workspaces WHERE id = ? LIMIT 1', [parsed.data.workspace_id]),
        );
        tenantId = rows[0]?.core_tenant_id || null;
      }

      if (!tenantId) {
        return res.status(400).json({ error: 'Missing tenant_id or workspace_id' });
      }

      const response = await coreFetch('/auth/switch-tenant', {
        method: 'POST',
        token,
        json: { tenant_id: tenantId },
      });

      if (!response?.access_token) {
        return res.status(502).json({ error: 'Core switch-tenant missing access_token' });
      }

      return res.json(await bootstrapAndSync(response.access_token, response, appSlug));
    } catch (error) {
      return next(error);
    }
  });

  router.post('/auth/register', async (req, res, next) => {
    try {
      const registerSchema = z.object({
        email: z.string().email().max(320),
        password: z.string().min(8).max(2048),
        name: z.string().min(2).max(200),
      });
      const parsed = registerSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: 'Invalid body', issues: parsed.error.issues });
      }

      const coreRegister = await coreFetch('/auth/register', {
        method: 'POST',
        json: {
          ...parsed.data,
          app_slug: appSlug,
        },
        headers: {
          'x-client-id': appSlug,
        },
      });

      if (!coreRegister?.access_token) {
        return res.status(502).json({ error: coreRegister?.error || 'Registration failed' });
      }

      return res.json(await bootstrapAndSync(coreRegister.access_token, coreRegister, appSlug));
    } catch (error) {
      return next(error);
    }
  });

  router.post('/auth/logout', async (req, res, next) => {
    try {
      const token = extractBearerToken(req);
      if (token) {
        try {
          await coreFetch('/auth/logout', { method: 'POST', token });
        } catch {
          // best-effort only
        }
      }
      return res.json({ ok: true });
    } catch (error) {
      return next(error);
    }
  });

  return router;
}
