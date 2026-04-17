import type { CategoryRule, CategorySection } from "@/lib/domain/types";

type SeedCategory = {
  category: string;
  slug: string;
  description: string;
  section: CategorySection;
  priority: number;
  accountType: CategoryRule["accountType"];
  statementType: CategoryRule["statementType"];
  reportingBucket: string;
  defaultTaxTreatment: CategoryRule["defaultTaxTreatment"];
  defaultVatRate?: number;
  defaultVatRecoverable?: boolean;
  glCode?: string;
  allowableForTax?: boolean;
  allowablePercentage?: number;
  supplierPattern?: string;
  keywordPattern?: string;
};

export const GENERIC_STARTER_CATEGORY_SLUGS = [
  "sales-revenue",
  "service-income",
  "lesson-income",
  "other-business-income",
  "interest-received",
  "refunds-received",
  "fuel",
  "vehicle-insurance",
  "vehicle-repairs-maintenance",
  "vehicle-servicing",
  "vehicle-tax",
  "mot-inspection",
  "parking",
  "tolls",
  "car-cleaning",
  "mileage",
  "vehicle-lease-hire",
  "travel-other",
  "training-materials",
  "office-supplies",
  "printing-stationery",
  "postage",
  "phone",
  "internet",
  "software-subscriptions",
  "computer-it-costs",
  "web-hosting",
  "domain-costs",
  "bank-charges",
  "payment-platform-fees",
  "accountancy-fees",
  "legal-fees",
  "professional-fees",
  "business-insurance",
  "licences-certifications",
  "memberships-subscriptions",
  "advertising",
  "social-media-ads",
  "website-costs",
  "marketing-expenses",
  "staff-training",
  "staff-travel",
  "rent",
  "utilities",
  "electricity",
  "gas",
  "water",
  "cleaning",
  "vat-control",
  "drawings",
  "capital-introduced",
  "personal-expenses",
  "transfers-to-personal-account",
  "vehicle-purchase",
  "loan-repayment",
  "transfer-between-accounts",
  "uncategorised",
  "needs-review",
] as const;

const STARTER_SET = new Set<string>(GENERIC_STARTER_CATEGORY_SLUGS);

const SEED_CATEGORIES: SeedCategory[] = [
  { category: "Sales / Revenue", slug: "sales-revenue", description: "General product sales and trading revenue. Reuses the classic sales-income slot without changing existing references.", section: "Income", priority: 10, accountType: "income", statementType: "p_and_l", reportingBucket: "Income", defaultTaxTreatment: "standard_rated", defaultVatRate: 20, glCode: "4000", keywordPattern: "sale|invoice|revenue|payment received" },
  { category: "Service Income", slug: "service-income", description: "Income earned from supplying services.", section: "Income", priority: 11, accountType: "income", statementType: "p_and_l", reportingBucket: "Income", defaultTaxTreatment: "standard_rated", defaultVatRate: 20, glCode: "4010", keywordPattern: "service|consulting|consultancy|fee income" },
  { category: "Lesson Income", slug: "lesson-income", description: "Tuition or lesson income for training-led businesses.", section: "Income", priority: 12, accountType: "income", statementType: "p_and_l", reportingBucket: "Income", defaultTaxTreatment: "standard_rated", defaultVatRate: 20, glCode: "4020", keywordPattern: "lesson|tuition|instruction|student|pupil" },
  { category: "Other Business Income", slug: "other-business-income", description: "Other operational income that does not fit the main sales categories.", section: "Income", priority: 13, accountType: "income", statementType: "p_and_l", reportingBucket: "Income", defaultTaxTreatment: "standard_rated", defaultVatRate: 20, glCode: "4090" },
  { category: "Interest Received", slug: "interest-received", description: "Bank or deposit interest received.", section: "Income", priority: 14, accountType: "income", statementType: "p_and_l", reportingBucket: "Other Income", defaultTaxTreatment: "exempt", defaultVatRate: 0, defaultVatRecoverable: false, glCode: "4800", keywordPattern: "interest" },
  { category: "Commission Income", slug: "commission-income", description: "Commission earned from referrals, agency work, or sales arrangements.", section: "Income", priority: 15, accountType: "income", statementType: "p_and_l", reportingBucket: "Other Income", defaultTaxTreatment: "standard_rated", defaultVatRate: 20, glCode: "4805", keywordPattern: "commission|referral fee" },
  { category: "Rental Income", slug: "rental-income", description: "Rental or hire income earned by the business.", section: "Income", priority: 16, accountType: "income", statementType: "p_and_l", reportingBucket: "Other Income", defaultTaxTreatment: "exempt", defaultVatRate: 0, defaultVatRecoverable: false, glCode: "4810", keywordPattern: "rent received|rental income|hire income" },
  { category: "Refunds Received", slug: "refunds-received", description: "Supplier refunds or charge reversals received back into the business.", section: "Income", priority: 17, accountType: "income", statementType: "p_and_l", reportingBucket: "Other Income", defaultTaxTreatment: "outside_scope", defaultVatRate: 0, defaultVatRecoverable: false, glCode: "4815", keywordPattern: "refund|chargeback|reversal" },
  { category: "Grants / Support Income", slug: "grants-support-income", description: "Grant income, relief payments, or support receipts. This covers the grant-income use case without creating a duplicate.", section: "Income", priority: 18, accountType: "income", statementType: "p_and_l", reportingBucket: "Other Income", defaultTaxTreatment: "outside_scope", defaultVatRate: 0, defaultVatRecoverable: false, glCode: "4820", keywordPattern: "grant|support|relief" },
  { category: "Miscellaneous Income", slug: "miscellaneous-income", description: "Fallback category for small incidental income items.", section: "Income", priority: 19, accountType: "income", statementType: "p_and_l", reportingBucket: "Other Income", defaultTaxTreatment: "standard_rated", defaultVatRate: 20, glCode: "4890" },

  { category: "Direct Materials", slug: "direct-materials", description: "Direct material purchases used to deliver revenue-generating work.", section: "Cost of Sales", priority: 30, accountType: "expense", statementType: "p_and_l", reportingBucket: "Cost of Sales", defaultTaxTreatment: "standard_rated", defaultVatRate: 20, glCode: "5000" },
  { category: "Subcontractor Costs", slug: "subcontractor-costs", description: "Third-party subcontractor or freelance delivery costs.", section: "Cost of Sales", priority: 31, accountType: "expense", statementType: "p_and_l", reportingBucket: "Cost of Sales", defaultTaxTreatment: "standard_rated", defaultVatRate: 20, glCode: "5010" },
  { category: "Training Materials", slug: "training-materials", description: "Consumable materials, workbooks, and course support materials.", section: "Cost of Sales", priority: 32, accountType: "expense", statementType: "p_and_l", reportingBucket: "Cost of Sales", defaultTaxTreatment: "zero_rated", defaultVatRate: 0, glCode: "5020" },
  { category: "Cost of Goods Sold", slug: "cost-of-goods-sold", description: "Direct inventory or goods cost attached to sales.", section: "Cost of Sales", priority: 33, accountType: "expense", statementType: "p_and_l", reportingBucket: "Cost of Sales", defaultTaxTreatment: "standard_rated", defaultVatRate: 20, glCode: "5030" },
  { category: "Direct Job Costs", slug: "direct-job-costs", description: "Project-specific costs that directly support customer delivery.", section: "Cost of Sales", priority: 34, accountType: "expense", statementType: "p_and_l", reportingBucket: "Cost of Sales", defaultTaxTreatment: "standard_rated", defaultVatRate: 20, glCode: "5040" },
  { category: "Merchant Fees", slug: "merchant-fees", description: "Merchant account and sales collection fees.", section: "Cost of Sales", priority: 35, accountType: "expense", statementType: "p_and_l", reportingBucket: "Cost of Sales", defaultTaxTreatment: "exempt", defaultVatRate: 0, defaultVatRecoverable: false, glCode: "5050", keywordPattern: "merchant fee|processing fee" },
  { category: "Card Processing Fees", slug: "card-processing-fees", description: "Card terminal and gateway charges specifically tied to card collections.", section: "Cost of Sales", priority: 36, accountType: "expense", statementType: "p_and_l", reportingBucket: "Cost of Sales", defaultTaxTreatment: "exempt", defaultVatRate: 0, defaultVatRecoverable: false, glCode: "5055", keywordPattern: "card fee|stripe fee|paypal fee|sumup fee|processing fee" },

  { category: "Fuel", slug: "fuel", description: "Fuel and refuelling costs for business vehicles.", section: "Travel & Vehicle", priority: 50, accountType: "expense", statementType: "p_and_l", reportingBucket: "Travel & Vehicle", defaultTaxTreatment: "standard_rated", defaultVatRate: 20, glCode: "5100", supplierPattern: "bp|shell|esso|texaco|fuel|petrol|diesel", keywordPattern: "fuel|petrol|diesel" },
  { category: "Vehicle Insurance", slug: "vehicle-insurance", description: "Insurance policies for cars, vans, or other business vehicles.", section: "Travel & Vehicle", priority: 51, accountType: "expense", statementType: "p_and_l", reportingBucket: "Travel & Vehicle", defaultTaxTreatment: "exempt", defaultVatRate: 0, defaultVatRecoverable: false, glCode: "5110", keywordPattern: "insurance" },
  { category: "Vehicle Repairs and Maintenance", slug: "vehicle-repairs-maintenance", description: "Repairs, tyres, and general maintenance for business vehicles.", section: "Travel & Vehicle", priority: 52, accountType: "expense", statementType: "p_and_l", reportingBucket: "Travel & Vehicle", defaultTaxTreatment: "standard_rated", defaultVatRate: 20, glCode: "5120", keywordPattern: "repair|garage|maintenance|tyre|brake" },
  { category: "Vehicle Servicing", slug: "vehicle-servicing", description: "Routine servicing and scheduled vehicle maintenance.", section: "Travel & Vehicle", priority: 53, accountType: "expense", statementType: "p_and_l", reportingBucket: "Travel & Vehicle", defaultTaxTreatment: "standard_rated", defaultVatRate: 20, glCode: "5125", keywordPattern: "service|servicing|interim service|full service" },
  { category: "Vehicle Tax", slug: "vehicle-tax", description: "Road tax or similar statutory vehicle charges.", section: "Travel & Vehicle", priority: 54, accountType: "expense", statementType: "p_and_l", reportingBucket: "Travel & Vehicle", defaultTaxTreatment: "outside_scope", defaultVatRate: 0, defaultVatRecoverable: false, glCode: "5130" },
  { category: "MOT / Inspection", slug: "mot-inspection", description: "MOT tests, inspections, or vehicle compliance checks.", section: "Travel & Vehicle", priority: 55, accountType: "expense", statementType: "p_and_l", reportingBucket: "Travel & Vehicle", defaultTaxTreatment: "standard_rated", defaultVatRate: 20, glCode: "5135", keywordPattern: "mot|inspection|test" },
  { category: "Parking", slug: "parking", description: "Business parking charges.", section: "Travel & Vehicle", priority: 56, accountType: "expense", statementType: "p_and_l", reportingBucket: "Travel & Vehicle", defaultTaxTreatment: "outside_scope", defaultVatRate: 0, defaultVatRecoverable: false, glCode: "5140", keywordPattern: "parking" },
  { category: "Parking Fines", slug: "parking-fines", description: "Parking fines and penalty charge notices. Non-allowable for tax.", section: "Travel & Vehicle", priority: 57, accountType: "expense", statementType: "p_and_l", reportingBucket: "Travel & Vehicle", defaultTaxTreatment: "outside_scope", defaultVatRate: 0, defaultVatRecoverable: false, glCode: "5141", allowableForTax: false, allowablePercentage: 0, keywordPattern: "pcn|penalty|parking fine" },
  { category: "Tolls", slug: "tolls", description: "Road tolls, congestion charges, and crossing fees.", section: "Travel & Vehicle", priority: 58, accountType: "expense", statementType: "p_and_l", reportingBucket: "Travel & Vehicle", defaultTaxTreatment: "outside_scope", defaultVatRate: 0, defaultVatRecoverable: false, glCode: "5145", keywordPattern: "toll|congestion|crossing" },
  { category: "Car Cleaning", slug: "car-cleaning", description: "Car washes, valeting, and business vehicle cleaning. Covers the valeting use case without renaming older references.", section: "Travel & Vehicle", priority: 59, accountType: "expense", statementType: "p_and_l", reportingBucket: "Travel & Vehicle", defaultTaxTreatment: "standard_rated", defaultVatRate: 20, glCode: "5150", keywordPattern: "car wash|valet|valeting|cleaning" },
  { category: "Mileage", slug: "mileage", description: "Mileage claims or mileage-based reimbursements.", section: "Travel & Vehicle", priority: 60, accountType: "expense", statementType: "p_and_l", reportingBucket: "Travel & Vehicle", defaultTaxTreatment: "outside_scope", defaultVatRate: 0, defaultVatRecoverable: false, glCode: "5160" },
  { category: "Vehicle Finance Interest", slug: "vehicle-finance-interest", description: "Interest on vehicle finance arrangements.", section: "Travel & Vehicle", priority: 61, accountType: "expense", statementType: "p_and_l", reportingBucket: "Travel & Vehicle", defaultTaxTreatment: "exempt", defaultVatRate: 0, defaultVatRecoverable: false, glCode: "5170", keywordPattern: "vehicle finance|car finance|hp interest" },
  { category: "Vehicle Lease / Hire", slug: "vehicle-lease-hire", description: "Lease, hire, or rental costs for vehicles.", section: "Travel & Vehicle", priority: 62, accountType: "expense", statementType: "p_and_l", reportingBucket: "Travel & Vehicle", defaultTaxTreatment: "standard_rated", defaultVatRate: 20, glCode: "5180", keywordPattern: "lease|hire|rental" },
  { category: "Public Transport", slug: "public-transport", description: "Rail, bus, and other public transport fares.", section: "Travel & Vehicle", priority: 63, accountType: "expense", statementType: "p_and_l", reportingBucket: "Travel & Vehicle", defaultTaxTreatment: "outside_scope", defaultVatRate: 0, defaultVatRecoverable: false, glCode: "5190", keywordPattern: "train|rail|bus|tram|tube" },
  { category: "Taxi / Ride Services", slug: "taxi-ride-services", description: "Taxi, private hire, or ride-share travel costs.", section: "Travel & Vehicle", priority: 64, accountType: "expense", statementType: "p_and_l", reportingBucket: "Travel & Vehicle", defaultTaxTreatment: "standard_rated", defaultVatRate: 20, glCode: "5195", supplierPattern: "uber|bolt|free now|taxi", keywordPattern: "taxi|ride|uber|bolt" },
  { category: "Travel - Other", slug: "travel-other", description: "Other travel costs that do not fit a more specific travel category.", section: "Travel & Vehicle", priority: 65, accountType: "expense", statementType: "p_and_l", reportingBucket: "Travel & Vehicle", defaultTaxTreatment: "standard_rated", defaultVatRate: 20, glCode: "5199" },

  { category: "Office Supplies", slug: "office-supplies", description: "Everyday office consumables and supplies.", section: "Office & Admin", priority: 80, accountType: "expense", statementType: "p_and_l", reportingBucket: "Office & Admin", defaultTaxTreatment: "standard_rated", defaultVatRate: 20, glCode: "6100" },
  { category: "Printing / Stationery", slug: "printing-stationery", description: "Printing, stationery, paper, and similar costs.", section: "Office & Admin", priority: 81, accountType: "expense", statementType: "p_and_l", reportingBucket: "Office & Admin", defaultTaxTreatment: "standard_rated", defaultVatRate: 20, glCode: "6110" },
  { category: "Postage", slug: "postage", description: "Courier, shipping, and postal charges. Reuses the postage-and-shipping slot without creating a duplicate.", section: "Office & Admin", priority: 82, accountType: "expense", statementType: "p_and_l", reportingBucket: "Office & Admin", defaultTaxTreatment: "exempt", defaultVatRate: 0, defaultVatRecoverable: false, glCode: "6115" },
  { category: "Phone", slug: "phone", description: "Business phone, mobile, and handset-related costs. 50% allowed for mixed personal/business use by default.", section: "Office & Admin", priority: 83, accountType: "expense", statementType: "p_and_l", reportingBucket: "Office & Admin", defaultTaxTreatment: "standard_rated", defaultVatRate: 20, glCode: "6140", allowableForTax: true, allowablePercentage: 50 },
  { category: "Internet", slug: "internet", description: "Broadband and internet connectivity costs.", section: "Office & Admin", priority: 84, accountType: "expense", statementType: "p_and_l", reportingBucket: "Office & Admin", defaultTaxTreatment: "standard_rated", defaultVatRate: 20, glCode: "6145" },
  { category: "Software Subscriptions", slug: "software-subscriptions", description: "Recurring software, SaaS, and cloud subscriptions.", section: "Office & Admin", priority: 85, accountType: "expense", statementType: "p_and_l", reportingBucket: "Office & Admin", defaultTaxTreatment: "standard_rated", defaultVatRate: 20, glCode: "6120", supplierPattern: "aws|amazon web|google|microsoft|xero|quickbooks|adobe|dropbox|zoom|slack", keywordPattern: "software|subscription|saas|cloud|licence|license" },
  { category: "Computer / IT Costs", slug: "computer-it-costs", description: "IT support, repairs, peripherals, and smaller computer costs.", section: "Office & Admin", priority: 86, accountType: "expense", statementType: "p_and_l", reportingBucket: "Office & Admin", defaultTaxTreatment: "standard_rated", defaultVatRate: 20, glCode: "6130" },
  { category: "Web Hosting", slug: "web-hosting", description: "Website hosting and infrastructure costs kept separate from general site work.", section: "Office & Admin", priority: 87, accountType: "expense", statementType: "p_and_l", reportingBucket: "Office & Admin", defaultTaxTreatment: "standard_rated", defaultVatRate: 20, glCode: "6135", keywordPattern: "hosting|server|vps|cdn" },
  { category: "Domain Costs", slug: "domain-costs", description: "Domain registration and renewal charges.", section: "Office & Admin", priority: 88, accountType: "expense", statementType: "p_and_l", reportingBucket: "Office & Admin", defaultTaxTreatment: "standard_rated", defaultVatRate: 20, glCode: "6136", keywordPattern: "domain|dns|whois" },
  { category: "Bank Charges", slug: "bank-charges", description: "Bank account fees and transaction charges.", section: "Office & Admin", priority: 89, accountType: "expense", statementType: "p_and_l", reportingBucket: "Finance Charges", defaultTaxTreatment: "exempt", defaultVatRate: 0, defaultVatRecoverable: false, glCode: "6150", keywordPattern: "bank charge|account fee|transaction fee" },
  { category: "Payment Platform Fees", slug: "payment-platform-fees", description: "Fees charged by payment platforms outside direct merchant acquiring.", section: "Office & Admin", priority: 90, accountType: "expense", statementType: "p_and_l", reportingBucket: "Finance Charges", defaultTaxTreatment: "exempt", defaultVatRate: 0, defaultVatRecoverable: false, glCode: "6152", keywordPattern: "paypal fee|platform fee|gateway fee" },
  { category: "Accountancy Fees", slug: "accountancy-fees", description: "External bookkeeping, accounting, and tax advisory costs.", section: "Office & Admin", priority: 91, accountType: "expense", statementType: "p_and_l", reportingBucket: "Professional Fees", defaultTaxTreatment: "standard_rated", defaultVatRate: 20, glCode: "6160", keywordPattern: "accountant|accountancy|bookkeeping|tax return" },
  { category: "Legal Fees", slug: "legal-fees", description: "Solicitor and legal advisory costs.", section: "Office & Admin", priority: 92, accountType: "expense", statementType: "p_and_l", reportingBucket: "Professional Fees", defaultTaxTreatment: "standard_rated", defaultVatRate: 20, glCode: "6170" },
  { category: "Professional Fees", slug: "professional-fees", description: "General professional services and advisory fees.", section: "Office & Admin", priority: 93, accountType: "expense", statementType: "p_and_l", reportingBucket: "Professional Fees", defaultTaxTreatment: "standard_rated", defaultVatRate: 20, glCode: "6180" },
  { category: "Business Insurance", slug: "business-insurance", description: "General business insurance outside vehicle cover.", section: "Office & Admin", priority: 94, accountType: "expense", statementType: "p_and_l", reportingBucket: "Office & Admin", defaultTaxTreatment: "exempt", defaultVatRate: 0, defaultVatRecoverable: false, glCode: "6190" },
  { category: "Licences / Certifications", slug: "licences-certifications", description: "Professional licences, accreditations, and certifications.", section: "Office & Admin", priority: 95, accountType: "expense", statementType: "p_and_l", reportingBucket: "Office & Admin", defaultTaxTreatment: "outside_scope", defaultVatRate: 0, defaultVatRecoverable: false, glCode: "6195" },
  { category: "Memberships / Subscriptions", slug: "memberships-subscriptions", description: "Trade body memberships and non-software subscriptions.", section: "Office & Admin", priority: 96, accountType: "expense", statementType: "p_and_l", reportingBucket: "Office & Admin", defaultTaxTreatment: "standard_rated", defaultVatRate: 20, glCode: "6198" },
  { category: "Sundry Expenses", slug: "sundry-expenses", description: "Minor admin spend that is too small or irregular for a dedicated category.", section: "Office & Admin", priority: 97, accountType: "expense", statementType: "p_and_l", reportingBucket: "Office & Admin", defaultTaxTreatment: "standard_rated", defaultVatRate: 20, glCode: "6199" },
  { category: "Miscellaneous Expense", slug: "miscellaneous-expense", description: "Small business costs that do not yet fit another category.", section: "Other & Special", priority: 243, accountType: "expense", statementType: "p_and_l", reportingBucket: "Other Expenses", defaultTaxTreatment: "standard_rated", defaultVatRate: 20, glCode: "9030" },

  { category: "Advertising", slug: "advertising", description: "General advertising and promotional spend.", section: "Marketing & Sales", priority: 110, accountType: "expense", statementType: "p_and_l", reportingBucket: "Marketing & Sales", defaultTaxTreatment: "standard_rated", defaultVatRate: 20, glCode: "6200" },
  { category: "Social Media Ads", slug: "social-media-ads", description: "Meta, TikTok, LinkedIn, or other social ad spend.", section: "Marketing & Sales", priority: 111, accountType: "expense", statementType: "p_and_l", reportingBucket: "Marketing & Sales", defaultTaxTreatment: "standard_rated", defaultVatRate: 20, glCode: "6210" },
  { category: "Website Costs", slug: "website-costs", description: "Website design, development, and maintenance costs.", section: "Marketing & Sales", priority: 112, accountType: "expense", statementType: "p_and_l", reportingBucket: "Marketing & Sales", defaultTaxTreatment: "standard_rated", defaultVatRate: 20, glCode: "6220" },
  { category: "Branding / Design", slug: "branding-design", description: "Design, creative, and branding work.", section: "Marketing & Sales", priority: 113, accountType: "expense", statementType: "p_and_l", reportingBucket: "Marketing & Sales", defaultTaxTreatment: "standard_rated", defaultVatRate: 20, glCode: "6230" },
  { category: "Marketing Expenses", slug: "marketing-expenses", description: "General marketing spend that does not fit a more specific category.", section: "Marketing & Sales", priority: 114, accountType: "expense", statementType: "p_and_l", reportingBucket: "Marketing & Sales", defaultTaxTreatment: "standard_rated", defaultVatRate: 20, glCode: "6235" },
  { category: "Promotional Costs", slug: "promotional-costs", description: "Printed promos, giveaways, or campaign collateral.", section: "Marketing & Sales", priority: 115, accountType: "expense", statementType: "p_and_l", reportingBucket: "Marketing & Sales", defaultTaxTreatment: "standard_rated", defaultVatRate: 20, glCode: "6240" },
  { category: "Sales Commissions", slug: "sales-commissions", description: "Commission payments tied to sales generation.", section: "Marketing & Sales", priority: 116, accountType: "expense", statementType: "p_and_l", reportingBucket: "Marketing & Sales", defaultTaxTreatment: "standard_rated", defaultVatRate: 20, glCode: "6250" },

  { category: "Loan Interest", slug: "loan-interest", description: "Interest on general business loans.", section: "Financial / Finance Costs", priority: 120, accountType: "expense", statementType: "p_and_l", reportingBucket: "Finance Charges", defaultTaxTreatment: "exempt", defaultVatRate: 0, defaultVatRecoverable: false, glCode: "6260", keywordPattern: "loan interest" },
  { category: "Interest Paid", slug: "interest-paid", description: "General interest expense not covered by a more specific finance category.", section: "Financial / Finance Costs", priority: 121, accountType: "expense", statementType: "p_and_l", reportingBucket: "Finance Charges", defaultTaxTreatment: "exempt", defaultVatRate: 0, defaultVatRecoverable: false, glCode: "6265", keywordPattern: "interest paid|interest charge" },
  { category: "Finance Charges", slug: "finance-charges", description: "General finance and borrowing charges.", section: "Financial / Finance Costs", priority: 122, accountType: "expense", statementType: "p_and_l", reportingBucket: "Finance Charges", defaultTaxTreatment: "exempt", defaultVatRate: 0, defaultVatRecoverable: false, glCode: "6270", keywordPattern: "finance charge" },
  { category: "Overdraft Interest", slug: "overdraft-interest", description: "Interest charged on overdrafts.", section: "Financial / Finance Costs", priority: 123, accountType: "expense", statementType: "p_and_l", reportingBucket: "Finance Charges", defaultTaxTreatment: "exempt", defaultVatRate: 0, defaultVatRecoverable: false, glCode: "6275", keywordPattern: "overdraft" },
  { category: "Late Payment Charges", slug: "late-payment-charges", description: "Late payment fees and supplier default charges.", section: "Financial / Finance Costs", priority: 124, accountType: "expense", statementType: "p_and_l", reportingBucket: "Finance Charges", defaultTaxTreatment: "outside_scope", defaultVatRate: 0, defaultVatRecoverable: false, glCode: "6280", keywordPattern: "late fee|late payment|default charge" },
  { category: "Bad Debt", slug: "bad-debt", description: "Bad debt write-offs and credit losses. Reuses the bad-debts slot without changing existing references.", section: "Other & Special", priority: 242, accountType: "expense", statementType: "p_and_l", reportingBucket: "Other Expenses", defaultTaxTreatment: "outside_scope", defaultVatRate: 0, defaultVatRecoverable: false, glCode: "9020" },
  { category: "Bad Debt Recovery", slug: "bad-debt-recovery", description: "Recoveries against debts previously written off.", section: "Financial / Finance Costs", priority: 125, accountType: "income", statementType: "p_and_l", reportingBucket: "Other Income", defaultTaxTreatment: "outside_scope", defaultVatRate: 0, defaultVatRecoverable: false, glCode: "6285", keywordPattern: "debt recovery|bad debt recovery" },

  { category: "Wages", slug: "wages", description: "Hourly wages paid to staff.", section: "Staff & Payroll", priority: 130, accountType: "expense", statementType: "p_and_l", reportingBucket: "Staff & Payroll", defaultTaxTreatment: "outside_scope", defaultVatRate: 0, defaultVatRecoverable: false, glCode: "6300" },
  { category: "Salaries", slug: "salaries", description: "Salaried payroll costs.", section: "Staff & Payroll", priority: 131, accountType: "expense", statementType: "p_and_l", reportingBucket: "Staff & Payroll", defaultTaxTreatment: "outside_scope", defaultVatRate: 0, defaultVatRecoverable: false, glCode: "6310" },
  { category: "Employer NI", slug: "employer-ni", description: "Employer social security or national insurance costs.", section: "Staff & Payroll", priority: 132, accountType: "expense", statementType: "p_and_l", reportingBucket: "Staff & Payroll", defaultTaxTreatment: "outside_scope", defaultVatRate: 0, defaultVatRecoverable: false, glCode: "6320" },
  { category: "Pension Contributions", slug: "pension-contributions", description: "Employer pension costs and contributions.", section: "Staff & Payroll", priority: 133, accountType: "expense", statementType: "p_and_l", reportingBucket: "Staff & Payroll", defaultTaxTreatment: "outside_scope", defaultVatRate: 0, defaultVatRecoverable: false, glCode: "6330" },
  { category: "Staff Training", slug: "staff-training", description: "Training courses and professional development for staff.", section: "Staff & Payroll", priority: 134, accountType: "expense", statementType: "p_and_l", reportingBucket: "Staff & Payroll", defaultTaxTreatment: "standard_rated", defaultVatRate: 20, glCode: "6340" },
  { category: "Staff Welfare", slug: "staff-welfare", description: "Staff welfare and small team wellbeing costs.", section: "Staff & Payroll", priority: 135, accountType: "expense", statementType: "p_and_l", reportingBucket: "Staff & Payroll", defaultTaxTreatment: "standard_rated", defaultVatRate: 20, glCode: "6350", allowableForTax: false, allowablePercentage: 0 },
  { category: "Staff Travel", slug: "staff-travel", description: "Travel booked on behalf of staff.", section: "Staff & Payroll", priority: 136, accountType: "expense", statementType: "p_and_l", reportingBucket: "Staff & Payroll", defaultTaxTreatment: "standard_rated", defaultVatRate: 20, glCode: "6360" },
  { category: "Reimbursements", slug: "reimbursements", description: "General expense reimbursements paid back to owners or staff.", section: "Staff & Payroll", priority: 137, accountType: "expense", statementType: "p_and_l", reportingBucket: "Staff & Payroll", defaultTaxTreatment: "outside_scope", defaultVatRate: 0, defaultVatRecoverable: false, glCode: "6370" },
  { category: "Staff Reimbursements", slug: "staff-reimbursements", description: "Expense reimbursements specifically paid back to staff.", section: "Staff & Payroll", priority: 138, accountType: "expense", statementType: "p_and_l", reportingBucket: "Staff & Payroll", defaultTaxTreatment: "outside_scope", defaultVatRate: 0, defaultVatRecoverable: false, glCode: "6371" },
  { category: "Temporary Staff", slug: "temporary-staff", description: "Agency and temporary worker costs.", section: "Staff & Payroll", priority: 139, accountType: "expense", statementType: "p_and_l", reportingBucket: "Staff & Payroll", defaultTaxTreatment: "outside_scope", defaultVatRate: 0, defaultVatRecoverable: false, glCode: "6375" },
  { category: "Payroll Fees", slug: "payroll-fees", description: "Payroll bureau or payroll software processing charges.", section: "Staff & Payroll", priority: 140, accountType: "expense", statementType: "p_and_l", reportingBucket: "Staff & Payroll", defaultTaxTreatment: "standard_rated", defaultVatRate: 20, glCode: "6380" },

  { category: "Rent", slug: "rent", description: "Office, studio, or premises rental costs.", section: "Property & Premises", priority: 150, accountType: "expense", statementType: "p_and_l", reportingBucket: "Property & Premises", defaultTaxTreatment: "exempt", defaultVatRate: 0, defaultVatRecoverable: false, glCode: "6400" },
  { category: "Utilities", slug: "utilities", description: "General property utility costs.", section: "Property & Premises", priority: 151, accountType: "expense", statementType: "p_and_l", reportingBucket: "Property & Premises", defaultTaxTreatment: "standard_rated", defaultVatRate: 20, glCode: "6410" },
  { category: "Electricity", slug: "electricity", description: "Electricity usage for the business premises.", section: "Property & Premises", priority: 152, accountType: "expense", statementType: "p_and_l", reportingBucket: "Property & Premises", defaultTaxTreatment: "standard_rated", defaultVatRate: 20, glCode: "6415" },
  { category: "Gas", slug: "gas", description: "Gas usage for the business premises.", section: "Property & Premises", priority: 153, accountType: "expense", statementType: "p_and_l", reportingBucket: "Property & Premises", defaultTaxTreatment: "standard_rated", defaultVatRate: 20, glCode: "6418" },
  { category: "Water", slug: "water", description: "Water and wastewater charges.", section: "Property & Premises", priority: 154, accountType: "expense", statementType: "p_and_l", reportingBucket: "Property & Premises", defaultTaxTreatment: "standard_rated", defaultVatRate: 20, glCode: "6420" },
  { category: "Cleaning", slug: "cleaning", description: "Cleaning services and supplies for the premises.", section: "Property & Premises", priority: 155, accountType: "expense", statementType: "p_and_l", reportingBucket: "Property & Premises", defaultTaxTreatment: "standard_rated", defaultVatRate: 20, glCode: "6425" },
  { category: "Repairs", slug: "repairs", description: "Property repairs and maintenance costs. Covers repairs-and-maintenance without changing older category references.", section: "Property & Premises", priority: 156, accountType: "expense", statementType: "p_and_l", reportingBucket: "Property & Premises", defaultTaxTreatment: "standard_rated", defaultVatRate: 20, glCode: "6430" },
  { category: "Security", slug: "security", description: "Security systems, alarm monitoring, and protection services.", section: "Property & Premises", priority: 157, accountType: "expense", statementType: "p_and_l", reportingBucket: "Property & Premises", defaultTaxTreatment: "standard_rated", defaultVatRate: 20, glCode: "6435" },
  { category: "Rates", slug: "rates", description: "Business rates and similar local property taxes. Covers the business-rates use case.", section: "Property & Premises", priority: 158, accountType: "expense", statementType: "p_and_l", reportingBucket: "Property & Premises", defaultTaxTreatment: "outside_scope", defaultVatRate: 0, defaultVatRecoverable: false, glCode: "6440" },

  { category: "VAT Control", slug: "vat-control", description: "Control account summarising VAT payable or reclaimable.", section: "Tax & Compliance", priority: 170, accountType: "liability", statementType: "tax_control", reportingBucket: "Tax Control", defaultTaxTreatment: "outside_scope", defaultVatRate: 0, defaultVatRecoverable: false, glCode: "2200" },
  { category: "Input VAT", slug: "input-vat", description: "Input VAT recoverable on purchases.", section: "Tax & Compliance", priority: 171, accountType: "asset", statementType: "tax_control", reportingBucket: "Tax Control", defaultTaxTreatment: "outside_scope", defaultVatRate: 0, defaultVatRecoverable: true, glCode: "2201" },
  { category: "Output VAT", slug: "output-vat", description: "Output VAT collected on sales.", section: "Tax & Compliance", priority: 172, accountType: "liability", statementType: "tax_control", reportingBucket: "Tax Control", defaultTaxTreatment: "outside_scope", defaultVatRate: 0, defaultVatRecoverable: false, glCode: "2202" },
  { category: "PAYE / Payroll Taxes", slug: "paye-payroll-taxes", description: "Payroll tax liabilities and PAYE-type remittances.", section: "Tax & Compliance", priority: 173, accountType: "liability", statementType: "balance_sheet", reportingBucket: "Tax Control", defaultTaxTreatment: "outside_scope", defaultVatRate: 0, defaultVatRecoverable: false, glCode: "2210" },
  { category: "Corporation Tax", slug: "corporation-tax", description: "Corporation tax liabilities or provisions.", section: "Tax & Compliance", priority: 174, accountType: "liability", statementType: "balance_sheet", reportingBucket: "Tax Control", defaultTaxTreatment: "outside_scope", defaultVatRate: 0, defaultVatRecoverable: false, glCode: "2220" },
  { category: "National Insurance Provision", slug: "national-insurance-provision", description: "Provision for national insurance liabilities outside normal payroll posting.", section: "Tax & Compliance", priority: 175, accountType: "liability", statementType: "balance_sheet", reportingBucket: "Tax Control", defaultTaxTreatment: "outside_scope", defaultVatRate: 0, defaultVatRecoverable: false, glCode: "2225" },
  { category: "Income Tax Provision", slug: "income-tax-provision", description: "Owner or personal tax provision tracked separately from trade expenses.", section: "Tax & Compliance", priority: 176, accountType: "equity", statementType: "equity_movement", reportingBucket: "Owner Items", defaultTaxTreatment: "outside_scope", defaultVatRate: 0, defaultVatRecoverable: false, glCode: "2230" },
  { category: "Penalties / Interest", slug: "penalties-interest", description: "Tax penalties, late fees, and similar charges.", section: "Tax & Compliance", priority: 177, accountType: "expense", statementType: "p_and_l", reportingBucket: "Tax & Compliance", defaultTaxTreatment: "outside_scope", defaultVatRate: 0, defaultVatRecoverable: false, glCode: "2240", allowableForTax: false, allowablePercentage: 0 },
  { category: "HMRC Payments", slug: "hmrc-payments", description: "Payments to the tax authority against existing tax liabilities.", section: "Tax & Compliance", priority: 178, accountType: "liability", statementType: "balance_sheet", reportingBucket: "Tax Control", defaultTaxTreatment: "outside_scope", defaultVatRate: 0, defaultVatRecoverable: false, glCode: "2250" },

  { category: "Drawings", slug: "drawings", description: "Owner drawings or personal withdrawals from the business.", section: "Equity & Owner Items", priority: 190, accountType: "equity", statementType: "equity_movement", reportingBucket: "Owner Items", defaultTaxTreatment: "outside_scope", defaultVatRate: 0, defaultVatRecoverable: false, glCode: "3000" },
  { category: "Capital Introduced", slug: "capital-introduced", description: "Owner capital or cash introduced into the business.", section: "Equity & Owner Items", priority: 191, accountType: "equity", statementType: "equity_movement", reportingBucket: "Owner Items", defaultTaxTreatment: "outside_scope", defaultVatRate: 0, defaultVatRecoverable: false, glCode: "3010" },
  { category: "Owner Loan", slug: "owner-loan", description: "Amounts owed between the business and owner loan account.", section: "Equity & Owner Items", priority: 192, accountType: "liability", statementType: "balance_sheet", reportingBucket: "Owner Items", defaultTaxTreatment: "outside_scope", defaultVatRate: 0, defaultVatRecoverable: false, glCode: "3020" },
  { category: "Dividends", slug: "dividends", description: "Dividend or profit distribution payments.", section: "Equity & Owner Items", priority: 193, accountType: "equity", statementType: "equity_movement", reportingBucket: "Owner Items", defaultTaxTreatment: "outside_scope", defaultVatRate: 0, defaultVatRecoverable: false, glCode: "3030" },
  { category: "Personal Expenses", slug: "personal-expenses", description: "Owner personal spend passing through the business account.", section: "Equity & Owner Items", priority: 194, accountType: "equity", statementType: "equity_movement", reportingBucket: "Owner Items", defaultTaxTreatment: "outside_scope", defaultVatRate: 0, defaultVatRecoverable: false, glCode: "3040" },
  { category: "Transfers to Personal Account", slug: "transfers-to-personal-account", description: "Transfers from business accounts to a personal account.", section: "Equity & Owner Items", priority: 195, accountType: "equity", statementType: "equity_movement", reportingBucket: "Owner Items", defaultTaxTreatment: "outside_scope", defaultVatRate: 0, defaultVatRecoverable: false, glCode: "3050" },

  { category: "Vehicle Purchase", slug: "vehicle-purchase", description: "Purchase of a vehicle treated as a fixed asset.", section: "Assets, Liabilities & Transfers", priority: 210, accountType: "asset", statementType: "balance_sheet", reportingBucket: "Fixed Assets", defaultTaxTreatment: "standard_rated", defaultVatRate: 20, glCode: "1000" },
  { category: "Equipment Purchase", slug: "equipment-purchase", description: "Purchase of capital equipment or machinery.", section: "Assets, Liabilities & Transfers", priority: 211, accountType: "asset", statementType: "balance_sheet", reportingBucket: "Fixed Assets", defaultTaxTreatment: "standard_rated", defaultVatRate: 20, glCode: "1010" },
  { category: "Computer Equipment", slug: "computer-equipment", description: "Laptops, desktops, and other capital IT hardware.", section: "Assets, Liabilities & Transfers", priority: 212, accountType: "asset", statementType: "balance_sheet", reportingBucket: "Fixed Assets", defaultTaxTreatment: "standard_rated", defaultVatRate: 20, glCode: "1020" },
  { category: "Office Equipment", slug: "office-equipment", description: "Capital office equipment outside general IT hardware.", section: "Assets, Liabilities & Transfers", priority: 213, accountType: "asset", statementType: "balance_sheet", reportingBucket: "Fixed Assets", defaultTaxTreatment: "standard_rated", defaultVatRate: 20, glCode: "1030" },
  { category: "Furniture", slug: "furniture", description: "Furniture and fixtures treated as capital assets.", section: "Assets, Liabilities & Transfers", priority: 214, accountType: "asset", statementType: "balance_sheet", reportingBucket: "Fixed Assets", defaultTaxTreatment: "standard_rated", defaultVatRate: 20, glCode: "1040" },
  { category: "Loan Received", slug: "loan-received", description: "Cash received from loan or finance arrangements.", section: "Assets, Liabilities & Transfers", priority: 215, accountType: "liability", statementType: "balance_sheet", reportingBucket: "Loans & Finance", defaultTaxTreatment: "outside_scope", defaultVatRate: 0, defaultVatRecoverable: false, glCode: "2300" },
  { category: "Loan Repayment", slug: "loan-repayment", description: "Principal repayments against existing borrowings.", section: "Assets, Liabilities & Transfers", priority: 216, accountType: "liability", statementType: "balance_sheet", reportingBucket: "Loans & Finance", defaultTaxTreatment: "outside_scope", defaultVatRate: 0, defaultVatRecoverable: false, glCode: "2310" },
  { category: "Credit Card Payment", slug: "credit-card-payment", description: "Settlement of credit card balances.", section: "Assets, Liabilities & Transfers", priority: 217, accountType: "liability", statementType: "balance_sheet", reportingBucket: "Loans & Finance", defaultTaxTreatment: "outside_scope", defaultVatRate: 0, defaultVatRecoverable: false, glCode: "2320" },
  { category: "Transfer Between Accounts", slug: "transfer-between-accounts", description: "Internal transfers between business bank accounts.", section: "Assets, Liabilities & Transfers", priority: 218, accountType: "asset", statementType: "balance_sheet", reportingBucket: "Transfers", defaultTaxTreatment: "outside_scope", defaultVatRate: 0, defaultVatRecoverable: false, glCode: "2330" },
  { category: "Cash Injection", slug: "cash-injection", description: "Cash placed into the business outside normal trade income.", section: "Assets, Liabilities & Transfers", priority: 219, accountType: "equity", statementType: "equity_movement", reportingBucket: "Owner Items", defaultTaxTreatment: "outside_scope", defaultVatRate: 0, defaultVatRecoverable: false, glCode: "2340" },
  { category: "Asset Disposal", slug: "asset-disposal", description: "Disposal or sale of a previously recognised asset.", section: "Assets, Liabilities & Transfers", priority: 220, accountType: "asset", statementType: "balance_sheet", reportingBucket: "Fixed Assets", defaultTaxTreatment: "standard_rated", defaultVatRate: 20, glCode: "2350" },
  { category: "Deposits / Prepayments", slug: "deposits-prepayments", description: "Deposits and prepayments carried forward as assets. Kept for compatibility with older workspaces.", section: "Assets, Liabilities & Transfers", priority: 221, accountType: "asset", statementType: "balance_sheet", reportingBucket: "Current Assets", defaultTaxTreatment: "standard_rated", defaultVatRate: 20, glCode: "2360" },
  { category: "Deposits", slug: "deposits", description: "Deposits carried as recoverable or future-value assets.", section: "Assets, Liabilities & Transfers", priority: 222, accountType: "asset", statementType: "balance_sheet", reportingBucket: "Current Assets", defaultTaxTreatment: "standard_rated", defaultVatRate: 20, glCode: "2361" },
  { category: "Prepayments", slug: "prepayments", description: "Prepaid expenses carried forward as assets.", section: "Assets, Liabilities & Transfers", priority: 223, accountType: "asset", statementType: "balance_sheet", reportingBucket: "Current Assets", defaultTaxTreatment: "standard_rated", defaultVatRate: 20, glCode: "2362" },
  { category: "Cash Withdrawal", slug: "cash-withdrawal", description: "Cash withdrawn from the bank into business cash holdings.", section: "Assets, Liabilities & Transfers", priority: 224, accountType: "asset", statementType: "balance_sheet", reportingBucket: "Transfers", defaultTaxTreatment: "outside_scope", defaultVatRate: 0, defaultVatRecoverable: false, glCode: "2365" },
  { category: "Cash Lodgement", slug: "cash-lodgement", description: "Cash lodged back into a business bank account.", section: "Assets, Liabilities & Transfers", priority: 225, accountType: "asset", statementType: "balance_sheet", reportingBucket: "Transfers", defaultTaxTreatment: "outside_scope", defaultVatRate: 0, defaultVatRecoverable: false, glCode: "2366" },

  { category: "Fines and Penalties", slug: "fines-and-penalties", description: "Non-deductible fines and penalty charges.", section: "Other & Special", priority: 240, accountType: "expense", statementType: "p_and_l", reportingBucket: "Other Expenses", defaultTaxTreatment: "outside_scope", defaultVatRate: 0, defaultVatRecoverable: false, glCode: "9000", allowableForTax: false, allowablePercentage: 0, keywordPattern: "fine|penalty|pcn" },
  { category: "Donations", slug: "donations", description: "Charitable or other donations paid by the business.", section: "Other & Special", priority: 241, accountType: "expense", statementType: "p_and_l", reportingBucket: "Other Expenses", defaultTaxTreatment: "outside_scope", defaultVatRate: 0, defaultVatRecoverable: false, glCode: "9010", allowableForTax: false, allowablePercentage: 0 },
  { category: "Suspense / Needs Review", slug: "suspense-needs-review", description: "Legacy temporary holding category kept for compatibility. Prefer the separate Suspense and Needs Review categories for new work.", section: "Other & Special", priority: 244, accountType: "expense", statementType: "p_and_l", reportingBucket: "Needs Review", defaultTaxTreatment: "no_vat", defaultVatRate: 0, defaultVatRecoverable: false, glCode: "9998", allowableForTax: false, allowablePercentage: 0 },
  { category: "Suspense", slug: "suspense", description: "Suspense account for transactions that should stay off the P&L until resolved.", section: "Other & Special", priority: 245, accountType: "asset", statementType: "balance_sheet", reportingBucket: "Suspense", defaultTaxTreatment: "outside_scope", defaultVatRate: 0, defaultVatRecoverable: false, glCode: "9996" },
  { category: "Needs Review", slug: "needs-review", description: "Operational review category for transactions that still need finance attention.", section: "Other & Special", priority: 246, accountType: "expense", statementType: "p_and_l", reportingBucket: "Needs Review", defaultTaxTreatment: "no_vat", defaultVatRate: 0, defaultVatRecoverable: false, glCode: "9997", allowableForTax: false, allowablePercentage: 0 },
  { category: "Uncategorised", slug: "uncategorised", description: "Fallback category used when nothing else has been assigned yet.", section: "Other & Special", priority: 247, accountType: "expense", statementType: "p_and_l", reportingBucket: "Needs Review", defaultTaxTreatment: "no_vat", defaultVatRate: 0, defaultVatRecoverable: false, glCode: "9999", allowableForTax: false, allowablePercentage: 0 },
  { category: "Duplicate / Excluded", slug: "duplicate-excluded", description: "Excluded or duplicate items kept out of normal reporting until resolved.", section: "Other & Special", priority: 248, accountType: "asset", statementType: "balance_sheet", reportingBucket: "Excluded Items", defaultTaxTreatment: "outside_scope", defaultVatRate: 0, defaultVatRecoverable: false, glCode: "9995" },
];

function makeCategory(seed: SeedCategory, index: number): CategoryRule {
  const visible = STARTER_SET.has(seed.slug);
  const isExpense = seed.accountType === "expense" && seed.statementType === "p_and_l";
  const allowableForTax = isExpense ? (seed.allowableForTax ?? true) : false;

  return {
    id: `cat_${seed.slug}`,
    category: seed.category,
    slug: seed.slug,
    description: seed.description,
    section: seed.section,
    supplierPattern: seed.supplierPattern,
    keywordPattern: seed.keywordPattern,
    priority: seed.priority,
    accountType: seed.accountType,
    statementType: seed.statementType,
    reportingBucket: seed.reportingBucket,
    defaultTaxTreatment: seed.defaultTaxTreatment,
    defaultVatRate: seed.defaultVatRate ?? 20,
    defaultVatRecoverable: seed.defaultVatRecoverable ?? seed.accountType === "expense",
    glCode: seed.glCode,
    isSystemDefault: true,
    isActive: visible,
    isVisible: visible,
    allowableForTax,
    allowablePercentage: isExpense ? (allowableForTax ? (seed.allowablePercentage ?? 100) : 0) : 0,
    sortOrder: index + 1,
  };
}

export const MASTER_CATEGORY_LIBRARY: CategoryRule[] = SEED_CATEGORIES.map(makeCategory);

export function buildMasterCategoryLibrary(): CategoryRule[] {
  return MASTER_CATEGORY_LIBRARY.map((rule) => ({ ...rule }));
}

export function mergeWorkspaceCategoryRules(savedRules: CategoryRule[]): CategoryRule[] {
  const master = buildMasterCategoryLibrary();
  const savedBySlug = new Map(savedRules.map((rule) => [rule.slug, rule]));
  const usedSlugs = new Set<string>();

  const merged = master.map((rule) => {
    const saved = savedBySlug.get(rule.slug);
    if (!saved) return rule;
    usedSlugs.add(rule.slug);
    return {
      ...rule,
      ...saved,
      id: saved.id,
      slug: saved.slug || rule.slug,
      isSystemDefault: saved.isSystemDefault ?? true,
    };
  });

  const customRules = savedRules.filter((rule) => !usedSlugs.has(rule.slug));

  return [...merged, ...customRules].sort(
    (a, b) => a.sortOrder - b.sortOrder || a.priority - b.priority || a.category.localeCompare(b.category),
  );
}
