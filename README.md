# OmniFlow AI — Omnichannel AI Sales & Customer Support Agent
### ვერსია: 1.0 (ქართული გამოცემა) • არხები: Telegram, WhatsApp Business, Facebook Messenger

სრული, ინტეგრირებული AI გაყიდვებისა და მხარდაჭერის სისტემა ქართული ელექტრონული კომერციისთვის. სისტემა დაფუძნებულია Master System Prompt v1.0-ზე და v3.0-ის უსაფრთხოების/დაშბორდის სპეციფიკაციებზე.

---

## ✨ ძირითადი შესაძლებლობები

- **3 საკომუნიკაციო არხი ერთ სისტემაში:**
  - 📱 **Telegram:** Webhook და ლოკალური Long Polling რეჟიმები (`npm run telegram:poll`).
  - 💬 **WhatsApp Business Cloud API:** Meta-ს ოფიციალური API, HMAC-SHA256 ხელმოწერის შემოწმება.
  - 🌐 **Facebook Messenger:** Meta Webhook Handshake და Graph API.
- **სრული ქართული ადმინ პანელი (`/admin`):**
  - **მიმოხილვა (Overview):** ცოცხალი KPI-ები (ჩათები, შეკვეთები, გაყიდვები ₾, ყურადღების რიგი).
  - **ინბოქსი (Inbox):** საუბრების ისტორია, AI პაუზა / ადამიანის ჩართვა (Takeover), ოპერატორის პირდაპირი პასუხი.
  - **შეკვეთები (Orders):** შეკვეთების სია, სტატუსების მართვა მკაცრი State Machine-ით.
  - **გადახდები (Payments):** ქვითრების OCR ამოცნობა და ადამიანის მიერ დადასტურების რიგი (`PAYMENT_REVIEW`).
  - **კატალოგი (Products):** პროდუქტების და ვარიანტების მართვა, **CSV იმპორტი**.
  - **პარამეტრები (Settings):** `business_config`-ის ცვლილება რეალურ დროში.
  - **აუდიტის ჟურნალი (Audit Logs):** სისტემის და ადმინის მოქმედებების უსაფრთხო ლოგი.
  - **სისტემის სტატუსი (Health):** კომპონენტების დიაგნოსტიკა.
  - **🔒 PII Masking:** კლიენტის ტელეფონების და მისამართების დაბინდვა/გამოჩენა ერთი კლიკით.
- **ფინანსური დაცვა (Zero-Loss Guarantee):**
  - AI აგენტი **არასდროს ადასტურებს გადახდას ავტომატურად** (`CONFIRMED_PAID`). გადახდას ამოწმებს მხოლოდ ადამიანი/ბუღალტერი.
  - ფასები, საკურიერო ტარიფები და უფასო მიტანა (≥ 100 ₾) ითვლება მკაცრად სერვერზე, AI-ს არ შეუძლია ფასის შეცვლა.
- **ავტომატური Fallback (Zero-Dependency Testing):**
  - თუ Supabase არ არის დაკავშირებული, სისტემა მუშაობს ჩაშენებულ **In-Memory რეპოზიტორიაზე**, რაც საშუალებას გაძლევთ გაუშვათ ტესტები და შეამოწმოთ დაშბორდი ნებისმიერ გარემოში.
- **მრავალპროვაიდერიანი AI (LLM Agnostic):**
  - მხარდაჭერილია Google Gemini (`@google/genai`), OpenAI (`openai`) და Anthropic Claude (`@anthropic-ai/sdk`).

---

## 🚀 სწრაფი დაწყება (Quick Start)

### 1. დამოკიდებულებების ინსტალაცია
```bash
npm install
```

### 2. გარემოს კონფიგურაცია
დააკოპირეთ `.env.example` ფაილი `.env.local`-ში:
```bash
cp .env.example .env.local
```
*(ნაგულისხმევი პარამეტრებით სისტემა მუშაობს ლოკალურ სატესტო რეჟიმში. დეტალებისთვის იხილეთ [docs/SETUP_SUPABASE.md](docs/SETUP_SUPABASE.md)).*

### 3. სერვერის გაშვება
```bash
npm run dev
```
გახსენით ბრაუზერში: [http://localhost:3000](http://localhost:3000) (ავტომატურად გადაგამისამართებთ ადმინ პანელში).
- **ადმინის ნაგულისხმევი პაროლი:** `AdminSecret2026!` (იცვლება `.env.local`-ში `ADMIN_PASSWORD`).

---

## 🧪 ტესტების გაშვება

პროექტში ჩაწერილია 28 ავტომატური ტესტი, მათ შორის Master Prompt v1.0-ის 21-ე განყოფილების **ყველა 12 კრიტიკული სცენარი**:
```bash
# ტესტების გაშვება (Vitest)
npm test

# ტიპების შემოწმება (TypeScript)
npm run typecheck

# პროდაქშენ ბილდი (Next.js 16)
npm run build
```

---

## 📱 ლოკალური Telegram ტესტირება (ვებჰუკების გარეშე)

თუ გაქვთ Telegram ბოტის ტოკენი BotFather-ისგან, შეგიძლიათ პირდაპირ გამოსცადოთ AI აგენტი:
1. ჩაწერეთ `TELEGRAM_BOT_TOKEN=...` `.env.local`-ში.
2. გაუშვით:
```bash
npm run telegram:poll
```
მიწერეთ თქვენს ბოტს ქართულად და დაინახავთ AI-ის რეალურ დროში მუშაობას!

---

## 📚 დეტალური დოკუმენტაცია

ყველა ინსტრუქცია ქართულ ენაზე მოცემულია `docs/` დირექტორიაში:
- 📖 [დოკუმენტაციის სარჩევი (docs/README.md)](docs/README.md)
- 🗄️ [Supabase-ის გამართვის გზამკვლევი (docs/SETUP_SUPABASE.md)](docs/SETUP_SUPABASE.md)
- 📲 [არხების ინტეგრაცია: TG, WA, FB (docs/SETUP_CHANNELS.md)](docs/SETUP_CHANNELS.md)
- 🏗️ [სისტემის არქიტექტურა (docs/ARCHITECTURE.md)](docs/ARCHITECTURE.md)
- 🛡️ [უსაფრთხოების პოლიტიკა (docs/SECURITY.md)](docs/SECURITY.md)
- 🧪 [ტესტირების სახელმძღვანელო (docs/TESTING.md)](docs/TESTING.md)
- ✅ [გაშვების წინა ჩექლისტი (docs/LAUNCH_CHECKLIST.md)](docs/LAUNCH_CHECKLIST.md)

---

## 📂 პროექტის სტრუქტურა

```
├── docs/                          # ქართული დოკუმენტაცია
├── prompts/
│   └── system_ka_v1.md            # კანონიკური ქართული სისტემური პრომპტი (v1.0)
├── supabase/
│   ├── migrations/0001_init.sql   # 15 ცხრილი, RPC ფუნქციები, RLS და ტრიგერები
│   └── seed.sql                   # საწყისი ბიზნეს კონფიგი და კატალოგი
├── src/
│   ├── app/
│   │   ├── admin/page.tsx         # სრული ქართული ადმინ დაშბორდი
│   │   ├── login/page.tsx         # ავტორიზაციის გვერდი
│   │   └── api/
│   │       ├── admin/*            # 11 ადმინ API მარშრუტი (კონფიგი, შეკვეთები, CSV იმპორტი...)
│   │       ├── webhooks/*         # Telegram, WhatsApp, Messenger ვებჰუკები
│   │       └── cron/outbox        # Outbox რიგის ფონური დამმუშავებელი
│   ├── lib/
│   │   ├── agent/                 # Orchestrator, Prompt Builder, Tools, Safety Guards
│   │   ├── channels/              # Telegram, WhatsApp, Messenger ადაპტერები
│   │   ├── db/                    # SupabaseRepository & InMemoryRepository (ავტო-სვიჩერი)
│   │   ├── llm/                   # Gemini, OpenAI, Claude, Mock პროვაიდერები
│   │   ├── orders/                # State Machine & Authoritative Totals Calculator
│   │   ├── payments/              # ქვითრის OCR Vision და PAYMENT_REVIEW რიგი
│   │   └── validation/            # ტელეფონისა და მისამართის ქართული ვალიდატორები
│   └── middleware.ts              # ადმინ პანელის სესიის დაცვა
├── scripts/
│   └── telegram-poll.ts           # ლოკალური Long Polling სკრიპტი
├── tests/
│   ├── core.test.ts               # ძირითადი ვალიდაციებისა და State Machine-ის ტესტები
│   └── scenarios.test.ts          # Master Prompt-ის 12 სცენარის ტესტები
└── archive/                       # ძველი v3.0 mock ფაილები (არქივირებული)
```
