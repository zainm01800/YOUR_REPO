import { PageHeader } from "@/components/app-shell/page-header";
import { getRepository } from "@/lib/data";
import { getCachedBookkeepingDataset } from "@/lib/data/cached-reads";
import { buildCategoryRuleMap, classifyTransaction } from "@/lib/accounting/classifier";
import { resolveCategory } from "@/lib/categories/suggester";
import { TaxEstimatePanel } from "@/components/bookkeeping/tax-estimate-panel";
import { getServerViewerAccess } from "@/lib/auth/server-viewer-access";
import { redirect } from "next/navigation";

export const metadata = { title: "Self Assessment Estimate" };

/** UK 2024/25 tax bands */
const UK_TAX = {
  personalAllowance: 12_570,
  basicRateLimit: 50_270,
  higherRateLimit: 125_140,
  basicRate: 0.20,
  higherRate: 0.40,
  additionalRate: 0.45,
  /** Class 4 NI thresholds */
  ni4Lower: 12_570,
  ni4Upper: 50_270,
  ni4LowerRate: 0.09,
  ni4UpperRate: 0.02,
  /** Class 2 NI (flat weekly, approx annual) */
  ni2Annual: 179.40,
  ni2SmallProfitsThreshold: 12_570,
};

function calcTax(profit: number) {
  const taxableIncome = Math.max(0, profit - UK_TAX.personalAllowance);
  const basicBand = Math.max(0, Math.min(taxableIncome, UK_TAX.basicRateLimit - UK_TAX.personalAllowance));
  const higherBand = Math.max(0, Math.min(taxableIncome - basicBand, UK_TAX.higherRateLimit - UK_TAX.basicRateLimit));
  const additionalBand = Math.max(0, taxableIncome - basicBand - higherBand);
  const incomeTax = basicBand * UK_TAX.basicRate + higherBand * UK_TAX.higherRate + additionalBand * UK_TAX.additionalRate;

  const ni4Profit = profit - UK_TAX.ni4Lower;
  const ni4Lower = Math.max(0, Math.min(ni4Profit, UK_TAX.ni4Upper - UK_TAX.ni4Lower)) * UK_TAX.ni4LowerRate;
  const ni4Upper = Math.max(0, ni4Profit - (UK_TAX.ni4Upper - UK_TAX.ni4Lower)) * UK_TAX.ni4UpperRate;
  const class4Ni = ni4Lower + ni4Upper;
  const class2Ni = profit > UK_TAX.ni2SmallProfitsThreshold ? UK_TAX.ni2Annual : 0;

  const totalTax = incomeTax + class4Ni + class2Ni;
  const effectiveRate = profit > 0 ? (totalTax / profit) * 100 : 0;
  const setAsidePercentage = profit > 0 ? Math.ceil((totalTax / profit) * 100) : 0;

  return { incomeTax, class4Ni, class2Ni, totalTax, effectiveRate, setAsidePercentage, taxableIncome };
}

export default async function TaxEstimatePage() {
  const { repository, workspace, viewerAccess } = await getServerViewerAccess();
  if (!viewerAccess.canReviewTax) {
    redirect("/dashboard");
  }
  const [{ settingsSnapshot: settings, runs }, manualExpenses] = await Promise.all([
    getCachedBookkeepingDataset(workspace.id),
    repository.getManualExpenses(),
  ]);

  const currency = settings.workspace.defaultCurrency ?? "GBP";
  const categoryRuleMap = buildCategoryRuleMap(settings.categoryRules);
  const now = new Date();
  const taxYear = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
  const taxYearStart = new Date(`${taxYear}-04-06`);
  const taxYearEnd = new Date(`${taxYear + 1}-04-05`);

  let grossIncome = 0;
  let totalExpenses = 0;
  let vatCollected = 0;

  for (const run of runs) {
    for (const tx of run.transactions) {
      const dateStr = tx.transactionDate;
      if (!dateStr) continue;
      const date = new Date(dateStr);
      if (date < taxYearStart || date > taxYearEnd) continue;

      const catName = tx.category ?? resolveCategory(tx, settings.categoryRules);
      const cat = catName ? categoryRuleMap.get(catName) : undefined;
      const classified = classifyTransaction(tx, cat, settings.workspace.vatRegistered);

      if (classified.accountType === "income") {
        grossIncome += Math.abs(classified.grossAmount);
        vatCollected += classified.taxAmount ?? 0;
      } else if (classified.accountType === "expense") {
        totalExpenses += Math.abs(classified.grossAmount);
      }
    }
  }

  // Add manual expenses
  for (const exp of manualExpenses) {
    if (!exp.date) continue;
    const date = new Date(exp.date);
    if (date < taxYearStart || date > taxYearEnd) continue;
    totalExpenses += exp.amount;
  }

  const netIncome = grossIncome - vatCollected; // VAT exclusive income
  const profit = Math.max(0, netIncome - totalExpenses);
  const taxCalc = calcTax(profit);

  return (
    <>
      <PageHeader
        eyebrow="Bookkeeping"
        title="Self Assessment Estimate"
        description={`Estimated tax liability for the ${taxYear}/${taxYear + 1} tax year (6 Apr ${taxYear} – 5 Apr ${taxYear + 1}). UK sole trader — income tax + Class 4 NI.`}
      />
      <TaxEstimatePanel
        currency={currency}
        grossIncome={grossIncome}
        vatCollected={vatCollected}
        netIncome={netIncome}
        totalExpenses={totalExpenses}
        profit={profit}
        taxCalc={taxCalc}
        taxYear={taxYear}
        ukTax={UK_TAX}
      />
    </>
  );
}
