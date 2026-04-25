// iOS — full web-app desktop UI on Mac Catalyst (width >= 768), step wizard on iPhone
import React from 'react';
import {useWindowDimensions} from 'react-native';
import {CreateAgreementDesktop} from './CreateAgreementDesktop';

// Use explicit .tsx extension so Metro resolves to the base wizard file directly,
// bypassing iOS platform resolution (which would otherwise create a circular import
// back to this file itself when resolving './CreateAgreementScreen').
// eslint-disable-next-line @typescript-eslint/no-require-imports
const {CreateAgreementScreen: WizardScreen} = require('./CreateAgreementScreen.tsx') as {
  CreateAgreementScreen: React.ComponentType;
};

export function CreateAgreementScreen() {
  const {width} = useWindowDimensions();
  return width >= 768 ? <CreateAgreementDesktop /> : <WizardScreen />;
}
