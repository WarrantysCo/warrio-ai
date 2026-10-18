# Warrio AI

Warrio is the AI CEO for Warrantys.co. Every customer message goes to the CEO
(`app/lib/agents/ceo.ts`), which hands it to the agent whose job it is.

| Agent | Status | Job |
| --- | --- | --- |
| Sales | live | Reads the customer's invoice, recommends a plan, creates the lead |
| Support | live | Answers warranty, coverage and claim questions |
| Operations, Shipping, WhatsApp, Marketing | planned | Listed in `app/lib/agents/registry.ts` |

## Sales flow

1. The customer uploads an invoice on the website (`/api/warrio`).
2. Gemini reads the invoice (`app/lib/agents/sales/agent.ts`).
3. Plain code picks the plan and price from the price list and checks
   eligibility (`app/lib/agents/sales/pricing.ts`). The AI never sets a price.
4. Gemini writes a short reply in the customer's language.
5. The customer fills in their details and the lead is saved (`/api/leads`) and
   sent to n8n, where it lands in the "Warrio Leads" table.

Prices come from `Product cost for Warrio Database_290726.xlsx` and live in
`app/data/priceList.ts`. Eligibility rules are in `app/data/salesRules.ts`.
`buildN8nInstructions()` in `app/lib/agents/sales/instructions.ts` produces the
same rules and prices as text for the n8n "Warrio Instructions" step.

## Settings

| Name | Needed for |
| --- | --- |
| `GEMINI_API_KEY` | Reading invoices and answering questions |
| `N8N_LEADS_WEBHOOK_URL` | Optional. n8n Webhook URL that saves website leads |
| `N8N_WEBHOOK_SECRET` | Optional. Sent as the `X-Warrio-Secret` header |

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000.
