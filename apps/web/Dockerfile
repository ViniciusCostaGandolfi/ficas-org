# syntax=docker/dockerfile:1

# ---- Build stage: install all deps (incl. dev) and produce the SSR build ----
FROM node:22-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
# Install ALL deps: the `react-router` CLI and `typescript` live in devDependencies.
# --include=dev prevents a build-time NODE_ENV=production (injected by the host) from skipping them.
RUN npm ci --include=dev

COPY . .

# Baked into the client bundle at build time (browser-reachable URL).
ARG VITE_API_BASE_URL=http://localhost:8080
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

RUN npm run build

# ---- Runtime stage: production deps + server build only ----
FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY --from=build /app/build ./build

EXPOSE 3000
ENV PORT=3000
ENV HOST=0.0.0.0

CMD ["npm", "run", "start"]
