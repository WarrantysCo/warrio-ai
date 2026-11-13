// Turns the plain policy text in app/data/policies.ts into pieces the website
// pages can lay out. The text itself stays untouched because the AI agents
// read the same strings.

export type FaqItem = { question: string; answer: string[] };

export function parseFaq(text: string): FaqItem[] {
  const items: FaqItem[] = [];

  for (const rawLine of text.split("\n")) {
    const line = rawLine.trim();
    if (!line) continue;

    const question = line.match(/^\d+\.\s+(.*)$/);
    if (question) {
      items.push({ question: question[1], answer: [] });
    } else if (items.length > 0) {
      items[items.length - 1].answer.push(line);
    }
  }

  return items;
}

export type PolicyBlock =
  | { kind: "heading"; text: string }
  | { kind: "paragraph"; label?: string; text: string };

// Lines ending in ":" become headings, and "Short label: text" lines keep the
// label so it can be shown in bold.
export function parsePolicy(text: string, skipLines = 0): PolicyBlock[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(skipLines)
    .map((line): PolicyBlock => {
      if (line.endsWith(":")) {
        return { kind: "heading", text: line.slice(0, -1) };
      }

      const labelled = line.match(/^([^:]{3,40}):\s+(.+)$/);
      return labelled
        ? { kind: "paragraph", label: labelled[1], text: labelled[2] }
        : { kind: "paragraph", text: line };
    });
}
