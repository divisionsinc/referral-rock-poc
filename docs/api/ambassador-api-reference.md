# Ambassador (GetAmbassador) REST API Reference

> Research compiled from https://docs.getambassador.com
> Date: 2026-03-19

---

## 1. Authentication

Ambassador uses **URL-based credential authentication** -- your API username and API key are embedded directly in the URL path. No Bearer tokens or OAuth flows.

| Credential       | Description                                  |
|-------------------|----------------------------------------------|
| `API_USERNAME`    | Your company API username (found in account settings) |
| `API_TOKEN`       | Your API key (found in account settings)     |

**URL structure for every API call:**

```
https://api.getambassador.com/api/v2/{API_USERNAME}/{API_TOKEN}/json/{endpoint}/
```

**Required headers (POST requests only):**

```
Content-Type: application/json
```

**Security notes:**
- TLS 1.2 or higher required (TLS 1.0 and 1.1 are no longer supported)
- API key must never be shared or exposed in client-side code
- Rate limits are enforced per IP address

---

## 2. Base URL

```
https://api.getambassador.com/api/v2/{username}/{token}/json/
```

- API version: **v2** (stable), **v3** (beta)
- The old domain `getambassador.com` (without `api.` prefix) ceased working January 2023
- Response format is specified in the URL path: use `/json/` for JSON, `/xml/` for XML

---

## 3. Rate Limits

| Endpoint Type                  | Limit                  |
|---------------------------------|------------------------|
| Authentication/login endpoints  | 10 requests/minute     |
| Compliance export               | 5 requests/second      |
| Custom URL export               | 2 requests/minute      |
| All other methods               | 60 requests/second     |
| All other methods               | 10,000 requests/hour   |
| Anonymous endpoints (no API key)| 10 requests/second     |

---

## 4. Universal Response Format

All responses follow a consistent wrapper structure:

### Success (200)

```json
{
  "response": {
    "code": "200",
    "message": "OK: The request was successful. See response body for additional data.",
    "data": {
      // endpoint-specific payload
    }
  }
}
```

### Error (400)

```json
{
  "response": {
    "code": "400",
    "message": "BAD REQUEST: The parameters provided were invalid. See response body for error messages.",
    "errors": {
      "error": ["Error message 1", "Error message 2"]
    }
  }
}
```

### All Status Codes

| Code | Meaning                                                              |
|------|----------------------------------------------------------------------|
| 200  | Request was successful                                                |
| 400  | Invalid parameters                                                    |
| 401  | Invalid credentials or improper request                               |
| 404  | Entity or method does not exist                                       |
| 409  | Conflict (e.g., duplicate transaction_uid)                            |
| 500  | Server error                                                          |

---

## 5. Key Endpoints

### 5.1 Test Connection / Get Company Info

**`GET /company/get/`**

No parameters required. Use this to validate your API credentials and retrieve company + campaign info.

```bash
curl "https://api.getambassador.com/api/v2/{username}/{token}/json/company/get/"
```

**Response:**

```json
{
  "response": {
    "code": "200",
    "message": "OK: The request was successful.",
    "data": {
      "company": {
        "company_name": "string",
        "company_url": "string",
        "company_email": "string",
        "point_name": "string",
        "outgoing_email": "string",
        "avatar_url": "string"
      },
      "campaigns": [
        {
          "campaign_uid": "string",
          "campaign_name": "string",
          "campaign_description": "string",
          "sandbox": "string",
          "private": "string",
          "facebook_enabled": "string",
          "url": "string",
          "total_money_earned": "string",
          "total_points_earned": "string"
        }
      ]
    }
  }
}
```

**Reward types returned for campaigns:**
- `P` = Percentage Monetary
- `F` = Flat Monetary
- `N` = Percentage Non-Monetary
- `M` = Flat Non-Monetary
- `D` = None

---

### 5.2 Create / Enroll an Ambassador (Referrer)

**`GET /ambassador/get/`** with `auto_create=1`

This endpoint both retrieves AND creates ambassadors. Set `auto_create=1` to create if not found.

```bash
curl "https://api.getambassador.com/api/v2/{username}/{token}/json/ambassador/get/" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "johndoe@example.com",
    "auto_create": "1",
    "first_name": "John",
    "last_name": "Doe",
    "uid": "CUST-0000123",
    "status": "enrolled"
  }' \
  -X GET
```

**Request Parameters:**

| Parameter                | Type   | Required | Description                                          |
|--------------------------|--------|----------|------------------------------------------------------|
| `email`                  | string | Yes      | Ambassador's email address                           |
| `uid`                    | string | No       | Your internal unique ID for this user                |
| `auto_create`            | string | No       | `"1"` to create if not found, `"0"` to only retrieve (default: `"0"`) |
| `first_name`             | string | No       | First name                                           |
| `last_name`              | string | No       | Last name                                            |
| `status`                 | string | No       | New user status: `enrolled`, `prospect`, `banned`, `unsubscribed` |
| `email_new_ambassador`   | string | No       | Email credentials to new user (`"1"`/`"0"`, default: `"1"`) |
| `sandbox`                | string | No       | Test mode (`"1"`/`"0"`, default: `"0"`)              |
| `deactivate_new_ambassador` | string | No   | Deactivate on creation (`"1"`/`"0"`, default: `"0"`) |
| `add_to_group_id`        | string | No       | Comma-separated segment/group IDs (`"-1"` for no groups) |
| `set_groups`             | string | No       | Override existing groups                              |
| `street`                 | string | No       | Street address                                       |
| `city`                   | string | No       | City                                                 |
| `state`                  | string | No       | State                                                |
| `zip`                    | string | No       | Zip code                                             |
| `country`                | string | No       | Country                                              |
| `phone`                  | string | No       | Phone number                                         |
| `paypal_email`           | string | No       | PayPal email for payouts                             |
| `company`                | string | No       | Company name                                         |
| `custom1` - `custom10`   | string | No       | Custom fields (`custom4` is date: `YYYY-MM-DD`)      |
| `notify`                 | string | No       | `none`, `new_ambassador`, or `campaign_access`       |

**Response (200):**

```json
{
  "response": {
    "code": "200",
    "message": "OK: The request was successful.",
    "data": {
      "referring_ambassador": {
        "first_name": "string",
        "last_name": "string",
        "email": "string",
        "uid": null,
        "commission": null,
        "balance_money": "string",
        "balance_points": "string",
        "memorable_url": "string",
        "unique_referrals": "string",
        "sandbox": "string",
        "custom1": null,
        "custom2": null,
        "custom3": null
      },
      "ambassador": {
        "first_name": "John",
        "last_name": "Doe",
        "created_at": "2026-03-19T10:00:00Z",
        "email": "johndoe@example.com",
        "uid": "CUST-0000123",
        "balance_money": "0.00",
        "balance_points": "0",
        "money_paid": "0.00",
        "points_paid": "0",
        "memorable_url": "string",
        "unique_referrals": "0",
        "sandbox": "0",
        "custom1": null,
        "custom2": null,
        "custom3": null,
        "custom4": null,
        "custom5": null,
        "custom6": null,
        "custom7": null,
        "custom8": null,
        "custom9": null,
        "custom10": null,
        "groups": "string",
        "street": "",
        "city": "",
        "state": "",
        "zip": "",
        "country": "",
        "phone": "",
        "company": "",
        "paypal_email": "",
        "status": "enrolled",
        "campaign_links": [
          {
            "campaign_uid": "string",
            "campaign_name": "string",
            "sandbox": "0",
            "private": "0",
            "facebook_enabled": "1",
            "campaign_description": "string",
            "url": "https://mbsy.co/XXXXX",
            "total_money_earned": "0.00",
            "total_points_earned": "0"
          }
        ]
      },
      "company": {
        "company_name": "string",
        "company_url": "string",
        "company_email": "string",
        "point_name": "string",
        "outgoing_email": "string",
        "avatar_url": "string"
      }
    }
  }
}
```

**Important:** Ambassadors already in the system cannot be re-referred via the API to prevent "referral hijacking."

---

### 5.3 Create a Referral (Record an Event)

**`POST /event/record/`**

This is the core referral creation endpoint. It records a conversion event, links the referred customer to the referrer, and creates the commission.

```bash
curl "https://api.getambassador.com/api/v2/{username}/{token}/json/event/record/" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "referred_customer@example.com",
    "campaign_uid": 25,
    "short_code": "abc123",
    "revenue": 99.99,
    "transaction_uid": "TXN-2026-001",
    "first_name": "Jane",
    "last_name": "Smith",
    "auto_create": 1,
    "is_approved": 1
  }' \
  -X POST
```

**Request Parameters:**

| Parameter                | Type    | Required      | Description                                          |
|--------------------------|---------|---------------|------------------------------------------------------|
| `email`                  | string  | **Yes**       | Referred customer's email                            |
| `campaign_uid`           | integer | **Conditional** | Campaign ID (required if no `product_id`)           |
| `product_id`             | integer | **Conditional** | Product ID (required if no `campaign_uid`)          |
| `short_code`             | string  | **Conditional** | Referrer's mbsy shortcode (needed for commission)   |
| `coupon_code`            | string  | **Conditional** | Company coupon code (alternative to `short_code`)   |
| `revenue`                | number  | No            | Event revenue amount (default: 0)                    |
| `commission_amount`      | number  | No            | Override campaign commission rules                    |
| `transaction_uid`        | string  | No            | Unique transaction identifier (must be unique per campaign) |
| `ip_address`             | string  | No            | Customer IP address                                  |
| `uid`                    | string  | No            | Your internal customer ID                            |
| `first_name`             | string  | No            | Customer first name                                  |
| `last_name`              | string  | No            | Customer last name                                   |
| `auto_create`            | integer | No            | Auto-create ambassador for referred user (1/0, default: 0) |
| `email_new_ambassador`   | integer | No            | Email credentials to new ambassador (1/0, default: 1) |
| `deactivate_new_ambassador` | integer | No        | Deactivate new ambassador on creation (1/0, default: 0) |
| `is_approved`            | integer | No            | Commission status: `1`=approved, `0`=pending (follows campaign settings if omitted) |
| `add_to_group_id`        | string  | No            | Comma-separated group IDs                            |
| `event_data1` - `event_data3` | string | No       | Custom event-specific fields                         |
| `custom1` - `custom10`   | string  | No            | Custom ambassador fields                             |
| `street`, `city`, `state`, `zip`, `country`, `phone` | string | No | Address fields          |
| `notify`                 | string  | No            | `none`, `new_ambassador`, or `campaign_access`       |
| `welcome_bonus_amount`   | number  | No            | Override referral bonus amount                       |

**Response (200):**

```json
{
  "response": {
    "code": "200",
    "message": "OK: The request was successful.",
    "data": {
      "referring_ambassador": {
        "first_name": "John",
        "last_name": "Doe",
        "email": "johndoe@example.com",
        "commission": 10.00,
        "balance_money": "10.00",
        "balance_points": "0",
        "memorable_url": "https://mbsy.co/XXXXX",
        "unique_referrals": "1",
        "custom1": null,
        "custom2": null,
        "custom3": null
      },
      "ambassador": {
        "first_name": "Jane",
        "last_name": "Smith",
        "email": "referred_customer@example.com",
        "balance_money": "0.00",
        "balance_points": "0",
        "memorable_url": "string",
        "unique_referrals": "0",
        "groups": "string",
        "campaign_links": [
          {
            "campaign_uid": "25",
            "campaign_name": "string",
            "url": "https://mbsy.co/YYYYY",
            "total_money_earned": "0.00",
            "total_points_earned": "0"
          }
        ]
      }
    }
  }
}
```

**Error cases:**
- `400`: Missing email, missing campaign_uid/product_id, invalid short_code, ambassador already exists
- `404`: "Commission not created. Referring Ambassador doesn't exist"
- `409`: "The provided transaction_uid already exists"

---

### 5.4 Update Referral / Commission Status

**`POST /commission/update/`**

Updates a pending commission to approved or denied.

```bash
curl "https://api.getambassador.com/api/v2/{username}/{token}/json/commission/update/" \
  -H "Content-Type: application/json" \
  -d '{
    "commission_uid": "COMM-12345",
    "is_approved": 1
  }' \
  -X POST
```

**Request Parameters:**

| Parameter        | Type    | Required      | Description                                           |
|------------------|---------|---------------|-------------------------------------------------------|
| `commission_uid` | string  | **Conditional** | Commission ID (from `/commission/all/`). Takes precedence over `transaction_uid` |
| `transaction_uid`| string  | **Conditional** | Transaction ID (alternative identifier)              |
| `campaign_uid`   | integer | No            | Additional filter when using `transaction_uid`        |
| `is_approved`    | integer | **Yes**       | `0`=pending, `1`=approved, `2`=denied                |

**Commission status values:**

| Value | Status    | Description                              |
|-------|-----------|------------------------------------------|
| `0`   | Pending   | Awaiting approval                        |
| `1`   | Approved  | Commission approved, added to balance    |
| `2`   | Denied    | Commission rejected                      |

**Constraints:**
- Paid commissions cannot be updated (for security reasons)
- If both `commission_uid` and `transaction_uid` are provided, `commission_uid` takes precedence

---

### 5.5 List All Commissions

**`POST /commission/all/`**

Retrieves up to 100 commissions per request.

```bash
curl "https://api.getambassador.com/api/v2/{username}/{token}/json/commission/all/" \
  -H "Content-Type: application/json" \
  -d '{}' \
  -X POST
```

Supports threshold-based filtering and pagination via `page` parameter.

---

### 5.6 Get Ambassador Details

**`GET /ambassador/get/`** (same as 5.2, without auto_create)

```bash
curl "https://api.getambassador.com/api/v2/{username}/{token}/json/ambassador/get/" \
  -H "Content-Type: application/json" \
  -d '{"email": "johndoe@example.com"}' \
  -X GET
```

Returns full ambassador profile including:
- `balance_money` / `balance_points` -- current reward balances
- `money_paid` / `points_paid` -- total paid out
- `unique_referrals` -- count of unique referrals
- `campaign_links[]` -- per-campaign share URLs and earnings
- `status` -- enrollment status
- `groups` -- segment membership

---

### 5.7 Get Ambassador Statistics

**`GET /ambassador/stats/`**

Returns detailed per-campaign statistics for an ambassador.

```bash
curl "https://api.getambassador.com/api/v2/{username}/{token}/json/ambassador/stats/" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "johndoe@example.com",
    "start_date": "2026-01-01",
    "end_date": "2026-03-19"
  }' \
  -X GET
```

**Request Parameters:**

| Parameter    | Type   | Required | Description                     |
|-------------|--------|----------|---------------------------------|
| `email`     | string | **Yes**  | Ambassador's email address      |
| `uid`       | string | No       | Internal unique ID              |
| `start_date`| string | No       | Stats from date (`YYYY-MM-DD`)  |
| `end_date`  | string | No       | Stats until date (`YYYY-MM-DD`) |
| `auto_create`| string | No      | Create if missing (1/0)         |

**Response includes:**
- `ambassador` -- profile with `balance_money`, `balance_points`, `unique_referrals`
- `stats_summary` -- overall commission counts/sums by status (pending, approved, denied)
- `campaign_links` -- per-campaign statistics (shares, clicks, referrals, revenue)
- `company` -- company information

---

### 5.8 List All Ambassadors

**`GET /ambassador/all/`**

Returns up to 100 ambassadors per page.

```bash
curl "https://api.getambassador.com/api/v2/{username}/{token}/json/ambassador/all/?page=1"
```

**Query Parameters:**

| Parameter          | Type    | Description                                    |
|--------------------|---------|------------------------------------------------|
| `page`             | integer | Page number for pagination                     |
| `min_money`        | number  | Minimum monetary balance                        |
| `min_points`       | integer | Minimum point balance                           |
| `min_referrals`    | integer | Minimum unique referrals                        |
| `email`            | string  | Filter by email                                 |
| `uid`              | string  | Filter by user ID                               |
| `is_active`        | string  | `"1"` for active, `"0"` for deactivated        |
| `created_at__lte`  | string  | Created on/before (`YYYY-MM-DD`)               |
| `created_at__gte`  | string  | Created on/after (`YYYY-MM-DD`)                |
| `sandbox`          | integer | Filter sandbox ambassadors (1/0)                |
| `group`            | string  | Filter by Segment ID                            |

**Response:**

```json
{
  "response": {
    "code": "200",
    "message": "OK: The request was successful.",
    "data": {
      "ambassadors": [
        {
          "first_name": "string",
          "last_name": "string",
          "email": "string",
          "uid": "string",
          "balance_money": "string",
          "balance_points": "string",
          "money_paid": "string",
          "points_paid": "string",
          "memorable_url": "string",
          "unique_referrals": "string",
          "sandbox": "string",
          "created_at": "2026-03-19T10:00:00Z",
          "fraud_score": 0,
          "fraud_score_human_readable": null,
          "fraud_score_percent_ui": 0,
          "fraud_reasons": {}
        }
      ]
    }
  }
}
```

---

### 5.9 Update Ambassador Profile

**`POST /ambassador/update/`**

```bash
curl "https://api.getambassador.com/api/v2/{username}/{token}/json/ambassador/update" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "johndoe@example.com",
    "first_name": "John",
    "last_name": "Doe",
    "is_deactivated": 0
  }' \
  -X POST
```

**Key parameters:** `email` or `uid` (to identify), `new_email`, `new_uid`, `first_name`, `last_name`, `is_deactivated` (1=deactivate, 0=activate), `set_groups`, `custom1`-`custom10`, address fields, `paypal_email`, `company`.

**Response (200):**

```json
{
  "response": {
    "code": "200",
    "message": "OK: The request was successful. See response body for additional data.",
    "data": {
      "message": "Ambassador updated successfully."
    }
  }
}
```

---

### 5.10 Balance Management

**`POST /balance/add/`** -- Add to ambassador's reward balance

```bash
curl "https://api.getambassador.com/api/v2/{username}/{token}/json/balance/add/" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "johndoe@example.com",
    "amount": 25.00,
    "type": "money"
  }' \
  -X POST
```

**`POST /balance/deduct/`** -- Deduct from ambassador's reward balance

```bash
curl "https://api.getambassador.com/api/v2/{username}/{token}/json/balance/deduct/" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "johndoe@example.com",
    "amount": 25.00,
    "type": "money"
  }' \
  -X POST
```

Both accept `type`: `"money"` or `"points"` (default: `"money"`).

---

### 5.11 Create Commission Without Referrer

**`POST /commission/add/`**

For giving commission credit without a referring ambassador.

**Required:** `email` or `uid` + `campaign_uid` or `product_id` + `revenue`

---

### 5.12 Get Company Statistics

**`GET /company/stats/`**

Retrieves high-level statistics about your company's referral program. No parameters required beyond authentication.

---

## 6. Complete Endpoint Summary

| Method | Endpoint                | Description                                |
|--------|-------------------------|--------------------------------------------|
| GET    | `/company/get/`         | Company info + active campaigns            |
| GET    | `/company/stats/`       | Company-wide referral program statistics   |
| GET    | `/company/token/`       | Token info                                 |
| GET    | `/ambassador/get/`      | Get or create an ambassador                |
| GET    | `/ambassador/all/`      | List all ambassadors (paginated, max 100)  |
| GET    | `/ambassador/stats/`    | Detailed ambassador statistics             |
| POST   | `/ambassador/update/`   | Update ambassador profile                  |
| POST   | `/event/record/`        | Record referral event (create referral)    |
| POST   | `/event/multi_record/`  | Record events for multiple campaigns       |
| POST   | `/commission/all/`      | List commissions (paginated, max 100)      |
| POST   | `/commission/update/`   | Update commission status                   |
| POST   | `/commission/add/`      | Create commission without referrer          |
| POST   | `/balance/add/`         | Add to ambassador balance                  |
| POST   | `/balance/deduct/`      | Deduct from ambassador balance             |
| GET    | `/shortcode/get/`       | Resolve a shortcode to ambassador + campaign |
| POST   | `/group/get/`           | Get segment/group details                  |
| GET    | `/group/all/`           | List all segments/groups                   |
| GET    | `/share_tracker/track_share/` | Track a share event                  |
| POST   | `/compliance/remove/`   | Remove compliance data                     |
| POST   | `/compliance/export/`   | Export compliance data                     |

---

## 7. Referral Flow & Status Stages

### The Referral Lifecycle

```
1. ENROLL AMBASSADOR
   POST /ambassador/get/ (auto_create=1)
   --> Ambassador gets unique share links (mbsy.co/CODE)

2. AMBASSADOR SHARES LINK
   --> Referred visitor clicks mbsy.co/CODE
   --> Redirects to landing page with ?mbsy=SHORTCODE&campaignid=XX
   --> Your app stores the mbsy shortcode in session/cookie

3. REFERRED VISITOR CONVERTS
   POST /event/record/
   --> Pass short_code + email + campaign_uid + revenue
   --> Commission created (pending or auto-approved per campaign settings)

4. COMMISSION APPROVAL
   POST /commission/update/
   --> Move from pending (0) to approved (1) or denied (2)

5. PAYOUT
   Managed through Ambassador dashboard or /balance/deduct/
```

### Commission Status Stages

| Status Code | Status   | Description                                     |
|-------------|----------|-------------------------------------------------|
| `0`         | Pending  | Awaiting review/approval                        |
| `1`         | Approved | Commission approved, credited to balance        |
| `2`         | Denied   | Commission rejected                             |
| --          | Paid     | Payout processed (cannot be updated via API)    |

### Ambassador/Contact Status Values

| Status         | Description                           |
|----------------|---------------------------------------|
| `enrolled`     | Active ambassador                     |
| `prospect`     | Lead/prospect, not yet active         |
| `banned`       | Blocked from participating            |
| `unsubscribed` | Opted out                             |

---

## 8. Reward Tracking

**Yes, the API exposes reward balances.** Available in responses from `/ambassador/get/`, `/ambassador/stats/`, `/ambassador/all/`, and `/event/record/`:

### Referrer (Ambassador) Balances

| Field             | Description                    |
|-------------------|-------------------------------|
| `balance_money`   | Current monetary balance       |
| `balance_points`  | Current points balance         |
| `money_paid`      | Total money already paid out   |
| `points_paid`     | Total points already paid out  |
| `unique_referrals`| Count of unique referrals      |

### Per-Campaign Earnings

| Field                | Description                |
|----------------------|---------------------------|
| `total_money_earned` | Money earned in campaign   |
| `total_points_earned`| Points earned in campaign  |

### Referred Customer Balances

The `/event/record/` response includes both `referring_ambassador` and `ambassador` (the referred person) objects, each with `balance_money` and `balance_points`.

### Balance Management API

- `POST /balance/add/` -- Add money or points to a balance
- `POST /balance/deduct/` -- Deduct money or points from a balance

---

## 9. JavaScript SDK / Tracking

Ambassador provides a **Universal Snippet** (client-side JavaScript SDK) that goes on your website.

### Installation

Include the Universal Snippet on your website (obtained from your Ambassador dashboard). It loads the `mbsy` global object.

### Core Methods

#### `mbsy.identify(uniqueId, traits, options)` -- Identify / Enroll Users

```javascript
mbsy.identify("CUST-123", {
  email: "john@example.com",        // required
  firstName: "John",
  lastName: "Doe",
  company: "Acme Inc",
  phone: "555-1234",
  custom1: "value1",
  custom2: "value2"
}, {
  campaigns: "25,30",               // campaign IDs to enroll in
  segments: "seg1,seg2",            // segment assignment
  emailNewAmbassador: true,         // send welcome email
  enroll: true                      // enroll as ambassador (default true)
});
```

#### `mbsy.track(properties)` -- Track Conversions

```javascript
// IMPORTANT: mbsy.identify() must be called before every mbsy.track() call
mbsy.track({
  campaign: 25,                     // required - campaign ID
  revenue: 99.99,                   // optional - purchase amount
  transactionId: "TXN-2026-001",   // optional - unique transaction ID
  commissionApproved: true,         // required - auto-approve commission?
  eventData1: "plan_premium",       // optional - custom event data
  eventData2: "annual",
  is_trial: false                   // optional - zero-revenue commission
});
```

#### `mbsy.on(event, callback)` -- Event Listeners

Available events:
- `buttonVisibility`, `click`, `copy`, `formSubmit`, `load`
- `promptEnroll`, `share`, `ssoEnroll`, `trigger`, `visibility`
- `mbsyIdentifySuccess`, `mbsyIdentifyError`

#### Reading Referrer Data (from cookie/localStorage)

```javascript
const referrerData = JSON.parse(localStorage.getItem("mbsy/cookie")).value;
// Returns: { mbsy_cookie_code, mbsy_cookie_campaign, mbsy_source }
```

### Embeddable Widgets

- **Refer-A-Friend Widget** -- Drop-in sharing widget for ambassadors
- **Form Snippet** -- Enrollment form
- **Image Snippet** -- Branded sharing image
- **Share Tracking Snippet** -- Track social shares
- **Cookie Fetching Snippet** -- Legacy referral cookie capture (deprecated)

---

## 10. Share Links & Tracking

### URL Structure

| Environment | Format                    | Example                |
|-------------|---------------------------|------------------------|
| Production  | `mbsy.co/{CODE}`          | `mbsy.co/bFVj`        |
| Sandbox     | `mbsy.co/sndbx/{CODE}`   | `mbsy.co/sndbx/test1` |

- Max shortcode length: 32 characters
- Share links use SEO-friendly **301 redirects** to your campaign landing page
- Share links are automatically generated when an ambassador is created

### Query Parameters on Redirect

When a share link redirects to your landing page, these query parameters are appended:

| Parameter        | Description                           |
|------------------|---------------------------------------|
| `mbsy`           | Referrer's shortcode                  |
| `campaignid`     | Associated campaign ID                |
| `discount_value` | Discount code value (if configured)   |

Your application should capture the `mbsy` parameter from the URL and store it in the user's session for later use in `/event/record/`.

---

## 11. Server-Side Libraries

| Language   | Package          | Repository                                    | Status     |
|------------|------------------|-----------------------------------------------|------------|
| **Node.js**| `npm install mbsy`| https://github.com/GetAmbassador/mbsy.js     | Archived (2021) |
| **Ruby**   | `mbsy` gem       | https://github.com/GetAmbassador/mbsy         | Archived   |
| **PHP**    | `ambassador`     | https://github.com/GetAmbassador/ambassador   | Archived   |

### Node.js Usage (mbsy)

```javascript
var mbsy = require('mbsy').createClient('YOUR_USERNAME', 'YOUR_API_KEY');

// Get/create ambassador
mbsy.Ambassador.get({ email: 'john@example.com', auto_create: 1 }, function(err, data) {
  console.log(data);
});

// Record event
mbsy.Event.record({
  email: 'referred@example.com',
  campaign_uid: 25,
  short_code: 'abc123',
  revenue: 99.99
}, function(err, data) {
  console.log(data);
});

// Generic API call
mbsy.Custom.get('shortcode/get', { short_code: 'abc123' }, function(err, data) {
  console.log(data);
});
```

> **Note:** The Node.js library is archived (read-only since 2021). For a POC, calling the REST API directly with `fetch` or `axios` is recommended.

---

## 12. Webhooks (Event-Driven Notifications)

Instead of polling, Ambassador supports webhooks for real-time notifications:

| Webhook Event                | Trigger                                    |
|------------------------------|--------------------------------------------|
| Contact Created              | New ambassador/contact added               |
| Contact Status Updated       | Ambassador status changes                  |
| Share Tracked                | Ambassador shares their link               |
| Click Tracked                | Someone clicks a share link                |
| Referral Created             | New referral recorded                      |
| Commission Created           | New commission generated                   |
| Commission Status Updated    | Commission status changes (pending/approved/denied) |
| Payout Created               | Payout processed                           |
| Contact Added to Campaign    | Ambassador enrolled in campaign            |
| Contact Added to Segment     | Ambassador added to segment                |
| Custom Share Code Created    | Custom shortcode created                   |
| Custom Share Code Updated    | Custom shortcode modified                  |

Webhooks are configured through the Ambassador dashboard and include security and retry mechanisms.

---

## 13. Key Constraints & Notes

1. **Transaction IDs must be unique** per campaign for `/event/record/` calls. Different campaigns can share the same transaction ID.
2. **Existing ambassadors cannot be re-referred** via the API (prevents referral hijacking).
3. **Test and production data cannot be mixed** -- use `sandbox=1` for testing.
4. **No public Swagger/OpenAPI spec** was found. No downloadable Postman collection was found in the documentation.
5. **The `/ambassador/get/` endpoint gets slower** the more segments an ambassador belongs to.
6. **Pagination** is limited to 100 results per page for `/ambassador/all/` and `/commission/all/`.
7. **All monetary/numeric values in responses are returned as strings**, not numbers.
