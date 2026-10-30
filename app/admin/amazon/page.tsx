import { priceCategories } from "@/app/data/priceList";
import { readLeads } from "@/app/lib/integrations/leadStore";

export const dynamic = "force-dynamic";

export default async function AmazonOrderAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ created?: string; link?: string; error?: string }>;
}) {
  const { created, link, error } = await searchParams;
  const leads = (await readLeads()).filter((lead) => lead.source === "amazon").reverse();

  return (
    <main className="mx-auto max-w-3xl px-6 py-8 text-slate-900">
      <h1 className="text-2xl font-black">Start a certificate for an Amazon order</h1>
      <p className="mt-1 text-sm text-slate-600">
        Type in the order details below. We never email or WhatsApp Amazon
        buyers directly — send the link we give you through Amazon&apos;s own
        &quot;Contact buyer&quot; message so it stays inside Amazon&apos;s rules.
        Once the customer opens it, they give their own email and we take it
        from there, the same as a website order.
      </p>

      {error && (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</div>
      )}
      {created && link && (
        <div className="mt-4 rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-sm text-emerald-900">
          <div className="font-bold">Order {created} created.</div>
          <div className="mt-2">
            Send this link to the customer through Amazon&apos;s Contact Buyer message:
          </div>
          <div className="mt-1 break-all rounded-lg bg-white p-2 font-mono text-xs">{link}</div>
        </div>
      )}
      {created && !link && (
        <div className="mt-4 rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-sm text-emerald-900">
          <div className="font-bold">Order {created} added.</div>
          <div className="mt-2">
            No link needed — it is already in your{" "}
            <a href="/admin/warranty" className="font-semibold underline">
              certificate approval queue
            </a>
            .
          </div>
        </div>
      )}

      <form
        action="/api/admin/amazon-order"
        method="post"
        encType="multipart/form-data"
        className="mt-8 space-y-4 rounded-2xl border border-slate-200 bg-white p-6"
      >
        <label className="block">
          <span className="text-sm font-semibold">Amazon Order ID</span>
          <input name="amazonOrderId" required placeholder="408-9233882-7965122" className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2" />
        </label>
        <label className="block">
          <span className="text-sm font-semibold">Customer name</span>
          <input name="fullName" className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2" />
        </label>
        <label className="block">
          <span className="text-sm font-semibold">Customer mobile (optional, if you know it)</span>
          <input name="mobile" type="tel" inputMode="numeric" className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2" />
        </label>
        <div className="grid gap-4 sm:grid-cols-3">
          <label className="block">
            <span className="text-sm font-semibold">Product category</span>
            <select name="categoryId" required className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2">
              {priceCategories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.icon} {category.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-sm font-semibold">Device price (Rs)</span>
            <input name="priceInr" type="number" min={0} required className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2" />
          </label>
          <label className="block">
            <span className="text-sm font-semibold">Plan length</span>
            <select name="tenureYears" required className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2">
              <option value="1">1 year</option>
              <option value="2">2 years</option>
              <option value="3">3 years</option>
            </select>
          </label>
        </div>
        <label className="block">
          <span className="text-sm font-semibold">Date the customer bought the device (if known)</span>
          <input name="purchaseDate" type="date" className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2" />
        </label>

        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4">
          <div className="text-sm font-bold text-slate-900">
            Already have everything for this customer?
          </div>
          <p className="mt-1 text-xs text-slate-600">
            Fill in email and serial number below, and it skips the customer link — goes
            straight to your approval queue instead. Leave both blank to just get the link
            to send through Amazon.
          </p>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="text-sm font-semibold">Customer email</span>
              <input name="email" type="email" className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2" />
            </label>
            <label className="block">
              <span className="text-sm font-semibold">Serial number / IMEI</span>
              <input name="serialNumber" className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2" />
            </label>
            <label className="block">
              <span className="text-sm font-semibold">Brand</span>
              <input name="brand" className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2" />
            </label>
            <label className="block">
              <span className="text-sm font-semibold">Model</span>
              <input name="model" className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2" />
            </label>
            <label className="block sm:col-span-2">
              <span className="text-sm font-semibold">Device name</span>
              <input name="deviceName" className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2" />
            </label>
            <label className="block">
              <span className="text-sm font-semibold">Product invoice (optional)</span>
              <input
                type="file"
                name="productInvoice"
                accept="application/pdf,image/*"
                className="mt-1 block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-blue-50 file:px-3 file:py-2 file:font-semibold file:text-brand-blue"
              />
            </label>
            <label className="block">
              <span className="text-sm font-semibold">Amazon plan order/invoice (optional)</span>
              <input
                type="file"
                name="warrantyInvoice"
                accept="application/pdf,image/*"
                className="mt-1 block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-blue-50 file:px-3 file:py-2 file:font-semibold file:text-brand-blue"
              />
            </label>
            <label className="block">
              <span className="text-sm font-semibold">Device photo 1 (optional)</span>
              <input
                type="file"
                name="conditionPhoto1"
                accept="image/*"
                className="mt-1 block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-blue-50 file:px-3 file:py-2 file:font-semibold file:text-brand-blue"
              />
            </label>
            <label className="block">
              <span className="text-sm font-semibold">Device photo 2 (optional)</span>
              <input
                type="file"
                name="conditionPhoto2"
                accept="image/*"
                className="mt-1 block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-blue-50 file:px-3 file:py-2 file:font-semibold file:text-brand-blue"
              />
            </label>
          </div>
        </div>

        <button type="submit" className="w-full rounded-xl bg-brand-blue py-3 font-bold text-white hover:bg-brand-blue-dark">
          Create order
        </button>
      </form>

      <h2 className="mt-10 text-lg font-bold">Recent Amazon orders</h2>
      <div className="mt-3 space-y-2 text-sm">
        {leads.length === 0 && <div className="text-slate-500">None yet.</div>}
        {leads.map((lead) => (
          <div key={lead.lead_reference} className="rounded-lg border border-slate-200 bg-white p-3">
            <div className="font-semibold">{lead.lead_reference} · {lead.invoice_number}</div>
            <div className="text-slate-600">{lead.name} · {lead.recommended_plan} · {lead.status}</div>
          </div>
        ))}
      </div>
    </main>
  );
}
