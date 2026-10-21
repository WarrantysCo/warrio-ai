export const MAX_INVOICE_UPLOAD_BYTES = 10 * 1024 * 1024;

export const SUPPORTED_INVOICE_MIME_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/heic",
  "image/heif",
]);

export type InvoiceUpload = {
  buffer: Buffer;
  mimeType: string;
  fileName: string;
};

export function isSupportedInvoiceFile(file: File) {
  if (SUPPORTED_INVOICE_MIME_TYPES.has(file.type)) return true;
  return /\.(pdf|jpg|jpeg|png|webp|gif|heic|heif)$/i.test(file.name);
}

export async function toInvoiceUpload(file: File): Promise<InvoiceUpload> {
  return {
    buffer: Buffer.from(await file.arrayBuffer()),
    mimeType:
      file.type ||
      (file.name.toLowerCase().endsWith(".pdf")
        ? "application/pdf"
        : "application/octet-stream"),
    fileName: file.name,
  };
}
