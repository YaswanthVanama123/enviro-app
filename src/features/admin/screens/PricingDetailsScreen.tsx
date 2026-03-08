import React, {useState} from 'react';
import {View, StyleSheet} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {MainTab} from '../utils/pricing.utils';
import {PricingTabBar} from '../components/pricing-shared/PricingTabBar';
import {PricingTablesSection} from '../components/pricing-tables/PricingTablesSection';
import {ServiceConfigsSection} from '../components/service-configs/ServiceConfigsSection';
import {ProductCatalogSection} from '../components/product-catalog/ProductCatalogSection';
import {BackupManagementSection} from '../components/backup/BackupManagementSection';
import {Colors} from '../../../theme/colors';

export function PricingDetailsScreen() {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<MainTab>('pricing');
  return (
    <View style={[styles.screen, {paddingTop: insets.top}]}>
      <PricingTabBar active={activeTab} onSelect={setActiveTab} />
      <View style={styles.tabContent}>
        {activeTab === 'pricing'  && <PricingTablesSection />}
        {activeTab === 'services' && <ServiceConfigsSection />}
        {activeTab === 'catalog'  && <ProductCatalogSection />}
        {activeTab === 'backup'   && <BackupManagementSection />}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {flex: 1, backgroundColor: Colors.background},
  tabContent: {flex: 1},
});
