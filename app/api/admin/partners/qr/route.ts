import { adminAuthRequired, isAdminAllowed } from "@/app/lib/adminAuth";
import { readPartners } from "@/app/lib/partners/store";
import { renderPartnerQr } from "@/app/lib/partners/qr";

export const dynamic = "force-dynamic";

// Downloads an approved partner's QR code as a PNG.
export async function GET(request: Request) {
  if (!isAdminAllowed(request)) return adminAuthRequired();
  const code = new URL(request.url).searchParams.get("code") ?? "";
  const partner = (await readPartners()).find((row) => row.code && row.code === code);
  if (!partner) return new Response("Not found", { status: 404 });
  const png = await renderPartnerQr(code);
  return new Response(new Uint8Array(png), {
    headers: {
      "Content-Type": "image/png",
      "Content-Disposition": `inline; filename="warrantys-partner-${code}.png"`,
      "Cache-Control": "no-store",
    },
  });
}
