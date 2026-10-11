# EVspark — Production Deployment Guide

This guide provides end-to-end instructions for deploying all components of the EVspark platform to production using enterprise cloud providers: **Neon** (PostGIS Postgres), **Upstash** (Redis), **Render/Railway** (Express API & FastAPI ML), **Vercel** (Next.js Frontend), and **Cloudflare** (CDN, DNS, and R2 Object Storage).

---

## 1. Neon Database (PostgreSQL 16 + PostGIS)

### 1.1 Provisioning & PostGIS Extension
1. Log in to the [Neon Console](https://console.neon.tech/) and create a project named `evspark-prod`.
2. Connect to the database via SQL Console or `psql` and enable PostGIS:
   ```sql
   CREATE EXTENSION IF NOT EXISTS postgis;
   SELECT postgis_full_version();
   ```
3. Create separate branches:
   - `main`: Production database with point-in-time recovery (PITR).
   - `dev`: Staging/ephemeral test branch for running schema migrations before merging.

### 1.2 Connection Strings
Neon provides two types of endpoints:
- **Pooled Connection (`DATABASE_URL`)**:
  Used by the API runtime for high-throughput short queries.
  `postgresql://evspark_user:password@ep-xyz-pooler.us-east-2.aws.neon.tech/evspark?sslmode=require`
- **Direct Connection (`DIRECT_URL`)**:
  Used by Prisma during migrations (`prisma migrate deploy`) because connection poolers do not support advisory locks.
  `postgresql://evspark_user:password@ep-xyz.us-east-2.aws.neon.tech/evspark?sslmode=require`

---

## 2. Upstash Redis (Serverless Caching & PubSub)

1. Navigate to [Upstash Console](https://console.upstash.com/) and create a Redis database named `evspark-cache` in the nearest region (e.g. AWS `ap-south-1` or `us-east-1`).
2. Copy the credentials:
   - `UPSTASH_REDIS_REST_URL`: `https://your-upstash-redis.upstash.io`
   - `UPSTASH_REDIS_REST_TOKEN`: `AXXXXXXXXX...`
3. **Free Quota & Driver Configuration**:
   - Free tier includes 10,000 commands/day.
   - To avoid burning Redis quota with continuous job polling, set `QUEUE_DRIVER=cron` in production. EVspark uses scheduled cron ticks (`pnpm --filter api job hourlyRollup`) rather than continuous Redis polling loops.

---

## 3. Express API Backend (Render / Railway)

### 3.1 Service Configuration
- **Environment**: Node.js (Version `>=22`)
- **Root Directory**: `apps/api`
- **Build Command**:
  ```bash
  pnpm install --frozen-lockfile && pnpm --filter @evspark/shared build && pnpm --filter api build
  ```
- **Start Command**:
  ```bash
  node dist/index.js
  ```
- **Health Check Path**: `/readyz` (returns 200 when both Neon DB and Upstash Redis are reachable, 503 when degraded).

### 3.2 Key Runtime Environment Variables
```env
NODE_ENV=production
PORT=4000
TRUST_PROXY=1
DATABASE_URL=postgresql://user:pass@ep-xyz-pooler.neon.tech/evspark?sslmode=require
DIRECT_URL=postgresql://user:pass@ep-xyz.neon.tech/evspark?sslmode=require
UPSTASH_REDIS_REST_URL=https://...
UPSTASH_REDIS_REST_TOKEN=...
JWT_SECRET=super-secure-production-jwt-secret-min-256-bits
CORS_ORIGIN=https://evspark.in,https://admin.evspark.in
ML_SERVICE_URL=http://evspark-ml:8000
ENABLE_MQTT=false
```

> **Important**: `TRUST_PROXY=1` is mandatory behind Render, Railway, or Cloudflare reverse proxies to ensure client IP extraction for rate limiting (`express-rate-limit`) and TLS header validation.

---

## 4. FastAPI ML Service (Fly.io / Render / Docker Container)

### 4.1 Deployment
- **Docker Image**: Build using `apps/ml-service/Dockerfile`.
- **Runtime Command**:
  ```bash
  uvicorn main:app --host 0.0.0.0 --port 8000 --workers 2
  ```
- **Health Check Path**: `/health`

### 4.2 ML Model Weights
- The service loads `models/wait_time_model.joblib`.
- If `MODEL_URL` is set to an R2 presigned URL or public CDN URL, the container downloads the latest model weights on boot before accepting traffic.
- If no model artifact is present, the service automatically falls back to the physics heuristic curve and honestly reports `model_version: "fallback-curve-v1"`.

---

## 5. Web Frontend (Vercel)

1. Connect the GitHub repository to [Vercel](https://vercel.com/).
2. Select **Root Directory**: `apps/web`.
3. Framework Preset: **Next.js**.
4. Configure Environment Variables:
   ```env
   NEXT_PUBLIC_API_URL=https://api.evspark.in
   NEXT_PUBLIC_WS_URL=wss://api.evspark.in
   NEXT_PUBLIC_GOOGLE_MAPS_KEY=AIzaSy...
   ```
5. Deploy. Vercel automatically runs `next build` with ISR and static asset caching.

---

## 6. Cloudflare (CDN, DNS & Reverse Proxy)

### 6.1 DNS & Security
- Add an `A` or `CNAME` record pointing `api.evspark.in` to your Render/Railway origin.
- Set proxy status to **Proxied (Orange Cloud)**.
- Set SSL/TLS encryption mode to **Full (Strict)**.
- Under **Network Settings**, ensure **WebSockets** is toggled **ON**.

### 6.2 Edge Caching Rules
Create a Cloudflare Page Rule or Cache Rule for station queries:
- **URL Pattern**: `api.evspark.in/api/stations*`
- **Cache Level**: Cache Everything
- **Edge Cache TTL**: Respect Origin Cache-Control header (`public, s-maxage=15, stale-while-revalidate=30`).
- This protects the database and Redis cache from sudden traffic spikes during major commute hours.

---

## 7. Cloudflare R2 Storage (Models & Assets)

1. In Cloudflare, create an R2 bucket named `evspark-assets`.
2. Connect a custom domain: `cdn.evspark.in`.
3. Upload public media:
   - Hero video and walkthrough animations
   - Station operator QR code badge vectors
   - Nightly database backup dumps (`backups/`)
   - Versioned ML model artifacts (`models/v1.0.0/wait_time_model.joblib`)

---

## 8. Sentry & Uptime Monitoring

### 8.1 Sentry Projects
Create three distinct projects in [Sentry.io](https://sentry.io/):
1. `evspark-api` (Node/Express): Captures unhandled HTTP exceptions and database query timeouts.
2. `evspark-web` (Next.js): Captures client-side React hydration errors and map loader failures.
3. `evspark-ml` (Python/FastAPI): Tracks inference anomalies and model latency.

### 8.2 Synthetic Uptime Checks
Configure [UptimeRobot](https://uptimerobot.com/) or BetterStack:
- **API Health**: `GET https://api.evspark.in/readyz` every 5 minutes.
- **Web Ping**: `GET https://evspark.in` every 5 minutes.
- **Alert Channel**: PagerDuty, Slack, or webhook notifications.

---

## 9. GitHub Secrets for CI/CD

Configure the following repository secrets under **Settings > Secrets and variables > Actions**:

| Secret Key | Description |
|---|---|
| `DATABASE_URL` | Neon pooled Postgres connection string |
| `DIRECT_URL` | Neon direct connection string for migrations |
| `UPSTASH_REDIS_REST_URL` | Upstash Redis REST endpoint |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash Redis authentication token |
| `JWT_SECRET` | 256-bit JWT signing key |
| `RENDER_API_KEY` | Render deployment webhook / API key |
| `VERCEL_TOKEN` | Vercel CLI deployment token |
| `R2_ACCESS_KEY_ID` | Cloudflare R2 S3-compatible Access Key ID |
| `R2_SECRET_ACCESS_KEY`| Cloudflare R2 S3-compatible Secret Key |
| `R2_BUCKET_NAME` | Name of the backup storage bucket |

---

## 10. Automated Nightly Database Backup Workflow

Create `.github/workflows/nightly-backup.yml` to automatically dump PostGIS data to Cloudflare R2:

```yaml
name: Nightly Database Backup to R2

on:
  schedule:
    - cron: '0 2 * * *' # Every night at 02:00 UTC
  workflow_dispatch:

jobs:
  backup:
    runs-on: ubuntu-latest
    steps:
      - name: Install PostgreSQL Tools
        run: sudo apt-get install -y postgresql-client awscli

      - name: Execute pg_dump
        env:
          DATABASE_URL: ${{ secrets.DIRECT_URL }}
        run: |
          TIMESTAMP=$(date +%Y%m%d_%H%M%S)
          pg_dump "$DATABASE_URL" -Fc -f "evspark_backup_${TIMESTAMP}.dump"
          echo "BACKUP_FILE=evspark_backup_${TIMESTAMP}.dump" >> $GITHUB_ENV

      - name: Upload Dump to Cloudflare R2
        env:
          AWS_ACCESS_KEY_ID: ${{ secrets.R2_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.R2_SECRET_ACCESS_KEY }}
          AWS_ENDPOINT_URL: https://${{ secrets.CLOUDFLARE_ACCOUNT_ID }}.r2.cloudflarestorage.com
        run: |
          aws s3 cp "${BACKUP_FILE}" "s3://${{ secrets.R2_BUCKET_NAME }}/backups/${BACKUP_FILE}" --endpoint-url "$AWS_ENDPOINT_URL"
```

---

## 11. Rollback & Disaster Recovery Procedures

1. **Frontend Rollback**:
   - In Vercel Dashboard, select **Deployments**, locate the last verified stable deployment, and click **Promote to Production** (instant zero-downtime rollback).
2. **Backend Rollback**:
   - In Render/Railway, click **Rollback to previous release** or re-deploy the previous Git SHA.
3. **Database Schema Rollback**:
   - If a migration fails, connect via `DIRECT_URL` and run:
     ```bash
     pnpm --filter api exec prisma migrate resolve --rolled-back <migration_name>
     ```
   - Restore the latest dump from Cloudflare R2 if data recovery is required:
     ```bash
     pg_restore -d "$DIRECT_URL" --clean --no-owner "evspark_backup_<timestamp>.dump"
     ```
