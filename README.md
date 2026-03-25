# Referral Rock POC

React + TypeScript proof-of-concept for the Referral Rock ambassador API.
Walks through the full referral lifecycle in a step-by-step UI.

## Flow

```
┌─────────────────────────────────────────────────────┐
│                    Browser (React)                   │
└────────────────────────┬────────────────────────────┘
                         │
          ┌──────────────▼──────────────┐
          │   Step 1: Create Referrer   │  POST /members
          │   (Enroll ambassador)       │
          └──────────────┬──────────────┘
                         │ referralCode
          ┌──────────────▼──────────────┐
          │   Step 2: Referred Signup   │  POST /referrals
          │   Referral → pending        │
          └──────────────┬──────────────┘
                         │
          ┌──────────────▼──────────────┐
          │   Step 3: Place Work Order  │  POST /referrals/{id}/workorders
          │   Referral → qualified      │
          └──────────────┬──────────────┘
                         │
          ┌──────────────▼──────────────┐
          │   Step 4: Payment Received  │  PUT  /referrals/{id}/workorders/{wo}
          │   Referral → approved       │
          └──────────────┬──────────────┘
                         │
          ┌──────────────▼──────────────┐
          │   Inspector Panel           │  GET  /members/{id}/balance
          │   Reward balance + logs     │
          └─────────────────────────────┘
```

## Setup

```bash
cp .env.example .env
# fill in VITE_PUBLIC_KEY, VITE_PRIVATE_KEY, VITE_PROGRAM_ID
npm install
npm run dev
```

Open http://localhost:5173 and follow the steps in order.
