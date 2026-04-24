import React from 'react';
import {NavigationContainer, DefaultTheme} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {TabNavigator} from './TabNavigator';
import {AdminLoginScreen} from '../../features/auth/screens/AdminLoginScreen';
import {AdminPanelScreen} from '../../features/admin/screens/AdminPanelScreen';
import {ServiceAgreementScreen} from '../../features/admin/screens/ServiceAgreementScreen';
import {TrashScreen} from '../../features/agreements/screens/TrashScreen';
import type {RootStackParamList} from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

// Match web app colors exactly
const WebTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background:  '#f9fafb',
    card:        '#ffffff',
    border:      '#e6e6e6',
    primary:     '#c00000',
    text:        '#1f2937',
    notification: '#c00000',
  },
};

export default function AppNavigator() {
  return (
    <NavigationContainer theme={WebTheme}>
      <Stack.Navigator screenOptions={{headerShown: false}}>
        <Stack.Screen name="Main"       component={TabNavigator} />
        <Stack.Screen name="AdminLogin" component={AdminLoginScreen} />
        <Stack.Screen name="AdminPanel" component={AdminPanelScreen} />
        <Stack.Screen name="Agreement"  component={ServiceAgreementScreen} />
        <Stack.Screen name="Trash"      component={TrashScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
