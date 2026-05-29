import React from 'react';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import AppNavigator from '../navigation/AppNavigator';
import {AdminAuthProvider} from '../../features/admin/context/AdminAuthContext';
import {QuotaProvider} from '../../features/agreements/context/QuotaContext';

export function AppProviders() {
  return (
    <SafeAreaProvider>
      <AdminAuthProvider>
        <QuotaProvider>
          <AppNavigator />
        </QuotaProvider>
      </AdminAuthProvider>
    </SafeAreaProvider>
  );
}
