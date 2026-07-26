import {HeaderRow} from '../../../services/api/endpoints/form.api';

export const UNNAMED_CUSTOMER = 'Unnamed_Customer';

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
  return headerTitle?.trim() || 'Customer Update Addendum';
}
