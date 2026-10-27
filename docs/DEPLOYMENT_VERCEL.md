# GitHub & Vercel დეპლოის სახელმძღვანელო
### OmniFlow AI — პროდაქშენში გაშვება 5 წუთში

ეს დოკუმენტი ნაბიჯ-ნაბიჯ ხსნის, როგორ ატვირთოთ პროექტი **GitHub-ზე** და როგორ გაუშვათ ის **Vercel-ზე** სრულიად უფასოდ, 24/7 რეჟიმში.

---

## 1. რატომ Vercel + GitHub?

- **24/7 უწყვეტი მუშაობა:** თქვენი კომპიუტერის ჩართული დატოვება აღარ არის საჭირო.
- **უფასო მუდმივი HTTPS დომენი:** მაგ: `https://omniflow-ai.vercel.app` (აუცილებელია Meta-ს და Telegram-ის Webhook-ებისთვის).
- **ავტომატური CI/CD:** კოდის ნებისმიერ ცვლილებაზე (`git push`), Vercel ავტომატურად განაახლებს საიტს 1 წუთში.
- **სერვერლეს არქიტექტურა:** მომენტალური რეაგირება და ნულოვანი ხარჯი საწყის ეტაპზე.

---

## 2. ნაბიჯი 1: GitHub-ზე ატვირთვა

### 1. შექმენით ახალი რეპოზიტორია GitHub-ზე:
1. გადადით [https://github.com/new](https://github.com/new).
2. ჩაწერეთ რეპოზიტორიის სახელი (მაგალითად: `omniflow-ai` ან `ai-chatbot`).
3. აირჩიეთ **Private** (რეკომენდებულია) ან **Public**.
4. **არ მონიშნოთ** „Add a README file“ (README პროექტში უკვე გვაქვს).
5. დააჭირეთ **Create repository**.

### 2. ატვირთეთ კოდი თქვენი კომპიუტერიდან:
გახსენით ტერმინალი პროექტის საქაღალდეში (`c:\Users\giorgi\Desktop\ავტომატური ჩათბოტი`) და გაუშვით შემდეგი ბრძანებები:

```powershell
# 1. ფაილების მომზადება
git add .

# 2. პირველი კომიტის შექმნა
git commit -m "Initial commit: OmniFlow AI Omnichannel Agent"

# 3. მთავარი შტოს სახელის გადარქმევა main-ზე
git branch -M main

# 4. თქვენი GitHub-ის რეპოზიტორიის მიბმა (შეცვალეთ username და repo თქვენით):
git remote add origin https://github.com/თქვენი-username/omniflow-ai.git

# 5. კოდის ატვირთვა GitHub-ზე
git push -u origin main
```

> [!IMPORTANT]
> **უსაფრთხოება გარანტირებულია:** `.env` და `.env.local` ფაილები დამატებულია `.gitignore`-ში, ამიტომ თქვენი API გასაღებები და პაროლები GitHub-ზე **არ აიტვირთება**.

---

## 3. ნაბიჯი 2: Vercel-ზე დაკავშირება და გაშვება

1. გადადით **[https://vercel.com](https://vercel.com)** და გაიარეთ ავტორიზაცია თქვენი **GitHub** ანგარიშით.
2. დააჭირეთ **Add New...** -> **Project**.
3. სიაში იპოვეთ თქვენი რეპოზიტორია (`omniflow-ai`) და დააჭირეთ **Import**.
4. **Environment Variables (გარემოს ცვლადები):**  
   გახსენით განყოფილება **Environment Variables** და ჩაამატეთ პარამეტრები თქვენი `.env.local` ფაილიდან:

| ცვლადის სახელი | მნიშვნელობა (მაგალითი) |
| :--- | :--- |
| `LLM_PROVIDER` | `openrouter` |
| `OPENROUTER_API_KEY` | `sk-or-v1-your-openrouter-api-key` |
| `OPENROUTER_MODEL` | `google/gemma-4-26b-a4b-it:free` |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://qjezshdrvakocdgsorkf.supabase.co` |
| `SUPABASE_URL` | `https://qjezshdrvakocdgsorkf.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | `sb_publishable_TLbrCzhicuSLBa6Tg-gk2g__efFseN2` |
| `SUPABASE_PUBLISHABLE_KEY` | `sb_publishable_TLbrCzhicuSLBa6Tg-gk2g__efFseN2` |
| `ADMIN_PASSWORD` | `admin123!` (ან თქვენი სასურველი პაროლი) |
| `SESSION_SECRET` | `omniflow_local_dev_session_secret_32_characters_long_key_!!` |
| `TELEGRAM_BOT_TOKEN` | თქვენი Telegram ბოტის ტოკენი |
| `TELEGRAM_WEBHOOK_SECRET` | `telegram_dev_secret_token_12345` |
| `WHATSAPP_PHONE_NUMBER_ID` | თქვენი WhatsApp Phone ID |
| `WHATSAPP_ACCESS_TOKEN` | თქვენი WhatsApp Access Token |
| `WHATSAPP_VERIFY_TOKEN` | `omniflow_wa_secret_token_123` |
| `MESSENGER_PAGE_ACCESS_TOKEN` | თქვენი Facebook Page Token |
| `MESSENGER_VERIFY_TOKEN` | `omniflow_messenger_secret_token_123` |

5. დააჭირეთ **Deploy**!
   დაახლოებით 1-2 წუთში პროექტი აეწყობა და Vercel მოგცემთ თქვენს ოფიციალურ დომენს, მაგალითად:  
   👉 `https://omniflow-ai.vercel.app`

---

## 4. ნაბიჯი 3: არხების მიბმა Vercel-ის დომენზე

მას შემდეგ, რაც Vercel მოგცემთ დომენს (`https://omniflow-ai.vercel.app`):

### 1. Telegram ბოტის მიბმა (1 წამში):
გახსენით თქვენი ბრაუზერი და ჩაწერეთ შემდეგი ბმული:
```
https://api.telegram.org/bot<თქვენი_TELEGRAM_BOT_TOKEN>/setWebhook?url=https://omniflow-ai.vercel.app/api/webhooks/telegram
```
Telegram გიპასუხებთ: `{"ok":true,"result":true,"description":"Webhook was set"}`.  
ამ მომენტიდან Telegram ბოტი იმუშავებს მუდმივად, კომპიუტერის ჩართვის გარეშე!

### 2. Facebook Messenger-ის მიბმა:
Meta for Developers -> Messenger Settings -> Webhooks:
- **Callback URL:** `https://omniflow-ai.vercel.app/api/webhooks/messenger`
- **Verify Token:** `omniflow_messenger_secret_token_123`

### 3. WhatsApp Business-ის მიბმა:
Meta for Developers -> WhatsApp Configuration -> Webhooks:
- **Callback URL:** `https://omniflow-ai.vercel.app/api/webhooks/whatsapp`
- **Verify Token:** `omniflow_wa_secret_token_123`

### 4. ვებსაიტის ჩათ-ვიჯეტი:
ნებისმიერ თქვენს საიტზე ჩასვით:
```html
<script 
  src="https://omniflow-ai.vercel.app/chat-widget.js" 
  data-whatsapp="9955XXXXXXXX" 
  data-messenger="tqveni_page" 
  data-telegram="tqveni_bot"
  data-brand="ჩემი მაღაზია"
  data-color="#4f46e5">
</script>
```

### 5. ადმინ დაშბორდი:
გახსენით ბრაუზერში: `https://omniflow-ai.vercel.app/admin` (შედით თქვენი `ADMIN_PASSWORD`-ით).
მუშაობს ნებისმიერი ადგილიდან, კომპიუტერიდანაც და მობილურიდანაც.
