import { adminAuthRequired, isAdminAllowed } from "@/app/lib/adminAuth";

export const dynamic = "force-dynamic";

// Shows an invoice PDF to Amit. The server-side link stays out of the browser.
export async function GET(request: Request) {
  if (!isAdminAllowed(request)) return adminAuthRequired();
  const base = process.env.INVOICE_PDF_URL;
  const invoice = new URL(request.url).searchParams.get("invoice") ?? "";
  if (!base || !/^WTY\/\d{4}-\d{2}\/\d{4}$/.test(invoice)) return new Response("Not available.", { status: 404 });
  const upstream = await fetch(`${base}?invoice=${encodeURIComponent(invoice)}`, { signal: AbortSignal.timeout(30_000) });
  if (!upstream.ok) return new Response("Invoice PDF not available.", { status: 502 });
  return new Response(upstream.body, { headers: { "Content-Type": "application/pdf", "Cache-Control": "no-store" } });
}
