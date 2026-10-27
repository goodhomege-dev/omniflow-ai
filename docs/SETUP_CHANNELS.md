# არხების ინტეგრაციის ინსტრუქცია (Telegram, WhatsApp, Messenger)

ეს დოკუმენტი დეტალურად აღწერს, როგორ დააკავშიროთ სამივე არხი თქვენს OmniFlow AI აგენტთან.

---

## 1. Telegram ბოტის გამართვა

Telegram არის ყველაზე მარტივი არხი დასაწყებად.

### ნაბიჯი 1: ბოტის შექმნა
1. Telegram-ში მოძებნეთ ოფიციალური **@BotFather**.
2. გაგზავნეთ ბრძანება `/newbot`.
3. მიუთითეთ ბოტის სახელი (მაგ: `My Store Assistant`) და უნიკალური username (მაგ: `mystore_ka_bot`).
4. BotFather მოგცემთ **HTTP API Token**-ს (ფორმატით: `123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ`).
5. ჩაწერეთ ეს ტოკენი `.env.local`-ში:
   ```env
   TELEGRAM_BOT_TOKEN=123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ
   ```

### ნაბიჯი 2: მუშაობის რეჟიმის არჩევა

#### ვარიანტი A: ლოკალური ტესტირება (Zero-Webhook / Long Polling)
თუ არ გაქვთ საჯარო დომენი ან ngrok, შეგიძლიათ გაუშვათ ჩაშენებული პოლინგის სკრიპტი:
```bash
npm run telegram:poll
```
სკრიპტი პირდაპირ უკავშირდება Telegram სერვერებს, კითხულობს ახალ შეტყობინებებს და გადასცემს ორკესტრატორს. სრულიად უფასო და მოსახერხებელია დეველოპმენტისთვის.

#### ვარიანტი B: Production Webhook
როცა აპლიკაცია განთავსებულია საჯარო სერვერზე (Vercel, Railway ან VPS):
1. გააგზავნეთ GET მოთხოვნა ბრაუზერიდან ან curl-ით:
   ```bash
   curl "https://api.telegram.org/bot<თქვენი_ტოკენი>/setWebhook?url=https://თქვენი-დომენი.ge/api/webhooks/telegram"
   ```
2. პასუხად მიიღებთ `{"ok":true,"result":true,"description":"Webhook was set"}`.

---

## 2. WhatsApp Business Cloud API გამართვა

WhatsApp ინტეგრაცია მუშაობს Meta-ს ოფიციალური Cloud API-ით (უფასოა პირველი 1,000 საუბარი ყოველთვიურად).

### ნაბიჯი 1: Meta Developer აპლიკაციის შექმნა
1. გადადით [https://developers.facebook.com](https://developers.facebook.com).
2. შექმენით ახალი აპლიკაცია: ტიპი **Business**.
3. პროდუქტებში დაამატეთ **WhatsApp**.

### ნაბიჯი 2: ტოკენებისა და ნომრის ID-ს მიღება
1. მარცხენა მენიუდან გადადით **WhatsApp** -> **API Setup**.
2. დააკოპირეთ:
   - **Phone number ID:** (მაგ: `109876543210987`)
   - **Temporary access token** (სატესტოდ) ან შექმენით **System User** მუდმივი ტოკენისთვის:
     - გადადით Meta Business Settings -> System Users -> Add.
     - მიანიჭეთ `whatsapp_business_messaging` და `whatsapp_business_management` უფლებები.
     - დააგენერირეთ Permanent Token.
3. ჩაწერეთ `.env.local`-ში:
   ```env
   WHATSAPP_PHONE_NUMBER_ID=109876543210987
   WHATSAPP_ACCESS_TOKEN=EAAG...თქვენი_მუდმივი_ტოკენი
   WHATSAPP_VERIFY_TOKEN=omniflow_wa_secret_token_123
   WHATSAPP_APP_SECRET=თქვენი_meta_app_secret
   ```

### ნაბიჯი 3: Webhook-ის კონფიგურაცია Meta-ში
1. გადადით **WhatsApp** -> **Configuration**.
2. **Callback URL:** `https://თქვენი-დომენი.ge/api/webhooks/whatsapp`
3. **Verify Token:** ჩაწერეთ ზუსტად ის მნიშვნელობა, რაც გაქვთ `WHATSAPP_VERIFY_TOKEN`-ში.
4. დააჭირეთ **Verify and save**.
5. **Webhook fields** განყოფილებაში გამოიწერეთ (Subscribe) ველი: `messages`.

---

## 3. Facebook Messenger გამართვა

Messenger ინტეგრაცია იყენებს Meta Graph API-ს და ოფიციალურ Facebook გვერდს.

### ნაბიჯი 1: Facebook გვერდის დაკავშირება
1. თქვენს Meta Developer აპლიკაციაში დაამატეთ პროდუქტი **Messenger**.
2. გადადით **Messenger** -> **Settings**.
3. **Access Tokens** განყოფილებაში დააჭირეთ **Add Page** და აირჩიეთ თქვენი Facebook გვერდი.
4. დააგენერირეთ **Page Access Token**.
5. ჩაწერეთ `.env.local`-ში:
   ```env
   MESSENGER_PAGE_ACCESS_TOKEN=EAA...თქვენი_გვერდის_ტოკენი
   MESSENGER_VERIFY_TOKEN=omniflow_messenger_secret_token_123
   MESSENGER_APP_SECRET=თქვენი_meta_app_secret
   ```

### ნაბიჯი 2: Webhook-ის დაკავშირება
1. იმავე გვერდზე Webhooks განყოფილებაში დააჭირეთ **Add Callback URL**:
   - **Callback URL:** `https://თქვენი-დომენი.ge/api/webhooks/messenger`
   - **Verify Token:** `MESSENGER_VERIFY_TOKEN`-ის მნიშვნელობა.
2. გამოიწერეთ (Subscribe) მოვლენები:
   - `messages`
   - `messaging_postbacks`
3. დააჭირეთ **Add Subscriptions** თქვენი დაკავშირებული Facebook გვერდისთვის.

---

## 4. ვებსაიტზე ჩათის დამატება (Website Widget)

საიტზე ჩათის დასამატებლად ხელმისაწვდომია მზა უნივერსალური ვიჯეტი `public/chat-widget.js`, რომელიც მუშაობს ნებისმიერ საიტზე (WordPress, Shopify, Webflow, React, HTML).

### ნაბიჯი 1: კოდის ჩასმა საიტზე
ჩასვით ეს კოდი თქვენი ვებსაიტის `<body>` ტეგის დახურვამდე (`</body>`):

```html
<script 
  src="https://თქვენი-დომენი.ge/chat-widget.js" 
  data-whatsapp="9955XXXXXXXX" 
  data-messenger="tqveni_facebook_page" 
  data-telegram="tqveni_bot_username"
  data-brand="ჩემი მაღაზია"
  data-color="#4f46e5">
</script>
```

### ნაბიჯი 2: პარამეტრების მორგება
- `data-whatsapp`: თქვენი WhatsApp Business ნომერი საერთაშორისო ფორმატში (მაგ: `995599123456`).
- `data-messenger`: თქვენი Facebook გვერდის სახელი (username ან ID).
- `data-telegram`: თქვენი Telegram ბოტის username (მაგ: `mystore_bot`).
- `data-brand`: ბრენდის სახელი (გამოჩნდება ვიჯეტის თავში).
- `data-color`: ვიჯეტის ძირითადი ფერი ბრენდის დიზაინის მიხედვით.

ლოკალური ტესტირებისთვის გახსენით ბრაუზერში: [http://localhost:3000/widget-demo.html](http://localhost:3000/widget-demo.html)

