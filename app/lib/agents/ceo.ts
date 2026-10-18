import "server-only";

import { agents } from "./registry";
import type { AgentId, AgentRequest, AgentResponse } from "./types";

// Warrio the CEO: every customer message comes here first and is handed to the
// agent whose job it is. Routing is keyword based for now; it can move to an AI
// classifier once more agents are live.
const SUPPORT_WORDS =
  /\b(claim|repair|breakdown|broken|not working|stopped working|service|complaint|certificate|my warranty|kharab|band ho|chal nahi)\b/i;

export function chooseAgent(request: AgentRequest): AgentId {
  if (request.invoice) return "sales";
  if (SUPPORT_WORDS.test(request.message)) return "support";
  return "sales";
}

export async function handleCustomerRequest(
  request: AgentRequest
): Promise<AgentResponse> {
  const agent = agents[chooseAgent(request)];

  if (agent.status !== "live" || !agent.handle) {
    return {
      success: false,
      agent: agent.id,
      message:
        "A team member from Warrantys.co will help you with this shortly.",
    };
  }

  return agent.handle(request);
}
