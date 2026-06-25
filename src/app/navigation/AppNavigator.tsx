import React from 'react';
import {View, ActivityIndicator, StyleSheet} from 'react-native';
import {NavigationContainer, DefaultTheme} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {TabNavigator} from './TabNavigator';
import {LandingScreen} from '../../features/auth/screens/LandingScreen';
import {LoginScreen} from '../../features/auth/screens/LoginScreen';
import {AdminLoginScreen} from '../../features/auth/screens/AdminLoginScreen';
import {AdminPanelScreen} from '../../features/admin/screens/AdminPanelScreen';
import {ServiceAgreementScreen} from '../../features/admin/screens/ServiceAgreementScreen';
import {TrashScreen} from '../../features/agreements/screens/TrashScreen';
import {EditAgreementScreen} from '../../features/agreements/screens/EditAgreementScreen';
import {MyCommissionsScreen} from '../../features/commissions/screens/MyCommissionsScreen';
import {AdminCommissionsScreen} from '../../features/admin/screens/AdminCommissionsScreen';
import {AdminCommissionRulesScreen} from '../../features/admin/screens/AdminCommissionRulesScreen';
import {MyQuotaScreen} from '../../features/quota/screens/MyQuotaScreen';
import {MyInsideSalesScreen} from '../../features/inside-sales/screens/MyInsideSalesScreen';
import {QuotaManagementScreen} from '../../features/admin/screens/QuotaManagementScreen';
import {RouteStarCustomersScreen} from '../../features/admin/screens/RouteStarCustomersScreen';
import {CompanyMappingScreen} from '../../features/admin/screens/CompanyMappingScreen';
import {BiginAuditScreen} from '../../features/admin/screens/BiginAuditScreen';
import {MapDistanceScreen} from '../../features/admin/screens/MapDistanceScreen';
import {EmployeeAgreementsScreen} from '../../features/admin/screens/EmployeeAgreementsScreen';
import {EditHistoryScreen} from '../../features/admin/screens/EditHistoryScreen';
import {PayrollSettingsScreen} from '../../features/admin/screens/PayrollSettingsScreen';
import {PayrollScreen} from '../../features/admin/screens/PayrollScreen';
import {PayrollPeriodDetailScreen} from '../../features/admin/screens/PayrollPeriodDetailScreen';
import {PayrollAgreementsScreen} from '../../features/admin/screens/PayrollAgreementsScreen';
import {useAuth} from '../../features/admin/context/AdminAuthContext';
import {Colors} from '../../theme';
import type {RootStackParamList} from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function AppNavigator() {
  const {isAuthenticated, authReady, isAdmin} = useAuth();

  if (!authReady) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer theme={DefaultTheme}>
      <Stack.Navigator screenOptions={{headerShown: false}}>
        {!isAuthenticated ? (
          <>
            <Stack.Screen name="Landing" component={LandingScreen} />
            <Stack.Screen name="Login" component={LoginScreen} />
          </>
        ) : (
          <>
            {/* Shared — available to every authenticated role */}
            <Stack.Screen name="Main" component={TabNavigator} />
            <Stack.Screen name="Agreement" component={ServiceAgreementScreen} />
            <Stack.Screen name="EditAgreement" component={EditAgreementScreen} />
            <Stack.Screen name="Trash" component={TrashScreen} />
            <Stack.Screen name="MyInsideSales" component={MyInsideSalesScreen} />

            {isAdmin ? (
              /* Admin-only — mirrors the web app's `requireAdmin` route group */
              <>
                <Stack.Screen name="AdminLogin" component={AdminLoginScreen} />
                <Stack.Screen name="AdminPanel" component={AdminPanelScreen} />
                <Stack.Screen name="AdminCommissions" component={AdminCommissionsScreen} />
                <Stack.Screen name="AdminCommissionRules" component={AdminCommissionRulesScreen} />
                <Stack.Screen name="QuotaManagement" component={QuotaManagementScreen} />
                <Stack.Screen name="RouteStarCustomers" component={RouteStarCustomersScreen} />
                <Stack.Screen name="CompanyMapping" component={CompanyMappingScreen} />
                <Stack.Screen name="BiginAudit" component={BiginAuditScreen} />
                <Stack.Screen name="MapDistance" component={MapDistanceScreen} />
                <Stack.Screen name="EmployeeAgreements" component={EmployeeAgreementsScreen} />
                <Stack.Screen name="EditHistory" component={EditHistoryScreen} />
                <Stack.Screen name="PayrollSettings" component={PayrollSettingsScreen} />
                <Stack.Screen name="Payroll" component={PayrollScreen} />
                <Stack.Screen name="PayrollPeriodDetail" component={PayrollPeriodDetailScreen} />
                <Stack.Screen name="PayrollAgreements" component={PayrollAgreementsScreen} />
              </>
            ) : (
              /* Employee-only — personal commission & quota views */
              <>
                <Stack.Screen name="MyCommissions" component={MyCommissionsScreen} />
                <Stack.Screen name="MyQuota" component={MyQuotaScreen} />
              </>
            )}
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
});
