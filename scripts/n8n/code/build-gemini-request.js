// Packs the invoice and Warrio's reading rules into a Gemini request.
const settings = $('Warrio Settings (edit here)').first().json;
const form = $('Enquiry Form').first();

const input = $input.first();
const binaryKey = Object.keys(input.binary || {})[0];
if (!binaryKey) throw new Error('No invoice file was uploaded.');
const file = input.binary[binaryKey];
const buffer = await this.helpers.getBinaryDataBuffer(0, binaryKey);
const fileName = file.fileName || 'invoice';

// Gemini only accepts exact types such as image/jpeg, so trust the file's first bytes over its label
// (browsers and phones sometimes send "image/jpg", "image/pjpeg" or nothing at all).
const starts = (...bytes) => bytes.every((b, i) => buffer[i] === b);
let mimeType;
if (starts(0x25, 0x50, 0x44, 0x46)) mimeType = 'application/pdf';
else if (starts(0xff, 0xd8, 0xff)) mimeType = 'image/jpeg';
else if (starts(0x89, 0x50, 0x4e, 0x47)) mimeType = 'image/png';
else if (starts(0x52, 0x49, 0x46, 0x46) && buffer.slice(8, 12).toString() === 'WEBP') mimeType = 'image/webp';
else if (buffer.slice(4, 12).toString().startsWith('ftyphei') || buffer.slice(4, 12).toString().startsWith('ftypmif1')) mimeType = 'image/heic';
else mimeType = /\.pdf$/i.test(fileName) ? 'application/pdf' : 'image/jpeg';

const categories = [...settings.PRICE_LIST.map((c) => c.name), 'Other'];
const today = new Date().toISOString().slice(0, 10);
const f = form.json;
const customer = {
  name: String(f['Your name'] || '').trim(),
  mobile: String(f['Mobile number'] || '').trim(),
  email: String(f['Email'] || '').trim(),
  question: String(f['Your question (optional)'] || '').trim(),
};

const prompt = `You are Warrio, the sales assistant for Warrantys.co. Read the attached purchase invoice.

READING THE INVOICE
- Extract only what is clearly written on the invoice. Never guess. If a detail is not visible, use null.
- price_inr = the final amount paid for the device including GST, in Rupees (number only). If the invoice has several items, use the main device and ignore accessories, delivery or other warranty charges.
- invoice_date must be in YYYY-MM-DD format.
- product_category must be exactly one of: ${categories.join('; ')}.
- Apple iPhone, iPad and Apple Watch always use "Apple iPhone / iPad / Apple Watch". Any TV (LED, LCD, OLED, Smart TV) uses "TV".
- purchase_country is the country of the seller's address, or null if not shown.
- If the file is not an invoice, is unreadable, or the device and price cannot be found, set is_invoice to false.
- In notes_for_team, mention anything our team should check, for example: name on invoice differs from the customer's name, the invoice looks edited, or date or amounts look wrong. Otherwise use "".
- customer_language is "hindi" or "hinglish" only if the customer's question is written that way, else "english".

Today's date: ${today}
Customer's name: ${customer.name || 'not given'}
Customer's question: ${customer.question || 'none'}`;

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
  gemini_url: `https://generativelanguage.googleapis.com/v1beta/models/${settings.MODEL}:generateContent`,
  gemini_body: body,
} }];
