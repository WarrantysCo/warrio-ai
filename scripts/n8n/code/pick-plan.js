// Picks the plan and price from the price list. The AI never sets a price.
const settings = $('Warrio Settings (edit here)').first().json;
const prepared = $('Build Gemini Request').first().json;
const response = $input.first().json;

let read = null;
let aiError = '';
try {
  if (response.error) throw new Error(typeof response.error === 'string' ? response.error : (response.error.message || JSON.stringify(response.error)));
  const candidate = response.candidates?.[0];
  if (!candidate?.content?.parts) throw new Error('no answer (' + (candidate?.finishReason || response.promptFeedback?.blockReason || 'empty response') + ')');
  // Skip any "thinking" parts and code fences around the JSON.
  const answer = candidate.content.parts.filter((p) => !p.thought).map((p) => p.text || '').join('').trim()
    .replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  read = JSON.parse(answer);
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
if (/^\d{4}-\d{2}-\d{2}$/.test(invoice.invoice_date || '')) {
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
    options = band.slice(2).flatMap((price, i) => price === null ? [] : [{ name: `${category.short} ${i + 1}-year plan`, years: i + 1, price }]);
  }
}

const notes = [];
let eligible = false;
if (aiError) notes.push(aiError);
else if (!isInvoice) notes.push('File is not a readable invoice.');
else if (!category) notes.push('Product is not in the Warrio price list.');
else if (invoice.price_inr === null) notes.push('Device price could not be read.');
else if (options.length === 0) notes.push(`No ${category.short} plan for a device of Rs ${invoice.price_inr}.`);
else if (days === null) notes.push('Invoice date could not be read.');
else if (days < 0) notes.push('Invoice date is in the future.');
else if (days > settings.PURCHASE_WINDOW_DAYS) notes.push(`Bought ${days} days ago, outside the ${settings.PURCHASE_WINDOW_DAYS}-day plan window.`);
else if (invoice.purchase_country && invoice.purchase_country.toLowerCase() !== settings.COUNTRY.toLowerCase()) notes.push(`Bought in ${invoice.purchase_country}, not ${settings.COUNTRY}.`);
else eligible = true;

const recommended = eligible
  ? (settings.RECOMMEND === 'shortest' ? options[0] : options[options.length - 1])
  : null;

const customer = prepared.customer;
const firstName = (customer.name || invoice.name_on_invoice || '').split(/\s+/)[0];
const rupees = (n) => 'Rs ' + Number(n).toLocaleString('en-IN');
// Short label, e.g. "Hisense TV". Long model numbers stay in the saved lead only.
const device = [invoice.brand, category ? category.short : invoice.product_category].filter(Boolean).join(' ');

const perDay = recommended ? Math.ceil(recommended.price / (recommended.years * 365)) : null;
const hello = firstName ? `Hi ${firstName}` : 'Hi there';

// Used when the second Gemini step fails, so the customer still gets a complete answer.
let fallbackReply;
if (aiError) {
  fallbackReply = `${hello} 🙏\nThank you for trusting Warrantys.co with your invoice.\nOur team will personally check it and call you with the best plan for your device.`;
} else if (!isInvoice) {
  fallbackReply = `${hello} 🙏\nThank you for reaching out to Warrantys.co.\nWe could not read the device details from this file. Please upload a clear photo or PDF of the full purchase invoice, and Warrio will suggest the right plan in a minute.`;
} else if (!recommended) {
  fallbackReply = `${hello} 🙏\nThank you for sharing the invoice for your ${device}.\nOur team will personally check the details and call you with the best option for you.`;
} else {
  fallbackReply = `${hello} 😊\nI can see your ${device}${invoice.price_inr ? ' bought for ' + rupees(invoice.price_inr) : ''}. Great choice!\nOnce the brand warranty ends, repairs can be costly and stressful.\nThe ${recommended.name} secures your future repair expenses for ${rupees(recommended.price)}, less than Rs ${perDay} a day.\nRepairs are 100% cashless with authorized technicians and genuine parts, and if it cannot be repaired you get a replacement or a full refund.\nWhenever you feel ready, you can secure it with the button below. And if you have any question at all, I am happy to help. 🛡️`;
}

const replyPrompt = `You are Warrio, the warm and caring sales assistant of Warrantys.co. Write a WhatsApp-style reply to the customer.

TONE
- Warm, personal, decent and respectful, like a helpful friend who understands how much the device matters to them. Never pushy, never robotic.
- Frame the plan as securing their future repair expenses and peace of mind, a small step that protects money they have already spent.
- No pressure or urgency: never say "hurry", "limited time", "last chance", "only today", "don't miss" or anything similar. The customer decides in their own time.
- Show you understand the worry: repairs after the brand warranty ends can be expensive and stressful.
- Make the value feel real: say the plan costs less than Rs ${perDay ?? '-'} a day.
- Language: ${read?.customer_language || 'english'}. If hindi or hinglish, write in that language; otherwise simple English.
- 6 to 9 short lines. You may use 1 or 2 friendly emojis.

STRUCTURE
1. Greet by first name (${firstName || 'no name, greet warmly without a name'}) and thank them.
2. Confirm the device you found, e.g. "I can see your Samsung 43 inch TV bought on 10 Oct 2026 for Rs 42,000."
3. Recommend the plan below by its exact name and exact price.
4. Two or three short benefits, chosen only from the WHY WARRANTYS.CO list.
5. Mention the cheaper alternative in one line only if one is listed below.
6. End gently, for example: "Whenever you feel ready, you can secure your TV with the button below. If you have any question, I am happy to help." Do not ask them to reply YES or type anything; the buttons below the message do that.

STRICT RULES
- Use ONLY the plan names and prices below. Never invent a price, plan, discount, offer or coverage.
- If no plan is recommended below, do not recommend any plan or payment. Say warmly that a team member from Warrantys.co will personally check and call them.
- Never promise claim approval. Never ask for card numbers, OTPs or bank details.
- Write the full message. Never stop mid-sentence.

WHY WARRANTYS.CO: ${settings.WHY_WARRIO.join('; ')}.
WHAT IS COVERED: ${settings.COVERED}, after the brand warranty ends, as per the plan terms.
NOT COVERED: ${settings.NOT_COVERED}.

Customer's question: ${customer.question || 'none'}
Invoice details: ${JSON.stringify(invoice)}
Recommended plan: ${recommended ? recommended.name + ', ' + rupees(recommended.price) : 'none'}
Cheaper alternatives: ${eligible ? options.filter((o) => o !== recommended).map((o) => o.name + ', ' + rupees(o.price)).join('; ') || 'none' : 'none'}

Return only the message text.`;

// The plan box and buttons on the reply page always come from the price list, never from the AI.
const esc = (v) => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const whatsapp = (message) => `https://wa.me/${settings.WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
const contactLine = [customer.name && `Name: ${customer.name}`, customer.mobile && `Mobile: ${customer.mobile}`].filter(Boolean).join(', ');
const planLink = (plan) => whatsapp(
  `Hello Warrantys.co, I would like to secure my ${device} with the ${plan.name} (${rupees(plan.price)}). ${contactLine}`.trim());
const button = (href, label, primary) => `<a href="${esc(href)}" target="_blank" rel="noopener" style="display: block; text-align: center; text-decoration: none; margin-top: 10px; padding: ${primary ? '13px' : '10px'} 14px; border-radius: 10px; font-size: ${primary ? '16px' : '14px'}; font-weight: bold; ${primary ? 'background: #1a7f37; color: #fff;' : 'background: #fff; color: #1a4f8b; border: 1px solid #c7defa;'}">${label}</a>`;

// payLink: the customer's own Razorpay link, added later by "Prepare Lead". Without it the buttons open WhatsApp.
const planBox = (payLink) => recommended
  ? `<div style="margin-top: 18px; padding: 14px 16px; border-radius: 12px; background: #eef6ff; border: 1px solid #c7defa;">
<div style="font-size: 13px; color: #555;">Recommended for your ${esc(device)}</div>
<div style="font-size: 18px; font-weight: bold; margin-top: 4px;">${recommended.name}: ${rupees(recommended.price)}</div>
<div style="font-size: 13px; color: #555;">Less than Rs ${perDay} a day to keep your repair costs covered.</div>
${button(payLink || planLink(recommended), `🛡️ Secure my ${esc(device)}`, true)}
${options.filter((o) => o !== recommended).map((o) => button(planLink(o), `Choose ${o.name}: ${rupees(o.price)}`, false)).join('\n')}
<div style="font-size: 12px; color: #666; margin-top: 8px; text-align: center;">${payLink
    ? `The green button opens a secure Razorpay payment page for ${rupees(recommended.price)}. For another plan, tap it and our team will help you on WhatsApp.`
    : 'Opens WhatsApp with your plan details. Our team will share a secure payment link there.'} No card details or OTP are ever asked on chat.</div>
</div>`
  : '';

// Always offer a way to ask or talk, whether or not a plan was found.
const helpBox = `<div style="margin-top: 16px; padding: 12px 16px; border-radius: 12px; background: #f6f6f6;">
<div style="font-size: 14px; color: #333;">Have a question, or would you like to talk first?</div>
${button(whatsapp(`Hello Warrantys.co, I have a question about a warranty plan for my ${device || 'device'}. ${contactLine}`.trim()), '💬 Chat with us on WhatsApp', false)}
${button(`tel:+${settings.WHATSAPP_NUMBER}`, `📞 Call us: ${settings.PHONE_DISPLAY}`, false)}
</div>`;

// Razorpay wants the amount in paise and the mobile with its country code.
const mobileDigits = String(customer.mobile || '').replace(/\D/g, '');
const contact = mobileDigits.length === 10 ? '+91' + mobileDigits : (mobileDigits.length === 12 && mobileDigits.startsWith('91') ? '+' + mobileDigits : '');
// TEST_AMOUNT_RS in the Settings box charges that amount instead, only for testing payments.
const testAmount = Number(settings.TEST_AMOUNT_RS) > 0 ? Math.round(Number(settings.TEST_AMOUNT_RS)) : 0;
const razorpayBody = recommended ? {
  amount: (testAmount || recommended.price) * 100,
  currency: 'INR',
  accept_partial: false,
  description: `${testAmount ? 'TEST PAYMENT - ' : ''}Warrantys.co ${recommended.name} for your ${device}`.slice(0, 2048),
  customer: Object.fromEntries(Object.entries({ name: customer.name, contact, email: customer.email }).filter(([, v]) => v)),
  notify: { sms: false, email: false },
  reminder_enable: false,
  notes: { plan: recommended.name, device, mobile: customer.mobile || '' },
} : null;

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
    // Generous limit: newer Gemini models spend part of it on thinking.
    generationConfig: { temperature: 0.6, maxOutputTokens: 4096 },
  },
  plan_box_html: planBox('') + helpBox,
  plan_box_pay_html: planBox('__PAY_LINK__') + helpBox,
  make_payment_link: Boolean(recommended) && settings.USE_RAZORPAY === true,
  razorpay_body: razorpayBody,
  skip_ai_reply: Boolean(aiError) || !isInvoice || settings.AI_WRITES_REPLY !== true,
} }];
