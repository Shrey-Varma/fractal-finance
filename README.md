<div align="center">

# 💰 Fractal Finance

### AI-Powered Personal Finance App — Entrepreneurship Track Winner

[![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react)](https://reactjs.org/)
[![Plaid](https://img.shields.io/badge/Plaid-Bank%20Linking-00A36C?logo=plaid)](https://plaid.com/)
[![OpenAI](https://img.shields.io/badge/OpenAI-GPT--3.5-412991?logo=openai)](https://openai.com/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?logo=supabase)](https://supabase.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript)](https://www.typescriptlang.org/)

**🏆 Winner — Entrepreneurship Track**

**A full-stack personal finance platform that links real bank accounts via Plaid, categorizes 50+ transaction types, and executes intelligent automations triggered by real-time webhooks — with sub-4-second BERT inference for spending enforcement.**

[Repo](https://github.com/Shrey-Varma/fractal-finance) · [Architecture](#architecture) · [Features](#features) · [Getting Started](#getting-started)

</div>

---

## Overview

Fractal Finance is an AI-native personal finance application that solves the hardest problem in consumer fintech: making real financial data actionable in real time. By combining Plaid's bank-linking API with a webhook-driven automation engine and BERT-powered spending analysis, the platform lets users define rules like *"alert me when my checking balance drops below $500"* or *"flag any transaction over $100 at a restaurant"* — and enforces them in seconds.

### Key Technical Achievements

| Achievement | Detail |
|---|---|
| **Plaid Integration** | Full Link flow with card linking, transaction sync across 50+ categories |
| **Webhook Pipeline** | Plaid webhooks ingested → transaction persisted in Supabase → automations evaluated → SMS dispatched |
| **BERT Inference** | Sub-4-second spending category classification via fine-tuned BERT model |
| **AI Category Matching** | GPT-3.5 matches user-defined categories/merchants to Plaid's taxonomy |
| **Automation Engine** | Rule-based trigger/criteria/action system with balance thresholds and new-transaction events |
| **SMS Notifications** | Vonage SDK sends real-time spend alerts with templated messages |

---

## Features

### 🏦 Bank Account Linking (Plaid)
- **React Plaid Link** embedded widget for OAuth bank linking
- Fetches and syncs real transaction history on connection
- Supports checking, savings, investment accounts across all major US banks
- Persists accounts, balances, and transactions to Supabase in real time

### 🔄 Webhook-Driven Transaction Ingestion
Plaid webhooks are consumed by a Next.js API route, which:
1. Receives `TRANSACTIONS_SYNC` events from Plaid
2. Fetches new/modified/removed transactions via Plaid's incremental sync API
3. Upserts transactions into Supabase `transactions` table
4. Triggers the automation engine for all active user flows

```
Plaid → POST /api/plaid/webhook
         └─ Sync transactions → Supabase
         └─ Run trigger engine → evaluate automations
         └─ Execute actions → Vonage SMS
```

### 🤖 AI-Powered Transaction Intelligence

**Category Matching (GPT-3.5)**
When a user creates an automation filtering by "coffee" or "fast food", the system calls GPT-3.5 to map natural language to Plaid's exact category taxonomy:

```
User: "food" → GPT: ["FOOD_AND_DRINK"] (from available categories)
User: "gas"  → GPT: ["TRANSPORTATION", "AUTOMOTIVE"]
```

**Merchant Matching (GPT-3.5 + fuzzy fallback)**
Natural language merchant queries are resolved to actual merchant names in the user's transaction data, with a fuzzy string-matching fallback:

```
User: "coffee shops" → ["Starbucks", "Dunkin'", "Blue Bottle Coffee"]
```

**BERT Transaction Categorization**
A fine-tuned BERT model provides sub-4-second inference for custom transaction category classification, augmenting Plaid's built-in taxonomy with domain-specific labels. Enforces spending limits per category with model confidence thresholds.

### ⚡ Automation Engine (Trigger → Criteria → Action)

The automation engine (`/src/engine/`) is a rules-based pipeline evaluating user-defined flows:

#### Trigger Types
| Trigger | Description |
|---|---|
| `balance_threshold` | Fires when account balance crosses a configured amount |
| `new_transaction` | Fires on every new transaction ingested from Plaid |
| `now` | Fires immediately for manual/test execution |

#### Criteria (Filter Conditions)
- Spending above/below a limit in a category
- Transaction amount threshold
- Merchant name match (AI-resolved)
- Account name filter

#### Actions
| Action | Description |
|---|---|
| `notify` | Sends templated SMS via Vonage with dynamic placeholders |
| `transfer` | Logs transfer intent (extensible for Plaid Transfer API) |

**Example automation flow:**
```json
{
  "triggers": [{ "type": "balance_threshold", "threshold": { "amount": 500, "direction": "below" }}],
  "criteria": [{ "conditionType": "category_spend", "category": "FOOD_AND_DRINK", "amount": 200 }],
  "actions": [{ "type": "notify", "message": "Balance low: ${balance}. Food spend: ${amount}" }]
}
```

### 📊 Transaction Dashboard
- Full transaction history with date, merchant, amount, category
- Recharts-powered spending breakdowns (pie, bar, line charts)
- D3.js date/scale utilities for time-series aggregations
- Category-level drill-down with AI-matched filters

### 🎯 Financial Goals
- Set and track savings goals with progress visualization
- Automated goal-funding rules via the trigger engine

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Next.js 15 App                          │
│                                                             │
│  /app/home         – Dashboard, spending charts             │
│  /app/transactions – Full transaction ledger                │
│  /app/automations  – Flow builder (trigger/criteria/action) │
│  /app/goals        – Goals tracking                         │
│  /app/agent        – AI financial assistant                 │
└─────────────────┬───────────────────────────────────────────┘
                  │  API Routes
                  ▼
┌─────────────────────────────────────────────────────────────┐
│               Next.js API Routes (/app/api/)                │
│                                                             │
│  /api/plaid/link-token   – Create Plaid Link session        │
│  /api/plaid/exchange     – Exchange public token            │
│  /api/plaid/webhook      – Receive Plaid events             │
│  /api/plaid/sync         – Incremental transaction sync     │
│  /api/automations        – CRUD for user flows              │
│  /api/run-automation     – Manual trigger execution         │
└─────┬──────────────────────────┬───────────────────────────┘
      │                          │
      ▼                          ▼
┌──────────────┐         ┌──────────────────────────────────┐
│   Plaid API  │         │      Automation Engine           │
│   (Bank link,│         │  /src/engine/                    │
│    Webhooks, │         │  ┌─────────────────────────────┐ │
│    Tx sync)  │         │  │ trigger-engine.ts            │ │
└──────────────┘         │  │  processBalanceThresholds()  │ │
                         │  │  processNewTransactionTrig.. │ │
      ┌──────────────┐   │  │  processNowTriggerWorkflow() │ │
      │  Vonage SMS  │◄──│  ├─────────────────────────────┤ │
      │   (Alerts)   │   │  │ conditions.ts (criteria eval)│ │
      └──────────────┘   │  │ ai-matching.ts (GPT resolv.) │ │
                         │  │ actions.ts (SMS dispatch)    │ │
      ┌──────────────┐   │  └─────────────────────────────┘ │
      │  OpenAI API  │◄──│                                  │
      │  (Category + │   └──────────────────────────────────┘
      │   Merchant   │
      │   matching)  │          ┌─────────────────────────┐
      └──────────────┘          │       Supabase           │
                                │  - Auth (JWT)            │
                                │  - plaid_connections     │
                                │  - accounts + balances   │
                                │  - transactions          │
                                │  - flows (automations)   │
                                │  - user_profiles         │
                                └─────────────────────────┘
```

---

## Tech Stack

| Category | Technology |
|---|---|
| **Frontend** | Next.js 15, React 18, TypeScript 5, Tailwind CSS 4 |
| **Bank Data** | Plaid (Link, Transactions, Webhooks) via `react-plaid-link` |
| **AI / ML** | OpenAI GPT-3.5 (category + merchant matching), BERT (transaction classification) |
| **AI Framework** | LangChain + `@langchain/core` |
| **Charts** | Recharts 3, D3 (scale, time, format) |
| **Database** | Supabase PostgreSQL |
| **Auth** | Supabase Auth, `@supabase/ssr` |
| **SMS Notifications** | Vonage Server SDK |
| **Animations** | Framer Motion |
| **Styling Utilities** | clsx, tailwind-merge |

---

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── plaid/
│   │   │   ├── link-token/     # Create Plaid Link token
│   │   │   ├── exchange/       # Public token → access token
│   │   │   ├── webhook/        # Receive Plaid webhook events
│   │   │   └── sync/           # Incremental transaction sync
│   │   ├── automations/        # CRUD for user automation flows
│   │   └── run-automation/     # Manual flow execution
│   ├── home/                   # Main dashboard
│   ├── transactions/           # Transaction ledger
│   ├── automations/            # Flow builder UI
│   ├── goals/                  # Financial goals
│   └── agent/                  # AI chat assistant
├── engine/
│   ├── trigger-engine.ts       # Core automation orchestrator
│   ├── conditions.ts           # Balance/category/merchant criteria evaluation
│   ├── ai-matching.ts          # GPT-3.5 category + merchant resolution
│   ├── actions.ts              # SMS action executor (Vonage)
│   └── types.ts                # AutomationRule, UserAccount, Trigger types
├── components/                 # Shared React components
├── utils/
│   ├── supabase/               # Client/server Supabase helpers
│   └── sms.ts                  # Vonage SMS wrapper
└── schemas/                    # Zod validation schemas
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- [Supabase](https://supabase.com/) project
- [Plaid](https://plaid.com/) developer account (Sandbox)
- [OpenAI](https://platform.openai.com/) API key
- [Vonage](https://www.vonage.com/) account (for SMS)

### 1. Clone & Install

```bash
git clone https://github.com/Shrey-Varma/fractal-finance.git
cd fractal-finance
npm install
```

### 2. Configure Environment

Create `.env.local`:
```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Plaid
PLAID_CLIENT_ID=your_plaid_client_id
PLAID_SECRET=your_plaid_sandbox_secret
PLAID_ENV=sandbox

# OpenAI
OPENAI_API_KEY=your_openai_api_key

# Vonage (SMS)
VONAGE_API_KEY=your_vonage_api_key
VONAGE_API_SECRET=your_vonage_api_secret
VONAGE_FROM_NUMBER=your_vonage_number
```

### 3. Set Up Database

Run the Supabase migrations in `supabase/` to create tables for `plaid_connections`, `accounts`, `balances`, `transactions`, `flows`, and `user_profiles`.

### 4. Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and connect your bank via Plaid Sandbox.

---

## Automation Engine — Deep Dive

### `processBalanceThresholds(userId)`

Called after each webhook event. For every active automation with a `balance_threshold` trigger:

1. Fetches the user's linked accounts and current balances from Supabase
2. Checks if the threshold condition is met (e.g., balance < $500)
3. Evaluates additional `criteria` conditions (category spend, merchant filters)
4. If all pass → executes `notify` actions via Vonage SMS with templated messages

### `processNewTransactionTriggers(userId)`

Processes recent transactions (7-day window) against automations with `new_transaction` triggers. Per transaction:

1. Resolves the transaction's account
2. Evaluates all criteria conditions with GPT-3.5 merchant/category resolution
3. Fires once per trigger per run (deduplication via `break` after first match)
4. Dispatches SMS with merchant, amount, date, and balance placeholders

### AI Category & Merchant Resolution

```typescript
// findMatchingCategories — maps "food" → ["FOOD_AND_DRINK"]
const categories = await findMatchingCategories(userInput, plaidCategories, userId)

// findMatchingMerchants — maps "coffee" → ["Starbucks", "Dunkin'"]
const merchants = await findMatchingMerchants(userInput, transactionMerchants, userId)
```

Both functions validate AI output against ground-truth lists, with fuzzy-match fallback for merchants.

---

## License

MIT — see [LICENSE](LICENSE) for details.
