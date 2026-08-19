import express from 'express';
import { env } from '../config/env.js';
import { internalAuth } from '../middleware/internalAuth.js';
import { authRouter } from './auth.js';
import { membersRouter } from './members.js';
import { projectsRouter } from './projects.js';
import { tasksRouter } from './tasks.js';
import { workRouter } from './work.js';

export function registerRoutes(app) {
  const api = express.Router();

  api.use('/v1', authRouter(env.core.appSlug));

  const internal = express.Router();
  internal.use(internalAuth);
  internal.use(membersRouter());
  internal.use(projectsRouter());
  internal.use(tasksRouter());
  internal.use(workRouter());

  api.use('/v1', internal);

  app.use('/api', api);
}
