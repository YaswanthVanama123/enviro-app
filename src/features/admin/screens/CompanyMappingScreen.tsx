/**
 * Company Mapping Screen
 * Wrapper screen for CompanyMappingSection component
 */

import React from 'react';
import {View, StyleSheet} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {CompanyMappingSection} from '../components/company-mapping/CompanyMappingSection';
import {Colors} from '../../../theme';

export function CompanyMappingScreen() {
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <CompanyMappingSection />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
});

export default CompanyMappingScreen;
