export const CURRENCY_SYMBOL = "$";

type CurrencyFormatOptions = {
  sign?: "always" | "negative-only";
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
  notation?: "standard" | "compact";
};

export function formatCurrency(value: number, options: CurrencyFormatOptions = {}) {
  const { sign = "negative-only", minimumFractionDigits = 0, maximumFractionDigits = 2, notation = "standard" } = options;
  const absolute = Math.abs(value);
  const formatted = new Intl.NumberFormat("en-US", {
    minimumFractionDigits,
    maximumFractionDigits,
    notation,
    compactDisplay: "short",
  }).format(absolute);
  const prefix = value < 0 ? "-" : sign === "always" ? "+" : "";
  return `${prefix}${CURRENCY_SYMBOL}${formatted}`;
}
