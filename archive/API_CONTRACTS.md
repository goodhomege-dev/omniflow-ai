# API CONTRACTS & WEBHOOK SPECIFICATIONS
**Omnichannel AI Sales & Customer Support Platform**
*Interface Specification | Version 3.0*

---

## 1. Webhook Ingestion Contracts

### 1.1 Facebook Messenger Webhook
- **Handshake Verification**: `GET /api/webhooks/messenger`
  - Query Params: `hub.mode=subscribe`, `hub.challenge=CHALLENGE_CODE`, `hub.verify_token=MESSENGER_VERIFY_TOKEN`
  - Response: Plaintext `CHALLENGE_CODE` (HTTP 200) if token matches; otherwise HTTP 403.
- **Message Ingestion**: `POST /api/webhooks/messenger`
  - Security Header: `X-Hub-Signature-256: sha256=<HMAC_HEX_DIGEST>`
  - Sample Payload:
    ```json
    {
      "object": "page",
      "entry": [
        {
          "id": "PAGE_ID",
          "time": 1771934800000,
          "messaging": [
            {
              "sender": { "id": "PSID_USER_12345" },
              "recipient": { "id": "PAGE_ID" },
              "timestamp": 1771934800000,
              "message": {
                "mid": "m_mid.1234567890",
                "text": "გამარჯობა, iPhone 15 გაქვთ მარაგში?"
              }
            }
          ]
        }
      ]
    }
    ```

### 1.2 WhatsApp Business Cloud API Webhook
- **Handshake Verification**: `GET /api/webhooks/whatsapp`
  - Query Params: `hub.mode=subscribe`, `hub.challenge=CHALLENGE_CODE`, `hub.verify_token=WHATSAPP_VERIFY_TOKEN`
  - Response: Plaintext `CHALLENGE_CODE` (HTTP 200).
- **Message Ingestion**: `POST /api/webhooks/whatsapp`
  - Security Header: `X-Hub-Signature-256: sha256=<HMAC_HEX_DIGEST>`
  - Sample Payload:
    ```json
    {
      "object": "whatsapp_business_account",
      "entry": [
        {
          "id": "WABA_ID",
          "changes": [
            {
              "value": {
                "messaging_product": "whatsapp",
                "metadata": { "display_phone_number": "995322100200", "phone_number_id": "PNID_123" },
                "contacts": [{ "profile": { "name": "Nino G." }, "wa_id": "995599112233" }],
                "messages": [
                  {
                    "from": "995599112233",
                    "id": "wamid.HBgLOTk1...",
                    "timestamp": "1771934800",
                    "text": { "body": "შეკვეთის გაფორმება მინდა" },
                    "type": "text"
                  }
                ]
              },
              "field": "messages"
            }
          ]
        }
      ]
    }
    ```

### 1.3 Telegram Bot API Webhook
- **Message Ingestion**: `POST /api/webhooks/telegram`
  - Security Header: `X-Telegram-Bot-Api-Secret-Token: <TELEGRAM_WEBHOOK_SECRET>`
  - Sample Payload:
    ```json
    {
      "update_id": 987654321,
      "message": {
        "message_id": 4321,
        "from": {
          "id": 123456789,
          "is_bot": false,
          "first_name": "Dato",
          "username": "dato_k"
        },
        "chat": { "id": 123456789, "type": "private" },
        "date": 1771934800,
        "text": "რა ღირს მიტანა რეგიონში?"
      }
    }
    ```

---

## 2. Mandatory AI JSON Response Contract

The AI agent must return **strictly valid JSON** with no Markdown formatting or code fences.

### 2.1 JSON Schema Definition
```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "AIAgentResponse",
  "type": "object",
  "required": [
    "replyText",
    "platform",
    "intent",
    "isOrderReady",
    "isEscalate",
    "missingFields",
    "order",
    "actions"
  ],
  "properties": {
    "replyText": {
      "type": "string",
      "description": "Customer-facing message in the target language"
    },
    "platform": {
      "type": "string",
      "enum": ["messenger", "whatsapp", "telegram"]
    },
    "intent": {
      "type": "string",
      "enum": [
        "general_question",
        "product_inquiry",
        "order",
        "payment",
        "delivery",
        "complaint",
        "human_handoff",
        "other"
      ]
    },
    "isOrderReady": {
      "type": "boolean",
      "description": "True ONLY when all validations pass and backend confirms readiness"
    },
    "isEscalate": {
      "type": "boolean",
      "description": "True when conversation requires human support agent handoff"
    },
    "missingFields": {
      "type": "array",
      "items": { "type": "string" },
      "description": "List of missing fields preventing order completion"
    },
    "order": {
      "type": ["object", "null"],
      "properties": {
        "orderId": { "type": ["string", "null"] },
        "productId": { "type": ["string", "null"] },
        "product": { "type": ["string", "null"] },
        "quantity": { "type": ["integer", "null"] },
        "unitPrice": { "type": ["number", "null"] },
        "deliveryFee": { "type": ["number", "null"] },
        "totalPrice": { "type": ["number", "null"] },
        "currency": { "type": ["string", "null"], "default": "GEL" },
        "customerName": { "type": ["string", "null"] },
        "phone": { "type": ["string", "null"] },
        "city": { "type": ["string", "null"] },
        "address": { "type": ["string", "null"] },
        "deliveryNotes": { "type": ["string", "null"] },
        "paymentMethod": { "type": ["string", "null"] },
        "paymentStatus": {
          "type": ["string", "null"],
          "enum": [
            "UNVERIFIED",
            "AWAITING_PAYMENT",
            "PAYMENT_REVIEW",
            "CONFIRMED_PAID",
            "PAYMENT_FAILED",
            "REFUND_PENDING",
            "REFUNDED",
            null
          ]
        },
        "status": {
          "type": ["string", "null"],
          "enum": [
            "DRAFT",
            "AWAITING_DETAILS",
            "AWAITING_PAYMENT",
            "PAYMENT_REVIEW",
            "CONFIRMED_PAID",
            "CONFIRMED_COD",
            "PROCESSING",
            "READY_FOR_DISPATCH",
            "SHIPPED",
            "DELIVERED",
            "CANCELLED",
            "REFUND_PENDING",
            "REFUNDED",
            null
          ]
        }
      },
      "additionalProperties": false
    },
    "actions": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["name", "parameters"],
        "properties": {
          "name": {
            "type": "string",
            "enum": [
              "LOOKUP_PRODUCT",
              "CHECK_STOCK",
              "CALCULATE_ORDER_TOTAL",
              "VALIDATE_PHONE",
              "VALIDATE_ADDRESS",
              "CREATE_ORDER",
              "VERIFY_PAYMENT",
              "GET_ORDER_STATUS",
              "REQUEST_HUMAN_HANDOFF",
              "CANCEL_ORDER",
              "CHECK_DELIVERY_STATUS"
            ]
          },
          "parameters": { "type": "object" }
        }
      }
    }
  },
  "additionalProperties": false
}
```

---

## 3. Backend Tool Contracts

### 3.1 `LOOKUP_PRODUCT`
- **Request**: `{ "query": "iPhone 15", "category": "smartphones" }`
- **Response**:
  ```json
  {
    "found": true,
    "products": [
      {
        "id": "prod_9876",
        "name": "Apple iPhone 15",
        "variants": [
          { "variantId": "var_1", "sku": "IPHONE15-128-BLK", "name": "128GB Black", "price": 2499.00, "inStock": true, "availableQty": 7 }
        ],
        "warranty": "1 Year Official Apple Warranty"
      }
    ]
  }
  ```

### 3.2 `CALCULATE_ORDER_TOTAL`
- **Request**:
  ```json
  {
    "items": [{ "variantId": "var_1", "quantity": 1 }],
    "city": "Tbilisi",
    "deliveryType": "STANDARD",
    "promoCode": "TECH2026"
  }
  ```
- **Response**:
  ```json
  {
    "subtotal": 2499.00,
    "discount": 124.95,
    "deliveryFee": 0.00,
    "tax": 0.00,
    "total": 2374.05,
    "currency": "GEL",
    "isFreeShipping": true
  }
  ```

### 3.3 `CREATE_ORDER`
- **Request**:
  ```json
  {
    "idempotencyKey": "ord_idemp_abc123",
    "customerId": "cust_456",
    "channel": "whatsapp",
    "items": [{ "variantId": "var_1", "quantity": 1, "unitPrice": 2499.00 }],
    "delivery": {
      "recipientName": "Nino G.",
      "phone": "+995599112233",
      "city": "Tbilisi",
      "address": "Rustaveli Ave 14, Apt 8",
      "deliveryNotes": "Call before arrival"
    },
    "paymentMethod": "BANK_TRANSFER_TBC",
    "confirmedTotal": 2374.05
  }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "orderId": "ORD-1048",
    "status": "AWAITING_PAYMENT",
    "paymentInstructions": {
      "bank": "TBC Bank",
      "iban": "GE00TB0000000000000000",
      "recipient": "TechStore Georgia LLC",
      "amount": 2374.05,
      "reference": "ORD-1048"
    }
  }
  ```

---

## 4. Admin Dashboard REST Endpoints

### 4.1 Read Endpoints (GET)

| Endpoint | Description | Role Access |
|---|---|---|
| `GET /api/dashboard/summary?range=7d&channel=all` | Top-line KPI metrics (conversations, orders, sales, attention count) | All authenticated roles |
| `GET /api/dashboard/timeseries?metric=sales&interval=day` | Historical timeseries data for trends | All authenticated roles |
| `GET /api/conversations?status=open&channel=whatsapp&limit=20` | Unified inbox conversation list | Admin, Manager, Support |
| `GET /api/conversations/{id}` | Full conversation history with safe masked customer context | Admin, Manager, Support |
| `GET /api/orders?status=PROCESSING&limit=20` | Filterable, searchable order list | Admin, Manager, Finance, Warehouse |
| `GET /api/orders/{id}` | Order details, items, audit timeline, linked conversation | Admin, Manager, Finance, Warehouse |
| `GET /api/payments/review-queue` | Transactions needing verification or duplicate checks | Admin, Manager, Finance |
| `GET /api/inventory/alerts` | Low stock and reservation alerts | Admin, Manager, Warehouse |
| `GET /api/integrations/health` | Webhook connectivity and external provider uptime | Admin |
| `GET /api/audit-logs?entity=orders&limit=50` | Traceable system and staff action log | Admin |

### 4.2 Consequential Action Endpoints (POST)

All action endpoints require:
1. `Authorization: Bearer <JWT_SESSION_TOKEN>`
2. `Idempotency-Key: <UUID>` header.
3. Server-side role validation.

#### `POST /api/conversations/{id}/assign`
- Request: `{ "assignedToUserId": "user_789", "reason": "Complex warranty complaint" }`
- Response: `{ "success": true, "conversationId": "...", "assignedTo": "user_789" }`

#### `POST /api/conversations/{id}/handoff`
- Request: `{ "action": "RETURN_TO_AI" | "TAKE_OVER", "notes": "Handled customer refund" }`
- Response: `{ "success": true, "isHumanAssigned": false }`

#### `POST /api/payments/{id}/verify`
- Request:
  ```json
  {
    "orderId": "ORD-1048",
    "verificationSource": "MANUAL_BANK_CHECK",
    "outcome": "CONFIRMED_PAID",
    "bankTransactionReference": "TBC-99887766",
    "verifiedAmount": 249.00
  }
  ```
- Response: `{ "success": true, "orderStatus": "CONFIRMED_PAID" }`

#### `POST /api/orders/{id}/cancel`
- Request: `{ "reason": "Customer requested cancellation prior to dispatch", "refundInitiated": false }`
- Response: `{ "success": true, "orderStatus": "CANCELLED" }`

#### `POST /api/shipments`
- Request:
  ```json
  {
    "orderId": "ORD-1048",
    "courierService": "Delivery On Time",
    "trackingNumber": "DOT-992211",
    "notes": "Fragile electronics"
  }
  ```
- Response: `{ "success": true, "shipmentId": "...", "orderStatus": "SHIPPED" }`
