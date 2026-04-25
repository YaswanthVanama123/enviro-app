/**
 * @format
 */

import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';

// Log unhandled promise rejections so they appear in Metro output instead of
// silently crashing the JS thread on iOS new architecture.
const originalHandler = global.ErrorUtils?.getGlobalHandler?.();
global.ErrorUtils?.setGlobalHandler?.((error, isFatal) => {
  console.error('[GlobalErrorHandler]', isFatal ? 'FATAL' : 'non-fatal', error?.message, error?.stack);
  if (originalHandler) {
    originalHandler(error, isFatal);
  }
});

AppRegistry.registerComponent(appName, () => App);
