import React from 'react';
import {View, ActivityIndicator, StyleSheet} from 'react-native';
import {NavigationContainer, DefaultTheme} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {TabNavigator} from './TabNavigator';
import {LoginScreen} from '../../features/auth/screens/LoginScreen';
import {AdminLoginScreen} from '../../features/auth/screens/AdminLoginScreen';
import {AdminPanelScreen} from '../../features/admin/screens/AdminPanelScreen';
import {ServiceAgreementScreen} from '../../features/admin/screens/ServiceAgreementScreen';
import {TrashScreen} from '../../features/agreements/screens/TrashScreen';
import {EditAgreementScreen} from '../../features/agreements/screens/EditAgreementScreen';
import {MyCommissionsScreen} from '../../features/commissions/screens/MyCommissionsScreen';
import {AdminCommissionsScreen} from '../../features/admin/screens/AdminCommissionsScreen';
import {useAuth} from '../../features/admin/context/AdminAuthContext';
import {Colors} from '../../theme';
import type {RootStackParamList} from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function AppNavigator() {
  const {isAuthenticated, authReady} = useAuth();

  // Show loading screen while checking auth
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
        {isAuthenticated ? (
          // Authenticated screens
          <>
            <Stack.Screen name="Main" component={TabNavigator} />
            <Stack.Screen name="AdminLogin" component={AdminLoginScreen} />
            <Stack.Screen name="AdminPanel" component={AdminPanelScreen} />
            <Stack.Screen name="Agreement" component={ServiceAgreementScreen} />
            <Stack.Screen name="Trash" component={TrashScreen} />
            <Stack.Screen name="EditAgreement" component={EditAgreementScreen} />
            <Stack.Screen name="MyCommissions" component={MyCommissionsScreen} />
            <Stack.Screen name="AdminCommissions" component={AdminCommissionsScreen} />
          </>
        ) : (
          // Unauthenticated - show login
          <Stack.Screen name="Login" component={LoginScreen} />
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
