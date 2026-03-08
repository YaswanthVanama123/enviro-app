import React from 'react';
import {View, StyleSheet, ViewStyle} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Colors} from '../../../theme';

interface ScreenWrapperProps {
  children: React.ReactNode;
  style?: ViewStyle;
  backgroundColor?: string;
  edges?: Array<'top' | 'bottom' | 'left' | 'right'>;
}

export function ScreenWrapper({
  children,
  style,
  backgroundColor = Colors.background,
  edges = ['top', 'bottom', 'left', 'right'],
}: ScreenWrapperProps) {
  return (
    <SafeAreaView
      style={[styles.safe, {backgroundColor}, style]}
      edges={edges}>
      <View style={[styles.inner, {backgroundColor}]}>
        {children}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  inner: {
    flex: 1,
  },
});
