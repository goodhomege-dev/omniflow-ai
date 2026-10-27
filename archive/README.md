# OmniFlow AI — Omnichannel AI Sales & Customer Support Platform
**English & ქართული გამოცემა | Version 3.0 — Enterprise Architecture & Admin Dashboard**

[![PostgreSQL](https://img.shields.io/badge/Database-PostgreSQL_14+-336791?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Supabase](https://img.shields.io/badge/Cloud-Supabase_Ready-3ECF8E?logo=supabase&logoColor=white)](https://supabase.com/)
[![Meta Messenger](https://img.shields.io/badge/Channel-Facebook_Messenger-0084FF?logo=messenger&logoColor=white)](https://developers.facebook.com/)
[![WhatsApp](https://img.shields.io/badge/Channel-WhatsApp_Cloud_API-25D366?logo=whatsapp&logoColor=white)](https://business.whatsapp.com/)
[![Telegram](https://img.shields.io/badge/Channel-Telegram_Bot_API-26A5E4?logo=telegram&logoColor=white)](https://core.telegram.org/bots)

---

## 🇬🇪 პროექტის მოკლე მიმოხილვა (Georgian Overview)
**OmniFlow AI** არის საწარმოო დონის (Enterprise-grade) ომნიარხული პლატფორმა, რომელიც აერთიანებს ელექტრონული კომერციის გაყიდვებსა და მომხმარებელთა მხარდაჭერას **Facebook Messenger-ზე, WhatsApp Business-სა და Telegram-ზე**.

სისტემა შექმნილია პრინციპით: **AI მოდელი არის ორკესტრატორი და არა სიმართლის წყარო**. ყველა ფასი, მარაგი, შეკვეთის სტატუსი და გადახდის ვერიფიკაცია კონტროლდება მკაცრი სერვერული ლოგიკითა და რელაციური მონაცემთა ბაზით (PostgreSQL).

---

## 🇬🇧 Project Architecture & Operating Philosophy
OmniFlow AI connects multi-channel customer communications to a single unified backend. The AI agent:
1. Answers questions accurately using live catalog queries (`LOOKUP_PRODUCT`, `CHECK_STOCK`).
2. Calculates totals authoritatively on the server (`CALCULATE_ORDER_TOTAL`) with exact shipping fees and taxes.
3. Validates phone numbers (e.g. Georgian `+995 5XX...`) and addresses strictly before order submission.
4. Prevents race conditions and stock overselling via PostgreSQL transactional locks (`inventory_reservations`).
5. Enforces fraud protection: **Receipt images and OCR are treated strictly as extraction aids, not proof of payment**. Payments are confirmed only via trusted bank webhooks or authorized finance review.
6. Returns an unbending, strictly validated JSON contract (`replyText`, `platform`, `intent`, `isOrderReady`, `isEscalate`, `missingFields`, `order`, `actions`).

---

## 📂 Repository Structure & Artifacts

| File | Language | Purpose & Contents |
|---|:---:|---|
| [**`PROMPT_SYSTEM_EN.md`**](file:///c:/Users/giorgi/Desktop/ავტომატური%20ჩათბოტი/PROMPT_SYSTEM_EN.md) | English | Master System Prompt (v3.0). System instructions, hierarchy, order workflow, JSON schema, and dashboard specs. |
| [**`PROMPT_SYSTEM_KA.md`**](file:///c:/Users/giorgi/Desktop/ავტომატური%20ჩათბოტი/PROMPT_SYSTEM_KA.md) | Georgian | ქართული ლოკალიზებული სისტემური პრომპტი (+995 ნომრები, TBC/BOG რეკვიზიტები, თბილისის/რეგიონული მიწოდება). |
| [**`BUSINESS_CONFIG_TEMPLATE.md`**](file:///c:/Users/giorgi/Desktop/ავტომატური%20ჩათბოტი/BUSINESS_CONFIG_TEMPLATE.md) | Bilingual | Configuration guide mapping every `{{PLACEHOLDER}}` with verified business examples. |
| [**`ARCHITECTURE.md`**](file:///c:/Users/giorgi/Desktop/ავტომატური%20ჩათბოტი/ARCHITECTURE.md) | English | Full technical architecture: Ingestion pipeline, Deduplication, Order State Machine, Concurrency control. |
| [**`DATABASE_SCHEMA.sql`**](file:///c:/Users/giorgi/Desktop/ავტომატური%20ჩათბოტი/DATABASE_SCHEMA.sql) | SQL | Complete runnable DDL for 15 production tables, enums, triggers, foreign keys, and indexes. |
| [**`DATABASE_SCHEMA.md`**](file:///c:/Users/giorgi/Desktop/ავტომატური%20ჩათბოტი/DATABASE_SCHEMA.md) | English | Database manual, Entity-Relationship (ER) diagram, data dictionary, and retention policies. |
| [**`API_CONTRACTS.md`**](file:///c:/Users/giorgi/Desktop/ავტომატური%20ჩათბოტი/API_CONTRACTS.md) | English | Webhook contracts (FB/WA/TG), JSON schema validator, Backend Tool contracts, and Dashboard REST API. |
| [**`SECURITY_AND_PRIVACY.md`**](file:///c:/Users/giorgi/Desktop/ავტომატური%20ჩათბოტი/SECURITY_AND_PRIVACY.md) | English | RBAC matrix (6 roles), PII masking (`+995 599 *** *12`), audit log specification, formula injection defense. |
| [**`TESTING_AND_VERIFICATION.md`**](file:///c:/Users/giorgi/Desktop/ავტომატური%20ჩათბოტი/TESTING_AND_VERIFICATION.md) | English | 15 mandatory test suites covering Section 21 (price checks, fake receipts, injection defense, race conditions). |
| [**`DEPLOYMENT_GUIDE.md`**](file:///c:/Users/giorgi/Desktop/ავტომატური%20ჩათბოტი/DEPLOYMENT_GUIDE.md) | English | Pre-launch checklist (Section 22), Meta App setup, WhatsApp WABA configuration, Telegram BotFather setup. |
| [**`DASHBOARD_SPEC.md`**](file:///c:/Users/giorgi/Desktop/ავტომატური%20ჩათბოტი/DASHBOARD_SPEC.md) | English | Admin Dashboard functional specification covering all 10 core views and UI states. |
| [**`dashboard.html`**](file:///c:/Users/giorgi/Desktop/ავტომატური%20ჩათბოტი/dashboard.html) | HTML/CSS/JS | Standalone, interactive Admin Console prototype with 10 working views, PII toggle, order drawer, CSV export. |
| [**`.env.example`**](file:///c:/Users/giorgi/Desktop/ავტომატური%20ჩათბოტი/.env.example) | Shell | Complete environment configuration template with exhaustive documentation for every key. |
| [**`.env`**](file:///c:/Users/giorgi/Desktop/ავტომატური%20ჩათბოტი/.env) | Shell | Development configuration file pre-populated for local development and testing. |

---

## 🚀 Quickstart Guide (სწრაფი დაწყება)

### 1. Configure Business Parameters
Copy `.env.example` to `.env` (or customize the pre-created `.env`):
```bash
# Verify your brand parameters, banking IBANs, and API credentials
nano .env
```

### 2. Initialize the Database
Run the DDL schema in your PostgreSQL 14+ or Supabase SQL Editor:
```bash
psql -U postgres -d omniflow_db -f DATABASE_SCHEMA.sql
```
This creates:
- 15 core tables: `products`, `product_variants`, `inventory_reservations`, `customers`, `channel_identities`, `conversations`, `messages`, `orders`, `order_items`, `payment_events`, `refunds`, `shipments`, `handoff_tickets`, `audit_logs`, `idempotency_keys`.
- Status enums and auto-updating `updated_at` triggers.
- Performance indexes for high-throughput messaging lookups.

### 3. Connect Channels
Follow [**`DEPLOYMENT_GUIDE.md`**](file:///c:/Users/giorgi/Desktop/ავტომატური%20ჩათბოტი/DEPLOYMENT_GUIDE.md) to link:
- **Facebook Messenger**: Configure webhook at `/api/webhooks/messenger`.
- **WhatsApp Cloud API**: Configure webhook at `/api/webhooks/whatsapp`.
- **Telegram Bot**: Run `setWebhook` pointing to `/api/webhooks/telegram`.

### 4. Open the Admin Console
Double-click or serve [**`dashboard.html`**](file:///c:/Users/giorgi/Desktop/ავტომატური%20ჩათბოტი/dashboard.html) in your browser:
- Switch between all 10 views (Overview, Unified Inbox, Orders, Payments, Inventory, Delivery, AI Performance, Integrations, Reports, Audit Log).
- Test PII masking toggle (`👁️ Toggle PII Masking`).
- Test interactive order inspection modals and CSV export.

---

## 🛡️ Security & Compliance
- **Zero Hallucination Guarantee**: Strict database validation before answering product, price, or stock inquiries.
- **Deduplication Engine**: Unique message IDs prevent duplicate webhook responses or double charges.
- **Audit Trails**: Every status change and staff action is recorded immutably in `audit_logs`.
- **GDPR & Local Data Protection**: Automatic PII masking across all tables and logs.
