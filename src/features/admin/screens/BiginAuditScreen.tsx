/**
 * Bigin Audit Screen
 * Wrapper screen for BiginAuditSection component
 */

import React from 'react';
import {View, StyleSheet} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {BiginAuditSection} from '../components/bigin/BiginAuditSection';
import {Colors} from '../../../theme';

export function BiginAuditScreen() {
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <BiginAuditSection />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
});

export default BiginAuditScreen;
