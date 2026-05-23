/**
 * Quota Management Screen
 * Wrapper screen for QuotaSection component
 */

import React from 'react';
import {View, StyleSheet} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {QuotaSection} from '../components/quota/QuotaSection';
import {Colors} from '../../../theme';

export function QuotaManagementScreen() {
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <QuotaSection />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
});

export default QuotaManagementScreen;
