/**
 * Core Money Helpers
 *
 * INVARIANT: All monetary amounts in the database and business logic
 * are stored and manipulated as integer cents (e.g. $125.50 -> 12550).
 * Never use floating-point numbers for money storage or arithmetic.
 */

export function assertIntegerCents(cents: number, label = "amount"): void {
  if (!Number.isSafeInteger(cents)) {
    throw new Error(`Invalid ${label}: expected safe integer cents, got ${cents}`);
  }
}

/**
 * Formats integer cents into a human-readable currency string (e.g., 12550 -> "$125.50").
 */
export function formatCents(
  cents: number,
  currency = "USD",
  locale = "en-US"
): string {
  assertIntegerCents(cents);
  const isNegative = cents < 0;
  const absCents = Math.abs(cents);
  const dollars = Math.floor(absCents / 100);
  const remainderCents = absCents % 100;

  const formattedNumber = new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(dollars + remainderCents / 100);

  return isNegative ? `-${formattedNumber}` : formattedNumber;
}

/**
 * Parses a user-entered dollar string (e.g. "125.50", "$1,250.05", "-45.2") into integer cents.
 * Uses string splitting rather than float multiplication to avoid IEEE-754 precision bugs.
 */
export function parseDollarsToCents(input: string): number {
  const cleaned = input.trim().replace(/[$,\s]/g, "");
  if (!cleaned) {
    throw new Error("Amount cannot be empty");
  }

  const match = /^(-?)(\d+)(?:\.(\d{1,2}))?$/.exec(cleaned);
  if (!match) {
    throw new Error(`Invalid monetary amount: "${input}"`);
  }

  const [, sign, wholePart, fracPart = ""] = match;
  const paddedFrac = fracPart.padEnd(2, "0");
  const totalCents =
    parseInt(wholePart, 10) * 100 + parseInt(paddedFrac, 10);

  const signedCents = sign === "-" ? -totalCents : totalCents;
  assertIntegerCents(signedCents);
  return signedCents;
}
