import type {
  ReviewBaseColumnKey,
  ReviewGridColumnLayout,
  ReviewRow,
} from "@/lib/domain/types";
import { formatCurrency, formatPercent } from "@/lib/utils";

function getExcelColumnName(columnNumber: number) {
  let dividend = columnNumber;
  let columnName = "";

  while (dividend > 0) {
    const modulo = (dividend - 1) % 26;
    columnName = String.fromCharCode(65 + modulo) + columnName;
    dividend = Math.floor((dividend - modulo) / 26);
  }

  return columnName;
}

function getBaseNumericValue(row: ReviewRow, key: ReviewBaseColumnKey) {
  switch (key) {
    case "originalValue":
      return row.originalAmount;
    case "gross":
      return row.gross;
    case "net":
      return row.net;
    case "vat":
      return row.vat;
    case "vatPercent":
      return row.vatPercent;
    default:
      return undefined;
  }
}

function evaluateExpression(expression: string) {
  const sanitized = expression.replace(/\s+/g, "");
  if (!/^[0-9+\-*/().,]+$/.test(sanitized)) {
    return undefined;
  }

  try {
    const result = Function(`"use strict"; return (${sanitized});`)() as number;
    return Number.isFinite(result) ? result : undefined;
  } catch {
    return undefined;
  }
}

export function evaluateReviewFormula(
  row: ReviewRow,
  column: ReviewGridColumnLayout,
  columns: ReviewGridColumnLayout[],
  rowNumber: number,
  stack = new Set<string>(),
): number | string | undefined {
  if (!column.formula) {
    return undefined;
  }

  if (stack.has(column.key)) {
    return "#CYCLE";
  }

  const visibleColumns = columns.filter((candidate) => candidate.visible);
  const nextStack = new Set(stack);
  nextStack.add(column.key);
  const formula = column.formula.trim().startsWith("=")
    ? column.formula.trim()
    : `=${column.formula.trim()}`;

  const labelLookup = new Map(
    visibleColumns.map((candidate) => [candidate.label.toLowerCase(), candidate]),
  );
  const letterLookup = new Map(
    visibleColumns.map((candidate, index) => [getExcelColumnName(index + 1), candidate]),
  );

  const resolveColumnNumericValue = (candidate?: ReviewGridColumnLayout) => {
    if (!candidate) {
      return 0;
    }

    if (candidate.kind === "custom") {
      const result = evaluateReviewFormula(row, candidate, columns, rowNumber, nextStack);
      return typeof result === "number" ? result : 0;
    }

    return getBaseNumericValue(row, candidate.key as ReviewBaseColumnKey) ?? 0;
  };

  let expression = formula.slice(1);

  expression = expression.replace(/\[([^\]]+)\]/g, (_match, label) => {
    const candidate = labelLookup.get(String(label).toLowerCase());
    return String(resolveColumnNumericValue(candidate));
  });

  expression = expression.replace(
    /SUM\(([A-Z]+)\d+:([A-Z]+)\d+\)/gi,
    (_match, startLetter, endLetter) => {
      const startIndex = visibleColumns.findIndex(
        (_column, index) => getExcelColumnName(index + 1) === startLetter.toUpperCase(),
      );
      const endIndex = visibleColumns.findIndex(
        (_column, index) => getExcelColumnName(index + 1) === endLetter.toUpperCase(),
      );

      if (startIndex < 0 || endIndex < 0) {
        return "0";
      }

      const [from, to] =
        startIndex <= endIndex ? [startIndex, endIndex] : [endIndex, startIndex];
      const total = visibleColumns
        .slice(from, to + 1)
        .reduce((sum, candidate) => sum + resolveColumnNumericValue(candidate), 0);

      return String(total);
    },
  );

  expression = expression.replace(/([A-Z]+)\d+/g, (_match, letter) => {
    const candidate = letterLookup.get(letter.toUpperCase());
    return String(resolveColumnNumericValue(candidate));
  });

  const result = evaluateExpression(expression);
  return result ?? "#ERROR";
}

export function getReviewCellDisplayValue(
  row: ReviewRow,
  column: ReviewGridColumnLayout,
  columns: ReviewGridColumnLayout[],
  rowNumber: number,
) {
  if (column.kind === "custom") {
    const result = evaluateReviewFormula(row, column, columns, rowNumber);

    if (typeof result === "number") {
      return Number.isInteger(result)
        ? result.toLocaleString("en-GB")
        : result.toLocaleString("en-GB", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          });
    }

    return result || "";
  }

  switch (column.key) {
    case "supplier":
      return row.supplier;
    case "originalValue":
      return formatCurrency(row.originalAmount, row.originalCurrency);
    case "gross":
      return row.gross !== undefined ? formatCurrency(row.gross, row.currency) : "Pending";
    case "net":
      return row.net !== undefined ? formatCurrency(row.net, row.currency) : "Pending";
    case "vat":
      return row.vat !== undefined ? formatCurrency(row.vat, row.currency) : "Pending";
    case "vatPercent":
      return row.vatPercent !== undefined ? formatPercent(row.vatPercent) : "No rate";
    case "vatCode":
      return row.vatCode || "Missing";
    case "glCode":
      return row.glCode || "Missing";
  }
}

export function getReviewCellFilterText(
  row: ReviewRow,
  column: ReviewGridColumnLayout,
  columns: ReviewGridColumnLayout[],
  rowNumber: number,
) {
  return String(getReviewCellDisplayValue(row, column, columns, rowNumber)).toLowerCase();
}
