# Stage 1: Build stage
FROM node:20-alpine AS builder

# Install pnpm globally
RUN npm install -g pnpm

WORKDIR /app

# Copy lockfile and workspace files
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json tsconfig.base.json tsconfig.json ./

# Copy all packages configuration
COPY lib/db/package.json ./lib/db/
COPY lib/api-spec/package.json ./lib/api-spec/
COPY lib/api-zod/package.json ./lib/api-zod/
COPY lib/api-client-react/package.json ./lib/api-client-react/
COPY artifacts/api-server/package.json ./artifacts/api-server/
COPY artifacts/sweet-tooth/package.json ./artifacts/sweet-tooth/

# Install dependencies (only for building libs/api)
RUN pnpm install --frozen-lockfile

# Copy codebase
COPY lib/ ./lib/
COPY artifacts/api-server/ ./artifacts/api-server/

# Build core libraries
RUN npx tsc -p ./lib/db/tsconfig.json
RUN npx tsc -p ./lib/api-client-react/tsconfig.json

# Build Express API Server
WORKDIR /app/artifacts/api-server
RUN pnpm run build

# Stage 2: Runner stage
FROM node:20-alpine AS runner

WORKDIR /app

# Expose server port (Cloud Run sets PORT env dynamically, but defaults to 8080)
EXPOSE 8080
ENV PORT=8080
ENV NODE_ENV=production

# Copy built outputs and dependencies
COPY --from=builder /app/pnpm-lock.yaml /app/package.json /app/pnpm-workspace.yaml ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/lib/db/package.json ./lib/db/
COPY --from=builder /app/lib/db/dist ./lib/db/dist
COPY --from=builder /app/lib/api-zod ./lib/api-zod
COPY --from=builder /app/lib/api-client-react ./lib/api-client-react
COPY --from=builder /app/artifacts/api-server/package.json ./artifacts/api-server/
COPY --from=builder /app/artifacts/api-server/dist ./artifacts/api-server/dist

WORKDIR /app/artifacts/api-server

CMD ["node", "--enable-source-maps", "./dist/index.mjs"]
