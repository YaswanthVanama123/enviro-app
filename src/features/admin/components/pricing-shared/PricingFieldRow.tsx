import React from 'react';
import {View, Text, TouchableOpacity, StyleSheet} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {ConfigField} from '../../utils/pricing.utils';
import {Colors} from '../../../../theme/colors';
import {Spacing} from '../../../../theme/spacing';
import {FontSize} from '../../../../theme/typography';

interface PricingFieldRowProps {
  field: ConfigField;
  onEdit?: (field: ConfigField) => void;
  showDescription?: boolean;
}

export function PricingFieldRow({field, onEdit, showDescription = true}: PricingFieldRowProps) {
  const canEdit = field.editable && !!onEdit;

  return (
    <TouchableOpacity
      style={styles.row}
      activeOpacity={canEdit ? 0.6 : 1}
      disabled={!canEdit}
      onPress={() => canEdit && onEdit!(field)}>
      <View style={styles.left}>
        <Text style={styles.label}>{field.label}</Text>
        {field.group ? <Text style={styles.group}>{field.group}</Text> : null}
        {showDescription && field.description ? (
          <Text style={styles.desc}>{field.description}</Text>
        ) : null}
      </View>
      <View style={styles.right}>
        <Text style={styles.value}>{field.value}</Text>
        {canEdit && <Ionicons name="pencil" size={12} color={Colors.primary} />}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: 13,
    backgroundColor: Colors.surface,
    gap: Spacing.md,
  },
  left: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  right: {
    flexShrink: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    maxWidth: 150,
  },
  label: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  group: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  desc: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    lineHeight: 16,
  },
  value: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: '#16a34a',
    textAlign: 'right',
  },
});
