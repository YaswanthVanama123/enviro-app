import React, {useState} from 'react';
import {View, Text, TouchableOpacity, StyleSheet} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {Colors} from '../../../../theme/colors';
import {Spacing, Radius} from '../../../../theme/spacing';
import {FontSize} from '../../../../theme/typography';

interface PickerFieldProps {
  placeholder: string;
  value: string;
  options: {label: string; value: string}[];
  onSelect: (v: string) => void;
}

export function PickerField({
  placeholder,
  value,
  options,
  onSelect,
}: PickerFieldProps) {
  const [open, setOpen] = useState(false);
  const selected = options.find(o => o.value === value);
  return (
    <View>
      <TouchableOpacity
        style={styles.pickerField}
        onPress={() => setOpen(o => !o)}
        activeOpacity={0.7}>
        <Text style={[styles.pickerText, !selected && styles.pickerPlaceholder]}>
          {selected ? selected.label : placeholder}
        </Text>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={16} color={Colors.textMuted} />
      </TouchableOpacity>
      {open && (
        <View style={styles.pickerDropdown}>
          {options.map(opt => (
            <TouchableOpacity
              key={opt.value}
              style={styles.pickerOption}
              onPress={() => {onSelect(opt.value); setOpen(false);}}>
              <Text style={[styles.pickerOptionText, opt.value === value && styles.pickerOptionActive]}>
                {opt.label}
              </Text>
              {opt.value === value && (
                <Ionicons name="checkmark" size={14} color={Colors.primary} />
              )}
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  pickerField: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 11,
  },
  pickerText: {
    fontSize: FontSize.sm,
    color: Colors.textPrimary,
    flex: 1,
  },
  pickerPlaceholder: {
    color: Colors.textMuted,
  },
  pickerDropdown: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    marginTop: 4,
    overflow: 'hidden',
  },
  pickerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  pickerOptionText: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  pickerOptionActive: {
    color: Colors.primary,
    fontWeight: '600',
  },
});
