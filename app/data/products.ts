export const warrantyProducts = [
  {
    id: "television",
    category: "Television",
    name: "Television Extended Warranty",
    active: true,

    plans: [
      {
        id: "tv-1-year",
        name: "1 Year",
        price: 4589,
        currency: "INR",
        tenure: "1 Year",
      },
      {
        id: "tv-2-year",
        name: "2 Years",
        price: 5799,
        currency: "INR",
        tenure: "2 Years",
      },
      {
        id: "tv-3-year",
        name: "3 Years",
        price: 6149,
        currency: "INR",
        tenure: "3 Years",
      },
    ],

    coverage: [
      "Manufacturing defects",
      "Software issues",
      "Electrical issues",
      "Breakdowns",
    ],

    exclusions: [
      "Physical damage",
      "Liquid damage",
      "Accessories",
      "Consumables",
      "Parts not covered under the manufacturer's warranty",
    ],

    eligibility:
      "New devices purchased within 9 months of device purchase with at least 1 year of manufacturer's warranty remaining in India.",

    service:
      "Repair or replacement according to the applicable plan terms.",
  },
];