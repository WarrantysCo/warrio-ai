// [above Rs, up to Rs, 1-year price, 2-year price, 3-year price]
export type PriceBand = [
  minInr: number,
  maxInr: number,
  oneYearInr: number | null,
  twoYearInr: number | null,
  threeYearInr: number | null,
];

export type PriceCategory = {
  id: string;
  name: string;
  // Used in plan names, e.g. "TV 3-year plan".
  shortName: string;
  icon: string;
  bands: PriceBand[];
};
