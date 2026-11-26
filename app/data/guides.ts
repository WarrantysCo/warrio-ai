// AI-answer / AEO content: one page per common buyer question, written as
// direct facts (not marketing copy) so AI answer engines (ChatGPT, Gemini,
// Google AI Overviews, Perplexity) can quote them accurately. Prices are
// real examples from priceList.ts, not guarantees — the live quote always
// comes from priceList.ts via /plans or /warranty-check. No competitor or
// other-provider names here, ever.

export type GuideVideo = {
  youtubeId: string;
  title: string;
  description: string;
  uploadDate: string; // ISO date, when the Short was published
  transcript: string; // short factual summary of what the Short says
};

export type Guide = {
  slug: string;
  title: string;
  metaDescription: string;
  categoryId: string;
  intro: string;
  faqs: { question: string; answer: string }[];
  video?: GuideVideo;
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
    video: {
      youtubeId: "n3H0UmRAqM4",
      title: "Big TV broken? Repair bill can be ₹0 with Warrantys.co",
      description:
        "A short explainer on what happens when a large TV suddenly stops working after the brand warranty ends, and how a Warrantys.co extended warranty plan covers the repair instead of an out-of-pocket bill.",
      uploadDate: "2026-11-18",
      transcript:
        "Shows a TV suddenly breaking down after the brand warranty period. Explains that without extended warranty, the full repair cost falls on the owner, but with a Warrantys.co plan the repair is cashless with genuine parts.",
    },
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
    video: {
      youtubeId: "3UqPIZ9i-HM",
      title: "Fridge breakdown? Skip the tension with extended warranty",
      description:
        "A short explainer on refrigerator breakdowns after the brand warranty ends, and how a Warrantys.co extended warranty plan saves the repair cost.",
      uploadDate: "2026-11-17",
      transcript:
        "Shows a refrigerator (or similar electronic appliance) breaking down at home. Explains that extended warranty takes the tension out of a breakdown by covering the repair cost once the brand warranty has run out.",
    },
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
    video: {
      youtubeId: "J4foTVNrOmo",
      title: "₹8,000 AC repair cost? Protect your AC today",
      description:
        "A short explainer on how an unexpected AC repair bill (compressor or gas issue) can disturb a monthly budget, and how a Warrantys.co extended warranty plan covers it.",
      uploadDate: "2026-04-12",
      transcript:
        "Explains that an unexpected AC repair bill — for example a compressor or gas-related issue — can disturb a household's monthly budget, and that a Warrantys.co extended warranty plan protects against that cost.",
    },
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
    video: {
      youtubeId: "0Ni-1-7SWdA",
      title: "Bought a new washing machine? Don't worry about repairs",
      description:
        "A short explainer on why a new washing machine owner doesn't need to worry about future repair costs when covered by a Warrantys.co extended warranty plan.",
      uploadDate: "2026-11-16",
      transcript:
        "Addresses someone who has just bought a new washing machine and tells them not to worry about the repair tension later, since an extended warranty plan covers it.",
    },
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
  {
    slug: "laptop-extended-warranty",
    title: "Laptop Extended Warranty in India: Price & Coverage",
    metaDescription:
      "What a laptop extended warranty covers in India, real price examples by laptop price band, and how long after purchase you can buy one.",
    categoryId: "laptop",
    intro:
      "Laptop motherboard, display, and keyboard repairs after the 1-year brand warranty ends can run into thousands of rupees, especially on premium models. Extended warranty covers these breakdowns for 1 to 3 additional years, with software-issue cover included.",
    video: {
      youtubeId: "TPcDUMZkxBw",
      title: "₹18,000 repair bill? Protect your device with Warrantys.co",
      description:
        "A short explainer on how a single repair bill can spoil a month's budget, and how a Warrantys.co extended warranty plan protects a laptop (or other device) against that cost.",
      uploadDate: "2026-11-12",
      transcript:
        "Shows a laptop owner facing a large, unexpected repair bill after the brand warranty has ended. Explains that one repair bill can spoil a whole month's budget, and that a Warrantys.co extended warranty plan protects the device against that cost.",
    },
    faqs: [
      {
        question: "Is extended warranty worth it for a laptop?",
        answer:
          "Yes, especially above Rs 30,000 to 40,000 — a motherboard or display repair alone can cost a large fraction of the laptop's price. A Rs 30,000 to 40,000 laptop's 1-year plan costs Rs 2,300, well under a typical board repair bill.",
      },
      {
        question: "How much does laptop extended warranty cost in India?",
        answer:
          "On Warrantys.co, a laptop priced Rs 30,000 to 40,000 costs Rs 2,300 for 1 year, Rs 2,800 for 2 years, or Rs 3,800 for 3 years. A Rs 50,000 to 60,000 laptop costs Rs 3,450 / Rs 4,200 / Rs 5,700 for the same tenures. Check your exact price band at warrantys.co/plans.",
      },
      {
        question: "Does laptop extended warranty cover software issues?",
        answer:
          "Yes — software issues are covered alongside manufacturing defects and electrical/mechanical breakdowns. Physical damage, liquid damage, theft, and cosmetic damage are not covered.",
      },
      {
        question: "Can I buy extended warranty for a laptop a few months after purchase?",
        answer:
          "Yes, any time within 9 months (270 days) of the purchase invoice date, even while the 1-year brand warranty is still running.",
      },
    ],
  },
  {
    slug: "samsung-tv-extended-warranty",
    title: "Samsung TV Extended Warranty in India: Price & Coverage",
    metaDescription:
      "Extended warranty cost and coverage for Samsung TVs in India, with real price examples and the purchase window for buying after the brand warranty.",
    categoryId: "tv",
    intro:
      "Samsung TVs carry a 1-year manufacturer warranty on most models. Extended warranty on Warrantys.co picks up after that and covers panel, board, and other electrical/mechanical breakdowns for 1 to 3 more years — pricing is based on the TV's purchase price, not the brand.",
    faqs: [
      {
        question: "Is extended warranty worth it for a Samsung TV?",
        answer:
          "For Samsung TVs above roughly Rs 30,000, yes — panel and main-board repairs are the most common and most expensive Samsung TV repairs after the brand warranty ends. A Rs 30,000 to 40,000 Samsung TV's 1-year plan costs Rs 2,260.",
      },
      {
        question: "How much does extended warranty cost for a Samsung TV?",
        answer:
          "Price depends on the TV's purchase price, not the model name: Rs 30,000 to 40,000 costs Rs 2,260 / Rs 2,800 / Rs 3,700 for 1 / 2 / 3 years; Rs 50,000 to 60,000 costs Rs 3,390 / Rs 4,200 / Rs 5,550. Check your exact band at warrantys.co/plans.",
      },
      {
        question: "How long after buying a Samsung TV can I get extended warranty?",
        answer:
          "Within 9 months (270 days) of your purchase invoice date, bought in India through an official channel with an invoice and the manufacturer's warranty.",
      },
      {
        question: "What does Samsung TV extended warranty cover?",
        answer:
          "Manufacturing defects and electrical/mechanical breakdowns, with cashless repair and genuine parts. Physical damage, liquid damage, theft, and cosmetic damage are excluded.",
      },
    ],
  },
  {
    slug: "lg-tv-extended-warranty",
    title: "LG TV Extended Warranty in India: Price & Coverage",
    metaDescription:
      "Extended warranty cost and coverage for LG TVs in India, with real price examples and the purchase window for buying after the brand warranty.",
    categoryId: "tv",
    intro:
      "LG TVs come with a 1-year manufacturer warranty. Extended warranty on Warrantys.co covers panel, board, and other electrical/mechanical breakdowns for 1 to 3 more years after that, priced by the TV's purchase price rather than the brand.",
    faqs: [
      {
        question: "Is extended warranty worth it for an LG TV?",
        answer:
          "Yes for LG TVs above roughly Rs 30,000, since OLED and panel repairs on LG TVs are expensive. A Rs 40,000 to 50,000 LG TV's 1-year plan costs Rs 2,825.",
      },
      {
        question: "How much does extended warranty cost for an LG TV?",
        answer:
          "Price is based on the TV's purchase price: Rs 40,000 to 50,000 costs Rs 2,825 / Rs 3,500 / Rs 4,625 for 1 / 2 / 3 years; Rs 60,000 to 70,000 costs Rs 3,955 / Rs 4,900 / Rs 6,475. See your exact band at warrantys.co/plans.",
      },
      {
        question: "Can I buy extended warranty for an LG TV after a few months?",
        answer:
          "Yes, any time within 9 months (270 days) of your purchase invoice date.",
      },
    ],
  },
  {
    slug: "sony-tv-extended-warranty",
    title: "Sony TV Extended Warranty in India: Price & Coverage",
    metaDescription:
      "Extended warranty cost and coverage for Sony TVs in India, with real price examples and the purchase window for buying after the brand warranty.",
    categoryId: "tv",
    intro:
      "Sony TVs, especially higher-end Bravia models, carry a 1-year manufacturer warranty. Extended warranty on Warrantys.co covers panel and board breakdowns for 1 to 3 more years, priced by the TV's purchase price.",
    faqs: [
      {
        question: "Is extended warranty worth it for a Sony TV?",
        answer:
          "Yes, particularly for premium Sony models above Rs 70,000 to 100,000, where a panel replacement is one of the costliest single appliance repairs. The 1-year plan for that band costs Rs 5,650.",
      },
      {
        question: "How much does extended warranty cost for a Sony TV?",
        answer:
          "Price depends on purchase price, not brand: Rs 70,000 to 100,000 costs Rs 5,650 / Rs 7,000 / Rs 9,250 for 1 / 2 / 3 years; Rs 100,000 to 150,000 costs Rs 8,475 / Rs 10,500 / Rs 13,875. Check your exact band at warrantys.co/plans.",
      },
      {
        question: "When is the last date to buy extended warranty for a Sony TV?",
        answer:
          "Within 9 months (270 days) of your purchase invoice date.",
      },
    ],
  },
  {
    slug: "samsung-fridge-extended-warranty",
    title: "Samsung Refrigerator Extended Warranty: Price & Coverage",
    metaDescription:
      "Extended warranty cost and coverage for Samsung refrigerators in India, with real price examples and the purchase window.",
    categoryId: "refrigerator",
    intro:
      "Samsung refrigerators carry a 1-year manufacturer warranty, though the compressor itself is often covered longer by Samsung directly. Extended warranty on Warrantys.co covers other electrical/mechanical breakdowns and manufacturing defects for 1 to 3 more years.",
    faqs: [
      {
        question: "Is extended warranty worth it for a Samsung refrigerator?",
        answer:
          "Yes for most models — cooling-system and control-board repairs outside the compressor are common and costly. A Rs 30,000 to 40,000 Samsung fridge's 1-year plan costs Rs 2,200.",
      },
      {
        question: "How much does extended warranty cost for a Samsung fridge?",
        answer:
          "Price is based on purchase price: Rs 30,000 to 40,000 costs Rs 2,200 / Rs 2,700 / Rs 3,520 for 1 / 2 / 3 years; Rs 20,000 to 30,000 costs Rs 1,650 / Rs 2,025 / Rs 2,640. See your exact band at warrantys.co/plans.",
      },
      {
        question: "Can I buy extended warranty for a Samsung fridge after a few months?",
        answer:
          "Yes, any time within 9 months (270 days) of your purchase invoice date.",
      },
    ],
  },
  {
    slug: "lg-fridge-extended-warranty",
    title: "LG Refrigerator Extended Warranty: Price & Coverage",
    metaDescription:
      "Extended warranty cost and coverage for LG refrigerators in India, with real price examples and the purchase window.",
    categoryId: "refrigerator",
    intro:
      "LG refrigerators carry a 1-year manufacturer warranty. Extended warranty on Warrantys.co covers cooling-system and control-board breakdowns for 1 to 3 more years after that, priced by the fridge's purchase price.",
    faqs: [
      {
        question: "Is extended warranty worth it for an LG refrigerator?",
        answer:
          "Yes for fridges above Rs 20,000 to 30,000 — a single control-board or cooling-system repair often costs close to a year of cover. That band's 1-year plan costs Rs 1,650.",
      },
      {
        question: "How much does extended warranty cost for an LG fridge?",
        answer:
          "Price is based on purchase price: Rs 20,000 to 30,000 costs Rs 1,650 / Rs 2,025 / Rs 2,640 for 1 / 2 / 3 years; Rs 40,000 to 50,000 costs Rs 2,750 / Rs 3,375 / Rs 4,400. Check your exact band at warrantys.co/plans.",
      },
      {
        question: "When is the last date to buy extended warranty for an LG fridge?",
        answer:
          "Within 9 months (270 days) of your purchase invoice date.",
      },
    ],
  },
  {
    slug: "extended-warranty-amazon-flipkart-purchase",
    title: "Extended Warranty for Products Bought on Amazon or Flipkart",
    metaDescription:
      "Can you buy extended warranty on Warrantys.co for a TV, fridge, AC, or laptop bought on Amazon or Flipkart? Eligibility and how to apply, explained.",
    categoryId: "tv",
    intro:
      "Yes — Warrantys.co covers new products bought through official channels on Amazon or Flipkart, the same way it covers products bought from a local shop, as long as you have the purchase invoice and the manufacturer's warranty is valid.",
    faqs: [
      {
        question: "Can I buy extended warranty for a product bought on Amazon?",
        answer:
          "Yes, as long as it's a new (not refurbished) product bought through an official/authorized seller with a proper invoice, and you buy the plan within 9 months (270 days) of the Amazon invoice date.",
      },
      {
        question: "Can I buy extended warranty for a product bought on Flipkart?",
        answer:
          "Yes, same rule — new product, official channel, invoice available, and purchase within 9 months of the Flipkart invoice date.",
      },
      {
        question: "What invoice do I need from Amazon or Flipkart to buy extended warranty?",
        answer:
          "Your Amazon or Flipkart tax invoice (downloadable from your orders page) showing the product, price, and purchase date — upload this when you buy your plan or during warranty-certificate registration.",
      },
      {
        question: "Does it matter which platform I bought the product on?",
        answer:
          "No — Warrantys.co's eligibility rules (new product, official channel, invoice, 9-month window) are the same regardless of whether you bought from Amazon, Flipkart, or a local retailer.",
      },
    ],
  },
  {
    slug: "check-tv-fridge-warranty-end-date",
    title: "How to Check Your TV or Fridge Warranty End Date",
    metaDescription:
      "How to find your TV or refrigerator's manufacturer warranty end date from your invoice, and why it matters for buying extended warranty on time.",
    categoryId: "tv",
    intro:
      "Your manufacturer warranty end date is usually 1 year from your purchase invoice date, though some brands offer longer cover on specific parts (like a compressor). Knowing this date matters because the 9-month Warrantys.co purchase window is counted from your invoice date, not from when the brand warranty ends.",
    faqs: [
      {
        question: "How do I find my TV or fridge's warranty end date?",
        answer:
          "Check your purchase invoice date and add the manufacturer's stated warranty period (usually 1 year for the main unit) — that gives your warranty end date. The invoice itself, or the product's warranty card, states the exact period.",
      },
      {
        question: "Can Warrantys.co tell me my warranty end date for free?",
        answer:
          "Yes — upload your bill at warrantys.co/warranty-check and it reads your invoice and shows your warranty end date along with your plan price, no cost or obligation to buy.",
      },
      {
        question: "Does the 9-month window start from my invoice date or my warranty end date?",
        answer:
          "From your invoice (purchase) date — you can buy a Warrantys.co plan any time within 270 days of that date, even while the manufacturer warranty is still running.",
      },
      {
        question: "What if I can't find my original invoice?",
        answer:
          "Check your email for an Amazon/Flipkart order confirmation, or ask the retailer for a reprint — a valid invoice showing the product and purchase date is required to buy or activate a plan.",
      },
    ],
  },
  {
    slug: "how-to-claim-extended-warranty",
    title: "How to Raise a Claim on Your Extended Warranty",
    metaDescription:
      "How the Warrantys.co extended warranty claim and repair process works, from raising a service request to replacement or refund if it can't be repaired.",
    categoryId: "tv",
    intro:
      "Raising a claim means logging a service request for your covered device. Warrantys.co assigns it to an authorized technician for a cashless repair with genuine parts — if the device can't be repaired, you get a replacement or a full refund with no depreciation deduction.",
    faqs: [
      {
        question: "How do I raise a claim on my Warrantys.co extended warranty?",
        answer:
          "Log a service request through your registered email or the website once your device develops a covered issue. An authorized technician is then assigned to inspect and repair it.",
      },
      {
        question: "Is the repair cashless?",
        answer:
          "Yes — all covered repairs use genuine parts through authorized technicians with no hidden charges, as long as the issue falls under coverage (manufacturing defects, electrical/mechanical breakdowns, software issues).",
      },
      {
        question: "What happens if my device can't be repaired?",
        answer:
          "You get an equivalent replacement or a full refund of the purchase value, with no depreciation deduction, once the technician confirms the device can't be fixed.",
      },
      {
        question: "What's not covered when I raise a claim?",
        answer:
          "Physical damage, liquid damage, theft or loss, cosmetic damage, and consumables like filters, batteries, or cables are excluded — these are not valid claim reasons under a Warrantys.co extended warranty.",
      },
    ],
  },
];
