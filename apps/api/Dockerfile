FROM node:22-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

FROM base AS builder
WORKDIR /app
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json turbo.json ./
COPY packages/shared packages/shared
COPY apps/api apps/api

RUN pnpm install --frozen-lockfile
RUN cd apps/api && pnpm exec prisma generate
RUN cd apps/api && pnpm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=4000

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 evspark

COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/package.json ./apps/api/package.json
COPY --from=builder /app/apps/api/src/generated ./apps/api/src/generated
COPY --from=builder /app/packages/shared ./packages/shared
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/api/node_modules ./apps/api/node_modules

USER evspark
EXPOSE 4000

WORKDIR /app/apps/api
CMD ["node", "dist/index.js"]
