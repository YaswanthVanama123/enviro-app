import {HeaderRow} from '../../../services/api/endpoints/form.api';

export type CustomerField = {
  id: string;
  label: string;
  value: string;
  builtIn: boolean;
};

const BUILT_IN_LABELS = new Set([
  'CUSTOMER NAME:',
  'CUSTOMER CONTACT:',
  'CUSTOMER NUMBER:',
  'POC EMAIL:',
  'POC NAME:',
  'POC PHONE:',
]);

export function normalizeLabel(label: string): string {
  return label.replace(/\s+:/g, ':').trim().toUpperCase();
}

export function isBuiltInLabel(label: string): boolean {
  if (!label) {return false;}
  return BUILT_IN_LABELS.has(normalizeLabel(label));
}

export function headerRowsToFields(rows: HeaderRow[]): CustomerField[] {
  const fields: CustomerField[] = [];
  rows.forEach((row, rowIndex) => {
    if (row.labelLeft || row.valueLeft) {
      fields.push({
        id: `r${rowIndex}_L`,
        label: row.labelLeft ?? '',
        value: row.valueLeft ?? '',
        builtIn: isBuiltInLabel(row.labelLeft ?? ''),
      });
    }
    if (row.labelRight || row.valueRight) {
      fields.push({
        id: `r${rowIndex}_R`,
        label: row.labelRight ?? '',
        value: row.valueRight ?? '',
        builtIn: isBuiltInLabel(row.labelRight ?? ''),
      });
    }
  });

  if (fields.length === 0) {
    const defaults: HeaderRow[] = [
      {labelLeft: 'CUSTOMER NAME:', valueLeft: '', labelRight: 'CUSTOMER CONTACT:', valueRight: ''},
      {labelLeft: 'CUSTOMER NUMBER:', valueLeft: '', labelRight: 'POC EMAIL:', valueRight: ''},
      {labelLeft: 'POC NAME:', valueLeft: '', labelRight: 'POC PHONE:', valueRight: ''},
    ];
    return headerRowsToFields(defaults);
  }

  return fields;
}

export function fieldsToHeaderRows(fields: CustomerField[]): HeaderRow[] {
  const rows: HeaderRow[] = [];
  for (let i = 0; i < fields.length; i += 2) {
    const left = fields[i];
    const right = fields[i + 1];
    rows.push({
      labelLeft: left?.label ?? '',
      valueLeft: left?.value ?? '',
      labelRight: right?.label ?? '',
      valueRight: right?.value ?? '',
    });
  }
  return rows;
}

export function makeCustomField(seq: number): CustomerField {
  return {
    id: `custom_${seq}`,
    label: 'CUSTOM FIELD:',
    value: '',
    builtIn: false,
  };
}
