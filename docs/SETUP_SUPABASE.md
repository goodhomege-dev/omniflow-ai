# Supabase-ის გამართვის ინსტრუქცია

პროექტი იყენებს PostgreSQL მონაცემთა ბაზას Supabase-ის მეშვეობით. სისტემაში ჩაშენებულია ავტომატური Fallback: თუ Supabase-ის პარამეტრები `.env.local`-ში შევსებული არ არის, სისტემა მუშაობს **In-Memory რეჟიმში**, რაც საშუალებას გაძლევთ გაუშვათ ტესტები და ლოკალურად გამოსცადოთ ადმინ პანელი გარე სერვისების გარეშე.

რეალური წარმოების (Production) რეჟიმისთვის მიჰყევით ამ ნაბიჯებს:

---

## 1. Supabase პროექტის შექმნა

1. გადადით [https://supabase.com](https://supabase.com) და გაიარეთ ავტორიზაცია.
2. დააჭირეთ **"New Project"**.
3. მიუთითეთ:
   - **Name:** OmniFlow AI (ან თქვენი სასურველი სახელი)
   - **Database Password:** შეინახეთ საიმედო პაროლი
   - **Region:** Frankfurt (eu-central-1) — ყველაზე დაბალი პინგისთვის საქართველოდან.
4. დაელოდეთ 1-2 წუთი ბაზის შექმნას.

---

## 2. ბაზის სქემის (Migrations) გაშვება

1. მარცხენა მენიუდან გახსენით **SQL Editor**.
2. გახსენით პროექტის ფაილი `supabase/migrations/0001_init.sql`.
3. დააკოპირეთ მთლიანი შიგთავსი, ჩასვით Supabase SQL Editor-ში და დააჭირეთ **Run**.
4. შემოწმება: ბრძანების დასრულების შემდეგ მარცხენა მენიუში **Table Editor**-ში უნდა გამოჩნდეს შემდეგი 15 ცხრილი:
   - `customers`
   - `channel_identities`
   - `conversations`
   - `messages`
   - `products`
   - `product_variants`
   - `orders`
   - `order_items`
   - `order_status_history`
   - `stock_reservations`
   - `payment_events`
   - `handoff_tickets`
   - `audit_logs`
   - `business_config`
   - `outbox_messages`

ასევე შეიქმნება კრიტიკული ტრანზაქციული RPC ფუნქციები:
- `create_order_tx` — ატომური შეკვეთის შექმნა და მარაგის რეზერვაცია.
- `transition_order` — შეკვეთის სტატუსის უსაფრთხო ცვლილება.
- `release_expired_reservations` — ვადაგასული რეზერვაციების გათავისუფლება.

---

## 3. საწყისი მონაცემების შეტანა (Seed Data)

1. კვლავ გახსენით **SQL Editor**.
2. დააკოპირეთ ფაილ `supabase/seed.sql`-ის შიგთავსი.
3. ჩასვით SQL Editor-ში და დააჭირეთ **Run**.
4. ეს ოპერაცია შეავსებს `business_config` ცხრილს ბიზნესის პარამეტრებით და ჩაწერს 4 სატესტო პროდუქტს ვარიანტებით (AirPods Pro 2, iPhone 15, JBL Flip 6, Baseus GaN დამტენი).

---

## 4. API გასაღებების მიღება და `.env.local`-ში ჩაწერა

1. Supabase დაშბორდში გადადით **Project Settings** -> **API**.
2. იპოვეთ:
   - **Project URL:** მაგალითად `https://xyzcompany.supabase.co`
   - **Project API keys** განყოფილებაში:
     - `anon` `public` — საჯარო გასაღები.
     - `service_role` `secret` — **სერვისული გასაღები** (ეს გასაღები გამოიყენება Next.js-ის სერვერული API მარშრუტებიდან RLS-ის გვერდის ავლით მონაცემების უსაფრთხო მართვისთვის).
3. გახსენით თქვენი `.env.local` ფაილი და ჩაწერეთ:

```env
NEXT_PUBLIC_SUPABASE_URL=https://qjezshdrvakocdgsorkf.supabase.co
SUPABASE_URL=https://qjezshdrvakocdgsorkf.supabase.co
SUPABASE_REST_URL=https://qjezshdrvakocdgsorkf.supabase.co/rest/v1/
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
SUPABASE_SERVICE_ROLE_KEY=sb_secret_... (ან service_role)
```

> **შენიშვნა URL-ის ფორმატზე:** თუ შეცდომით მიუთითებთ REST URL-ს (`/rest/v1/`-ით), სისტემა (`normalizeSupabaseUrl`) ავტომატურად გაასუფთავებს მას, რათა `@supabase/supabase-js`-მა არ წარმოქმნას `Invalid path` შეცდომა.

4. გადატვირთეთ Next.js აპლიკაცია (`npm run dev`). სისტემა ავტომატურად გადაერთვება Supabase ბაზაზე.
