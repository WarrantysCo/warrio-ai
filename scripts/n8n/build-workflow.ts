// Builds the importable n8n workflow "Warrio v2 Invoice (Gemini)" from the same
// price list and rules the website uses.
//
// Run from the repo root:
//   JITI_ALIAS='{"@":"'$PWD'"}' npx jiti scripts/n8n/build-workflow.ts > Warrio-Workflow-v2.5-Gemini.json

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { priceCategories } from "@/app/data/priceList";
import { salesRules } from "@/app/data/salesRules";

const SETTINGS_NODE = "Warrio Settings (edit here)";
const FORM_NODE = "Enquiry Form";
const TABLE_NODE = "Create Leads Table (first time only)";
const PLAN_NODE = "Pick Plan From Price List";
const PAY_CHECK_NODE = "Make Payment Link?";
const REPLY_CHECK_NODE = "Gemini Writes Reply?";
const REPLY_NODE = "Ask Gemini: Write Reply";
const RAZORPAY_NODE = "Create Razorpay Payment Link";
const PREPARE_NODE = "Prepare Lead";

// Code node scripts live in scripts/n8n/code so they can be read and edited as plain JavaScript.
const code = (file: string) => readFileSync(join(__dirname, "code", file), "utf8");
const prepareCode = code("build-gemini-request.js");
const pickPlanCode = code("pick-plan.js");
const finalizeCode = code("prepare-lead.js");

const leadColumns: [string, "string" | "number" | "boolean"][] = [
  ["date", "string"],
  ["name", "string"],
  ["mobile", "string"],
  ["email", "string"],
  ["question", "string"],
  ["invoice_ok", "boolean"],
  ["invoice_file", "string"],
  ["seller", "string"],
  ["invoice_number", "string"],
  ["invoice_date", "string"],
  ["name_on_invoice", "string"],
  ["product_category", "string"],
  ["brand", "string"],
  ["model", "string"],
  ["serial_or_imei", "string"],
  ["price_inr", "number"],
  ["days_since_purchase", "number"],
  ["recommended_plan", "string"],
  ["plan_price_inr", "number"],
  ["notes_for_team", "string"],
  ["warrio_reply", "string"],
  ["status", "string"],
  ["source", "string"],
];

function priceListCode() {
  const rows = priceCategories
    .map((category) => {
      const bands = category.bands
        .map((band) => `      [${band.map((value) => (value === null ? "null" : value)).join(", ")}],`)
        .join("\n");
      return `  {\n    name: ${JSON.stringify(category.name)},\n    short: ${JSON.stringify(category.shortName)},\n    // [device price above Rs, up to Rs, 1-year plan, 2-year plan, 3-year plan]; null = not sold\n    bands: [\n${bands}\n    ],\n  },`;
    })
    .join("\n");
  return `[\n${rows}\n]`;
}

const settingsCode = `// ===== WARRIO SETTINGS: edit prices and rules here =====

// Gemini model that reads the invoice. "gemini-flash-lite-latest" is Google's fastest model.
// For harder invoices you can use "gemini-flash-latest" (more careful, but slower).
const MODEL = "gemini-flash-lite-latest";

// false: the customer gets Warrio's ready-made warm message at once (fastest).
// true: Gemini writes a personal message first, which adds waiting time.
const AI_WRITES_REPLY = false;

// Plan must be bought within this many days of the invoice date.
const PURCHASE_WINDOW_DAYS = ${salesRules.purchaseWindowDays};

// Which plan Warrio recommends when 1, 2 and 3 year plans are all sold: "longest" or "shortest".
const RECOMMEND = "${salesRules.recommend}";

const COUNTRY = "${salesRules.country}";

// WhatsApp number for the plan and question buttons: country code + number, no spaces or +.
const WHATSAPP_NUMBER = "918875192691";
const PHONE_DISPLAY = "88751 92691";

// true: make a Razorpay payment link with the exact plan price for every customer
// (needs the "Razorpay" key in the "Create Razorpay Payment Link" box).
// false: the plan button opens WhatsApp instead.
const USE_RAZORPAY = true;

const COVERED = ${JSON.stringify(salesRules.coverage.join(", "))};

// Why customers should buy. Only true promises from the Warrantys.co website FAQ and refund policy.
const WHY_WARRIO = [
  "100% cashless repairs with no hidden charges",
  "Authorized technicians and genuine spare parts",
  "If the device cannot be repaired, a replacement or full refund with no depreciation",
  "Unlimited repairs up to the device's purchase price",
  "Warranty certificate on email within 24 hours",
  "Full refund if cancelled within 7 days",
];
const NOT_COVERED = ${JSON.stringify(salesRules.exclusions.join(", "))};

// From "Product cost for Warrio Database_290726.xlsx".
// The first row of each product includes its lower price; later rows start just above it.
const PRICE_LIST = ${priceListCode()};

// Carry the uploaded invoice forward from the form.
return [{
  json: { MODEL, AI_WRITES_REPLY, PURCHASE_WINDOW_DAYS, RECOMMEND, COUNTRY, WHATSAPP_NUMBER, PHONE_DISPLAY, USE_RAZORPAY, COVERED, NOT_COVERED, WHY_WARRIO, PRICE_LIST },
  binary: $('${FORM_NODE}').first().binary,
}];
`;




const escapeHtml = "String($json.warrio_reply).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\\n/g, '<br>')";

const replyPage = `=<div style="font-family: Arial, sans-serif; max-width: 560px; margin: 24px auto; line-height: 1.6;">
<h2 style="margin: 0 0 12px;">🛡️ Warrio, Warrantys.co</h2>
<p style="font-size: 16px;">{{ ${escapeHtml} }}</p>
{{ (() => { const plan = $('Pick Plan From Price List').first().json; const pay = $('${RAZORPAY_NODE}').isExecuted ? $('${RAZORPAY_NODE}').first().json : {}; const link = plan.make_payment_link && typeof pay.short_url === 'string' && /^https:\\/\\/[\\w./-]+$/.test(pay.short_url) ? pay.short_url : ''; return link ? plan.plan_box_pay_html.split('__PAY_LINK__').join(link) : plan.plan_box_html; })() }}
<p style="margin-top: 20px; color: #555;">If you prefer, our team is also happy to call you on {{ $json.mobile }}.</p>
</div>`;

const geminiHttpNode = (name: string, urlExpr: string, bodyExpr: string, position: [number, number]) => ({
  parameters: {
    method: "POST",
    url: `={{ ${urlExpr} }}`,
    authentication: "predefinedCredentialType",
    nodeCredentialType: "googlePalmApi",
    sendBody: true,
    specifyBody: "json",
    jsonBody: `={{ JSON.stringify(${bodyExpr}) }}`,
    // A stuck call gives up after 30 seconds instead of keeping the customer waiting.
    options: { timeout: 30000 },
  },
  name,
  type: "n8n-nodes-base.httpRequest",
  typeVersion: 4.2,
  position,
  onError: "continueRegularOutput",
  // Google's free tier often answers "busy" (429 or 503); try again before giving up.
  retryOnFail: true,
  maxTries: 2,
  waitBetweenTries: 3000,
  credentials: { googlePalmApi: { id: "", name: "Google Gemini(PaLM) Api account" } },
});

const nodes = [
  {
    parameters: {
      path: "warrio",
      formTitle: "Warrantys.co – Get the best warranty plan",
      formDescription:
        "Upload the purchase invoice of your device. Warrio will read it and suggest the right extended warranty plan.",
      formFields: {
        values: [
          { fieldLabel: "Your name", requiredField: true },
          { fieldLabel: "Mobile number", placeholder: "10-digit mobile number", requiredField: true },
          { fieldLabel: "Email", fieldType: "email" },
          {
            fieldLabel: "Invoice",
            fieldType: "file",
            multipleFiles: false,
            acceptFileTypes: ".jpg, .jpeg, .png, .webp, .pdf",
            requiredField: true,
          },
          { fieldLabel: "Your question (optional)", fieldType: "textarea" },
        ],
      },
      responseMode: "lastNode",
      options: { buttonLabel: "Get my plan", appendAttribution: false },
    },
    name: FORM_NODE,
    type: "n8n-nodes-base.formTrigger",
    typeVersion: 2.3,
    position: [0, 0],
    webhookId: "warrio",
  },
  {
    parameters: {
      resource: "table",
      operation: "create",
      tableName: "Warrio Leads",
      columns: { column: leadColumns.map(([name, type]) => ({ name, type })) },
      options: { createIfNotExists: true },
    },
    name: TABLE_NODE,
    type: "n8n-nodes-base.dataTable",
    typeVersion: 1.1,
    position: [220, 0],
  },
  {
    parameters: { jsCode: settingsCode },
    name: SETTINGS_NODE,
    type: "n8n-nodes-base.code",
    typeVersion: 2,
    position: [440, 0],
  },
  {
    parameters: { jsCode: prepareCode },
    name: "Build Gemini Request",
    type: "n8n-nodes-base.code",
    typeVersion: 2,
    position: [660, 0],
  },
  geminiHttpNode("Ask Gemini: Read Invoice", "$json.gemini_url", "$json.gemini_body", [880, 0]),
  {
    parameters: { jsCode: pickPlanCode },
    name: "Pick Plan From Price List",
    type: "n8n-nodes-base.code",
    typeVersion: 2,
    position: [1100, 0],
  },
  {
    parameters: {
      conditions: {
        options: { caseSensitive: true, leftValue: "", typeValidation: "loose", version: 2 },
        conditions: [
          {
            id: "ai-writes-reply",
            leftValue: `={{ $('${PLAN_NODE}').first().json.skip_ai_reply }}`,
            rightValue: "",
            operator: { type: "boolean", operation: "false", singleValue: true },
          },
        ],
        combinator: "and",
      },
      options: {},
    },
    name: REPLY_CHECK_NODE,
    type: "n8n-nodes-base.if",
    typeVersion: 2.2,
    position: [1320, 0],
  },
  geminiHttpNode(REPLY_NODE, "$json.reply_url", "$json.reply_body", [1540, -120]),
  {
    parameters: {
      conditions: {
        options: { caseSensitive: true, leftValue: "", typeValidation: "loose", version: 2 },
        conditions: [
          {
            id: "make-payment-link",
            leftValue: `={{ $('${PLAN_NODE}').first().json.make_payment_link }}`,
            rightValue: "",
            operator: { type: "boolean", operation: "true", singleValue: true },
          },
        ],
        combinator: "and",
      },
      options: {},
    },
    name: PAY_CHECK_NODE,
    type: "n8n-nodes-base.if",
    typeVersion: 2.2,
    position: [1760, 0],
  },
  {
    parameters: {
      method: "POST",
      url: "https://api.razorpay.com/v1/payment_links",
      authentication: "genericCredentialType",
      genericAuthType: "httpBasicAuth",
      sendBody: true,
      specifyBody: "json",
      jsonBody: `={{ JSON.stringify($('${PLAN_NODE}').first().json.razorpay_body) }}`,
      options: { timeout: 30000 },
    },
    name: RAZORPAY_NODE,
    type: "n8n-nodes-base.httpRequest",
    typeVersion: 4.2,
    position: [1980, -120],
    onError: "continueRegularOutput",
    credentials: { httpBasicAuth: { id: "", name: "Razorpay" } },
  },
  {
    parameters: { jsCode: finalizeCode },
    name: PREPARE_NODE,
    type: "n8n-nodes-base.code",
    typeVersion: 2,
    position: [2200, 0],
  },
  {
    parameters: {
      resource: "row",
      operation: "insert",
      dataTableId: {
        __rl: true,
        mode: "id",
        value: `={{ $('${TABLE_NODE}').first().json.id }}`,
      },
      columns: { mappingMode: "autoMapInputData", value: {} },
      options: {},
    },
    name: "Save Lead",
    type: "n8n-nodes-base.dataTable",
    typeVersion: 1.1,
    position: [2420, 0],
  },
  {
    parameters: {
      operation: "completion",
      respondWith: "showText",
      responseText: replyPage.replace(/\$json\./g, "$('Prepare Lead').first().json."),
    },
    name: "Show Reply to Customer",
    type: "n8n-nodes-base.form",
    typeVersion: 2.3,
    position: [2640, 0],
    webhookId: "warrio-reply",
  },
];

// Straight chain, except the two checks: yes goes through Gemini's reply or Razorpay, no skips it.
const link = (node: string) => [{ node, type: "main", index: 0 }];
const chain = nodes.map((node) => node.name).filter((name) => name !== RAZORPAY_NODE && name !== REPLY_NODE);
const connections: Record<string, { main: ReturnType<typeof link>[] }> = Object.fromEntries(
  chain.slice(0, -1).map((name, index) => [name, { main: [link(chain[index + 1])] }])
);
connections[REPLY_CHECK_NODE] = { main: [link(REPLY_NODE), link(PAY_CHECK_NODE)] };
connections[REPLY_NODE] = { main: [link(PAY_CHECK_NODE)] };
connections[PAY_CHECK_NODE] = { main: [link(RAZORPAY_NODE), link(PREPARE_NODE)] };
connections[RAZORPAY_NODE] = { main: [link(PREPARE_NODE)] };

const workflow = {
  name: "Warrio v2.5 Invoice (Gemini)",
  nodes: nodes.map((node, index) => ({ id: `warrio-node-${index + 1}`, ...node })),
  connections,
  settings: { executionOrder: "v1" },
  pinData: {},
  active: false,
};

process.stdout.write(JSON.stringify(workflow, null, 2) + "\n");
