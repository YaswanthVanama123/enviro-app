export function capitalize(str: string): string {
  if (!str) {return '';}
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) {return str;}
  return str.slice(0, maxLength - 3) + '...';
}

export function formatNumber(n: number): string {
  return n.toLocaleString();
}

export function formatCurrency(amount: number): string {
  return '$' + amount.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});
}
