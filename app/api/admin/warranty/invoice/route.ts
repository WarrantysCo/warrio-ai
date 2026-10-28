import { adminAuthRequired, checkAdminPassword } from "@/app/lib/adminAuth";
import { readInvoiceFile } from "@/app/lib/warranty/store";

export const dynamic = "force-dynamic";

// Lets the admin view a customer's uploaded bill. The file name is checked
// against a strict pattern in readInvoiceFile, so it can't read other files.
export async function GET(request: Request) {
  const adminCheck = checkAdminPassword(request);
  if (adminCheck !== "ok") return adminAuthRequired(adminCheck);

  const fileName = new URL(request.url).searchParams.get("file") ?? "";
  const data = await readInvoiceFile(fileName);
  if (!data) return new Response("Not found.", { status: 404 });

  const extension = fileName.split(".").pop()?.toLowerCase() ?? "";
  const contentType =
    extension === "pdf"
      ? "application/pdf"
      : extension === "png"
        ? "image/png"
        : extension === "webp"
          ? "image/webp"
          : extension === "gif"
            ? "image/gif"
            : "image/jpeg";

  return new Response(new Uint8Array(data), {
    headers: { "Content-Type": contentType, "Cache-Control": "no-store" },
  });
}
