import React, {useState} from 'react';
import {View, Text, TouchableOpacity, StyleSheet, Platform} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {Product} from '../../../../services/api/endpoints/pricing.api';
import {fmt} from '../../utils/pricing.utils';
import {Colors} from '../../../../theme/colors';
import {Spacing, Radius} from '../../../../theme/spacing';
import {FontSize} from '../../../../theme/typography';

interface ProductRowProps {
  product: Product;
  onEditBase?: (product: Product) => void;
}

export function ProductRow({product, onEditBase}: ProductRowProps) {
  const [expanded, setExpanded] = useState(false);
  const hasWarranty = (product.warrantyPricePerUnit?.amount ?? 0) > 0;
  const hasDesc = !!product.description;

  return (
    <View>
      <TouchableOpacity
        activeOpacity={hasDesc ? 0.7 : 1}
        onPress={() => hasDesc && setExpanded(e => !e)}
        style={styles.productRow}>
        <View style={styles.productRowTop}>
          <View style={styles.productInfo}>
            <Text style={styles.productName}>{product.name}</Text>
            <View style={styles.productKeyBadge}>
              <Text style={styles.productKeyText}>{product.key}</Text>
            </View>
          </View>
          <View style={styles.productPrices}>
            <View style={styles.priceChip}>
              <Text style={styles.priceChipLabel}>Base</Text>
              <Text style={styles.priceChipValue}>
                {fmt(product.basePrice?.amount)}
                {product.basePrice?.uom ? (
                  <Text style={styles.priceUom}> /{product.basePrice.uom}</Text>
                ) : null}
              </Text>
            </View>
            {hasWarranty && (
              <View style={styles.priceChip}>
                <Text style={styles.priceChipLabel}>Warranty</Text>
                <Text style={[styles.priceChipValue, {color: '#7c3aed'}]}>
                  {fmt(product.warrantyPricePerUnit?.amount)}
                  {product.warrantyPricePerUnit?.billingPeriod ? (
                    <Text style={styles.priceUom}> /{product.warrantyPricePerUnit.billingPeriod}</Text>
                  ) : null}
                </Text>
              </View>
            )}
            {hasDesc && (
              <Ionicons
                name={expanded ? 'chevron-up' : 'chevron-down'}
                size={14}
                color={Colors.textMuted}
                style={{marginTop: 2}}
              />
            )}
          </View>
        </View>
        {expanded && hasDesc && (
          <Text style={styles.productDesc}>{product.description}</Text>
        )}
      </TouchableOpacity>

      {onEditBase && (
        <TouchableOpacity
          style={styles.editBaseBtn}
          onPress={() => onEditBase(product)}
          activeOpacity={0.7}>
          <Ionicons name="pencil-outline" size={11} color="#1d4ed8" />
          <Text style={styles.editBaseBtnText}>Edit Base</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  productRow: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: 12,
    backgroundColor: Colors.surface,
  },
  productRowTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  productInfo: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  productName: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  productKeyBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#f1f5f9',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  productKeyText: {
    fontSize: 10,
    color: Colors.textMuted,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  productPrices: {
    alignItems: 'flex-end',
    gap: 4,
  },
  priceChip: {
    alignItems: 'flex-end',
  },
  priceChipLabel: {
    fontSize: 9,
    fontWeight: '600',
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  priceChipValue: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: '#16a34a',
  },
  priceUom: {
    fontSize: 10,
    fontWeight: '400',
    color: Colors.textMuted,
  },
  productDesc: {
    marginTop: 8,
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    lineHeight: 18,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    paddingTop: 6,
  },
  editBaseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-end',
    marginRight: Spacing.lg,
    marginBottom: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.full,
    backgroundColor: '#dbeafe',
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  editBaseBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1d4ed8',
  },
});
