// Builds one row for the "Warrio Leads" table.
const plan = $('Pick Plan From Price List').first().json;
const response = $('Ask Gemini: Write Reply').isExecuted ? $('Ask Gemini: Write Reply').first().json : {};

// The customer's own Razorpay link, when it was made. Any failure falls back to WhatsApp.
let paymentLink = '';
let paymentNote = '';
if (plan.make_payment_link) {
  const razorpay = $('Create Razorpay Payment Link').isExecuted ? $('Create Razorpay Payment Link').first().json : {};
  if (typeof razorpay.short_url === 'string' && /^https:\/\//.test(razorpay.short_url)) {
    paymentLink = razorpay.short_url;
    paymentNote = `Payment link: ${paymentLink}`;
  } else {
    const why = razorpay.error ? (razorpay.error.description || razorpay.error.message || JSON.stringify(razorpay.error)) : 'no link returned';
    paymentNote = 'Razorpay link could not be made (' + String(why).slice(0, 200) + '). Customer was shown the WhatsApp button.';
  }
}

let reply = plan.fallback_reply;
if (!plan.skip_ai_reply) {
  try {
    const candidate = response.candidates[0];
    const written = candidate.content.parts.filter((p) => !p.thought).map((p) => p.text || '').join('').trim();
    // A reply cut off by the token limit is worse than the fallback.
    if (written && candidate.finishReason === 'STOP') reply = written;
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
  notes_for_team: [plan.notes_for_team, paymentNote].filter(Boolean).join(' '),
  warrio_reply: reply,
  status: plan.status,
  source: 'n8n_form',
} }];
