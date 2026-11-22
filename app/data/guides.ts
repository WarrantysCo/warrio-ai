// AI-answer / AEO content: one page per common buyer question, written as
// direct facts (not marketing copy) so AI answer engines (ChatGPT, Gemini,
// Google AI Overviews, Perplexity) can quote them accurately. Prices are
// real examples from priceList.ts, not guarantees — the live quote always
// comes from priceList.ts via /plans or /warranty-check. No competitor or
// other-provider names here, ever.

export type Guide = {
  slug: string;
  title: string;
  metaDescription: string;
  categoryId: string;
  intro: string;
  faqs: { question: string; answer: string }[];
};

export const guides: Guide[] = [
  {
    slug: "tv-extended-warranty",
    title: "TV Extended Warranty in India: Is It Worth It?",
    metaDescription:
      "What an extended warranty covers on a TV in India, what it costs, and how to buy one after the brand warranty period, with real price examples.",
    categoryId: "tv",
    intro:
      "Most TVs sold in India come with a 1-year manufacturer warranty. An extended warranty picks up after that, covering electrical and mechanical breakdowns and manufacturing defects for 1 to 3 more years, with cashless repairs and genuine parts.",
    faqs: [
      {
        question: "Is extended warranty worth it for a TV?",
        answer:
          "For TVs above roughly Rs 20,000 to 30,000, yes — a single panel or board repair after the brand warranty ends often costs close to a year of extended cover. Larger and premium TVs (55 inch and up) make the cover worth it even more, since panel replacement is expensive.",
      },
      {
        question: "How much does TV extended warranty cost in India?",
        answer:
          "On Warrantys.co, a TV priced Rs 30,000 to 40,000 costs Rs 2,260 for 1 year, Rs 2,800 for 2 years, or Rs 3,700 for 3 years. Price depends on the TV's purchase price band — see the exact price for your TV at warrantys.co/plans.",
      },
      {
        question: "Can I buy extended warranty after the brand warranty ends?",
        answer:
          "Yes, but only within 9 months (270 days) of your purchase invoice date, not after the brand warranty itself ends. Buy any time in that window, even if your 1-year brand warranty is still running.",
      },
      {
        question: "What does TV extended warranty cover?",
        answer:
          "Manufacturing defects and electrical/mechanical breakdowns, with cashless repair using genuine parts. It does not cover physical damage, liquid damage, theft, or cosmetic damage.",
      },
      {
        question: "What if my TV can't be repaired?",
        answer:
          "You get a replacement or a full refund, with no depreciation cut and no hidden charges, through authorized technicians only.",
      },
    ],
  },
  {
    slug: "fridge-extended-warranty",
    title: "Refrigerator Extended Warranty in India: Price & Coverage",
    metaDescription:
      "What a refrigerator extended warranty covers, real price examples by fridge price band, and how long after purchase you can buy one in India.",
    categoryId: "refrigerator",
    intro:
      "A refrigerator runs every day of the year, so a compressor or cooling-system fault after the brand warranty ends is one of the more expensive home-appliance repairs. Extended warranty covers this for 1 to 3 years after the standard 1-year brand cover.",
    faqs: [
      {
        question: "Is extended warranty worth it for a refrigerator?",
        answer:
          "Yes for most refrigerators — compressor and cooling-system repairs are among the costliest fridge repairs, and a fridge runs continuously, so breakdown risk is real. The 1-year plan for a Rs 20,000 to 30,000 fridge costs Rs 1,650, well under a single compressor repair bill.",
      },
      {
        question: "How much does refrigerator extended warranty cost?",
        answer:
          "On Warrantys.co, a refrigerator priced Rs 20,000 to 30,000 costs Rs 1,650 for 1 year, Rs 2,025 for 2 years, or Rs 2,640 for 3 years. Exact price depends on your fridge's purchase price — check at warrantys.co/plans.",
      },
      {
        question: "Can I buy fridge extended warranty after a few months?",
        answer:
          "Yes, any time within 9 months (270 days) of the purchase invoice date — you don't have to buy it on day one.",
      },
      {
        question: "What does refrigerator extended warranty not cover?",
        answer:
          "Physical damage, liquid damage, theft, cosmetic damage, and consumables like gaskets or filters are excluded. AC gas refills are also excluded for AC plans, but not relevant to fridges.",
      },
    ],
  },
  {
    slug: "ac-extended-warranty",
    title: "AC Extended Warranty in India: Price & When to Buy",
    metaDescription:
      "What an AC extended warranty costs and covers in India, and why buying within 9 months of purchase matters even outside the summer season.",
    categoryId: "ac",
    intro:
      "Air conditioner repairs (compressor, PCB, gas-related faults) can be costly once the brand warranty ends. Extended warranty covers breakdowns for 1 to 3 years after that, regardless of season — the purchase window is what matters, not the time of year you buy.",
    faqs: [
      {
        question: "Is extended warranty worth it for an AC?",
        answer:
          "Yes, especially for split and inverter ACs where PCB and compressor repairs are expensive. A Rs 20,000 to 30,000 AC's 1-year plan costs Rs 1,740 — much less than a single PCB replacement.",
      },
      {
        question: "Can I buy AC extended warranty in winter?",
        answer:
          "Yes. The purchase window is 9 months (270 days) from your invoice date, not tied to the cooling season. If you bought your AC in summer, you can still buy extended cover months later.",
      },
      {
        question: "How much does AC extended warranty cost?",
        answer:
          "On Warrantys.co, an AC priced Rs 20,000 to 30,000 costs Rs 1,740 for 1 year, Rs 2,190 for 2 years, or Rs 2,850 for 3 years. See your exact price at warrantys.co/plans.",
      },
      {
        question: "Does AC extended warranty cover gas refilling?",
        answer:
          "No, AC gas is specifically excluded, along with physical damage, liquid damage, theft and cosmetic damage. It covers electrical/mechanical breakdowns and manufacturing defects.",
      },
    ],
  },
  {
    slug: "washing-machine-extended-warranty",
    title: "Washing Machine Extended Warranty: Cost & Coverage",
    metaDescription:
      "Washing machine extended warranty prices by price band in India, what's covered, and how long after purchase you can still buy one.",
    categoryId: "washing-machine",
    intro:
      "Washing machine motor and drum faults after the 1-year brand warranty are common repair costs. Extended warranty covers these for 1 to 3 additional years.",
    faqs: [
      {
        question: "Is extended warranty worth it for a washing machine?",
        answer:
          "Yes for machines above Rs 15,000 to 20,000 — motor, drum, and control-board repairs can be a significant fraction of the machine's price. A Rs 20,000 to 30,000 machine's 1-year plan is Rs 1,650.",
      },
      {
        question: "How much does washing machine extended warranty cost?",
        answer:
          "On Warrantys.co, a washing machine priced Rs 20,000 to 30,000 costs Rs 1,650 for 1 year, Rs 2,025 for 2 years, or Rs 2,640 for 3 years. Check your exact band at warrantys.co/plans.",
      },
      {
        question: "When is the last date to buy washing machine extended warranty?",
        answer:
          "Within 9 months (270 days) of your purchase invoice date — not tied to when the brand warranty itself ends.",
      },
    ],
  },
  {
    slug: "is-extended-warranty-worth-it",
    title: "Is Extended Warranty Worth It? A Straight Answer",
    metaDescription:
      "When extended warranty is worth buying for a TV, fridge, AC, washing machine, laptop or phone, with real price examples and what's actually covered.",
    categoryId: "tv",
    intro:
      "Extended warranty is worth it when a single repair after the brand warranty ends would likely cost more than the plan itself — which is usually true for appliances above roughly Rs 15,000 to 20,000, where compressor, motor, panel, or board repairs are expensive.",
    faqs: [
      {
        question: "Is extended warranty a waste of money?",
        answer:
          "Not if priced correctly relative to real repair costs. It is a poor value only when the plan price is close to the appliance's own replacement cost, or when it duplicates a brand warranty you already have. Check the manufacturer warranty period first, then buy extended cover to start right after it ends.",
      },
      {
        question: "What is the difference between manufacturer warranty and extended warranty?",
        answer:
          "Manufacturer warranty (usually 1 year) is free and included at purchase. Extended warranty is purchased separately and covers the same type of breakdowns and defects for additional years after the manufacturer warranty ends.",
      },
      {
        question: "How long after buying a device can I get extended warranty?",
        answer:
          "On Warrantys.co, up to 9 months (270 days) from your purchase invoice date, for new (not refurbished) products bought in India with an invoice and the original manufacturer's warranty.",
      },
      {
        question: "What does extended warranty NOT cover?",
        answer:
          "Physical damage, liquid damage, theft or loss, cosmetic damage, consumables (filters, batteries, cables), and AC gas are excluded across all Warrantys.co plans. It covers manufacturing defects and electrical/mechanical breakdowns.",
      },
    ],
  },
];
