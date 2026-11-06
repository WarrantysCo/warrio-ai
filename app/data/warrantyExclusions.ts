// The standard "Exclusions" terms printed on every warranty certificate,
// copied verbatim from Amit's sample certificate (2026-10-28). This text is
// the same for every plan and category, including the furniture-specific
// sub-list, which the sample certificate prints regardless of device type.

export const EXCLUSIONS_INTRO =
  "The Company is not liable for and no indemnity will be provided in respect of any loss to the Insured Asset arising out of, caused by, occasioned by, attributable to or howsoever connected to:";

export const EXCLUSIONS: string[] = [
  "Any claim falling beyond the Cover Period.",
  "Deductible as opted by the Insured and stated in the Policy Schedule",
  "Loss or damage arising out of the Insured Asset not being used in accordance with manufacturer's general instructions/guidelines.",
  "Loss or damage for which the manufacturer of the Insured Asset is responsible under a guarantee and/or warranty/conditions.",
  "Loss or damage arising out of improper use of the Insured Asset.",
  "Loss or damage arising out of modification or alteration of any nature made in the electrical circuitry and/or physical/structural construction of the Insured Asset.",
  "Where repair work is carried out by persons/agency that are not authorized by the manufacturer or by Us.",
  "Superficial and inconsequential aspects such as noises, vibrations, warpage, oil seepage and sensations that do not lead to dismal performance of the Insured Asset.",
  "Loss or damage to accessories used in connection with the Insured Asset that were not supplied at the time of purchase of the Insured Asset by the Insured.",
  "Replacement of any consumable item of the Insured Asset, including but not limited to batteries, bulbs, plugs, cables, ribbons, belts, tapes, fuses, filters, toner or software.",
  "Defects or faults that were not covered under the Manufacturer's Warranty.",
  "Loss or damage due to or consequent upon wear and tear and/or gradual deterioration of the Insured Asset.",
  "Loss or damage arising out of improper or abnormal electrical/gas/water supply or signal connection to the Insured Asset.",
  "The cost of transporting the Insured Asset to and/or from the place of repair.",
  "Loss or damage caused by or arising out of the wilful acts or wilful gross negligence or fraudulent acts of the Insured/Warranty Contract Holder(s) and/or Insured's/Warranty Contract Holder(s) family and/or Insured's/Warranty Contract Holder(s) employees.",
  "Insured/Warranty Contract Holder(s) consequential losses of any kind",
  "Insured/Warranty Contract Holder(s) legal liability of any kind excluding repair or replacement costs incurred by the Insured in respect of the Insured Asset by a Breakdown arising out of manufacturing defect and/or due to poor workmanship of the service personnel of the authorized workshop.",
  "Failure of parts which are subject to recall by manufacturer of the Insured Asset.",
  "The cost of repairing, restoring or reconfiguring computer software or any system programs.",
  "Any cost incurred with periodic maintenance of the Insured Asset, including parts replaced in course of such maintenance operations.",
  "Loss or damage due to corrosion, rust, denting, scratching, blockages or dust.",
  "Where the original serial number is removed, obliterated or altered from Insured Asset.",
  "Loss or damage arising out of improper storage or transportation of the Insured Asset.",
  "The cost of installation of the Insured Assets and/or any optional attachment to the Insured Asset.",
  "Loss or damage due to use of non-genuine parts, accessories and/or consumables.",
  "Where there is a change of ownership of the Insured Asset.",
  "Mechanical and/or electrical breakdown caused by overloading, strain, overrunning, freezing, excessive pressure, short-circuiting, heating.",
  "Service/maintenance calls which do not involve malfunction or defects in the Insured Asset due to workmanship or material used by manufacturer.",
  "Damages caused by services performed by service personnel of the non-authorized persons or repairer workshops.",
  "Where the Insured Asset is subject to commercial, rental or profit generation purposes except in cases of domestic/residential rental property.",
  "Loss or damage arising out of any external cause, including but not limited to fire, theft, explosion, water damage, acts of God perils, riots/strike/malicious damage, act of terrorism, corrosion, rust, denting, scratching, animal/insect damage, entry of foreign bodies, etc.",
  "Accidental damage both internal and external",
  "Any circumstance, fact or matter of which the Insured was or ought reasonably to have been aware prior to the commencement of the Policy Period/Cover Period.",
  "Ionising, radiation or contamination by radioactivity from any nuclear fuel or from any nuclear waste or from the combustion of nuclear fuel.",
  "The radioactive toxic explosive or other hazardous properties of any explosive nuclear assembly or nuclear component thereof.",
  "War, invasion, acts of foreign enemies, hostilities (whether war be declared or not), civil war, rebellion, revolution, insurrection, military or usurped power or confiscation or nationalisation or requisition of or damage to property by or under the order of any government or public local authority.",
  "Covered sum insured is the amount paid for policy purchased and not above it.",
  "Exclusion specific to furniture which is Insured Asset:",
];

// Sub-points of item 38 (furniture), printed as an indented a-q list under
// the last EXCLUSIONS entry above.
export const FURNITURE_EXCLUSIONS: string[] = [
  "Loss or damage caused by stains howsoever caused",
  "Maintenance, damage caused by normal or ordinary wear-and-tear, including but not limited to scuffing, scrapes, or other surface abrasions, including surface scratches on leather or fabrics.",
  "Damage to mattresses, wicker and rattan furniture, nubuck, suede or exotic leathers, split-grain leather hides used in seat cushions, back cushions, or arm areas.",
  "Components and mechanisms integrated into furniture, including but not limited to adjustable bed frames, sinks, plumbing, robotics, TV lifts, electronics, USB ports, electrical outlets, electrical appliances, fireplaces, clocks",
  "Fading, colour loss, or colour change and/or cracking and peeling of leather or vinyl",
  "Loss of foam and/or inner spring resiliency (including any impressions or deformation)",
  "Repairs carried out by persons not authorised by the company/manufacturer.",
  "Checking, cracking, bubbling, or peeling of the finish.",
  "Chips, scratches, and/or breakage of glass or any brittle material used in manufacturing or mirrors, loss of silvering on mirrors.",
  "Any loss or defects covered under any warranty/guarantee/other insurance policies",
  "Damage caused by fire, smoke, flood or other natural disaster, theft or vandalism.",
  "Damage caused by structural problems or appliance malfunctions such as, but not limited to, leaks from air conditioners, skylights, roofs, water heaters, or water pipes.",
  "Furniture that is used for commercial, institutional or rental purposes.",
  "Furniture that has been mishandled, neglected, or abused other than intended use as specified by the manufacturer.",
  "Furniture sold \"as is\" or floor samples.",
  "Furniture showing signs of infestation, including but not limited to insects, rodents, termites and cockroaches.",
  "The effects of weather conditions upon the product such as but not limited to sunlight, wind, weather, rusting, radiation, corrosion.",
];

// The 4-step claim process shown on the certificate's second page.
export const PROCESS_STEPS: { title: string; body: string }[] = [
  { title: "Device Malfunctions", body: "Your protected device malfunctions" },
  {
    title: "Inform Us",
    body: "Simply call us or write to us, or raise a service request at warrantys.co/claims",
  },
  {
    title: "We Repair",
    body: "We get the device picked up, repaired and delivered back, or send a brand expert for repair",
  },
  {
    title: "Enjoy Your Device",
    body: "Keep using the device with tender love & care. Do recommend Warrantys.co to a friend",
  },
];
