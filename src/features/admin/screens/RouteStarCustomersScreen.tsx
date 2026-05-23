/**
 * RouteStar Customers Screen
 * Wrapper screen for RouteStarCustomersSection component
 */

import React from 'react';
import {View, StyleSheet} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {RouteStarCustomersSection} from '../components/routestar/RouteStarCustomersSection';
import {Colors} from '../../../theme';

export function RouteStarCustomersScreen() {
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <RouteStarCustomersSection />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
});

export default RouteStarCustomersScreen;
