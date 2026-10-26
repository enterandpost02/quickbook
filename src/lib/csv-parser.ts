/**
 * Bank CSV Parser & Column Mapper
 * Handles quoted values, currency symbols, parentheses for negative amounts,
 * single Amount column or split Debit/Credit (Money Out/Money In) columns.
 */

export interface ParsedCsvPreview {
  headers: string[];
  rawRows: string[][];
  suggestedMapping: {
    dateIndex: number;
    descriptionIndex: number;
    amountIndex: number;
    payeeIndex: number;
  };
}

export function splitCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

export function parseCsvTextToPreview(csvText: string): ParsedCsvPreview {
  const lines = csvText
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length === 0) {
    return {
      headers: [],
      rawRows: [],
      suggestedMapping: {
        dateIndex: 0,
        descriptionIndex: 1,
        amountIndex: 2,
        payeeIndex: -1,
      },
    };
  }

  const headers = splitCsvLine(lines[0]);
  const rawRows = lines.slice(1).map(splitCsvLine);

  const lowerHeaders = headers.map((h) => h.toLowerCase());
  const dateIndex = Math.max(
    0,
    lowerHeaders.findIndex((h) => h.includes("date") || h.includes("posted"))
  );
  const descriptionIndex = Math.max(
    0,
    lowerHeaders.findIndex(
      (h) =>
        h.includes("desc") ||
        h.includes("memo") ||
        h.includes("narrative") ||
        h.includes("details")
    )
  );
  const amountIndex = Math.max(
    0,
    lowerHeaders.findIndex(
      (h) => h.includes("amount") || h.includes("total") || h.includes("value")
    )
  );
  const payeeIndex = lowerHeaders.findIndex(
    (h) => h.includes("payee") || h.includes("vendor") || h.includes("merchant")
  );

  return {
    headers,
    rawRows,
    suggestedMapping: {
      dateIndex,
      descriptionIndex: descriptionIndex === dateIndex ? 1 : descriptionIndex,
      amountIndex: amountIndex === dateIndex ? 2 : amountIndex,
      payeeIndex,
    },
  };
}

export function parseCurrencyStringToCents(raw: string): number {
  if (!raw) return 0;
  let cleaned = raw.trim();
  let isNegative = false;

  // Handle accounting parentheses e.g. ($125.50)
  if (cleaned.startsWith("(") && cleaned.endsWith(")")) {
    isNegative = true;
    cleaned = cleaned.slice(1, -1);
  }
  if (cleaned.startsWith("-")) {
    isNegative = true;
    cleaned = cleaned.slice(1);
  } else if (cleaned.startsWith("+")) {
    cleaned = cleaned.slice(1);
  }

  cleaned = cleaned.replace(/[$,\s]/g, "");
  if (!cleaned) return 0;

  const [whole = "0", frac = ""] = cleaned.split(".");
  const wholeInt = parseInt(whole, 10);
  if (Number.isNaN(wholeInt)) return 0;

  const paddedFrac = frac.slice(0, 2).padEnd(2, "0");
  const fracInt = parseInt(paddedFrac, 10) || 0;

  const totalCents = wholeInt * 100 + fracInt;
  return isNegative ? -totalCents : totalCents;
}

export function normalizeDateString(raw: string): string {
  const trimmed = raw.trim();
  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }
  // MM/DD/YYYY or M/D/YYYY
  const slashMatch = /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/.exec(trimmed);
  if (slashMatch) {
    const m = slashMatch[1].padStart(2, "0");
    const d = slashMatch[2].padStart(2, "0");
    const y =
      slashMatch[3].length === 2 ? `20${slashMatch[3]}` : slashMatch[3];
    return `${y}-${m}-${d}`;
  }
  return new Date().toISOString().slice(0, 10);
}
