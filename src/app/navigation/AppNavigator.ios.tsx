// iOS — uses WebTheme for consistent desktop branding on Mac Catalyst
import React from 'react';
import {NavigationContainer, DefaultTheme} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {TabNavigator} from './TabNavigator';
import {AdminLoginScreen} from '../../features/auth/screens/AdminLoginScreen';
import {AdminPanelScreen} from '../../features/admin/screens/AdminPanelScreen';
import {ServiceAgreementScreen} from '../../features/admin/screens/ServiceAgreementScreen';
import {TrashScreen} from '../../features/agreements/screens/TrashScreen';
import {EditAgreementScreen} from '../../features/agreements/screens/EditAgreementScreen';
import {MyCommissionsScreen} from '../../features/commissions/screens/MyCommissionsScreen';
import {AdminCommissionsScreen} from '../../features/admin/screens/AdminCommissionsScreen';
import {AdminCommissionRulesScreen} from '../../features/admin/screens/AdminCommissionRulesScreen';
import {MyQuotaScreen} from '../../features/quota/screens/MyQuotaScreen';
import {QuotaManagementScreen} from '../../features/admin/screens/QuotaManagementScreen';
import {RouteStarCustomersScreen} from '../../features/admin/screens/RouteStarCustomersScreen';
import {CompanyMappingScreen} from '../../features/admin/screens/CompanyMappingScreen';
import {BiginAuditScreen} from '../../features/admin/screens/BiginAuditScreen';
import {MapDistanceScreen} from '../../features/admin/screens/MapDistanceScreen';
import {EmployeeAgreementsScreen} from '../../features/admin/screens/EmployeeAgreementsScreen';
import {EditHistoryScreen} from '../../features/admin/screens/EditHistoryScreen';
import {PayrollSettingsScreen} from '../../features/admin/screens/PayrollSettingsScreen';
import type {RootStackParamList} from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

const WebTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background:   '#f9fafb',
    card:         '#ffffff',
    border:       '#e6e6e6',
    primary:      '#c00000',
    text:         '#1f2937',
    notification: '#c00000',
  },
};

export default function AppNavigator() {
  return (
    <NavigationContainer theme={WebTheme}>
      <Stack.Navigator screenOptions={{headerShown: false}}>
        <Stack.Screen name="Main" component={TabNavigator} />
        <Stack.Screen name="AdminLogin" component={AdminLoginScreen} />
        <Stack.Screen name="AdminPanel" component={AdminPanelScreen} />
        <Stack.Screen name="Agreement" component={ServiceAgreementScreen} />
        <Stack.Screen name="Trash" component={TrashScreen} />
        <Stack.Screen name="EditAgreement" component={EditAgreementScreen} />
        <Stack.Screen name="MyCommissions" component={MyCommissionsScreen} />
        <Stack.Screen name="AdminCommissions" component={AdminCommissionsScreen} />
        <Stack.Screen name="AdminCommissionRules" component={AdminCommissionRulesScreen} />
        <Stack.Screen name="MyQuota" component={MyQuotaScreen} />
        <Stack.Screen name="QuotaManagement" component={QuotaManagementScreen} />
        <Stack.Screen name="RouteStarCustomers" component={RouteStarCustomersScreen} />
        <Stack.Screen name="CompanyMapping" component={CompanyMappingScreen} />
        <Stack.Screen name="BiginAudit" component={BiginAuditScreen} />
        <Stack.Screen name="MapDistance" component={MapDistanceScreen} />
        <Stack.Screen name="EmployeeAgreements" component={EmployeeAgreementsScreen} />
        <Stack.Screen name="EditHistory" component={EditHistoryScreen} />
        <Stack.Screen name="PayrollSettings" component={PayrollSettingsScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
