import { randomUUID } from "node:crypto";
import * as XLSX from "xlsx";
import type { GlCodeRule, VatRule } from "@/lib/domain/types";

function normalizeHeader(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function toBoolean(value: unknown, fallback = true) {
  if (typeof value === "boolean") {
    return value;
  }

  const normalized = String(value ?? "")
    .trim()
    .toLowerCase();

  if (["true", "yes", "y", "1", "recoverable"].includes(normalized)) {
    return true;
  }

  if (["false", "no", "n", "0", "nonrecoverable", "non-recoverable"].includes(normalized)) {
    return false;
  }

  return fallback;
}

function toOptionalString(value: unknown) {
  const text = String(value ?? "").trim();
  return text || undefined;
}

function toRequiredString(value: unknown) {
  const text = String(value ?? "").trim();
  return text;
}

function toNumber(value: unknown) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : undefined;
  }

  const normalized = String(value ?? "")
    .trim()
    .replace(/[%\s]/g, "")
    .replace(",", ".");
  if (!normalized) {
    return undefined;
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function readWorkbookRows(buffer: ArrayBuffer) {
  const workbook = XLSX.read(Buffer.from(buffer), { type: "buffer" });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) {
    return [];
  }

  const sheet = workbook.Sheets[firstSheetName];
  return XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: "",
    raw: false,
  });
}

function parseLine(line: string) {
  const cleaned = line.trim();
  if (!cleaned) {
    return [];
  }

  if (cleaned.includes("\t")) {
    return cleaned.split("\t").map((part) => part.trim());
  }

  if (cleaned.includes("|")) {
    return cleaned.split("|").map((part) => part.trim());
  }

  if (cleaned.includes(",")) {
    return cleaned.split(",").map((part) => part.trim());
  }

  if (cleaned.includes(" - ")) {
    const [left, ...rest] = cleaned.split(" - ");
    return [left.trim(), rest.join(" - ").trim()];
  }

  return [cleaned];
}

function recordValue(record: Record<string, unknown>, aliases: string[]) {
  const aliasSet = new Set(aliases.map(normalizeHeader));

  for (const [key, value] of Object.entries(record)) {
    if (aliasSet.has(normalizeHeader(key))) {
      return value;
    }
  }

  return undefined;
}

export function parseGlRulesFromText(text: string): GlCodeRule[] {
  const rules: Array<GlCodeRule | null> = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => {
      const parts = parseLine(line);
      const glCode = toRequiredString(parts[0]);
      const label = toRequiredString(parts[1]);
      const supplierPattern = toOptionalString(parts[2]);
      const keywordPattern = toOptionalString(parts[3]);
      const priority = toNumber(parts[4]) ?? 100 + index;

      if (!glCode || !label) {
        return null;
      }

      return {
        id: `gl_${randomUUID()}`,
        glCode,
        label,
        supplierPattern,
        keywordPattern,
        priority,
      } satisfies GlCodeRule;
    });

  return rules.filter((rule): rule is GlCodeRule => Boolean(rule));
}

export function parseGlRulesFromWorkbook(buffer: ArrayBuffer): GlCodeRule[] {
  const rows = readWorkbookRows(buffer);
  const rules: Array<GlCodeRule | null> = rows
    .map((record, index) => {
      const glCode = toRequiredString(
        recordValue(record, ["glCode", "code", "account", "accountCode", "nominalCode"]),
      );
      const label = toRequiredString(
        recordValue(record, ["label", "description", "name", "title"]),
      );
      const supplierPattern = toOptionalString(
        recordValue(record, ["supplierPattern", "supplier", "merchantPattern"]),
      );
      const keywordPattern = toOptionalString(
        recordValue(record, ["keywordPattern", "keywords", "keyword"]),
      );
      const priority = toNumber(recordValue(record, ["priority", "rank"])) ?? 100 + index;

      if (!glCode || !label) {
        return null;
      }

      return {
        id: `gl_${randomUUID()}`,
        glCode,
        label,
        supplierPattern,
        keywordPattern,
        priority,
      } satisfies GlCodeRule;
    });

  return rules.filter((rule): rule is GlCodeRule => Boolean(rule));
}

export function parseVatRulesFromText(text: string): VatRule[] {
  const rules: Array<VatRule | null> = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const parts = parseLine(line);
      const countryCode = toRequiredString(parts[0]).toUpperCase();
      const rate = toNumber(parts[1]);
      const taxCode = toRequiredString(parts[2]);
      const recoverable = toBoolean(parts[3], true);
      const description = toRequiredString(parts[4] ?? `${countryCode} ${parts[1] ?? ""}% VAT`);

      if (!countryCode || rate === undefined || !taxCode) {
        return null;
      }

      return {
        id: `vat_${randomUUID()}`,
        countryCode,
        rate,
        taxCode,
        recoverable,
        description,
      } satisfies VatRule;
    });

  return rules.filter((rule): rule is VatRule => Boolean(rule));
}

export function parseVatRulesFromWorkbook(buffer: ArrayBuffer): VatRule[] {
  const rows = readWorkbookRows(buffer);
  const rules: Array<VatRule | null> = rows
    .map((record) => {
      const countryCode = toRequiredString(
        recordValue(record, ["country", "countryCode", "country_profile"]),
      ).toUpperCase();
      const rate = toNumber(recordValue(record, ["rate", "vatRate", "taxRate", "percent"]));
      const taxCode = toRequiredString(
        recordValue(record, ["taxCode", "vatCode", "code"]),
      );
      const recoverable = toBoolean(
        recordValue(record, ["recoverable", "isRecoverable"]),
        true,
      );
      const description = toRequiredString(
        recordValue(record, ["description", "label", "name"]) ??
          `${countryCode} ${rate ?? ""}% VAT`,
      );

      if (!countryCode || rate === undefined || !taxCode) {
        return null;
      }

      return {
        id: `vat_${randomUUID()}`,
        countryCode,
        rate,
        taxCode,
        recoverable,
        description,
      } satisfies VatRule;
    });

  return rules.filter((rule): rule is VatRule => Boolean(rule));
}
