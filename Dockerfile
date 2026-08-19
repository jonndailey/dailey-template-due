# Dailey Due starter template. Single container: the Express API serves the
# built React app and binds to the PORT Dailey OS provides.

FROM node:20-alpine AS webbuild
WORKDIR /app
COPY package*.json ./
COPY apps/web/package*.json apps/web/
RUN npm ci --workspace=apps/web
COPY apps/web/ apps/web/
RUN npm -w apps/web run build

FROM node:20-alpine AS apideps
WORKDIR /app
COPY package*.json ./
COPY apps/api/package*.json apps/api/
RUN npm ci --workspace=apps/api --omit=dev

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
COPY --from=apideps /app/node_modules ./node_modules
COPY --from=apideps /app/package.json ./
COPY apps/api/ apps/api/
COPY --from=webbuild /app/apps/web/dist ./apps/api/public
ENV STATIC_DIR=/app/apps/api/public
RUN chown -R node:node /app
USER node
WORKDIR /app/apps/api
EXPOSE 3000
CMD ["node", "src/index.js"]
