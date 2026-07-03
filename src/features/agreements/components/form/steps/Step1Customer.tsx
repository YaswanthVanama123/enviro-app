import React, {useMemo} from 'react';
import {View, Text, TextInput, TouchableOpacity, StyleSheet} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {FormSection, FormDivider} from '../ui/FormUI';
import {HeaderRow} from '../../../../../services/api/endpoints/form.api';
import {
  CustomerField,
  headerRowsToFields,
  fieldsToHeaderRows,
  makeCustomField,
} from '../../../utils/customerFields';
import {Colors} from '../../../../../theme/colors';
import {Spacing, Radius} from '../../../../../theme/spacing';
import {FontSize} from '../../../../../theme/typography';

interface Step1CustomerProps {
  headerTitle: string;
  onHeaderTitleChange: (v: string) => void;
  headerRows: HeaderRow[];
  onHeaderRowsChange: (rows: HeaderRow[]) => void;
}

export function Step1Customer({
  headerTitle,
  onHeaderTitleChange,
  headerRows,
  onHeaderRowsChange,
}: Step1CustomerProps) {
  const fields = useMemo(() => headerRowsToFields(headerRows), [headerRows]);

  const updateFields = (nextFields: CustomerField[]) => {
    onHeaderRowsChange(fieldsToHeaderRows(nextFields));
  };

  const changeValue = (id: string, next: string) => {
    updateFields(fields.map(f => (f.id === id ? {...f, value: next} : f)));
  };

  const changeLabel = (id: string, next: string) => {
    updateFields(fields.map(f => (f.id === id ? {...f, label: next} : f)));
  };

  const addField = () => {
    updateFields([...fields, makeCustomField(fields.length)]);
  };

  const removeField = (id: string) => {
    updateFields(fields.filter(f => f.id !== id));
  };

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
        {fields.map(f => {
          const isEmail = f.label.toUpperCase().includes('EMAIL');
          const isPhone = f.label.toUpperCase().includes('PHONE') || f.label.toUpperCase().includes('NUMBER');
          return (
            <View key={f.id} style={styles.fieldRow}>
              {f.builtIn ? (
                <Text style={styles.label}>{f.label.replace(/:$/, '')}</Text>
              ) : (
                <View style={styles.customLabelRow}>
                  <TextInput
                    style={styles.labelInput}
                    value={f.label}
                    onChangeText={v => changeLabel(f.id, v)}
                    placeholder="FIELD LABEL:"
                    placeholderTextColor={Colors.textMuted}
                    autoCapitalize="characters"
                    maxLength={26}
                  />
                  <TouchableOpacity style={styles.removeBtn} onPress={() => removeField(f.id)}>
                    <Ionicons name="remove-circle" size={20} color={Colors.primary} />
                  </TouchableOpacity>
                </View>
              )}
              <TextInput
                style={styles.input}
                value={f.value}
                onChangeText={v => changeValue(f.id, v)}
                placeholder={f.builtIn ? '' : 'Value'}
                placeholderTextColor={Colors.textMuted}
                autoCapitalize={isEmail ? 'none' : 'words'}
                keyboardType={isEmail ? 'email-address' : isPhone ? 'phone-pad' : 'default'}
                autoCorrect={false}
                returnKeyType="next"
              />
            </View>
          );
        })}

        <TouchableOpacity style={styles.addBtn} onPress={addField}>
          <Ionicons name="add-circle-outline" size={18} color={Colors.primary} />
          <Text style={styles.addBtnText}>Add Custom Field</Text>
        </TouchableOpacity>
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
  customLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  labelInput: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  removeBtn: {
    padding: Spacing.xs,
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
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.sm,
    paddingVertical: Spacing.sm,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    borderStyle: 'dashed',
    borderRadius: Radius.md,
  },
  addBtnText: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.primary,
  },
});
