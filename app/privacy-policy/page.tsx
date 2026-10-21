import type { Metadata } from "next";

import PageShell from "@/app/components/PageShell";
import { privacyPolicy } from "@/app/data/privacyPolicy";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How Warrantys.co collects, uses and protects your information.",
};

export default function PrivacyPolicyPage() {
  return (
    <PageShell eyebrow="Policy" title="Privacy Policy">
      <div className="space-y-4 text-base leading-7 text-slate-300">
        {privacyPolicy.map((section, sectionIndex) => (
          <section key={section.heading ?? sectionIndex} className="space-y-4">
            {section.heading && (
              <h2 className="pt-4 text-xl font-bold text-white">{section.heading}</h2>
            )}
            {section.body.map((part, index) =>
              Array.isArray(part) ? (
                <ul key={index} className="list-disc space-y-1 pl-6">
                  {part.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              ) : (
                <p key={index}>{part}</p>
              )
            )}
          </section>
        ))}
      </div>
    </PageShell>
  );
}
