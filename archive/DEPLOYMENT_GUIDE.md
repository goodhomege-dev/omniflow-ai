# PRODUCTION DEPLOYMENT & INTEGRATION GUIDE
**Omnichannel AI Sales & Customer Support Platform**
*Deployment Manual & Pre-Launch Checklist | Version 3.0*

---

## 1. Pre-Launch Verification Checklist

Before taking the AI sales agent and dashboard live to real customers, complete every item in this checklist:

- [ ] **Placeholders Replaced**: Every `{{PLACEHOLDER}}` in `PROMPT_SYSTEM_EN.md` and `PROMPT_SYSTEM_KA.md` has been replaced with verified brand data (see `BUSINESS_CONFIG_TEMPLATE.md`).
- [ ] **Database Schema Migrated**: All 15 tables, constraints, enums, and indexes in `DATABASE_SCHEMA.sql` have been executed on the production PostgreSQL/Supabase database.
- [ ] **Secrets & Environment Variables**: Production values for all variables in `.env.example` are stored in a secure secret manager (e.g. AWS Secrets Manager, Supabase Vault, Doppler) — zero secrets in git repository.
- [ ] **Webhook Security Validated**:
  - Meta/Messenger HMAC-SHA256 signature verification active.
  - WhatsApp Cloud API signature verification active.
  - Telegram `X-Telegram-Bot-Api-Secret-Token` active.
- [ ] **Idempotency & Deduplication Tested**: Redis or PostgreSQL `idempotency_keys` verified to reject duplicate webhook deliveries.
- [ ] **Financial & Bank Verification Workflow Active**: Bank statement API or manual review queue operational; OCR is strictly extraction-only.
- [ ] **Order State Machine Enforced**: Invalid transitions blocked by server code.
- [ ] **Role-Based Access Control (RBAC) Verified**: Dashboard roles restricted with server-side authorization.
- [ ] **Error Monitoring & Alerts Configured**: Sentry/Datadog and Slack alerts connected for webhook failures and Dead Letter Queue (DLQ) alerts.
- [ ] **End-to-End Dry Run Completed**: Verified complete order flow from product question -> cart summary -> customer consent -> order creation on all 3 channels.

---

## 2. Platform-by-Platform Setup Instructions

### 2.1 Facebook Messenger Integration

1. **Meta Developer Portal**:
   - Go to [developers.facebook.com](https://developers.facebook.com) and create a **Business** type App.
   - Add the **Messenger** product to your App.
2. **Facebook Page Connection**:
   - Link your official business Facebook Page.
   - Under *Page Access Tokens*, generate a long-lived Page Access Token.
   - Copy to `.env` as `MESSENGER_PAGE_ACCESS_TOKEN`.
   - Copy your App Secret to `MESSENGER_APP_SECRET`.
3. **Configure Webhook**:
   - Set Callback URL: `https://api.yourdomain.com/api/webhooks/messenger`.
   - Set Verify Token: Any secure random string (matching `MESSENGER_VERIFY_TOKEN` in `.env`).
   - Click **Verify and Save**.
   - Under *Subscription Fields*, subscribe to: `messages`, `messaging_postbacks`, `message_deliveries`, `message_reads`.
4. **Permissions Review**:
   - For public users outside app testers, submit for Meta App Review: `pages_messaging`.

---

### 2.2 WhatsApp Business Cloud API Integration

1. **Meta Business Manager**:
   - Navigate to Meta Business Manager and set up a **WhatsApp Business Account (WABA)**.
2. **Phone Number Registration**:
   - Add your business phone number and verify via SMS or voice call OTP.
   - Note down the `Phone Number ID` and `WhatsApp Business Account ID`.
3. **Permanent Access Token**:
   - In Business Manager -> *System Users*, create an Admin system user.
   - Assign permissions to the WABA: `whatsapp_business_messaging`, `whatsapp_business_management`.
   - Generate a permanent token and copy to `WHATSAPP_ACCESS_TOKEN`.
4. **Configure Webhook**:
   - Webhook URL: `https://api.yourdomain.com/api/webhooks/whatsapp`.
   - Verify Token: Matches `WHATSAPP_VERIFY_TOKEN`.
   - Subscribe to the `messages` event field.

---

### 2.3 Telegram Bot Setup

1. **BotFather Configuration**:
   - Open Telegram and message `@BotFather`.
   - Send `/newbot` and follow prompts to set the bot name and username (e.g. `TechStoreSupportBot`).
   - Copy the HTTP API token to `.env` as `TELEGRAM_BOT_TOKEN`.
2. **Set Webhook**:
   - Generate a strong random string for `TELEGRAM_WEBHOOK_SECRET`.
   - Register your webhook URL using cURL or Postman:
     ```bash
     curl -F "url=https://api.yourdomain.com/api/webhooks/telegram" \
          -F "secret_token=YOUR_TELEGRAM_WEBHOOK_SECRET" \
          https://api.telegram.org/bot<YOUR_TELEGRAM_BOT_TOKEN>/setWebhook
     ```
   - Verify success response: `{"ok":true,"result":true,"description":"Webhook was set"}`.
3. **Privacy Settings**:
   - In `@BotFather`, run `/setprivacy` -> Enable (ensures bot only receives 1-on-1 private messages and direct mentions).

---

## 3. Database & Backend Deployment

### 3.1 PostgreSQL / Supabase Setup
1. Create a Supabase project or PostgreSQL 14+ database instance.
2. Open SQL Editor and execute `DATABASE_SCHEMA.sql`.
3. Verify that all 15 tables and triggers are active.
4. Set up Row Level Security (RLS) policies if calling Supabase directly from microservices.

### 3.2 Docker Deployment Example
Create a `Dockerfile` for the application:
```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app ./
EXPOSE 3000
CMD ["npm", "start"]
```

### 3.3 Process Management & Auto-Restart (PM2)
```bash
# Install PM2
npm install -g pm2

# Start application
pm2 start dist/server.js --name "omnichannel-ai" -i max

# Save configuration across server reboots
pm2 save
pm2 startup
```

---

## 4. Monitoring, Health Checks & Maintenance

1. **Liveness & Readiness Endpoints**:
   - `GET /health/liveness`: Returns HTTP 200 `{ "status": "UP" }`.
   - `GET /health/readiness`: Pings PostgreSQL database and Redis; returns HTTP 200 `{ "status": "READY", "db": true, "redis": true }`.
2. **Expired Reservation Cleaner Cron**:
   - Schedule a background worker every 5 minutes:
     ```sql
     UPDATE inventory_reservations 
     SET is_released = TRUE 
     WHERE expires_at < NOW() AND is_released = FALSE;
     ```
3. **Log Retention**:
   - Rotate application logs daily with `logrotate`.
   - Ship structured logs to OpenTelemetry / Datadog / Grafana Loki.
