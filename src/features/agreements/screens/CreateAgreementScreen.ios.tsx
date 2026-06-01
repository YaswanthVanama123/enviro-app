
import React from 'react';
import {useWindowDimensions} from 'react-native';
import {CreateAgreementDesktop} from './CreateAgreementDesktop';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const {CreateAgreementScreen: WizardScreen} = require('./CreateAgreementScreen.tsx') as {
  CreateAgreementScreen: React.ComponentType;
};

export function CreateAgreementScreen() {
  const {width} = useWindowDimensions();
  return width >= 768 ? <CreateAgreementDesktop /> : <WizardScreen />;
}
