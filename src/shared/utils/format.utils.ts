/**
 * Capitalize the first letter of a string.
 */
export function capitalize(str: string): string {
  if (!str) {return '';}
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Truncate a string to maxLength, appending '...' if truncated.
 */
export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) {return str;}
  return str.slice(0, maxLength - 3) + '...';
}

/**
 * Format a number with comma separators (e.g. 1234567 → '1,234,567').
 */
export function formatNumber(n: number): string {
  return n.toLocaleString();
}
