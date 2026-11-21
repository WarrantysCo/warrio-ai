// GST state codes, so the invoice server can pick IGST or CGST+SGST.
const CODES: Record<string, string> = {
  "jammu and kashmir": "01", "himachal pradesh": "02", punjab: "03", chandigarh: "04", uttarakhand: "05",
  haryana: "06", delhi: "07", rajasthan: "08", "uttar pradesh": "09", bihar: "10", sikkim: "11",
  "arunachal pradesh": "12", nagaland: "13", manipur: "14", mizoram: "15", tripura: "16", meghalaya: "17",
  assam: "18", "west bengal": "19", jharkhand: "20", odisha: "21", chhattisgarh: "22", "madhya pradesh": "23",
  gujarat: "24", "dadra and nagar haveli and daman and diu": "26", maharashtra: "27", "andhra pradesh": "37",
  karnataka: "29", goa: "30", lakshadweep: "31", kerala: "32", "tamil nadu": "33", puducherry: "34",
  "andaman and nicobar islands": "35", telangana: "36", ladakh: "38",
};

export function stateCode(state: string, gstin?: string) {
  if (gstin && /^\d{2}/.test(gstin)) return gstin.slice(0, 2);
  const key = state.toLowerCase().replace(/&/g, "and").replace(/\s+/g, " ").trim();
  return CODES[key] ?? (key === "new delhi" ? "07" : "");
}
