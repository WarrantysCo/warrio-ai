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

const MIME_BY_EXTENSION: Record<string, string> = {
  pdf: "application/pdf",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  heic: "image/heic",
  heif: "image/heif",
};

function mimeFromFileName(fileName: string): string | undefined {
  const match = /\.([a-z0-9]+)$/i.exec(fileName);
  return match ? MIME_BY_EXTENSION[match[1].toLowerCase()] : undefined;
}

export function isSupportedInvoiceFile(file: File) {
  if (SUPPORTED_INVOICE_MIME_TYPES.has(file.type)) return true;
  return /\.(pdf|jpg|jpeg|png|webp|gif|heic|heif)$/i.test(file.name);
}

// Some phones/browsers report a file's type as empty or as the generic
// "application/octet-stream" (seen with HEIC photos and some camera apps)
// even though the file name's extension says exactly what it is. Gemini
// rejects octet-stream outright, so trust the extension over a missing or
// generic browser-reported type rather than passing the bad type straight
// through.
export async function toInvoiceUpload(file: File): Promise<InvoiceUpload> {
  const mimeType =
    (SUPPORTED_INVOICE_MIME_TYPES.has(file.type) ? file.type : undefined) ||
    mimeFromFileName(file.name) ||
    file.type ||
    "application/octet-stream";
  return {
    buffer: Buffer.from(await file.arrayBuffer()),
    mimeType,
    fileName: file.name,
  };
}
