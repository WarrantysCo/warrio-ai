import "server-only";

import {
  AI_NOT_CONFIGURED_MESSAGE,
  AI_UNAVAILABLE_MESSAGE,
  createModel,
  getErrorMessage,
} from "../../ai/gemini";
import { reportProblem } from "../../monitoring/problems";
import { buildVerifiedDataBlock } from "../knowledge";
import type { AgentRequest, AgentResponse, WarrioAgent } from "../types";

function buildSystemInstruction() {
  return `You are Warrio AI - Your Warranty Warrior, the support assistant for Warrantys.co, built by AA Labs.

Your job: help customers understand their warranty, what is covered, and the next steps for claims and service. Be friendly, clear and professional. Keep answers short and easy to read on a phone.

${buildVerifiedDataBlock()}`;
}

async function handle(request: AgentRequest): Promise<AgentResponse> {
  const model = createModel(buildSystemInstruction());

  if (!model) {
    return { success: false, agent: "support", message: AI_NOT_CONFIGURED_MESSAGE };
  }

  try {
    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: request.message }] }],
      generationConfig: { temperature: 0.4 },
    });

    return { success: true, agent: "support", message: result.response.text() };
  } catch (error) {
    await reportProblem({
      kind: "warrio_ai",
      where: "Warrio support chat",
      message: `Could not answer a customer: ${getErrorMessage(error)}`,
    });
    return { success: false, agent: "support", message: AI_UNAVAILABLE_MESSAGE };
  }
}

export const supportAgent: WarrioAgent = {
  id: "support",
  title: "Support",
  job: "Answers warranty, coverage and claim questions.",
  status: "live",
  handle,
};
