import { faqText } from "@/app/data/policies";
import { parseFaq } from "@/app/lib/policyText";

const faqs = parseFaq(faqText);

// The FAQ doubles as the "Store Policies" (terms) text on the old site.
export default function FaqList() {
  return (
    <div className="space-y-3">
      {faqs.map((faq, index) => (
        <details
          key={faq.question}
          className="group rounded-2xl border border-white/10 bg-white/[0.03] open:bg-white/[0.05]"
          open={index === 0}
        >
          <summary className="flex cursor-pointer list-none items-start gap-4 px-5 py-4 font-semibold">
            <span className="flex-1">{faq.question}</span>
            <span className="text-slate-500 transition group-open:rotate-90">›</span>
          </summary>
          <div className="space-y-2 px-5 pb-5 text-sm leading-6 text-slate-300">
            {faq.answer.map((line) => (
              <p key={line}>{line}</p>
            ))}
          </div>
        </details>
      ))}
    </div>
  );
}
