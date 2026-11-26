import "server-only";

import QRCode from "qrcode";

import { partnerLink } from "./store";

// A PNG QR code that opens the partner's tracked link.
export async function renderPartnerQr(code: string): Promise<Buffer> {
  return QRCode.toBuffer(partnerLink(code, "qr"), { width: 700, margin: 2, errorCorrectionLevel: "M" });
}
