import "server-only";

import { salesAgent } from "./sales/agent";
import { supportAgent } from "./support/agent";
import type { AgentId, WarrioAgent } from "./types";

// Warrio's team. Add an agent here when it is built and flip it to "live".
export const agents: Record<AgentId, WarrioAgent> = {
  sales: salesAgent,
  support: supportAgent,
  operations: {
    id: "operations",
    title: "Operations",
    job: "Warranty certificates, policy PDFs, renewals and daily summaries.",
    status: "planned",
  },
  shipping: {
    id: "shipping",
    title: "Shipping",
    job: "Pickup and drop of devices for repair.",
    status: "planned",
  },
  whatsapp: {
    id: "whatsapp",
    title: "WhatsApp",
    job: "Talks to customers on WhatsApp and passes their messages to the CEO.",
    status: "planned",
  },
  marketing: {
    id: "marketing",
    title: "Marketing",
    job: "Posts, ads and follow-ups for direct channels (never Amazon buyers).",
    status: "planned",
  },
};
