import "server-only";

// Copies each customer's bill into a Google Drive folder, named with the lead
// number, so we keep it for our records. Google Drive cannot be reached
// directly without a complicated Google setup, so this sends the file to a
// small free Google Apps Script (made by Amit in the Drive account once) that
// saves it in the folder. Needs DRIVE_UPLOAD_URL and DRIVE_UPLOAD_SECRET; leave
// them empty to skip. The bill is also emailed to warrantys.co.amz@gmail.com.

export async function uploadToDrive(options: {
  leadReference: string;
  fileName: string;
  content: Buffer;
}): Promise<"sent" | "skipped" | "failed"> {
  const url = process.env.DRIVE_UPLOAD_URL;
  const secret = process.env.DRIVE_UPLOAD_SECRET;
  if (!url || !secret) return "skipped";
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({
        secret,
        leadReference: options.leadReference,
        fileName: options.fileName,
        base64: options.content.toString("base64"),
      }),
      redirect: "follow",
      signal: AbortSignal.timeout(20_000),
    });
    const result = await response.json().catch(() => ({}));
    return response.ok && result?.ok ? "sent" : "failed";
  } catch (error) {
    console.error("Drive upload failed:", error instanceof Error ? error.message : error);
    return "failed";
  }
}
