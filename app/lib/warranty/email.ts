import "server-only";

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

  try {
    await transporter.sendMail({
      from: `"Warrantys.co" <${user}>`,
      to: options.to,
      subject: `Your Warrantys.co warranty certificate - Order ${options.orderId}`,
      text: `Hi ${options.customerName},\n\nThank you for protecting your device with Warrantys.co. Your warranty certificate is attached.\n\nOrder ID: ${options.orderId}\n\nIf you ever need help, call us at 8875192691 or reply to this email.\n\nWarrantys.co team`,
      attachments: [
        { filename: options.fileName, content: Buffer.from(options.pdf), contentType: "application/pdf" },
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
