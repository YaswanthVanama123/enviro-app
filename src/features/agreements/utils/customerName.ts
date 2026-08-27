import {HeaderRow} from '../../../services/api/endpoints/form.api';

export const UNNAMED_CUSTOMER = 'Unnamed_Customer';

// Title shown when no customer name has been entered yet. Extensions (renewals of
// an existing agreement) keep the legacy addendum wording; new agreements use the
// service-agreement wording. Both are treated as placeholders so a title saved
// under either scheme is replaced rather than displayed verbatim.
export const EXTENSION_DOCUMENT_TITLE = 'Customer Update Addendum';
export const DEFAULT_DOCUMENT_TITLE = 'Customer Service Agreement';

const PLACEHOLDER_TITLES = [DEFAULT_DOCUMENT_TITLE, EXTENSION_DOCUMENT_TITLE];

export function isPlaceholderTitle(title?: string | null): boolean {
  const trimmed = title?.trim();
  return !trimmed || PLACEHOLDER_TITLES.includes(trimmed);
}

export function defaultTitleFor(isExtension?: boolean): string {
  return isExtension ? EXTENSION_DOCUMENT_TITLE : DEFAULT_DOCUMENT_TITLE;
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
  isExtension?: boolean,
): string {
  const customerName = extractCustomerName(headerRows);
  if (customerName !== UNNAMED_CUSTOMER) {
    return customerName;
  }
  return isPlaceholderTitle(headerTitle) ? defaultTitleFor(isExtension) : headerTitle!.trim();
}
