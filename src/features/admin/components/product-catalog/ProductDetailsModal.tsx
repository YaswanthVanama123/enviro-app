import React from 'react';
import {View, Text, ScrollView, Modal, TouchableOpacity, StyleSheet, Platform} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {Product} from '../../../../services/api/endpoints/pricing.api';
import {fmt} from '../../utils/pricing.utils';
import {Colors} from '../../../../theme/colors';
import {Spacing, Radius} from '../../../../theme/spacing';
import {FontSize} from '../../../../theme/typography';

interface ProductDetailsModalProps {
  visible: boolean;
  product: Product | null;
  familyLabel: string;
  familyColor: string;
  onClose: () => void;
}

export function ProductDetailsModal({
  visible,
  product,
  familyLabel,
  familyColor,
  onClose,
}: ProductDetailsModalProps) {
  const insets = useSafeAreaInsets();
  if (!product) {return null;}

  const hasWarranty = (product.warrantyPricePerUnit?.amount ?? 0) > 0;

  const rows: {label: string; value: React.ReactNode}[] = [
    {
      label: 'Product Key',
      value: (
        <Text style={pdStyles.monoValue}>{product.key}</Text>
      ),
    },
    {
      label: 'Family',
      value: <Text style={pdStyles.value}>{familyLabel}</Text>,
    },
    {
      label: 'Base Price',
      value: (
        <Text style={[pdStyles.value, {color: '#16a34a', fontWeight: '700'}]}>
          {fmt(product.basePrice?.amount)}{product.basePrice?.uom ? ` / ${product.basePrice.uom}` : ''}
        </Text>
      ),
    },
    {
      label: 'Unit of Measure',
      value: <Text style={pdStyles.value}>{product.basePrice?.uom || '—'}</Text>,
    },
    {
      label: 'Warranty Price',
      value: (
        <Text style={[pdStyles.value, hasWarranty && {color: '#7c3aed', fontWeight: '700'}]}>
          {hasWarranty
            ? `${fmt(product.warrantyPricePerUnit?.amount)}${product.warrantyPricePerUnit?.billingPeriod ? ` / ${product.warrantyPricePerUnit.billingPeriod}` : ''}`
            : '—'}
        </Text>
      ),
    },
    {
      label: 'Display in Admin',
      value: (
        <View style={[pdStyles.displayBadge, product.displayByAdmin ? pdStyles.displayYes : pdStyles.displayNo]}>
          <Text style={[pdStyles.displayBadgeText, product.displayByAdmin ? pdStyles.displayYesText : pdStyles.displayNoText]}>
            {product.displayByAdmin ? 'Yes' : 'No'}
          </Text>
        </View>
      ),
    },
    ...(product.quantityPerCase
      ? [{
          label: 'Qty per Case',
          value: <Text style={pdStyles.value}>{product.quantityPerCase}{product.quantityPerCaseLabel ? ` ${product.quantityPerCaseLabel}` : ''}</Text>,
        }]
      : []),
  ];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}>
      <View style={[pdStyles.screen, {paddingTop: insets.top}]}>

        <View style={[pdStyles.header, {borderLeftColor: familyColor}]}>
          <View style={pdStyles.headerLeft}>
            <View style={[pdStyles.headerIcon, {backgroundColor: familyColor + '18'}]}>
              <Ionicons name="cube-outline" size={22} color={familyColor} />
            </View>
            <View style={{flex: 1, minWidth: 0}}>
              <Text style={pdStyles.headerTitle} numberOfLines={2}>{product.name}</Text>
              <Text style={pdStyles.headerSub}>{familyLabel}</Text>
            </View>
          </View>
          <TouchableOpacity style={pdStyles.closeBtn} onPress={onClose} hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
            <Ionicons name="close" size={20} color={Colors.textSecondary} />
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={[pdStyles.content, {paddingBottom: insets.bottom + 32}]}
          showsVerticalScrollIndicator={false}>

          <View style={pdStyles.section}>
            {rows.map((row, idx) => (
              <View key={row.label}>
                <View style={pdStyles.row}>
                  <Text style={pdStyles.rowLabel}>{row.label}</Text>
                  <View style={pdStyles.rowValue}>{row.value}</View>
                </View>
                {idx < rows.length - 1 && <View style={pdStyles.divider} />}
              </View>
            ))}
          </View>

          {product.description ? (
            <View style={pdStyles.section}>
              <Text style={pdStyles.descLabel}>Description</Text>
              <Text style={pdStyles.descText}>{product.description}</Text>
            </View>
          ) : null}

        </ScrollView>

        <View style={[pdStyles.footer, {paddingBottom: Math.max(insets.bottom, Spacing.lg)}]}>
          <TouchableOpacity style={pdStyles.closeFooterBtn} onPress={onClose}>
            <Text style={pdStyles.closeFooterBtnText}>Close</Text>
          </TouchableOpacity>
        </View>

      </View>
    </Modal>
  );
}

const pdStyles = StyleSheet.create({
  screen: {flex: 1, backgroundColor: Colors.background},
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    borderLeftWidth: 4,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flex: 1,
    minWidth: 0,
  },
  headerIcon: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  headerTitle: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  headerSub: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
    borderRadius: Radius.md,
    backgroundColor: '#f1f5f9',
    marginLeft: Spacing.sm,
  },
  content: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    gap: Spacing.md,
  },
  section: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: 13,
    gap: Spacing.md,
  },
  rowLabel: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    flex: 1,
  },
  rowValue: {
    alignItems: 'flex-end',
    flexShrink: 0,
    maxWidth: '55%',
  },
  divider: {
    height: 1,
    backgroundColor: Colors.borderLight,
    marginLeft: Spacing.md,
  },
  value: {
    fontSize: FontSize.sm,
    color: Colors.textPrimary,
    textAlign: 'right',
  },
  monoValue: {
    fontSize: FontSize.sm,
    color: Colors.textPrimary,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    textAlign: 'right',
  },
  displayBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: Radius.full,
  },
  displayYes: {backgroundColor: '#d1fae5'},
  displayNo:  {backgroundColor: '#fee2e2'},
  displayBadgeText: {fontSize: 12, fontWeight: '700'},
  displayYesText: {color: '#065f46'},
  displayNoText:  {color: '#991b1b'},
  descLabel: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    paddingBottom: 6,
  },
  descText: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    lineHeight: 22,
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
  },
  footer: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  closeFooterBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  closeFooterBtnText: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
});
