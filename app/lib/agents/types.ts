import type { InvoiceUpload } from "../invoiceFile";
import type { SalesAnalysis } from "./sales/types";

export type AgentId =
  | "sales"
  | "support"
  | "operations"
  | "shipping"
  | "whatsapp"
  | "marketing";

export type Channel = "website" | "whatsapp" | "n8n";

// One customer message, as the CEO receives it from any channel.
export type AgentRequest = {
  channel: Channel;
  message: string;
  customerName?: string;
  selectedProduct?: string;
  invoice?: InvoiceUpload;
};

export type AgentResponse = {
  success: boolean;
  agent: AgentId;
  message: string;
  analysis?: SalesAnalysis;
};

export type WarrioAgent = {
  id: AgentId;
  title: string;
  job: string;
  // Planned agents are listed so the CEO knows the full team, but never routed to.
  status: "live" | "planned";
  handle?: (request: AgentRequest) => Promise<AgentResponse>;
};
