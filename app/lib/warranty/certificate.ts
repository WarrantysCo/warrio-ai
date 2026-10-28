import "server-only";

import path from "node:path";
import { readFile } from "node:fs/promises";

import { PDFDocument, PDFFont, PDFPage, rgb, StandardFonts } from "pdf-lib";

import { contact } from "@/app/data/contact";
import {
  EXCLUSIONS,
  EXCLUSIONS_INTRO,
  FURNITURE_EXCLUSIONS,
  PROCESS_STEPS,
} from "@/app/data/warrantyExclusions";

// Builds the warranty certificate PDF, matching Amit's sample certificate
// (2026-10-28): same logo and brand art, same "how our process works" page,
// and the same Terms & Conditions / Exclusions pages, with this order's own
// details filled in on page 1.

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

// Corrected by Amit (2026-10-28): the device's own (OEM) warranty runs for
// 1 year from the date on the purchase invoice, so Warrantys.co coverage
// starts the day that OEM year ends — invoice date + 1 year, not the date
// the Warrantys.co plan itself was purchased. If a customer's manufacturer
// warranty is actually 2 or 3 years, Amit edits the date on the approval
// page and resends the certificate.
export function planStartDate(devicePurchaseDate: string) {
  const date = new Date(`${devicePurchaseDate}T00:00:00Z`);
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
const BRAND_TEAL_LIGHT = rgb(0.88, 0.96, 0.95);
const BRAND_GOLD = rgb(0.95, 0.71, 0.13);
const INK = rgb(0.15, 0.17, 0.2);
const MUTED = rgb(0.42, 0.45, 0.49);
const WHITE = rgb(1, 1, 1);

const PAGE_WIDTH = 842; // A4 landscape, same as the sample certificate
const PAGE_HEIGHT = 595;
const MARGIN = 40;

async function brandAsset(file: string) {
  return readFile(/*turbopackIgnore: true*/ path.join(process.cwd(), "public", "brand", file));
}

function wrapText(font: PDFFont, size: number, text: string, maxWidth: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function drawFooter(page: PDFPage, font: PDFFont) {
  page.drawText(
    `${contact.brand}  ·  Call us: ${contact.phoneHref.replace("tel:", "")}  ·  ${contact.email}`,
    { x: MARGIN, y: 24, size: 8, font, color: MUTED }
  );
}

export async function buildCertificatePdf(data: CertificateData): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const regular = await doc.embedFont(StandardFonts.Helvetica);
  const italic = await doc.embedFont(StandardFonts.HelveticaOblique);

  const [logoPng, framePng, badgePng] = await Promise.all([
    brandAsset("warrantys-logo.png"),
    brandAsset("certificate-frame.png"),
    brandAsset("certificate-badge.png"),
  ]);
  const logo = await doc.embedPng(logoPng);
  const frame = await doc.embedPng(framePng);
  const badge = await doc.embedPng(badgePng);

  function drawLogo(page: PDFPage) {
    const logoWidth = 170;
    const logoHeight = (logoWidth * logo.height) / logo.width;
    page.drawImage(logo, {
      x: MARGIN,
      y: PAGE_HEIGHT - MARGIN - logoHeight,
      width: logoWidth,
      height: logoHeight,
    });
    return PAGE_HEIGHT - MARGIN - logoHeight;
  }

  // ---- Page 1: the certificate itself -------------------------------
  const page1 = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  page1.drawRectangle({ x: 0, y: 0, width: PAGE_WIDTH, height: PAGE_HEIGHT, color: WHITE });
  const logoBottom = drawLogo(page1);

  const boxTop = logoBottom - 16;
  const boxBottom = 56;
  const boxHeight = boxTop - boxBottom;
  const boxX = MARGIN;
  const boxWidth = PAGE_WIDTH - MARGIN * 2;

  page1.drawRectangle({
    x: boxX,
    y: boxBottom,
    width: boxWidth,
    height: boxHeight,
    color: WHITE,
    borderColor: BRAND_TEAL,
    borderWidth: 1.5,
  });
  // The frame art is the teal/gold wave + ribbon border; stretch it to the
  // box so it reads the same as the sample certificate.
  page1.drawImage(frame, { x: boxX, y: boxBottom, width: boxWidth, height: boxHeight });

  // Badge + order ID, over the ribbon on the left of the box.
  const badgeSize = 76;
  page1.drawImage(badge, {
    x: boxX + 16,
    y: boxBottom + boxHeight - 24 - badgeSize,
    width: badgeSize,
    height: badgeSize,
  });
  const ribbonLabelY = boxBottom + boxHeight - 24 - badgeSize - 36;
  page1.drawRectangle({
    x: boxX + 10,
    y: ribbonLabelY - 30,
    width: badgeSize + 20,
    height: 44,
    color: BRAND_GOLD,
  });
  page1.drawText("Warrantys.co ORDER ID", {
    x: boxX + 16,
    y: ribbonLabelY - 12,
    size: 7,
    font: bold,
    color: INK,
    maxWidth: badgeSize + 10,
  });
  for (const [i, line] of wrapText(bold, 8, data.orderId, badgeSize + 10).entries()) {
    page1.drawText(line, { x: boxX + 16, y: ribbonLabelY - 24 - i * 10, size: 8, font: bold, color: INK });
  }

  // Title + customer name, offset past the left ribbon.
  const textX = boxX + 150;
  const textWidth = boxX + boxWidth - 24 - textX;
  let y = boxBottom + boxHeight - 44;
  page1.drawText("CERTIFICATE OF PROTECTION", { x: textX, y, size: 19, font: bold, color: INK });
  y -= 22;
  page1.drawText("This certificate is issued to", { x: textX, y, size: 10, font: regular, color: MUTED });
  y -= 20;
  page1.drawText(data.customerName, { x: textX, y, size: 16, font: bold, color: BRAND_TEAL });
  y -= 26;

  page1.drawText(`Plan Start Date: ${formatDate(data.planStartDate)}`, {
    x: textX,
    y,
    size: 10,
    font: bold,
    color: INK,
  });
  page1.drawText(`Plan End Date: ${formatDate(data.planEndDate)}`, {
    x: textX + textWidth / 2,
    y,
    size: 10,
    font: bold,
    color: INK,
  });
  y -= 22;
  page1.drawRectangle({ x: textX, y, width: textWidth, height: 1, color: BRAND_GOLD });
  y -= 22;

  const fieldsTop = y;
  const left: [string, string][] = [
    ["Policy Duration", `${data.tenureYears} Yr from Mfr. Warranty End`],
    ["Email", data.email],
    ["Phone", data.phone],
    ["Plan", data.planName],
    ["Plan Purchase Date", formatDate(data.planPurchaseDate)],
    ["Device Purchase Date", formatDate(data.devicePurchaseDate)],
  ];
  const right: [string, string][] = [
    ["Insured", `${data.brand} ${data.deviceCategory}`.trim()],
    ["Device", data.deviceName],
    ["Order ID", data.orderId],
    ["Model", data.model],
    ["IMEI/Sr. No.", data.serialOrImei],
    ["Make", data.brand],
  ];

  y = fieldsTop;
  for (const [label, value] of left) {
    page1.drawText(`${label}:`, { x: textX, y, size: 8, font: bold, color: MUTED });
    page1.drawText(value || "-", { x: textX + 110, y, size: 9, font: regular, color: INK, maxWidth: 140 });
    y -= 19;
  }

  y = fieldsTop;
  const col2 = textX + textWidth / 2;
  for (const [label, value] of right) {
    page1.drawText(`${label}:`, { x: col2, y, size: 8, font: bold, color: MUTED });
    page1.drawText(value || "-", { x: col2 + 90, y, size: 9, font: regular, color: INK, maxWidth: textWidth / 2 - 100 });
    y -= 19;
  }

  page1.drawText("This certificate is subject to the Terms & Conditions / Exclusions printed on the following pages.", {
    x: textX,
    y: boxBottom + 16,
    size: 8,
    font: italic,
    color: MUTED,
  });

  drawFooter(page1, regular);

  // ---- Page 2: how our process works --------------------------------
  const page2 = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  page2.drawRectangle({ x: 0, y: 0, width: PAGE_WIDTH, height: PAGE_HEIGHT, color: WHITE });
  drawLogo(page2);

  const pillText = "Extended Warranty from Warrantys.co";
  const pillWidth = bold.widthOfTextAtSize(pillText, 9) + 28;
  page2.drawRectangle({
    x: PAGE_WIDTH - MARGIN - pillWidth,
    y: PAGE_HEIGHT - MARGIN - 24,
    width: pillWidth,
    height: 22,
    color: BRAND_TEAL_LIGHT,
    borderColor: BRAND_TEAL,
    borderWidth: 1,
  });
  page2.drawText(pillText, {
    x: PAGE_WIDTH - MARGIN - pillWidth + 14,
    y: PAGE_HEIGHT - MARGIN - 17,
    size: 9,
    font: bold,
    color: BRAND_TEAL,
  });

  // Timeline: purchase date -> plan start date -> plan end date.
  const timelineY = PAGE_HEIGHT - 150;
  const timelineX1 = MARGIN + 20;
  const timelineX2 = PAGE_WIDTH - MARGIN - 20;
  page2.drawRectangle({ x: timelineX1, y: timelineY, width: timelineX2 - timelineX1, height: 2, color: BRAND_GOLD });
  const timelinePoints: [number, string, string][] = [
    [timelineX1, formatDate(data.planPurchaseDate), "(purchase date)"],
    [(timelineX1 + timelineX2) / 2, formatDate(data.planStartDate), "(start date)"],
    [timelineX2, formatDate(data.planEndDate), "(end date)"],
  ];
  for (const [x, dateLabel, caption] of timelinePoints) {
    page2.drawCircle({ x, y: timelineY + 1, size: 6, color: BRAND_TEAL });
    const dateWidth = bold.widthOfTextAtSize(dateLabel, 11);
    page2.drawText(dateLabel, { x: x - dateWidth / 2, y: timelineY + 14, size: 11, font: bold, color: INK });
    const capWidth = italic.widthOfTextAtSize(caption, 8);
    page2.drawText(caption, { x: x - capWidth / 2, y: timelineY - 16, size: 8, font: italic, color: MUTED });
  }

  // 4-step process row.
  page2.drawText("How our process works?", {
    x: MARGIN,
    y: timelineY - 70,
    size: 16,
    font: bold,
    color: INK,
  });

  const stepsTop = timelineY - 120;
  const stepWidth = (PAGE_WIDTH - MARGIN * 2) / PROCESS_STEPS.length;
  PROCESS_STEPS.forEach((step, i) => {
    const cx = MARGIN + stepWidth * i + stepWidth / 2;
    page2.drawCircle({ x: cx, y: stepsTop, size: 26, color: BRAND_TEAL_LIGHT, borderColor: BRAND_TEAL, borderWidth: 1.5 });
    const num = String(i + 1);
    const numWidth = bold.widthOfTextAtSize(num, 16);
    page2.drawText(num, { x: cx - numWidth / 2, y: stepsTop - 6, size: 16, font: bold, color: BRAND_TEAL });

    const titleWidth = bold.widthOfTextAtSize(step.title, 10);
    page2.drawText(step.title, { x: cx - titleWidth / 2, y: stepsTop - 46, size: 10, font: bold, color: INK });

    const bodyLines = wrapText(regular, 8, step.body, stepWidth - 24);
    bodyLines.forEach((line, lineIndex) => {
      const lineWidth = regular.widthOfTextAtSize(line, 8);
      page2.drawText(line, {
        x: cx - lineWidth / 2,
        y: stepsTop - 62 - lineIndex * 11,
        size: 8,
        font: regular,
        color: MUTED,
      });
    });
  });

  drawFooter(page2, regular);

  // ---- Pages 3+: Terms & Conditions / Exclusions ---------------------
  let exclusionsPage = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  exclusionsPage.drawRectangle({ x: 0, y: 0, width: PAGE_WIDTH, height: PAGE_HEIGHT, color: WHITE });
  let cursorY = PAGE_HEIGHT - MARGIN;
  const textMaxWidth = PAGE_WIDTH - MARGIN * 2;

  function newExclusionsPage(heading: string) {
    exclusionsPage = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    exclusionsPage.drawRectangle({ x: 0, y: 0, width: PAGE_WIDTH, height: PAGE_HEIGHT, color: WHITE });
    cursorY = PAGE_HEIGHT - MARGIN;
    exclusionsPage.drawText(heading, { x: MARGIN, y: cursorY, size: 13, font: bold, color: INK });
    cursorY -= 22;
  }

  function ensureSpace(linesNeeded: number) {
    if (cursorY - linesNeeded * 11 < MARGIN + 20) newExclusionsPage("EXCLUSIONS (continued)");
  }

  function drawParagraph(prefix: string, text: string, indent: number, size = 8.5) {
    const lines = wrapText(regular, size, text, textMaxWidth - indent - (prefix ? 14 : 0));
    ensureSpace(lines.length);
    lines.forEach((line, i) => {
      const x = MARGIN + indent + (i === 0 ? 0 : prefix ? 14 : 0);
      if (i === 0 && prefix) {
        exclusionsPage.drawText(prefix, { x: MARGIN + indent, y: cursorY, size, font: bold, color: INK });
      }
      exclusionsPage.drawText(line, { x: i === 0 && prefix ? MARGIN + indent + 14 : x, y: cursorY, size, font: regular, color: INK });
      cursorY -= 11;
    });
  }

  exclusionsPage.drawText("EXCLUSIONS", { x: MARGIN, y: cursorY, size: 13, font: bold, color: INK });
  cursorY -= 18;
  drawParagraph("", EXCLUSIONS_INTRO, 0, 9);
  cursorY -= 6;

  EXCLUSIONS.forEach((item, i) => {
    drawParagraph(`${i + 1}.`, item, 0);
    if (i === EXCLUSIONS.length - 1) {
      // The last entry introduces the furniture-specific sub-list below.
      FURNITURE_EXCLUSIONS.forEach((sub, j) => {
        const letter = String.fromCharCode(97 + j); // a, b, c, ...
        drawParagraph(`${letter})`, sub, 16);
      });
    }
  });

  drawFooter(exclusionsPage, regular);

  return doc.save();
}
