import React, {useState, useCallback} from 'react';
import {View, Text, TouchableOpacity, StyleSheet, Alert} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {MainTab} from '../utils/pricing.utils';
import {PricingTabBar} from '../components/pricing-shared/PricingTabBar';
import {PricingTablesSection} from '../components/pricing-tables/PricingTablesSection';
import {ServiceConfigsSection} from '../components/service-configs/ServiceConfigsSection';
import {ServicesReferenceSection} from '../components/service-configs/ServicesReferenceSection';
import {ProductCatalogSection} from '../components/product-catalog/ProductCatalogSection';
import {BackupManagementSection} from '../components/backup/BackupManagementSection';
import {pdfApi} from '../../../services/api/endpoints/pdf.api';
import {Colors} from '../../../theme/colors';

export function PricingDetailsScreen() {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<MainTab>('pricing');
  const [exporting, setExporting] = useState(false);

  const handleExportPdf = useCallback(async () => {
    setExporting(true);
    try {
      await pdfApi.exportPricingCatalogPdf();
    } catch (err: any) {
      if (err?.code === 'PUPPETEER_BUSY') {
        Alert.alert(
          'Export In Progress',
          'A PDF export is already being generated. Please wait a moment and try again.',
          [{text: 'OK'}],
        );
      } else {
        Alert.alert(
          'Export Failed',
          'Could not generate the pricing catalog PDF. Please try again.',
          [{text: 'OK'}],
        );
      }
    } finally {
      setExporting(false);
    }
  }, []);

  return (
    <View style={[styles.screen, {paddingTop: insets.top}]}>
      <View style={styles.navRow}>
        <View style={styles.tabBarWrap}>
          <PricingTabBar active={activeTab} onSelect={setActiveTab} />
        </View>
        <TouchableOpacity
          style={[styles.exportBtn, exporting && {opacity: 0.6}]}
          onPress={handleExportPdf}
          disabled={exporting}
          activeOpacity={0.8}>
          <Ionicons name={exporting ? 'hourglass-outline' : 'download-outline'} size={13} color="#fff" />
          <Text style={styles.exportBtnText}>Export PDF</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.tabContent}>
        {activeTab === 'pricing'   && <PricingTablesSection />}
        {activeTab === 'services'  && <ServiceConfigsSection />}
        {activeTab === 'catalog'   && <ProductCatalogSection />}
        {activeTab === 'backup'    && <BackupManagementSection />}
        {activeTab === 'reference' && <ServicesReferenceSection />}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {flex: 1, backgroundColor: Colors.background},
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  tabBarWrap: {
    flex: 1,
    borderBottomWidth: 0,
  },
  exportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#4f46e5',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 6,
    marginRight: 10,
    flexShrink: 0,
  },
  exportBtnText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  tabContent: {flex: 1},
});

