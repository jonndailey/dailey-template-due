# Due: task manager starter for Dailey OS

Due is a keyboard-first to-do app you can deploy as your first Dailey OS project. It is a real, useful app, and it is also a working tour of the three core platform primitives:

- **Database**: tasks, projects, work sessions, and focus sprints live in your project's MySQL database. Migrations run automatically on boot.
- **Storage**: task attachments are uploaded to your project's storage bucket through the injected S3 variables.
- **Dailey Core auth**: you and your teammates sign in with your existing Dailey account. No separate user system to manage.

## Deploy on Dailey OS

1. Create a project from this template (or point a new project at this repo).
2. Enable a database for the project. The app picks up `DATABASE_URL` automatically and seeds a Getting Started project on your first sign-in.
3. Enable storage for the project to activate file attachments. The app reads the injected `S3_*` variables.
4. Enable Dailey Core auth for the project, then set `DAILEY_APP_ID` to the client id returned by the enable step (it matches your project slug). Sign in with your Dailey email and password, or register new end users right from the login screen.

The container serves everything on a single port: the React app at `/`, the API under `/api/v1`, and health checks at `/healthz`. The root path returns 200 even while the database is still provisioning, so first deploys pass their health probes.

## What is inside

- `apps/api`: Express API (Node 20, ES modules). MySQL via `mysql2`, attachments via `@aws-sdk/client-s3`, auth proxied server-side to Dailey Core with your project's client id.
- `apps/web`: React + Vite single page app. Vim-style navigation, Blitz focus sprints, projects, subtasks, notes, and a work log.
- `apps/api/migrations`: plain SQL migrations, applied in order and tracked in the database.
- `Dockerfile`: one multi-stage build that compiles the web app and serves it from the API container on `PORT`.

## Local development

```bash
cp .env.example .env   # fill in your local MySQL details
npm install
npm run db:migrate
npm run dev            # API on :3000, web dev server on :5178
```

Set `DEV_BYPASS_AUTH=true` in `.env` to work on the UI without a Core login. The server refuses this flag in production.

## How auth works

The browser never talks to Dailey Core directly. The API forwards login, registration, refresh, and profile calls to Core with the `X-Client-Id` header set to your `DAILEY_APP_ID`. Core verifies the user against the shared Dailey account pool and returns tokens scoped to this app. Each Core tenant becomes a workspace in Due, and new workspaces are seeded with a few demo tasks so the first load is never empty.

## Make it yours

This is a starting point, not a cage. The API routes in `apps/api/src/routes` and the single-file UI in `apps/web/src/App.jsx` are meant to be read and edited. Delete the demo tasks, rename the app, add your own tables with a new migration file, and redeploy.
