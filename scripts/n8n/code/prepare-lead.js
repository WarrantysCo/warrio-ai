// Builds one row for the "Warrio Leads" table.
const plan = $('Pick Plan From Price List').first().json;
const response = $input.first().json;

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
  notes_for_team: plan.notes_for_team,
  warrio_reply: reply,
  status: plan.status,
  source: 'n8n_form',
} }];
