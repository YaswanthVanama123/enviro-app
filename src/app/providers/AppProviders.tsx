import React from 'react';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import AppNavigator from '../navigation/AppNavigator';
import {AdminAuthProvider} from '../../features/admin/context/AdminAuthContext';
import {QuotaProvider} from '../../features/agreements/context/QuotaContext';
import {LanguageProvider} from '../../i18n';

export function AppProviders() {
  return (
    <SafeAreaProvider>
      <LanguageProvider>
        <AdminAuthProvider>
          <QuotaProvider>
            <AppNavigator />
          </QuotaProvider>
        </AdminAuthProvider>
      </LanguageProvider>
    </SafeAreaProvider>
  );
}
