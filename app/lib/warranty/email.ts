import "server-only";

import { readFile } from "node:fs/promises";
import path from "node:path";

import nodemailer from "nodemailer";

// Sends the certificate by email from warrantys.co.amz@gmail.com (free Gmail,
// per Amit 2026-10-27). Needs GMAIL_USER + GMAIL_APP_PASSWORD (a Gmail "app
// password", not the normal login password) set on the host.

function gmailTransport() {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;
  if (!user || !pass) return null;
  return {
    user,
    transporter: nodemailer.createTransport({ service: "gmail", auth: { user, pass } }),
  };
}

export async function sendCertificateEmail(options: {
  to: string;
  customerName: string;
  orderId: string;
  pdf: Uint8Array;
  fileName: string;
}): Promise<{ ok: boolean; error?: string }> {
  const gmail = gmailTransport();
  if (!gmail) return { ok: false, error: "Email is not set up yet." };
  const { transporter, user } = gmail;

  const body = [
    `Hi ${options.customerName},`,
    ``,
    `Thank you for protecting your device with Warrantys.co. Your warranty certificate is attached.`,
    ``,
    `Order ID: ${options.orderId}`,
    ``,
    `If you ever need help, call us at 8875192691 or reply to this email.`,
  ];
  try {
    await transporter.sendMail({
      from: `"Warrantys.co" <${user}>`,
      to: options.to,
      subject: `Your Warrantys.co warranty certificate - Order ${options.orderId}`,
      text: `${body.join("\n")}\n\nWarrantys.co team`,
      html: brandedHtml(body),
      attachments: [
        { filename: options.fileName, content: Buffer.from(options.pdf), contentType: "application/pdf" },
        await logoAttachment(),
      ],
    });
    return { ok: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Certificate email failed:", message);
    // Show Gmail's own reason (e.g. "Invalid login", "Username and Password
    // not accepted") on the admin page so a failed send can be diagnosed
    // without server log access. Never contains the app password itself.
    return { ok: false, error: message.slice(0, 200) };
  }
}

// A short plain-text email to the team (problem alerts, the daily stuck
// customers list). Failures are only logged: the caller is usually already
// reporting a problem, and must not start another.
export async function sendAlertEmail(options: { to: string; subject: string; text: string }) {
  const gmail = gmailTransport();
  if (!gmail) return false;
  try {
    await gmail.transporter.sendMail({
      from: `"Warrantys.co alerts" <${gmail.user}>`,
      to: options.to,
      subject: options.subject,
      text: options.text,
    });
    return true;
  } catch (error) {
    console.error("Alert email failed:", error instanceof Error ? error.message : error);
    return false;
  }
}

// The mailbox that keeps every lead update (new orders with the customer's
// chat and bill attached, payments, follow-ups): warrantys.co.amz@gmail.com.
export function leadUpdatesAddress() {
  return process.env.LEAD_UPDATES_EMAIL || process.env.GMAIL_USER || "warrantys.co.amz@gmail.com";
}

// Sends any email from the Gmail account, with optional attachments. Returns
// whether it was sent; never throws.
export async function sendMail(options: {
  to: string;
  bcc?: string;
  replyTo?: string;
  subject: string;
  text: string;
  attachments?: { filename: string; content: Buffer }[];
  // A formatted version of the email; `text` stays as the plain fallback.
  // When it uses cid:warrantys-logo, the Warrantys.co logo is attached inline.
  html?: string;
}): Promise<boolean> {
  const gmail = gmailTransport();
  if (!gmail) return false;
  try {
    await gmail.transporter.sendMail({
      from: `"Warrantys.co" <${gmail.user}>`,
      to: options.to,
      bcc: options.bcc,
      replyTo: options.replyTo,
      subject: options.subject,
      text: options.text,
      html: options.html,
      attachments: [
        ...(options.attachments ?? []),
        ...(options.html?.includes("cid:warrantys-logo") ? [await logoAttachment()] : []),
      ],
    });
    return true;
  } catch (error) {
    console.error("Email failed:", error instanceof Error ? error.message : error);
    return false;
  }
}

// The Warrantys.co logo shown in the email signature, sent inside the email
// itself so it shows even when the customer's mail app blocks remote images.
async function logoAttachment() {
  return {
    filename: "warrantys-logo.png",
    content: await readFile(
      /*turbopackIgnore: true*/ path.join(process.cwd(), "public", "brand", "warrantys-logo-email.png")
    ),
    cid: "warrantys-logo",
  };
}

function escapeHtml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// Turns a plain-text email (paragraphs separated by blank lines, links on
// their own line) into a simple HTML email that ends with the logo signature.
export function brandedHtml(bodyLines: string[]): string {
  const paragraphs = bodyLines
    .join("\n")
    .split(/\n\n+/)
    .map((block) =>
      `<p style="margin:0 0 14px">${escapeHtml(block)
        .replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" style="color:#1e8be8">$1</a>')
        .replace(/\n/g, "<br>")}</p>`
    )
    .join("");
  return `<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.5;color:#1e293b">${paragraphs}
<p style="margin:18px 0 6px"><strong>Warrantys.co team</strong></p>
<img src="cid:warrantys-logo" alt="Warrantys.co" width="180" style="display:block;border:0;height:auto">
<p style="margin:6px 0 0;font-size:12px;color:#64748b">warrantys.co · business@warrantys.co</p></div>`;
}
