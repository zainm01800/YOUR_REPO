import type { CategoryRule, CategorySection } from "@/lib/domain/types";

const SECTION_ORDER: CategorySection[] = [
  "Income",
  "Cost of Sales",
  "Travel & Vehicle",
  "Office & Admin",
  "Marketing & Sales",
  "Financial / Finance Costs",
  "Staff & Payroll",
  "Property & Premises",
  "Tax & Compliance",
  "Equity & Owner Items",
  "Assets, Liabilities & Transfers",
  "Other & Special",
];

const SECTION_MATCHERS: Array<{ section: CategorySection; patterns: RegExp[] }> = [
  {
    section: "Income",
    patterns: [/income/i, /sales/i, /revenue/i, /interest received/i, /refunds received/i, /grant/i, /commission/i, /rental/i],
  },
  {
    section: "Cost of Sales",
    patterns: [/cost of goods/i, /direct/i, /materials/i, /subcontractor/i, /training materials/i, /merchant fees/i, /card processing/i],
  },
  {
    section: "Travel & Vehicle",
    patterns: [/fuel/i, /mileage/i, /vehicle/i, /mot/i, /parking/i, /tolls/i, /car cleaning/i, /public transport/i, /taxi/i, /travel/i],
  },
  {
    section: "Office & Admin",
    patterns: [/office/i, /printing/i, /stationery/i, /postage/i, /phone/i, /internet/i, /software/i, /computer/i, /hosting/i, /domain/i, /bank charges/i, /accountancy/i, /legal/i, /professional/i, /insurance/i, /licence/i, /membership/i, /sundry/i],
  },
  {
    section: "Marketing & Sales",
    patterns: [/advert/i, /marketing/i, /website/i, /branding/i, /design/i, /promotional/i, /sales commission/i, /social media/i],
  },
  {
    section: "Financial / Finance Costs",
    patterns: [/loan interest/i, /interest paid/i, /finance charge/i, /overdraft/i, /late payment/i, /bad debt/i],
  },
  {
    section: "Staff & Payroll",
    patterns: [/wages/i, /salaries/i, /payroll/i, /employer/i, /pension/i, /staff/i, /temporary staff/i],
  },
  {
    section: "Property & Premises",
    patterns: [/rent/i, /utilities/i, /electricity/i, /gas/i, /water/i, /cleaning/i, /repairs and maintenance/i, /rates/i, /security/i],
  },
  {
    section: "Tax & Compliance",
    patterns: [/vat/i, /hmrc/i, /tax/i, /paye/i, /penalties/i, /national insurance/i],
  },
  {
    section: "Equity & Owner Items",
    patterns: [/drawings/i, /capital introduced/i, /owner/i, /dividend/i, /personal/i, /transfers to personal/i],
  },
  {
    section: "Assets, Liabilities & Transfers",
    patterns: [/purchase/i, /equipment/i, /asset/i, /deposit/i, /prepayment/i, /loan received/i, /loan repayment/i, /credit card/i, /transfer between/i, /cash withdrawal/i, /cash lodgement/i],
  },
];

export function categorySection(rule: CategoryRule): CategorySection {
  const haystack = `${rule.category} ${rule.reportingBucket ?? ""} ${rule.description ?? ""}`;
  for (const matcher of SECTION_MATCHERS) {
    if (matcher.patterns.some((pattern) => pattern.test(haystack))) {
      return matcher.section;
    }
  }

  if (rule.accountType === "income") return "Income";
  if (rule.accountType === "asset" || rule.accountType === "liability") return "Assets, Liabilities & Transfers";
  if (rule.accountType === "equity") return "Equity & Owner Items";
  if (rule.statementType === "tax_control") return "Tax & Compliance";
  return rule.section || "Other & Special";
}

export function categorySectionSort(a: CategoryRule, b: CategoryRule) {
  const aSection = categorySection(a);
  const bSection = categorySection(b);
  return (
    SECTION_ORDER.indexOf(aSection) - SECTION_ORDER.indexOf(bSection) ||
    a.sortOrder - b.sortOrder ||
    a.priority - b.priority ||
    a.category.localeCompare(b.category)
  );
}
