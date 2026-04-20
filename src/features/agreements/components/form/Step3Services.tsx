import React, {useState, useMemo} from 'react';
import {View, Text, TouchableOpacity, ScrollView, StyleSheet, Modal} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {Colors} from '../../../../theme/colors';
import {Spacing, Radius} from '../../../../theme/spacing';
import {FontSize} from '../../../../theme/typography';

import {SanicleanForm}          from './services/SanicleanForm';
import {SaniscrubForm}          from './services/SaniscrubForm';
import {FoamingDrainForm}        from './services/FoamingDrainForm';
import {GreaseTrapForm}          from './services/GreaseTrapForm';
import {MicrofiberMoppingForm}   from './services/MicrofiberMoppingForm';
import {RpmWindowsForm}          from './services/RpmWindowsForm';
import {SanipodForm}             from './services/SanipodForm';
import {CarpetForm}              from './services/CarpetForm';
import {JanitorialForm}          from './services/JanitorialForm';
import {StripWaxForm}            from './services/StripWaxForm';
import {ElectrostaticSprayForm}  from './services/ElectrostaticSprayForm';
import {RefreshPowerScrubForm}   from './services/RefreshPowerScrubForm';

interface ServiceMeta {
  id: string;
  label: string;
  icon: string;
  iconColor: string;
  iconBg: string;
  category: string;
}

const SERVICE_CATALOG: ServiceMeta[] = [
  {id: 'saniclean',          label: 'Saniclean',            icon: 'shield-checkmark-outline', iconColor: '#7c3aed', iconBg: '#ede9fe', category: 'Sanitation'},
  {id: 'saniscrub',          label: 'SaniScrub',            icon: 'water-outline',            iconColor: '#0ea5e9', iconBg: '#e0f2fe', category: 'Sanitation'},
  {id: 'sanipod',            label: 'SaniPod',              icon: 'cube-outline',             iconColor: '#7c3aed', iconBg: '#ede9fe', category: 'Sanitation'},
  {id: 'foamingDrain',       label: 'Foaming Drain',        icon: 'flask-outline',            iconColor: '#10b981', iconBg: '#d1fae5', category: 'Drain'},
  {id: 'greaseTrap',         label: 'Grease Trap',          icon: 'trash-bin-outline',        iconColor: '#d97706', iconBg: '#fef3c7', category: 'Drain'},
  {id: 'microfiberMopping',  label: 'Microfiber Mopping',   icon: 'brush-outline',            iconColor: '#2563eb', iconBg: '#dbeafe', category: 'Cleaning'},
  {id: 'rpmWindows',         label: 'RPM Windows',          icon: 'albums-outline',           iconColor: '#0369a1', iconBg: '#e0f2fe', category: 'Cleaning'},
  {id: 'carpetclean',        label: 'Carpet Cleaning',      icon: 'grid-outline',             iconColor: '#92400e', iconBg: '#fef3c7', category: 'Cleaning'},
  {id: 'pureJanitorial',     label: 'Janitorial',           icon: 'briefcase-outline',        iconColor: '#059669', iconBg: '#d1fae5', category: 'Cleaning'},
  {id: 'stripwax',           label: 'Strip & Wax',          icon: 'sparkles-outline',         iconColor: '#ea580c', iconBg: '#ffedd5', category: 'Floor'},
  {id: 'electrostaticSpray', label: 'Electrostatic Spray',  icon: 'flash-outline',            iconColor: '#dc2626', iconBg: '#fee2e2', category: 'Specialty'},
  {id: 'refreshPowerScrub',  label: 'Refresh Power Scrub',  icon: 'water-outline',            iconColor: '#0891b2', iconBg: '#cffafe', category: 'Specialty'},
];

interface Step3ServicesProps {
  visibleServices: string[];
  services: Record<string, any>;
  contractMonths: number;
  pricingConfigs: Record<string, any>;
  serviceConfigsList?: any[];
  onAddService: (id: string) => void;
  onRemoveService: (id: string) => void;
  onUpdateService: (id: string, data: any) => void;
}

function ServicePickerModal({
  visible,
  current,
  catalog,
  onAdd,
  onClose,
}: {visible: boolean; current: string[]; catalog: ServiceMeta[]; onAdd: (id: string) => void; onClose: () => void}) {
  const categories = [...new Set(catalog.map(s => s.category))];
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={pm.overlay}>
        <View style={pm.sheet}>
          <View style={pm.header}>
            <Text style={pm.headerTitle}>Add Service</Text>
            <TouchableOpacity onPress={onClose} style={pm.closeBtn}>
              <Ionicons name="close" size={22} color={Colors.textPrimary} />
            </TouchableOpacity>
          </View>
          <ScrollView style={pm.scroll} showsVerticalScrollIndicator={false}>
            {categories.map(cat => {
              const items = catalog.filter(s => s.category === cat);
              return (
                <View key={cat} style={pm.categoryBlock}>
                  <Text style={pm.categoryLabel}>{cat}</Text>
                  {items.map(svc => {
                    const added = current.includes(svc.id);
                    return (
                      <TouchableOpacity
                        key={svc.id}
                        style={[pm.svcRow, added && pm.svcRowAdded]}
                        disabled={added}
                        onPress={() => {onAdd(svc.id); onClose();}}>
                        <View style={[pm.iconBox, {backgroundColor: svc.iconBg}]}>
                          <Ionicons name={svc.icon} size={16} color={svc.iconColor} />
                        </View>
                        <Text style={[pm.svcLabel, added && pm.svcLabelAdded]}>{svc.label}</Text>
                        {added
                          ? <Ionicons name="checkmark-circle" size={18} color={Colors.green} />
                          : <Ionicons name="add-circle-outline" size={18} color={Colors.primary} />}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              );
            })}
            <View style={{height: Spacing.xxl}} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function renderServiceForm(
  serviceId: string,
  data: any,
  contractMonths: number,
  pricingConfig: any,
  onChange: (d: any) => void,
  onRemove: () => void,
) {
  const props = {data, onChange, contractMonths, onRemove, pricingConfig};
  switch (serviceId) {
    case 'saniclean':          return <SanicleanForm         key={serviceId} {...props} />;
    case 'saniscrub':          return <SaniscrubForm         key={serviceId} {...props} />;
    case 'sanipod':            return <SanipodForm           key={serviceId} {...props} />;
    case 'foamingDrain':       return <FoamingDrainForm       key={serviceId} {...props} />;
    case 'greaseTrap':         return <GreaseTrapForm         key={serviceId} {...props} />;
    case 'microfiberMopping':  return <MicrofiberMoppingForm  key={serviceId} {...props} />;
    case 'rpmWindows':         return <RpmWindowsForm         key={serviceId} {...props} />;
    case 'carpetclean':        return <CarpetForm             key={serviceId} {...props} />;
    case 'pureJanitorial':     return <JanitorialForm         key={serviceId} {...props} />;
    case 'stripwax':           return <StripWaxForm           key={serviceId} {...props} />;
    case 'electrostaticSpray': return <ElectrostaticSprayForm key={serviceId} {...props} />;
    case 'refreshPowerScrub':  return <RefreshPowerScrubForm  key={serviceId} {...props} />;
    default:                   return null;
  }
}

export function Step3Services({
  visibleServices,
  services,
  contractMonths,
  pricingConfigs,
  serviceConfigsList,
  onAddService,
  onRemoveService,
  onUpdateService,
}: Step3ServicesProps) {
  const [showPicker, setShowPicker] = useState(false);

  const activeCatalog = useMemo(() => {
    if (!serviceConfigsList || serviceConfigsList.length === 0) {
      return SERVICE_CATALOG;
    }
    return SERVICE_CATALOG.filter(svc => {
      const sc = serviceConfigsList.find((c: any) => c.serviceId === svc.id);
      if (!sc) {return true;}
      return sc.adminByDisplay !== false && sc.isActive !== false;
    });
  }, [serviceConfigsList]);

  return (
    <View>
      {visibleServices.length === 0 && (
        <View style={styles.emptyState}>
          <Ionicons name="construct-outline" size={40} color={Colors.textMuted} />
          <Text style={styles.emptyTitle}>No Services Added</Text>
          <Text style={styles.emptySubtitle}>Tap "Add Service" to include services in this agreement</Text>
        </View>
      )}

      {visibleServices.map(serviceId =>
        renderServiceForm(
          serviceId,
          services[serviceId],
          contractMonths,
          pricingConfigs[serviceId] ?? null,
          (d: any) => onUpdateService(serviceId, d),
          () => onRemoveService(serviceId),
        ),
      )}

      <TouchableOpacity style={styles.addBtn} onPress={() => setShowPicker(true)}>
        <Ionicons name="add-circle" size={20} color={Colors.primary} />
        <Text style={styles.addBtnText}>Add Service</Text>
      </TouchableOpacity>

      <ServicePickerModal
        visible={showPicker}
        current={visibleServices}
        catalog={activeCatalog}
        onAdd={onAddService}
        onClose={() => setShowPicker(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  emptyState: {
    alignItems: 'center',
    paddingVertical: Spacing.xxl,
    paddingHorizontal: Spacing.xl,
    gap: Spacing.sm,
  },
  emptyTitle: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  emptySubtitle: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    marginHorizontal: Spacing.lg,
    marginVertical: Spacing.md,
    paddingVertical: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: 2,
    borderColor: Colors.primary,
    borderStyle: 'dashed',
    backgroundColor: Colors.primaryLight,
  },
  addBtnText: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Colors.primary,
  },
});

const pm = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    height: '75%',
    maxHeight: '85%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTitle: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  closeBtn: {
    padding: Spacing.xs,
  },
  scroll: {
    flex: 1,
    flexShrink: 1,
  },
  categoryBlock: {
    paddingTop: Spacing.md,
  },
  categoryLabel: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xs,
  },
  svcRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  svcRowAdded: {
    opacity: 0.5,
  },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  svcLabel: {
    flex: 1,
    fontSize: FontSize.md,
    fontWeight: '500',
    color: Colors.textPrimary,
  },
  svcLabelAdded: {
    color: Colors.textMuted,
  },
});
