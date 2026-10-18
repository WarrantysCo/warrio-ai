// Builds the importable n8n workflow "Warrio v2 Invoice (Gemini)" from the same
// price list and rules the website uses.
//
// Run from the repo root:
//   JITI_ALIAS='{"@":"'$PWD'"}' npx jiti scripts/n8n/build-workflow.ts > Warrio-Workflow-v2-Gemini.json

import { priceCategories } from "@/app/data/priceList";
import { salesRules } from "@/app/data/salesRules";

const SETTINGS_NODE = "Warrio Settings (edit here)";
const FORM_NODE = "Enquiry Form";
const TABLE_NODE = "Create Leads Table (first time only)";

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

// Gemini model. "gemini-flash-latest" always points to Google's current Flash model.
const MODEL = "gemini-flash-latest";

// Plan must be bought within this many days of the invoice date.
const PURCHASE_WINDOW_DAYS = ${salesRules.purchaseWindowDays};

// Which plan Warrio recommends when 1, 2 and 3 year plans are all sold: "longest" or "shortest".
const RECOMMEND = "${salesRules.recommend}";

const COUNTRY = "${salesRules.country}";

const COVERED = ${JSON.stringify(salesRules.coverage.join(", "))};
const NOT_COVERED = ${JSON.stringify(salesRules.exclusions.join(", "))};

// From "Product cost for Warrio Database_290726.xlsx".
// The first row of each product includes its lower price; later rows start just above it.
const PRICE_LIST = ${priceListCode()};

// Carry the uploaded invoice forward from the form.
return [{
  json: { MODEL, PURCHASE_WINDOW_DAYS, RECOMMEND, COUNTRY, COVERED, NOT_COVERED, PRICE_LIST },
  binary: $('${FORM_NODE}').first().binary,
}];
`;

const prepareCode = `// Packs the invoice and Warrio's reading rules into a Gemini request.
const settings = $('${SETTINGS_NODE}').first().json;
const form = $('${FORM_NODE}').first();

const input = $input.first();
const binaryKey = Object.keys(input.binary || {})[0];
if (!binaryKey) throw new Error('No invoice file was uploaded.');
const file = input.binary[binaryKey];
const buffer = await this.helpers.getBinaryDataBuffer(0, binaryKey);
let mimeType = file.mimeType || '';
const fileName = file.fileName || 'invoice';
if (!mimeType || mimeType === 'application/octet-stream') {
  mimeType = /\\.pdf$/i.test(fileName) ? 'application/pdf' : 'image/jpeg';
}

const categories = [...settings.PRICE_LIST.map((c) => c.name), 'Other'];
const today = new Date().toISOString().slice(0, 10);
const f = form.json;
const customer = {
  name: String(f['Your name'] || '').trim(),
  mobile: String(f['Mobile number'] || '').trim(),
  email: String(f['Email'] || '').trim(),
  question: String(f['Your question (optional)'] || '').trim(),
};

const prompt = \`You are Warrio, the sales assistant for Warrantys.co. Read the attached purchase invoice.

READING THE INVOICE
- Extract only what is clearly written on the invoice. Never guess. If a detail is not visible, use null.
- price_inr = the final amount paid for the device including GST, in Rupees (number only). If the invoice has several items, use the main device and ignore accessories, delivery or other warranty charges.
- invoice_date must be in YYYY-MM-DD format.
- product_category must be exactly one of: \${categories.join('; ')}.
- Apple iPhone, iPad and Apple Watch always use "Apple iPhone / iPad / Apple Watch". Any TV (LED, LCD, OLED, Smart TV) uses "TV".
- purchase_country is the country of the seller's address, or null if not shown.
- If the file is not an invoice, is unreadable, or the device and price cannot be found, set is_invoice to false.
- In notes_for_team, mention anything our team should check, for example: name on invoice differs from the customer's name, the invoice looks edited, or date or amounts look wrong. Otherwise use "".
- customer_language is "hindi" or "hinglish" only if the customer's question is written that way, else "english".

Today's date: \${today}
Customer's name: \${customer.name || 'not given'}
Customer's question: \${customer.question || 'none'}\`;

const nullableString = { type: 'STRING', nullable: true };
const body = {
  contents: [{ role: 'user', parts: [
    { text: prompt },
    { inline_data: { mime_type: mimeType, data: buffer.toString('base64') } },
  ] }],
  generationConfig: {
    temperature: 0,
    responseMimeType: 'application/json',
    responseSchema: {
      type: 'OBJECT',
      properties: {
        is_invoice: { type: 'BOOLEAN' },
        seller: nullableString,
        invoice_number: nullableString,
        invoice_date: nullableString,
        name_on_invoice: nullableString,
        product_category: { type: 'STRING', enum: categories },
        brand: nullableString,
        model: nullableString,
        serial_or_imei: nullableString,
        price_inr: { type: 'NUMBER', nullable: true },
        purchase_country: nullableString,
        customer_language: { type: 'STRING', enum: ['english', 'hindi', 'hinglish'] },
        notes_for_team: { type: 'STRING' },
      },
      required: ['is_invoice', 'seller', 'invoice_number', 'invoice_date', 'name_on_invoice', 'product_category', 'brand', 'model', 'serial_or_imei', 'price_inr', 'purchase_country', 'customer_language', 'notes_for_team'],
    },
  },
};

return [{ json: {
  customer,
  invoice_file: fileName,
  gemini_url: \`https://generativelanguage.googleapis.com/v1beta/models/\${settings.MODEL}:generateContent\`,
  gemini_body: body,
} }];
`;

const pickPlanCode = `// Picks the plan and price from the price list. The AI never sets a price.
const settings = $('${SETTINGS_NODE}').first().json;
const prepared = $('Build Gemini Request').first().json;
const response = $input.first().json;

let read = null;
let aiError = '';
try {
  if (response.error) throw new Error(typeof response.error === 'string' ? response.error : (response.error.message || JSON.stringify(response.error)));
  read = JSON.parse(response.candidates[0].content.parts[0].text);
} catch (error) {
  aiError = 'Gemini could not read the invoice: ' + String(error.message || error).slice(0, 300);
}

const text = (v) => (typeof v === 'string' && v.trim() ? v.trim() : null);
const invoice = {
  seller: text(read?.seller),
  invoice_number: text(read?.invoice_number),
  invoice_date: text(read?.invoice_date),
  name_on_invoice: text(read?.name_on_invoice),
  product_category: text(read?.product_category) || 'Other',
  brand: text(read?.brand),
  model: text(read?.model),
  serial_or_imei: text(read?.serial_or_imei),
  price_inr: typeof read?.price_inr === 'number' && read.price_inr > 0 ? Math.round(read.price_inr) : null,
  purchase_country: text(read?.purchase_country),
};
const isInvoice = read?.is_invoice === true;

// Days since purchase, by calendar date.
let days = null;
if (/^\\d{4}-\\d{2}-\\d{2}$/.test(invoice.invoice_date || '')) {
  const bought = Date.parse(invoice.invoice_date + 'T00:00:00Z');
  const now = new Date();
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  if (!Number.isNaN(bought)) days = Math.round((today - bought) / 86400000);
}

const category = settings.PRICE_LIST.find((c) => c.name === invoice.product_category);
let options = [];
if (category && invoice.price_inr !== null) {
  const band = category.bands.find(([min, max], i) =>
    i === 0 ? invoice.price_inr >= min && invoice.price_inr <= max : invoice.price_inr > min && invoice.price_inr <= max);
  if (band) {
    options = band.slice(2).flatMap((price, i) => price === null ? [] : [{ name: \`\${category.short} \${i + 1}-year plan\`, years: i + 1, price }]);
  }
}

const notes = [];
let eligible = false;
if (aiError) notes.push(aiError);
else if (!isInvoice) notes.push('File is not a readable invoice.');
else if (!category) notes.push('Product is not in the Warrio price list.');
else if (invoice.price_inr === null) notes.push('Device price could not be read.');
else if (options.length === 0) notes.push(\`No \${category.short} plan for a device of Rs \${invoice.price_inr}.\`);
else if (days === null) notes.push('Invoice date could not be read.');
else if (days < 0) notes.push('Invoice date is in the future.');
else if (days > settings.PURCHASE_WINDOW_DAYS) notes.push(\`Bought \${days} days ago, outside the \${settings.PURCHASE_WINDOW_DAYS}-day plan window.\`);
else if (invoice.purchase_country && invoice.purchase_country.toLowerCase() !== settings.COUNTRY.toLowerCase()) notes.push(\`Bought in \${invoice.purchase_country}, not \${settings.COUNTRY}.\`);
else eligible = true;

const recommended = eligible
  ? (settings.RECOMMEND === 'shortest' ? options[0] : options[options.length - 1])
  : null;

const customer = prepared.customer;
const firstName = (customer.name || invoice.name_on_invoice || '').split(/\\s+/)[0];
const rupees = (n) => 'Rs ' + Number(n).toLocaleString('en-IN');
const device = [invoice.brand, invoice.model].filter(Boolean).join(' ') || invoice.product_category;

// Used when the second Gemini step fails, so the customer still gets a correct answer.
let fallbackReply;
if (aiError) {
  fallbackReply = \`Hi \${firstName || 'there'},\\nThank you for sharing your invoice with Warrantys.co.\\nA team member will check it and suggest the right plan for you.\`;
} else if (!isInvoice) {
  fallbackReply = \`Hi \${firstName || 'there'},\\nThank you for contacting Warrantys.co.\\nWe could not read the device details from this file. Please upload a clear photo or PDF of the full purchase invoice.\`;
} else if (!recommended) {
  fallbackReply = \`Hi \${firstName || 'there'},\\nThank you for sharing the invoice for your \${device}.\\nA team member from Warrantys.co will check the details and confirm the right plan.\`;
} else {
  fallbackReply = \`Hi \${firstName || 'there'},\\nI can see your \${device}\${invoice.price_inr ? ' bought for ' + rupees(invoice.price_inr) : ''}.\\nI recommend the \${recommended.name} for \${rupees(recommended.price)}.\\nIt covers \${settings.COVERED.toLowerCase()} after the brand warranty ends.\\nReply YES and our team will send you the payment link.\`;
}

const replyPrompt = \`You are Warrio, the friendly sales assistant for Warrantys.co. Write the reply to the customer.

HOW TO REPLY
- Simple English. Reply language: \${read?.customer_language || 'english'}. If it is hindi or hinglish, reply in that language.
- 5 to 8 short lines, easy to read on a phone. Greet the customer by first name: \${firstName || 'no name, greet without a name'}.
- First confirm the device you found, for example: "I can see your Samsung 43 inch TV bought on 10 Oct 2026 for Rs 42,000."
- Recommend ONE best plan with its price in Rupees. Mention one alternative only if it really helps.
- One or two lines on what is covered and why it is worth it.
- End with a clear next step: "Reply YES and our team will send you the payment link."

STRICT RULES
- Use ONLY the plans and prices listed below. Never invent a price, plan, discount or coverage.
- If no plan is recommended below, do not recommend any plan or payment. Say kindly that a team member from Warrantys.co will check and call them.
- Never promise claim approval. Never ask for card numbers, OTPs or bank details.

WHAT IS COVERED: \${settings.COVERED}, after the brand warranty ends, as per the plan terms.
NOT COVERED: \${settings.NOT_COVERED}.

Customer's question: \${customer.question || 'none'}
Invoice details: \${JSON.stringify(invoice)}
Recommended plan: \${recommended ? recommended.name + ', ' + rupees(recommended.price) : 'none'}
Other plans they can buy: \${eligible ? options.filter((o) => o !== recommended).map((o) => o.name + ', ' + rupees(o.price)).join('; ') || 'none' : 'none'}

Return only the reply text.\`;

return [{ json: {
  customer,
  invoice_file: prepared.invoice_file,
  is_invoice: isInvoice,
  invoice,
  days_since_purchase: days,
  recommended_plan: recommended ? recommended.name : null,
  plan_price_inr: recommended ? recommended.price : 0,
  notes_for_team: [text(read?.notes_for_team), ...notes].filter(Boolean).join(' '),
  status: aiError ? 'check_invoice' : (eligible ? 'new' : 'team_to_call'),
  fallback_reply: fallbackReply,
  reply_url: prepared.gemini_url,
  reply_body: {
    contents: [{ role: 'user', parts: [{ text: replyPrompt }] }],
    generationConfig: { temperature: 0.3, maxOutputTokens: 512 },
  },
  skip_ai_reply: Boolean(aiError) || !isInvoice,
} }];
`;

const finalizeCode = `// Builds one row for the "Warrio Leads" table.
const plan = $('Pick Plan From Price List').first().json;
const response = $input.first().json;

let reply = plan.fallback_reply;
if (!plan.skip_ai_reply) {
  try {
    const written = response.candidates[0].content.parts.map((p) => p.text || '').join('').trim();
    if (written) reply = written;
  } catch (error) {
    // Keep the fallback reply.
  }
}

const inv = plan.invoice;
return [{ json: {
  date: new Date().toISOString(),
  name: plan.customer.name,
  mobile: plan.customer.mobile,
  email: plan.customer.email,
  question: plan.customer.question,
  invoice_ok: plan.is_invoice,
  invoice_file: plan.invoice_file,
  seller: inv.seller || '',
  invoice_number: inv.invoice_number || '',
  invoice_date: inv.invoice_date || '',
  name_on_invoice: inv.name_on_invoice || '',
  product_category: inv.product_category || '',
  brand: inv.brand || '',
  model: inv.model || '',
  serial_or_imei: inv.serial_or_imei || '',
  price_inr: inv.price_inr ?? 0,
  days_since_purchase: plan.days_since_purchase ?? 0,
  recommended_plan: plan.recommended_plan || '',
  plan_price_inr: plan.plan_price_inr || 0,
  notes_for_team: plan.notes_for_team,
  warrio_reply: reply,
  status: plan.status,
  source: 'n8n_form',
} }];
`;

const escapeHtml = "String($json.warrio_reply).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\\n/g, '<br>')";

const replyPage = `=<div style="font-family: Arial, sans-serif; max-width: 560px; margin: 24px auto; line-height: 1.6;">
<h2 style="margin: 0 0 12px;">🛡️ Warrio, Warrantys.co</h2>
<p>{{ ${escapeHtml} }}</p>
<p style="margin-top: 20px; color: #555;">Our team will also call you on {{ $json.mobile }}.</p>
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
    options: { timeout: 120000 },
  },
  name,
  type: "n8n-nodes-base.httpRequest",
  typeVersion: 4.2,
  position,
  onError: "continueRegularOutput",
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
  geminiHttpNode("Ask Gemini: Write Reply", "$json.reply_url", "$json.reply_body", [1320, 0]),
  {
    parameters: { jsCode: finalizeCode },
    name: "Prepare Lead",
    type: "n8n-nodes-base.code",
    typeVersion: 2,
    position: [1540, 0],
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
    position: [1760, 0],
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
    position: [1980, 0],
    webhookId: "warrio-reply",
  },
];

const chain = nodes.map((node) => node.name);
const connections = Object.fromEntries(
  chain.slice(0, -1).map((name, index) => [
    name,
    { main: [[{ node: chain[index + 1], type: "main", index: 0 }]] },
  ])
);

const workflow = {
  name: "Warrio v2 Invoice (Gemini)",
  nodes: nodes.map((node, index) => ({ id: `warrio-node-${index + 1}`, ...node })),
  connections,
  settings: { executionOrder: "v1" },
  pinData: {},
  active: false,
};

process.stdout.write(JSON.stringify(workflow, null, 2) + "\n");
