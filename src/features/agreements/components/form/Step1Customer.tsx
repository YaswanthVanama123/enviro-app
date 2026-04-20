import React from 'react';
import {View, Text, TextInput, StyleSheet} from 'react-native';
import {FormSection, FieldRow, FormDivider} from './FormUI';
import {HeaderRow} from '../../../../services/api/endpoints/form.api';
import {Colors} from '../../../../theme/colors';
import {Spacing, Radius} from '../../../../theme/spacing';
import {FontSize} from '../../../../theme/typography';

const CUSTOMER_FIELDS: Array<{label: string; rowIdx: number; side: 'Left' | 'Right'; placeholder: string}> = [
  {label: 'Customer Name',    rowIdx: 0, side: 'Left',  placeholder: 'Company / Customer Name'},
  {label: 'Customer Contact', rowIdx: 0, side: 'Right', placeholder: 'Contact Person'},
  {label: 'Customer Number',  rowIdx: 1, side: 'Left',  placeholder: 'Phone Number'},
  {label: 'POC Email',        rowIdx: 1, side: 'Right', placeholder: 'point@company.com'},
  {label: 'POC Name',         rowIdx: 2, side: 'Left',  placeholder: 'Point of Contact Name'},
  {label: 'POC Phone',        rowIdx: 2, side: 'Right', placeholder: 'POC Direct Phone'},
];

interface Step1CustomerProps {
  headerTitle: string;
  onHeaderTitleChange: (v: string) => void;
  headerRows: HeaderRow[];
  onRowChange: (idx: number, field: keyof HeaderRow, value: string) => void;
}

export function Step1Customer({
  headerTitle,
  onHeaderTitleChange,
  headerRows,
  onRowChange,
}: Step1CustomerProps) {
  return (
    <View>
      <FormSection icon="document-text-outline" title="Agreement Title">
        <View style={styles.titleRow}>
          <TextInput
            style={styles.titleInput}
            value={headerTitle}
            onChangeText={onHeaderTitleChange}
            placeholder="e.g. ABC Corporation – Jan 2025 Agreement"
            placeholderTextColor={Colors.textMuted}
            autoCapitalize="words"
            autoCorrect={false}
            returnKeyType="done"
          />
        </View>
      </FormSection>

      <FormDivider />

      <FormSection icon="person-outline" title="Customer Information">
        {CUSTOMER_FIELDS.map(f => {
          const row = headerRows[f.rowIdx] ?? {labelLeft: '', valueLeft: '', labelRight: '', valueRight: ''};
          const valueKey = `value${f.side}` as keyof HeaderRow;
          return (
            <View key={f.label} style={styles.fieldRow}>
              <Text style={styles.label}>{f.label}</Text>
              <TextInput
                style={styles.input}
                value={row[valueKey]}
                onChangeText={v => onRowChange(f.rowIdx, valueKey, v)}
                placeholder={f.placeholder}
                placeholderTextColor={Colors.textMuted}
                autoCapitalize={f.label.includes('Email') ? 'none' : 'words'}
                keyboardType={
                  f.label.includes('Email')
                    ? 'email-address'
                    : f.label.includes('Number') || f.label.includes('Phone')
                    ? 'phone-pad'
                    : 'default'
                }
                autoCorrect={false}
                returnKeyType="next"
              />
            </View>
          );
        })}
      </FormSection>
    </View>
  );
}

const styles = StyleSheet.create({
  titleRow: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  titleInput: {
    backgroundColor: Colors.surface,
    borderWidth: 2,
    borderColor: Colors.primary,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    fontSize: FontSize.md,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  fieldRow: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    gap: Spacing.xs,
  },
  label: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  input: {
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: FontSize.md,
    color: Colors.textPrimary,
  },
});
