/**
 * EnviroApp - React Native
 * Agreement Management System
 */

import React from 'react';
import {View, Text, StyleSheet, ScrollView, TouchableOpacity} from 'react-native';
import {AppProviders} from './src/app/providers/AppProviders';

interface ErrState {hasError: boolean; error: Error | null}

class ErrorBoundary extends React.Component<{children: React.ReactNode}, ErrState> {
  constructor(props: {children: React.ReactNode}) {
    super(props);
    this.state = {hasError: false, error: null};
  }

  static getDerivedStateFromError(error: Error) {
    return {hasError: true, error};
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary] caught:', error.message, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={eb.container}>
          <Text style={eb.title}>Crash Debug Info</Text>
          <Text style={eb.msg}>{this.state.error?.message}</Text>
          <ScrollView style={eb.scroll}>
            <Text style={eb.stack}>{this.state.error?.stack}</Text>
          </ScrollView>
          <TouchableOpacity
            style={eb.retry}
            onPress={() => this.setState({hasError: false, error: null})}>
            <Text style={eb.retryTxt}>Retry</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

const eb = StyleSheet.create({
  container: {flex: 1, padding: 20, backgroundColor: '#fff', justifyContent: 'center'},
  title: {fontSize: 18, fontWeight: 'bold', color: '#c00000', marginBottom: 8},
  msg: {fontSize: 14, fontWeight: '700', color: '#1f2937', marginBottom: 8},
  scroll: {maxHeight: 300, marginBottom: 16},
  stack: {fontSize: 11, color: '#6b7280', fontFamily: 'monospace'},
  retry: {padding: 12, backgroundColor: '#c00000', borderRadius: 8, alignItems: 'center'},
  retryTxt: {color: '#fff', fontWeight: '700'},
});

export default function App() {
  return (
    <ErrorBoundary>
      <AppProviders />
    </ErrorBoundary>
  );
}
