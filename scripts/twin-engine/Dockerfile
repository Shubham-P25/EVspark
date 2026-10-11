FROM node:22-alpine

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@11.2.2 --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/shared ./packages/shared
COPY apps/api/package.json ./apps/api/package.json
COPY apps/api/prisma ./apps/api/prisma
COPY scripts/twin-engine ./scripts/twin-engine

RUN pnpm --filter @evspark/shared --filter twin-engine install --frozen-lockfile
RUN pnpm --filter api run prisma:generate

WORKDIR /app/scripts/twin-engine

CMD ["pnpm", "start"]
