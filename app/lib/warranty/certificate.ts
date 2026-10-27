import "server-only";

import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

import { contact } from "@/app/data/contact";

// Builds the warranty certificate PDF, matching the fields on Amit's sample
// certificate (name, device, order ID, plan dates, policy duration).

export type CertificateData = {
  orderId: string;
  customerName: string;
  email: string;
  phone: string;
  deviceCategory: string;
  deviceName: string;
  brand: string;
  model: string;
  serialOrImei: string;
  planName: string;
  tenureYears: number;
  devicePurchaseDate: string; // YYYY-MM-DD
  planPurchaseDate: string; // YYYY-MM-DD
  planStartDate: string; // YYYY-MM-DD
  planEndDate: string; // YYYY-MM-DD
};

function formatDate(isoDate: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return isoDate;
  const date = new Date(`${isoDate}T00:00:00Z`);
  const day = date.getUTCDate();
  const suffix =
    day % 10 === 1 && day !== 11 ? "st" : day % 10 === 2 && day !== 12 ? "nd" : day % 10 === 3 && day !== 13 ? "rd" : "th";
  const month = date.toLocaleDateString("en-GB", { month: "short", timeZone: "UTC" });
  return `${day}${suffix} ${month} ${date.getUTCFullYear()}`;
}

// Confirmed by Amit (2026-10-27): the plan starts 1 year after the plan was
// purchased (the manufacturer's own warranty year), not the device purchase
// date. If a customer's manufacturer warranty is actually 2 or 3 years, Amit
// edits the date on the approval page and resends the certificate.
export function planStartDate(planPurchaseDate: string) {
  const date = new Date(`${planPurchaseDate}T00:00:00Z`);
  date.setUTCFullYear(date.getUTCFullYear() + 1);
  return date.toISOString().slice(0, 10);
}

export function planEndDate(startDate: string, tenureYears: number) {
  const date = new Date(`${startDate}T00:00:00Z`);
  date.setUTCFullYear(date.getUTCFullYear() + tenureYears);
  date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString().slice(0, 10);
}

const BRAND_TEAL = rgb(0.02, 0.44, 0.42);
const BRAND_GOLD = rgb(0.95, 0.71, 0.13);
const INK = rgb(0.15, 0.17, 0.2);
const MUTED = rgb(0.42, 0.45, 0.49);

export async function buildCertificatePdf(data: CertificateData): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([595, 420]); // A5 landscape-ish, matches the sample's wide layout
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const regular = await doc.embedFont(StandardFonts.Helvetica);

  const { width, height } = page.getSize();

  page.drawRectangle({ x: 0, y: 0, width, height, color: rgb(1, 1, 1) });
  page.drawRectangle({ x: 0, y: height - 10, width, height: 10, color: BRAND_GOLD });

  page.drawText("Warrantys.co", { x: 24, y: height - 40, size: 22, font: bold, color: BRAND_TEAL });
  page.drawText("Device's extra care", { x: 26, y: height - 56, size: 10, font: regular, color: MUTED });

  page.drawRectangle({ x: 24, y: height - 90, width: width - 48, height: 2, color: BRAND_GOLD });

  page.drawText("CERTIFICATE OF PROTECTION", {
    x: 24,
    y: height - 118,
    size: 18,
    font: bold,
    color: INK,
  });
  page.drawText(`This certificate is issued to ${data.customerName}`, {
    x: 24,
    y: height - 138,
    size: 11,
    font: regular,
    color: INK,
  });

  page.drawText(`Order ID: ${data.orderId}`, { x: width - 230, y: height - 118, size: 10, font: bold, color: INK });
  page.drawText(`Policy Duration: ${data.tenureYears} Year from Manufacturer Warranty Ends`, {
    x: width - 230,
    y: height - 134,
    size: 9,
    font: regular,
    color: MUTED,
  });

  const left: [string, string][] = [
    ["Email", data.email],
    ["Phone", data.phone],
    ["Plan", data.planName],
    ["Plan Purchase Date", formatDate(data.planPurchaseDate)],
    ["Device Purchase Date", formatDate(data.devicePurchaseDate)],
  ];
  const right: [string, string][] = [
    ["Insured", `${data.brand} ${data.deviceCategory}`.trim()],
    ["Device", data.deviceName],
    ["Make", data.brand],
    ["Model", data.model],
    ["IMEI/Sr. No.", data.serialOrImei],
  ];

  let y = height - 170;
  for (const [label, value] of left) {
    page.drawText(`${label}:`, { x: 24, y, size: 9, font: bold, color: MUTED });
    page.drawText(value || "-", { x: 150, y, size: 10, font: regular, color: INK });
    y -= 20;
  }

  y = height - 170;
  for (const [label, value] of right) {
    page.drawText(`${label}:`, { x: 300, y, size: 9, font: bold, color: MUTED });
    page.drawText(value || "-", { x: 420, y, size: 10, font: regular, color: INK });
    y -= 20;
  }

  page.drawRectangle({ x: 24, y: 60, width: width - 48, height: 40, color: rgb(0.95, 0.97, 0.96) });
  page.drawText(`Plan Start Date: ${formatDate(data.planStartDate)}`, {
    x: 34,
    y: 74,
    size: 10,
    font: bold,
    color: BRAND_TEAL,
  });
  page.drawText(`Plan End Date: ${formatDate(data.planEndDate)}`, {
    x: 320,
    y: 74,
    size: 10,
    font: bold,
    color: BRAND_TEAL,
  });

  page.drawText(
    `${contact.brand}  ·  Call us: ${contact.phoneHref.replace("tel:", "")}  ·  ${contact.email}`,
    { x: 24, y: 24, size: 8, font: regular, color: MUTED }
  );

  return doc.save();
}
