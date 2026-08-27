import {HeaderRow} from '../../../services/api/endpoints/form.api';

export const UNNAMED_CUSTOMER = 'Unnamed_Customer';

// Title shown when no customer name has been entered yet. The previous wording
// ("Customer Update Addendum") is still treated as a placeholder so agreements
// saved before the rename don't display the old heading.
export const DEFAULT_DOCUMENT_TITLE = 'Customer Service Agreement';

const PLACEHOLDER_TITLES = [DEFAULT_DOCUMENT_TITLE, 'Customer Update Addendum'];

export function isPlaceholderTitle(title?: string | null): boolean {
  const trimmed = title?.trim();
  return !trimmed || PLACEHOLDER_TITLES.includes(trimmed);
}

export function extractCustomerName(headerRows: HeaderRow[] = []): string {
  for (const row of headerRows) {
    if (row.labelLeft && row.labelLeft.toUpperCase().includes('CUSTOMER NAME')) {
      return row.valueLeft?.trim() || UNNAMED_CUSTOMER;
    }
    if (row.labelRight && row.labelRight.toUpperCase().includes('CUSTOMER NAME')) {
      return row.valueRight?.trim() || UNNAMED_CUSTOMER;
    }
  }
  return UNNAMED_CUSTOMER;
}

export function resolveDocumentTitle(
  headerTitle: string | undefined,
  headerRows: HeaderRow[] = [],
): string {
  const customerName = extractCustomerName(headerRows);
  if (customerName !== UNNAMED_CUSTOMER) {
    return customerName;
  }
  return isPlaceholderTitle(headerTitle) ? DEFAULT_DOCUMENT_TITLE : headerTitle!.trim();
}
