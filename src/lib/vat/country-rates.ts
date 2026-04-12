/**
 * Master database of country VAT rates.
 * Each entry represents one rate tier for a country.
 * taxCode follows the convention: countryCode + rate (e.g. GB20, DE19).
 */

export type MasterVatRate = {
  countryCode: string;
  countryName: string;
  region: "UK" | "EU" | "Europe" | "Americas" | "Asia-Pacific" | "Middle East" | "Africa";
  rate: number;
  type: "standard" | "reduced" | "super-reduced" | "zero" | "exempt";
  taxCode: string;
  description: string;
  recoverable: boolean; // default recoverability
};

export const MASTER_VAT_RATES: MasterVatRate[] = [
  // ── United Kingdom ────────────────────────────────────────────────────────
  { countryCode: "GB", countryName: "United Kingdom", region: "UK", rate: 20, type: "standard", taxCode: "GB20", description: "UK standard rate", recoverable: true },
  { countryCode: "GB", countryName: "United Kingdom", region: "UK", rate: 5, type: "reduced", taxCode: "GB5", description: "UK reduced rate (energy, children's car seats, etc.)", recoverable: true },
  { countryCode: "GB", countryName: "United Kingdom", region: "UK", rate: 0, type: "zero", taxCode: "GB0", description: "UK zero rate (food, books, children's clothing)", recoverable: true },

  // ── European Union ────────────────────────────────────────────────────────
  { countryCode: "AT", countryName: "Austria", region: "EU", rate: 20, type: "standard", taxCode: "AT20", description: "Austrian standard rate", recoverable: true },
  { countryCode: "AT", countryName: "Austria", region: "EU", rate: 13, type: "reduced", taxCode: "AT13", description: "Austrian reduced rate (cultural events, accommodation)", recoverable: true },
  { countryCode: "AT", countryName: "Austria", region: "EU", rate: 10, type: "reduced", taxCode: "AT10", description: "Austrian reduced rate (food, books, pharmaceuticals)", recoverable: true },

  { countryCode: "BE", countryName: "Belgium", region: "EU", rate: 21, type: "standard", taxCode: "BE21", description: "Belgian standard rate", recoverable: true },
  { countryCode: "BE", countryName: "Belgium", region: "EU", rate: 12, type: "reduced", taxCode: "BE12", description: "Belgian reduced rate (social housing, restaurants)", recoverable: true },
  { countryCode: "BE", countryName: "Belgium", region: "EU", rate: 6, type: "reduced", taxCode: "BE6", description: "Belgian reduced rate (food, books, pharmaceuticals)", recoverable: true },

  { countryCode: "BG", countryName: "Bulgaria", region: "EU", rate: 20, type: "standard", taxCode: "BG20", description: "Bulgarian standard rate", recoverable: true },
  { countryCode: "BG", countryName: "Bulgaria", region: "EU", rate: 9, type: "reduced", taxCode: "BG9", description: "Bulgarian reduced rate (tourism, books)", recoverable: true },

  { countryCode: "HR", countryName: "Croatia", region: "EU", rate: 25, type: "standard", taxCode: "HR25", description: "Croatian standard rate", recoverable: true },
  { countryCode: "HR", countryName: "Croatia", region: "EU", rate: 13, type: "reduced", taxCode: "HR13", description: "Croatian reduced rate (food, accommodation)", recoverable: true },
  { countryCode: "HR", countryName: "Croatia", region: "EU", rate: 5, type: "reduced", taxCode: "HR5", description: "Croatian reduced rate (books, newspapers, pharmaceuticals)", recoverable: true },

  { countryCode: "CY", countryName: "Cyprus", region: "EU", rate: 19, type: "standard", taxCode: "CY19", description: "Cypriot standard rate", recoverable: true },
  { countryCode: "CY", countryName: "Cyprus", region: "EU", rate: 9, type: "reduced", taxCode: "CY9", description: "Cypriot reduced rate (accommodation, food)", recoverable: true },
  { countryCode: "CY", countryName: "Cyprus", region: "EU", rate: 5, type: "reduced", taxCode: "CY5", description: "Cypriot reduced rate (books, newspapers, pharmaceuticals)", recoverable: true },

  { countryCode: "CZ", countryName: "Czech Republic", region: "EU", rate: 21, type: "standard", taxCode: "CZ21", description: "Czech standard rate", recoverable: true },
  { countryCode: "CZ", countryName: "Czech Republic", region: "EU", rate: 12, type: "reduced", taxCode: "CZ12", description: "Czech reduced rate (food, accommodation, books)", recoverable: true },

  { countryCode: "DK", countryName: "Denmark", region: "EU", rate: 25, type: "standard", taxCode: "DK25", description: "Danish standard rate", recoverable: true },

  { countryCode: "EE", countryName: "Estonia", region: "EU", rate: 22, type: "standard", taxCode: "EE22", description: "Estonian standard rate", recoverable: true },
  { countryCode: "EE", countryName: "Estonia", region: "EU", rate: 9, type: "reduced", taxCode: "EE9", description: "Estonian reduced rate (accommodation, books, medicines)", recoverable: true },

  { countryCode: "FI", countryName: "Finland", region: "EU", rate: 25.5, type: "standard", taxCode: "FI25", description: "Finnish standard rate", recoverable: true },
  { countryCode: "FI", countryName: "Finland", region: "EU", rate: 14, type: "reduced", taxCode: "FI14", description: "Finnish reduced rate (food, restaurant services)", recoverable: true },
  { countryCode: "FI", countryName: "Finland", region: "EU", rate: 10, type: "reduced", taxCode: "FI10", description: "Finnish reduced rate (books, medicines, accommodation)", recoverable: true },

  { countryCode: "FR", countryName: "France", region: "EU", rate: 20, type: "standard", taxCode: "FR20", description: "French standard rate", recoverable: true },
  { countryCode: "FR", countryName: "France", region: "EU", rate: 10, type: "reduced", taxCode: "FR10", description: "French reduced rate (restaurants, accommodation, transport)", recoverable: true },
  { countryCode: "FR", countryName: "France", region: "EU", rate: 5.5, type: "reduced", taxCode: "FR5", description: "French reduced rate (food, books, non-alcoholic beverages)", recoverable: true },
  { countryCode: "FR", countryName: "France", region: "EU", rate: 2.1, type: "super-reduced", taxCode: "FR2", description: "French super-reduced rate (press, pharmaceuticals)", recoverable: true },

  { countryCode: "DE", countryName: "Germany", region: "EU", rate: 19, type: "standard", taxCode: "DE19", description: "German standard rate", recoverable: true },
  { countryCode: "DE", countryName: "Germany", region: "EU", rate: 7, type: "reduced", taxCode: "DE7", description: "German reduced rate (food, books, transport, accommodation)", recoverable: true },

  { countryCode: "EL", countryName: "Greece", region: "EU", rate: 24, type: "standard", taxCode: "EL24", description: "Greek standard rate", recoverable: true },
  { countryCode: "EL", countryName: "Greece", region: "EU", rate: 13, type: "reduced", taxCode: "EL13", description: "Greek reduced rate (food, accommodation, transport)", recoverable: true },
  { countryCode: "EL", countryName: "Greece", region: "EU", rate: 6, type: "reduced", taxCode: "EL6", description: "Greek reduced rate (books, medicines, newspapers)", recoverable: true },

  { countryCode: "HU", countryName: "Hungary", region: "EU", rate: 27, type: "standard", taxCode: "HU27", description: "Hungarian standard rate", recoverable: true },
  { countryCode: "HU", countryName: "Hungary", region: "EU", rate: 18, type: "reduced", taxCode: "HU18", description: "Hungarian reduced rate (food, accommodation)", recoverable: true },
  { countryCode: "HU", countryName: "Hungary", region: "EU", rate: 5, type: "reduced", taxCode: "HU5", description: "Hungarian reduced rate (books, medicines, certain food)", recoverable: true },

  { countryCode: "IE", countryName: "Ireland", region: "EU", rate: 23, type: "standard", taxCode: "IE23", description: "Irish standard rate", recoverable: true },
  { countryCode: "IE", countryName: "Ireland", region: "EU", rate: 13.5, type: "reduced", taxCode: "IE13", description: "Irish reduced rate (hospitality, construction, fuel)", recoverable: true },
  { countryCode: "IE", countryName: "Ireland", region: "EU", rate: 9, type: "reduced", taxCode: "IE9", description: "Irish reduced rate (newspapers, sporting facilities)", recoverable: true },
  { countryCode: "IE", countryName: "Ireland", region: "EU", rate: 0, type: "zero", taxCode: "IE0", description: "Irish zero rate (food, children's clothing, books)", recoverable: true },

  { countryCode: "IT", countryName: "Italy", region: "EU", rate: 22, type: "standard", taxCode: "IT22", description: "Italian standard rate", recoverable: true },
  { countryCode: "IT", countryName: "Italy", region: "EU", rate: 10, type: "reduced", taxCode: "IT10", description: "Italian reduced rate (food, pharmaceuticals, tourism)", recoverable: true },
  { countryCode: "IT", countryName: "Italy", region: "EU", rate: 5, type: "reduced", taxCode: "IT5", description: "Italian reduced rate (social housing, associations)", recoverable: true },
  { countryCode: "IT", countryName: "Italy", region: "EU", rate: 4, type: "super-reduced", taxCode: "IT4", description: "Italian super-reduced rate (basic food, press)", recoverable: true },

  { countryCode: "LV", countryName: "Latvia", region: "EU", rate: 21, type: "standard", taxCode: "LV21", description: "Latvian standard rate", recoverable: true },
  { countryCode: "LV", countryName: "Latvia", region: "EU", rate: 12, type: "reduced", taxCode: "LV12", description: "Latvian reduced rate (medicines, medical devices, accommodation)", recoverable: true },
  { countryCode: "LV", countryName: "Latvia", region: "EU", rate: 5, type: "reduced", taxCode: "LV5", description: "Latvian reduced rate (food, books, newspapers)", recoverable: true },

  { countryCode: "LT", countryName: "Lithuania", region: "EU", rate: 21, type: "standard", taxCode: "LT21", description: "Lithuanian standard rate", recoverable: true },
  { countryCode: "LT", countryName: "Lithuania", region: "EU", rate: 9, type: "reduced", taxCode: "LT9", description: "Lithuanian reduced rate (accommodation, books, firewood)", recoverable: true },
  { countryCode: "LT", countryName: "Lithuania", region: "EU", rate: 5, type: "reduced", taxCode: "LT5", description: "Lithuanian reduced rate (pharmaceuticals, technical aids)", recoverable: true },

  { countryCode: "LU", countryName: "Luxembourg", region: "EU", rate: 17, type: "standard", taxCode: "LU17", description: "Luxembourg standard rate", recoverable: true },
  { countryCode: "LU", countryName: "Luxembourg", region: "EU", rate: 14, type: "reduced", taxCode: "LU14", description: "Luxembourg reduced rate (wine, advertising material)", recoverable: true },
  { countryCode: "LU", countryName: "Luxembourg", region: "EU", rate: 8, type: "reduced", taxCode: "LU8", description: "Luxembourg reduced rate (gas, electricity, accommodation)", recoverable: true },
  { countryCode: "LU", countryName: "Luxembourg", region: "EU", rate: 3, type: "super-reduced", taxCode: "LU3", description: "Luxembourg super-reduced rate (food, books, medicines)", recoverable: true },

  { countryCode: "MT", countryName: "Malta", region: "EU", rate: 18, type: "standard", taxCode: "MT18", description: "Maltese standard rate", recoverable: true },
  { countryCode: "MT", countryName: "Malta", region: "EU", rate: 7, type: "reduced", taxCode: "MT7", description: "Maltese reduced rate (accommodation)", recoverable: true },
  { countryCode: "MT", countryName: "Malta", region: "EU", rate: 5, type: "reduced", taxCode: "MT5", description: "Maltese reduced rate (electricity, food, books, newspapers)", recoverable: true },

  { countryCode: "NL", countryName: "Netherlands", region: "EU", rate: 21, type: "standard", taxCode: "NL21", description: "Dutch standard rate", recoverable: true },
  { countryCode: "NL", countryName: "Netherlands", region: "EU", rate: 9, type: "reduced", taxCode: "NL9", description: "Dutch reduced rate (food, books, medicines, accommodation)", recoverable: true },

  { countryCode: "PL", countryName: "Poland", region: "EU", rate: 23, type: "standard", taxCode: "PL23", description: "Polish standard rate", recoverable: true },
  { countryCode: "PL", countryName: "Poland", region: "EU", rate: 8, type: "reduced", taxCode: "PL8", description: "Polish reduced rate (food, accommodation, medicines)", recoverable: true },
  { countryCode: "PL", countryName: "Poland", region: "EU", rate: 5, type: "reduced", taxCode: "PL5", description: "Polish reduced rate (basic food, books, baby products)", recoverable: true },

  { countryCode: "PT", countryName: "Portugal", region: "EU", rate: 23, type: "standard", taxCode: "PT23", description: "Portuguese standard rate", recoverable: true },
  { countryCode: "PT", countryName: "Portugal", region: "EU", rate: 13, type: "reduced", taxCode: "PT13", description: "Portuguese reduced rate (food, accommodation)", recoverable: true },
  { countryCode: "PT", countryName: "Portugal", region: "EU", rate: 6, type: "reduced", taxCode: "PT6", description: "Portuguese reduced rate (basic food, books, medicines)", recoverable: true },

  { countryCode: "RO", countryName: "Romania", region: "EU", rate: 19, type: "standard", taxCode: "RO19", description: "Romanian standard rate", recoverable: true },
  { countryCode: "RO", countryName: "Romania", region: "EU", rate: 9, type: "reduced", taxCode: "RO9", description: "Romanian reduced rate (food, accommodation, books)", recoverable: true },
  { countryCode: "RO", countryName: "Romania", region: "EU", rate: 5, type: "reduced", taxCode: "RO5", description: "Romanian reduced rate (social housing, newspapers, museums)", recoverable: true },

  { countryCode: "SK", countryName: "Slovakia", region: "EU", rate: 23, type: "standard", taxCode: "SK23", description: "Slovak standard rate", recoverable: true },
  { countryCode: "SK", countryName: "Slovakia", region: "EU", rate: 19, type: "reduced", taxCode: "SK19", description: "Slovak reduced rate (food, accommodation, pharmaceuticals)", recoverable: true },

  { countryCode: "SI", countryName: "Slovenia", region: "EU", rate: 22, type: "standard", taxCode: "SI22", description: "Slovenian standard rate", recoverable: true },
  { countryCode: "SI", countryName: "Slovenia", region: "EU", rate: 9.5, type: "reduced", taxCode: "SI9", description: "Slovenian reduced rate (food, accommodation, books)", recoverable: true },
  { countryCode: "SI", countryName: "Slovenia", region: "EU", rate: 5, type: "reduced", taxCode: "SI5", description: "Slovenian reduced rate (books, newspapers, baby products)", recoverable: true },

  { countryCode: "ES", countryName: "Spain", region: "EU", rate: 21, type: "standard", taxCode: "ES21", description: "Spanish standard rate", recoverable: true },
  { countryCode: "ES", countryName: "Spain", region: "EU", rate: 10, type: "reduced", taxCode: "ES10", description: "Spanish reduced rate (food, accommodation, transport, cultural)", recoverable: true },
  { countryCode: "ES", countryName: "Spain", region: "EU", rate: 4, type: "super-reduced", taxCode: "ES4", description: "Spanish super-reduced rate (basic food, books, medicines)", recoverable: true },

  { countryCode: "SE", countryName: "Sweden", region: "EU", rate: 25, type: "standard", taxCode: "SE25", description: "Swedish standard rate", recoverable: true },
  { countryCode: "SE", countryName: "Sweden", region: "EU", rate: 12, type: "reduced", taxCode: "SE12", description: "Swedish reduced rate (food, accommodation, transport)", recoverable: true },
  { countryCode: "SE", countryName: "Sweden", region: "EU", rate: 6, type: "reduced", taxCode: "SE6", description: "Swedish reduced rate (books, newspapers, culture, sport)", recoverable: true },

  // ── Rest of Europe ─────────────────────────────────────────────────────────
  { countryCode: "CH", countryName: "Switzerland", region: "Europe", rate: 8.1, type: "standard", taxCode: "CH8", description: "Swiss standard rate (MWST/TVA)", recoverable: false },
  { countryCode: "CH", countryName: "Switzerland", region: "Europe", rate: 3.8, type: "reduced", taxCode: "CH3", description: "Swiss reduced rate (accommodation)", recoverable: false },
  { countryCode: "CH", countryName: "Switzerland", region: "Europe", rate: 2.6, type: "reduced", taxCode: "CH2", description: "Swiss reduced rate (food, books, medicines)", recoverable: false },

  { countryCode: "NO", countryName: "Norway", region: "Europe", rate: 25, type: "standard", taxCode: "NO25", description: "Norwegian standard rate (MVA)", recoverable: false },
  { countryCode: "NO", countryName: "Norway", region: "Europe", rate: 15, type: "reduced", taxCode: "NO15", description: "Norwegian reduced rate (food)", recoverable: false },
  { countryCode: "NO", countryName: "Norway", region: "Europe", rate: 12, type: "reduced", taxCode: "NO12", description: "Norwegian reduced rate (transport, hotels, cinema)", recoverable: false },

  { countryCode: "TR", countryName: "Turkey", region: "Europe", rate: 20, type: "standard", taxCode: "TR20", description: "Turkish standard rate (KDV)", recoverable: false },
  { countryCode: "TR", countryName: "Turkey", region: "Europe", rate: 10, type: "reduced", taxCode: "TR10", description: "Turkish reduced rate (food, accommodation)", recoverable: false },
  { countryCode: "TR", countryName: "Turkey", region: "Europe", rate: 1, type: "reduced", taxCode: "TR1", description: "Turkish reduced rate (basic food, agricultural goods)", recoverable: false },

  { countryCode: "RU", countryName: "Russia", region: "Europe", rate: 20, type: "standard", taxCode: "RU20", description: "Russian standard rate (НДС)", recoverable: false },
  { countryCode: "RU", countryName: "Russia", region: "Europe", rate: 10, type: "reduced", taxCode: "RU10", description: "Russian reduced rate (food, children's goods, books, medicines)", recoverable: false },

  // ── Americas ──────────────────────────────────────────────────────────────
  { countryCode: "CA", countryName: "Canada", region: "Americas", rate: 5, type: "standard", taxCode: "CA5", description: "Canadian federal GST", recoverable: false },
  { countryCode: "CA", countryName: "Canada", region: "Americas", rate: 13, type: "standard", taxCode: "CA13", description: "Canadian HST (ON/NB/NL/NS)", recoverable: false },
  { countryCode: "CA", countryName: "Canada", region: "Americas", rate: 15, type: "standard", taxCode: "CA15", description: "Canadian HST (PE)", recoverable: false },

  { countryCode: "MX", countryName: "Mexico", region: "Americas", rate: 16, type: "standard", taxCode: "MX16", description: "Mexican standard rate (IVA)", recoverable: false },

  { countryCode: "BR", countryName: "Brazil", region: "Americas", rate: 17, type: "standard", taxCode: "BR17", description: "Brazilian ICMS (state average)", recoverable: false },

  { countryCode: "AR", countryName: "Argentina", region: "Americas", rate: 21, type: "standard", taxCode: "AR21", description: "Argentine standard rate (IVA)", recoverable: false },
  { countryCode: "AR", countryName: "Argentina", region: "Americas", rate: 10.5, type: "reduced", taxCode: "AR10", description: "Argentine reduced rate (construction, medical services)", recoverable: false },

  { countryCode: "CL", countryName: "Chile", region: "Americas", rate: 19, type: "standard", taxCode: "CL19", description: "Chilean standard rate (IVA)", recoverable: false },

  { countryCode: "CO", countryName: "Colombia", region: "Americas", rate: 19, type: "standard", taxCode: "CO19", description: "Colombian standard rate (IVA)", recoverable: false },
  { countryCode: "CO", countryName: "Colombia", region: "Americas", rate: 5, type: "reduced", taxCode: "CO5", description: "Colombian reduced rate (certain goods and services)", recoverable: false },

  // ── Asia-Pacific ──────────────────────────────────────────────────────────
  { countryCode: "AU", countryName: "Australia", region: "Asia-Pacific", rate: 10, type: "standard", taxCode: "AU10", description: "Australian GST", recoverable: false },

  { countryCode: "NZ", countryName: "New Zealand", region: "Asia-Pacific", rate: 15, type: "standard", taxCode: "NZ15", description: "New Zealand GST", recoverable: false },

  { countryCode: "JP", countryName: "Japan", region: "Asia-Pacific", rate: 10, type: "standard", taxCode: "JP10", description: "Japanese consumption tax", recoverable: false },
  { countryCode: "JP", countryName: "Japan", region: "Asia-Pacific", rate: 8, type: "reduced", taxCode: "JP8", description: "Japanese reduced rate (food, non-alcoholic beverages, newspapers)", recoverable: false },

  { countryCode: "SG", countryName: "Singapore", region: "Asia-Pacific", rate: 9, type: "standard", taxCode: "SG9", description: "Singapore GST", recoverable: false },

  { countryCode: "KR", countryName: "South Korea", region: "Asia-Pacific", rate: 10, type: "standard", taxCode: "KR10", description: "Korean VAT (부가가치세)", recoverable: false },

  { countryCode: "IN", countryName: "India", region: "Asia-Pacific", rate: 18, type: "standard", taxCode: "IN18", description: "Indian GST standard rate", recoverable: false },
  { countryCode: "IN", countryName: "India", region: "Asia-Pacific", rate: 12, type: "reduced", taxCode: "IN12", description: "Indian GST reduced rate (work contracts, processed food)", recoverable: false },
  { countryCode: "IN", countryName: "India", region: "Asia-Pacific", rate: 5, type: "reduced", taxCode: "IN5", description: "Indian GST reduced rate (essential goods, transport)", recoverable: false },

  { countryCode: "CN", countryName: "China", region: "Asia-Pacific", rate: 13, type: "standard", taxCode: "CN13", description: "Chinese VAT standard rate (增值税)", recoverable: false },
  { countryCode: "CN", countryName: "China", region: "Asia-Pacific", rate: 9, type: "reduced", taxCode: "CN9", description: "Chinese VAT reduced rate (agricultural produce, natural gas)", recoverable: false },
  { countryCode: "CN", countryName: "China", region: "Asia-Pacific", rate: 6, type: "reduced", taxCode: "CN6", description: "Chinese VAT rate (services, financial, IT)", recoverable: false },

  { countryCode: "MY", countryName: "Malaysia", region: "Asia-Pacific", rate: 8, type: "standard", taxCode: "MY8", description: "Malaysian sales and service tax", recoverable: false },
  { countryCode: "MY", countryName: "Malaysia", region: "Asia-Pacific", rate: 5, type: "reduced", taxCode: "MY5", description: "Malaysian reduced rate (essential goods)", recoverable: false },

  { countryCode: "TH", countryName: "Thailand", region: "Asia-Pacific", rate: 7, type: "standard", taxCode: "TH7", description: "Thai VAT (ภาษีมูลค่าเพิ่ม)", recoverable: false },

  { countryCode: "ID", countryName: "Indonesia", region: "Asia-Pacific", rate: 11, type: "standard", taxCode: "ID11", description: "Indonesian VAT (PPN)", recoverable: false },

  // ── Middle East ───────────────────────────────────────────────────────────
  { countryCode: "AE", countryName: "UAE", region: "Middle East", rate: 5, type: "standard", taxCode: "AE5", description: "UAE VAT standard rate", recoverable: false },

  { countryCode: "SA", countryName: "Saudi Arabia", region: "Middle East", rate: 15, type: "standard", taxCode: "SA15", description: "Saudi VAT standard rate (ضريبة القيمة المضافة)", recoverable: false },

  { countryCode: "BH", countryName: "Bahrain", region: "Middle East", rate: 10, type: "standard", taxCode: "BH10", description: "Bahraini VAT standard rate", recoverable: false },

  { countryCode: "OM", countryName: "Oman", region: "Middle East", rate: 5, type: "standard", taxCode: "OM5", description: "Omani VAT standard rate", recoverable: false },

  { countryCode: "IL", countryName: "Israel", region: "Middle East", rate: 17, type: "standard", taxCode: "IL17", description: "Israeli VAT standard rate (מע''מ)", recoverable: false },

  // ── Africa ────────────────────────────────────────────────────────────────
  { countryCode: "ZA", countryName: "South Africa", region: "Africa", rate: 15, type: "standard", taxCode: "ZA15", description: "South African VAT standard rate", recoverable: false },

  { countryCode: "NG", countryName: "Nigeria", region: "Africa", rate: 7.5, type: "standard", taxCode: "NG7", description: "Nigerian VAT standard rate", recoverable: false },

  { countryCode: "KE", countryName: "Kenya", region: "Africa", rate: 16, type: "standard", taxCode: "KE16", description: "Kenyan VAT standard rate", recoverable: false },

  { countryCode: "GH", countryName: "Ghana", region: "Africa", rate: 15, type: "standard", taxCode: "GH15", description: "Ghanaian VAT standard rate", recoverable: false },

  { countryCode: "EG", countryName: "Egypt", region: "Africa", rate: 14, type: "standard", taxCode: "EG14", description: "Egyptian VAT standard rate (ضريبة القيمة المضافة)", recoverable: false },

  { countryCode: "MA", countryName: "Morocco", region: "Africa", rate: 20, type: "standard", taxCode: "MA20", description: "Moroccan VAT standard rate (TVA)", recoverable: false },
  { countryCode: "MA", countryName: "Morocco", region: "Africa", rate: 14, type: "reduced", taxCode: "MA14", description: "Moroccan reduced rate (gas, electricity, transport)", recoverable: false },
  { countryCode: "MA", countryName: "Morocco", region: "Africa", rate: 10, type: "reduced", taxCode: "MA10", description: "Moroccan reduced rate (food, financial services)", recoverable: false },
];

export const REGION_ORDER: MasterVatRate["region"][] = [
  "UK",
  "EU",
  "Europe",
  "Americas",
  "Asia-Pacific",
  "Middle East",
  "Africa",
];

export const REGION_LABELS: Record<MasterVatRate["region"], string> = {
  UK: "United Kingdom",
  EU: "European Union",
  Europe: "Rest of Europe",
  Americas: "Americas",
  "Asia-Pacific": "Asia-Pacific",
  "Middle East": "Middle East & North Africa",
  Africa: "Sub-Saharan Africa",
};

export const RATE_TYPE_LABELS: Record<MasterVatRate["type"], string> = {
  standard: "Standard",
  reduced: "Reduced",
  "super-reduced": "Super-reduced",
  zero: "Zero",
  exempt: "Exempt",
};

/** Build a lookup key from countryCode + taxCode */
export function vatRateKey(countryCode: string, taxCode: string) {
  return `${countryCode}_${taxCode}`;
}

/** Group master rates by region, then by country */
export function groupMasterRatesByRegion(): Map<
  MasterVatRate["region"],
  Map<string, MasterVatRate[]>
> {
  const grouped = new Map<MasterVatRate["region"], Map<string, MasterVatRate[]>>();

  for (const rate of MASTER_VAT_RATES) {
    if (!grouped.has(rate.region)) {
      grouped.set(rate.region, new Map());
    }
    const regionMap = grouped.get(rate.region)!;
    if (!regionMap.has(rate.countryCode)) {
      regionMap.set(rate.countryCode, []);
    }
    regionMap.get(rate.countryCode)!.push(rate);
  }

  return grouped;
}
