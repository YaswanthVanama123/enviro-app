import React from 'react';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import AppNavigator from '../navigation/AppNavigator';
import {AdminAuthProvider} from '../../features/admin/context/AdminAuthContext';

export function AppProviders() {
  return (
    <SafeAreaProvider>
      <AdminAuthProvider>
        <AppNavigator />
      </AdminAuthProvider>
    </SafeAreaProvider>
  );
}
