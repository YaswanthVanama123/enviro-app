export function capitalize(str: string): string {
  if (!str) {return '';}
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) {return str;}
  return str.slice(0, maxLength - 3) + '...';
}

export function formatNumber(n: number): string {
  const v = Number.isFinite(n) ? n : 0;
  const sign = v < 0 ? '-' : '';
  const fixed = Math.abs(v).toFixed(Number.isInteger(v) ? 0 : 2);
  const [intPart, decPart] = fixed.split('.');
  const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return decPart ? `${sign}${grouped}.${decPart}` : `${sign}${grouped}`;
}

export function formatCurrency(amount: number): string {
  const v = Number.isFinite(amount) ? amount : 0;
  const sign = v < 0 ? '-' : '';
  const fixed = Math.abs(v).toFixed(2);
  const [intPart, decPart] = fixed.split('.');
  const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${sign}$${grouped}.${decPart}`;
}
