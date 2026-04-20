import React, {useState} from 'react';
import {View, Text, TouchableOpacity, StyleSheet, Platform} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {Product, ProductFamily} from '../../../../services/api/endpoints/pricing.api';
import {fmt, FAMILY_COLORS, FAMILY_ICONS} from '../../utils/pricing.utils';
import {ProductDetailsModal} from './ProductDetailsModal';
import {Colors} from '../../../../theme/colors';
import {Spacing, Radius} from '../../../../theme/spacing';
import {FontSize} from '../../../../theme/typography';

interface FamilyCardProps {
  family: ProductFamily;
  onAddProduct: (familyKey: string) => void;
}

export function FamilyCard({family, onAddProduct}: FamilyCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [detailProduct, setDetailProduct] = useState<Product | null>(null);
  const color = FAMILY_COLORS[family.key] ?? Colors.primary;
  const icon = FAMILY_ICONS[family.key] ?? 'cube-outline';
  const preview = family.products.slice(0, 3);

  return (
    <TouchableOpacity
      style={styles.familyCard}
      activeOpacity={0.8}
      onPress={() => setExpanded(e => !e)}>
      <View style={styles.familyCardHeader}>
        <View style={[styles.familyCardIcon, {backgroundColor: color + '18'}]}>
          <Ionicons name={icon} size={20} color={color} />
        </View>
        <View style={styles.familyCardMeta}>
          <Text style={styles.familyCardTitle}>{family.label}</Text>
          <Text style={styles.familyCardCount}>
            {family.products.length} product{family.products.length !== 1 ? 's' : ''}
          </Text>
        </View>
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={18}
          color={Colors.textMuted}
        />
      </View>

      {!expanded && (
        <View style={styles.familyCardChips}>
          {preview.map(p => (
            <View key={p.key} style={[styles.previewChip, {borderColor: color + '40', backgroundColor: color + '0d'}]}>
              <Text style={[styles.previewChipText, {color}]} numberOfLines={1}>
                {p.name}
              </Text>
            </View>
          ))}
          {family.products.length > 3 && (
            <View style={[styles.previewChip, {borderColor: Colors.border, backgroundColor: '#f1f5f9'}]}>
              <Text style={[styles.previewChipText, {color: Colors.textMuted}]}>
                +{family.products.length - 3} more
              </Text>
            </View>
          )}
        </View>
      )}

      {expanded && (
        <View style={styles.familyCardExpanded}>
          {family.products.map((p, idx) => (
            <View key={p.key}>
              <View style={styles.catalogProductRow}>
                <View style={[styles.catalogProductDot, {backgroundColor: color}]} />
                <View style={styles.catalogProductInfo}>
                  <Text style={styles.catalogProductName}>{p.name}</Text>
                  <Text style={styles.catalogProductKey}>{p.key}</Text>
                </View>
                <View style={styles.catalogProductRight}>
                  <Text style={styles.catalogProductPrice}>
                    {fmt(p.basePrice?.amount)}
                    {p.basePrice?.uom ? (
                      <Text style={styles.priceUom}> /{p.basePrice.uom}</Text>
                    ) : null}
                  </Text>
                  <TouchableOpacity
                    style={styles.viewDetailsBtn}
                    onPress={() => setDetailProduct(p)}
                    activeOpacity={0.7}>
                    <Text style={styles.viewDetailsBtnText}>View Details</Text>
                  </TouchableOpacity>
                </View>
              </View>
              {idx < family.products.length - 1 && (
                <View style={[styles.separator, {marginLeft: 28}]} />
              )}
            </View>
          ))}
          <TouchableOpacity
            style={[styles.addProductBtn, {borderColor: color + '60', backgroundColor: color + '0d'}]}
            activeOpacity={0.7}
            onPress={() => onAddProduct(family.key)}>
            <Ionicons name="add-circle-outline" size={15} color={color} />
            <Text style={[styles.addProductBtnText, {color}]}>Add Product</Text>
          </TouchableOpacity>
        </View>
      )}

      {!expanded && (
        <TouchableOpacity
          style={[styles.addProductBtn, {borderColor: color + '60', backgroundColor: color + '0d'}]}
          activeOpacity={0.7}
          onPress={() => onAddProduct(family.key)}>
          <Ionicons name="add-circle-outline" size={15} color={color} />
          <Text style={[styles.addProductBtnText, {color}]}>Add Product</Text>
        </TouchableOpacity>
      )}
      <ProductDetailsModal
        visible={detailProduct !== null}
        product={detailProduct}
        familyLabel={family.label}
        familyColor={color}
        onClose={() => setDetailProduct(null)}
      />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  familyCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  familyCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    gap: Spacing.md,
  },
  familyCardIcon: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  familyCardMeta: {
    flex: 1,
    minWidth: 0,
  },
  familyCardTitle: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  familyCardCount: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    marginTop: 2,
  },
  familyCardChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
    gap: 6,
  },
  previewChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.full,
    borderWidth: 1,
    maxWidth: 120,
  },
  previewChipText: {
    fontSize: 11,
    fontWeight: '600',
  },
  familyCardExpanded: {
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  addProductBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.md,
    marginTop: Spacing.sm,
    paddingVertical: 8,
    borderRadius: Radius.md,
    borderWidth: 1,
  },
  addProductBtnText: {
    fontSize: FontSize.xs,
    fontWeight: '700',
  },
  catalogProductRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    gap: Spacing.sm,
  },
  catalogProductRight: {
    alignItems: 'flex-end',
    gap: 5,
    flexShrink: 0,
  },
  viewDetailsBtn: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: Radius.md,
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  viewDetailsBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2563eb',
  },
  catalogProductDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    flexShrink: 0,
  },
  catalogProductInfo: {
    flex: 1,
    minWidth: 0,
  },
  catalogProductName: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  catalogProductKey: {
    fontSize: 10,
    color: Colors.textMuted,
    marginTop: 1,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  catalogProductPrice: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: '#16a34a',
    flexShrink: 0,
  },
  priceUom: {
    fontSize: 10,
    fontWeight: '400',
    color: Colors.textMuted,
  },
  separator: {
    height: 1,
    backgroundColor: Colors.borderLight,
  },
});
