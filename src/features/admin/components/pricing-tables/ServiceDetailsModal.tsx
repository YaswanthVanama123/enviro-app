import React, {useState, useEffect} from 'react';
import {View, Text, ScrollView, TouchableOpacity, FlatList, Modal, StyleSheet} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {ServiceConfig} from '../../../../services/api/endpoints/pricing.api';
import {
  ServiceSubTab,
  SERVICE_SUBTABS,
  extractConfigFields,
} from '../../utils/pricing.utils';
import {Colors} from '../../../../theme/colors';
import {Spacing, Radius} from '../../../../theme/spacing';
import {FontSize} from '../../../../theme/typography';

interface ServiceDetailsModalProps {
  visible: boolean;
  config: ServiceConfig | null;
  onClose: () => void;
}

export function ServiceDetailsModal({visible, config, onClose}: ServiceDetailsModalProps) {
  const insets = useSafeAreaInsets();
  const [activeSubTab, setActiveSubTab] = useState<ServiceSubTab>('unit');

  useEffect(() => {
    if (visible) {setActiveSubTab('unit');}
  }, [visible, config]);

  if (!config) {return null;}

  const allFields = extractConfigFields(config.config);
  const visibleFields = allFields.filter(f => f.category === activeSubTab);

  const counts = SERVICE_SUBTABS.reduce<Record<string, number>>((acc, t) => {
    acc[t.key] = allFields.filter(f => f.category === t.key).length;
    return acc;
  }, {});

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}>
      <View style={[detailStyles.screen, {paddingTop: insets.top}]}>

        {/* Purple header */}
        <View style={detailStyles.header}>
          <View style={detailStyles.headerContent}>
            <View style={detailStyles.headerIcon}>
              <Ionicons name="settings-outline" size={22} color="#fff" />
            </View>
            <View style={detailStyles.headerText}>
              <Text style={detailStyles.headerTitle} numberOfLines={1}>
                {config.label || config.serviceId}
              </Text>
              <Text style={detailStyles.headerSub}>Pricing Details</Text>
            </View>
          </View>
          <TouchableOpacity style={detailStyles.closeBtn} onPress={onClose} hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
            <Ionicons name="close" size={18} color="rgba(255,255,255,0.9)" />
            <Text style={detailStyles.closeBtnText}>Close</Text>
          </TouchableOpacity>
        </View>

        {/* Sub-tab bar */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={detailStyles.subTabBar}
          contentContainerStyle={detailStyles.subTabBarContent}>
          {SERVICE_SUBTABS.map(tab => {
            const isActive = tab.key === activeSubTab;
            const count = counts[tab.key] ?? 0;
            return (
              <TouchableOpacity
                key={tab.key}
                style={[detailStyles.subTab, isActive && detailStyles.subTabActive]}
                onPress={() => setActiveSubTab(tab.key)}
                activeOpacity={0.7}>
                <Ionicons name={tab.icon} size={14} color={isActive ? Colors.primary : Colors.textMuted} />
                <Text style={[detailStyles.subTabText, isActive && detailStyles.subTabTextActive]}>
                  {tab.label}
                </Text>
                {count > 0 && (
                  <View style={[detailStyles.subTabBadge, isActive && detailStyles.subTabBadgeActive]}>
                    <Text style={[detailStyles.subTabBadgeText, isActive && detailStyles.subTabBadgeTextActive]}>
                      {count}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Field cards */}
        <FlatList
          key={activeSubTab}
          data={visibleFields}
          keyExtractor={f => f.key}
          renderItem={({item}) => (
            <View style={detailStyles.fieldCard}>
              <View style={detailStyles.fieldCardLeft}>
                <Text style={detailStyles.fieldCardLabel}>{item.label}</Text>
                {item.description ? (
                  <Text style={detailStyles.fieldCardDesc}>{item.description}</Text>
                ) : null}
              </View>
              <View style={detailStyles.fieldCardRight}>
                <Text style={detailStyles.fieldCardValue}>{item.value}</Text>
              </View>
            </View>
          )}
          ItemSeparatorComponent={() => <View style={detailStyles.separator} />}
          ListEmptyComponent={
            <View style={detailStyles.emptyFields}>
              <Ionicons name="document-outline" size={36} color={Colors.textMuted} />
              <Text style={detailStyles.emptyFieldsText}>No fields in this category</Text>
            </View>
          }
          contentContainerStyle={{paddingBottom: insets.bottom + 24}}
          showsVerticalScrollIndicator={false}
        />
      </View>
    </Modal>
  );
}

const detailStyles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    backgroundColor: '#5b21b6',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flex: 1,
    minWidth: 0,
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  headerText: {
    flex: 1,
    minWidth: 0,
  },
  headerTitle: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: '#fff',
  },
  headerSub: {
    fontSize: FontSize.xs,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 1,
  },
  closeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: Radius.md,
    backgroundColor: 'rgba(255,255,255,0.15)',
    marginLeft: Spacing.sm,
    flexShrink: 0,
  },
  closeBtnText: {
    fontSize: FontSize.xs,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
  },
  subTabBar: {
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    maxHeight: 46,
  },
  subTabBarContent: {
    paddingHorizontal: Spacing.md,
    gap: 4,
    alignItems: 'center',
    paddingVertical: 6,
  },
  subTab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  subTabActive: {
    backgroundColor: Colors.primaryLight,
    borderColor: Colors.primary + '40',
  },
  subTabText: {
    fontSize: FontSize.xs,
    fontWeight: '600',
    color: Colors.textMuted,
  },
  subTabTextActive: {
    color: Colors.primary,
  },
  subTabBadge: {
    backgroundColor: '#e5e7eb',
    borderRadius: Radius.full,
    paddingHorizontal: 5,
    paddingVertical: 1,
    minWidth: 18,
    alignItems: 'center',
  },
  subTabBadgeActive: {
    backgroundColor: Colors.primary + '20',
  },
  subTabBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.textMuted,
  },
  subTabBadgeTextActive: {
    color: Colors.primary,
  },
  fieldCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: 14,
    backgroundColor: Colors.surface,
    gap: Spacing.md,
  },
  fieldCardLeft: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  fieldCardRight: {
    flexShrink: 0,
    alignItems: 'flex-end',
  },
  fieldCardLabel: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  fieldCardDesc: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    lineHeight: 16,
  },
  fieldCardValue: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: '#16a34a',
    textAlign: 'right',
    maxWidth: 130,
  },
  separator: {
    height: 1,
    backgroundColor: Colors.borderLight,
  },
  emptyFields: {
    alignItems: 'center',
    paddingVertical: 56,
    gap: Spacing.sm,
  },
  emptyFieldsText: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    marginTop: 4,
  },
});
