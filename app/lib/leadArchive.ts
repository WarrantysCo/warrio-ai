import "server-only";

import { readChatForLead, saveChatLine, transcript } from "@/app/lib/chats/store";
import { uploadToDrive } from "@/app/lib/integrations/drive";
import { addNoteToHubSpot, type HubSpotResult } from "@/app/lib/integrations/hubspot";
import type { StoredLead } from "@/app/lib/integrations/leadStore";
import { reportProblem } from "@/app/lib/monitoring/problems";
import { leadUpdatesAddress, sendMail } from "@/app/lib/warranty/email";
import { saveInvoiceFile } from "@/app/lib/warranty/store";

// Everything we keep about a new order, so nothing about the customer is lost
// if they never pay: the bill file, the whole Warrio chat (also as a note on
// the HubSpot lead), a Google Drive copy of the bill, and one email to
// warrantys.co.amz@gmail.com with all of it. Runs after the customer already
// has their answer and never throws.
export async function archiveNewLead(options: {
  lead: StoredLead;
  invoice: File | null;
  chatId: string;
  hubspot: HubSpotResult;
}) {
  const { lead, invoice, chatId, hubspot } = options;
  try {
    if (chatId) {
      await saveChatLine({
        chat_id: chatId,
        kind: "linked",
        text: `Customer ${lead.name} (${lead.mobile}) chose ${lead.recommended_plan} Rs ${lead.plan_price_inr} and got a payment link`,
        lead_reference: lead.lead_reference,
      });
    }
    const session = chatId ? await readChatForLead(lead.lead_reference) : null;
    const chatText = session ? transcript(session) : "";

    let attachment: { filename: string; content: Buffer } | undefined;
    if (invoice) {
      const savedName = await saveInvoiceFile(lead.lead_reference, invoice).catch(() => "");
      const content = Buffer.from(await invoice.arrayBuffer());
      attachment = { filename: savedName || `${lead.lead_reference}-${invoice.name}`, content };
      const drive = await uploadToDrive({
        leadReference: lead.lead_reference,
        fileName: attachment.filename,
        content,
      });
      if (drive === "failed") {
        await reportProblem({
          kind: "saving_failed",
          where: "Google Drive copy of bill",
          message: "The bill was not copied to Google Drive (it is still on the server and in the email).",
          lead_reference: lead.lead_reference,
          mobile: lead.mobile,
        });
      }
    }

    if (chatText) {
      await addNoteToHubSpot({
        contactId: hubspot.contactId,
        dealId: hubspot.dealId,
        leadReference: lead.lead_reference,
        body: `Warrio chat before the order ${lead.lead_reference}:\n\n${chatText}`,
      });
    }

    await sendMail({
      to: leadUpdatesAddress(),
      subject: `New order ${lead.lead_reference}: ${lead.name}, ${lead.recommended_plan} Rs ${lead.plan_price_inr}`,
      text: [
        `New plan order on warrantys.co (not paid yet unless you see a payment email).`,
        ``,
        `Lead: ${lead.lead_reference}`,
        `Customer: ${lead.name}, ${lead.mobile}${lead.email ? `, ${lead.email}` : ""}`,
        `Plan: ${lead.recommended_plan}, Rs ${lead.plan_price_inr}`,
        `Device: ${[lead.brand, lead.model].filter(Boolean).join(" ") || lead.product_category}`,
        `Payment link: ${lead.payment_link || "none"}`,
        attachment ? `Bill attached: ${attachment.filename}` : `Bill: not uploaded yet`,
        ``,
        chatText ? `Chat with Warrio:\n${chatText}` : `No chat saved for this order.`,
      ].join("\n"),
      attachments: attachment ? [attachment] : undefined,
    });
  } catch (error) {
    console.error("Archiving lead failed:", error instanceof Error ? error.message : error);
  }
}

