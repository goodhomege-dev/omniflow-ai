# სისტემის არქიტექტურა — OmniFlow AI

OmniFlow AI არის მოდერნიზებული, მოვლენებზე ორიენტირებული (Event-Driven) სისტემა, რომელიც შექმნილია მაღალი საიმედოობის, ტრანზაქციული უსაფრთხოებისა და ჰალუცინაციების პრევენციისთვის.

---

## 1. მაღალი დონის არქიტექტურული დიაგრამა

```
[ Telegram ]      [ WhatsApp Cloud ]     [ FB Messenger ]
     │                    │                     │
     ▼                    ▼                     ▼
[/api/webhooks/tg]  [/api/webhooks/wa]   [/api/webhooks/msg]
     │                    │                     │
     └────────────────────┼─────────────────────┘
                          ▼
            [ Channel Adapter & HMAC Verify ]
                          ▼
             [ Deduplication (PostgreSQL) ]
                          ▼
             [ Agent Orchestrator Loop ]
                 │                ▲
  (System Prompt)│                │ (Tool Results)
                 ▼                │
         [ LLM Provider ] ◄───────┘
        (Gemini/OpenAI/Claude)
                 │
                 ▼
        [ Post-Guard Safety Checks ]
                 │
                 ▼
       [ Transactional Outbox Table ] ──► [ Outbox Worker/Cron ] ──► [ Channel API ]
```

---

## 2. ძირითადი კომპონენტები

### ა. არხების ადაპტერები (`src/lib/channels/`)
თითოეული არხისთვის (Telegram, WhatsApp, Messenger) შექმნილია უნიფიცირებული `ChannelAdapter` ინტერფეისი:
- `verify(req, rawBody)`: ამოწმებს Meta-ს `X-Hub-Signature-256` HMAC-SHA256 ციფრულ ხელმოწერას ან Telegram Secret Token-ს.
- `normalize(body)`: გარდაქმნის პლატფორმის განსხვავებულ JSON-ს სტანდარტულ `NormalizedMessage`-ად (`channel`, `platformUserId`, `platformMessageId`, `text`, `attachments`).
- `sendText(recipientId, text)`: აგზავნის პასუხს პლატფორმის ოფიციალური HTTP API-ით.

### ბ. მონაცემთა ბაზის აბსტრაქცია (`src/lib/db/`)
სისტემა იყენებს `DatabaseRepository` ინტერფეისს:
- `SupabaseRepository`: პროდაქშენ რეალიზაცია Supabase PostgreSQL-ზე დამოკიდებულებით, RPC ტრანზაქციებით (`create_order_tx`, `transition_order`) და RLS პოლიტიკებით.
- `InMemoryRepository`: სრული ფუნქციონალი მეხსიერებაში ლოკალური ტესტირებისა და CI/CD-სთვის გარე ბაზის გარეშე.

### გ. აგენტის ორკესტრაცია & Multi-Turn Tool Loop (`src/lib/agent/orchestrator.ts`)
1. **დედუპლიკაცია:** შეტყობინების მიღებისას ბაზაში მოწმდება `(channel, platform_message_id)` უნიკალურობა. დუბლიკატი ვებჰუკი დაუყოვნებლივ წყდება.
2. **Human Takeover Check:** თუ საუბარზე ჩართულია ოპერატორი (`aiPaused: true`), AI აღარ პასუხობს.
3. **დინამიური პრომპტი:** პრომპტი გენერირდება ბაზაში არსებული `business_config` მონაცემებით (ფასები, სამუშაო საათები, ბანკის IBAN-ები).
4. **Tool Calling Loop (მაქსიმუმ 4 ბიჯი):**
   - `LOOKUP_PRODUCT`: კატალოგში ძებნა.
   - `CHECK_STOCK`: ნაშთის შემოწმება.
   - `CALCULATE_ORDER_TOTAL`: სერვერული ფასის დათვლა.
   - `VALIDATE_PHONE`: ქართული 9-ნიშნა მობილურის შემოწმება.
   - `VALIDATE_ADDRESS`: ქალაქისა და ქუჩის შემოწმება.
   - `CREATE_ORDER`: შეკვეთის შექმნა და მარაგის რეზერვაცია.
   - `REQUEST_HUMAN_HANDOFF`: ოპერატორის ჩართვა.
5. **Post-Guard Safety Checks (`guards.ts`):** ამოწმებს, რომ AI-მ არ გააჟღერა დაუდასტურებელი შეკვეთის ან გადახდის ტექსტი, თუ სერვერზე ტრანზაქცია რეალურად არ შედგა.

### დ. Transactional Outbox Pattern (`src/lib/outbox/`)
პასუხის მომხმარებლისთვის გაგზავნა ხდება Outbox პატერნით: შეტყობინება იწერება `outbox_messages` ცხრილში იმავე ტრანზაქციაში, სადაც შეკვეთის სტატუსი. ამის შემდეგ ფონური გამგზავნი (`src/app/api/cron/outbox`) აგზავნის მესიჯს და წარუმატებლობის შემთხვევაში ახდენს Retry-ს ექსპონენციალური დაყოვნებით (Exponential Backoff). ეს გამორიცხავს შეტყობინებების დაკარგვას ქსელის შეფერხების დროს.

### ე. შეკვეთის სტატუსების მკაცრი მანქანა (State Machine)
შეკვეთის სტატუსები იმართება `src/lib/orders/stateMachine.ts`-ით:
```
DRAFT ──► AWAITING_DETAILS ──► AWAITING_PAYMENT ──► CONFIRMED_PAID ──► PROCESSING ──► READY_FOR_DISPATCH ──► SHIPPED ──► DELIVERED
  │               │                     │                    │              │                    │                 │
  └───────────────┴─────────────────────┴────────────────────┴──────────────┴────────────────────┴─────────────────┴──► CANCELLED
```
დაუშვებელია თვითნებური ნახტომები (მაგ: DRAFT-დან პირდაპირ SHIPPED-ზე).
