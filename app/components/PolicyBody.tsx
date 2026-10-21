import type { PolicyBlock } from "@/app/lib/policyText";

export default function PolicyBody({ blocks }: { blocks: PolicyBlock[] }) {
  return (
    <div className="space-y-4 text-base leading-7 text-slate-700">
      {blocks.map((block, index) =>
        block.kind === "heading" ? (
          <h2 key={index} className="pt-4 text-xl font-bold text-slate-900">
            {block.text}
          </h2>
        ) : (
          <p key={index}>
            {block.label && (
              <span className="font-semibold text-slate-900">{block.label}: </span>
            )}
            {block.text}
          </p>
        )
      )}
    </div>
  );
}
