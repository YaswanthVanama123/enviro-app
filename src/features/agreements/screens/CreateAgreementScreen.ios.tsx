// iOS — full web-app desktop UI on Mac Catalyst (width >= 768), step wizard on iPhone
import React from 'react';
import {useWindowDimensions} from 'react-native';
import {CreateAgreementDesktop} from './CreateAgreementDesktop';
import {CreateAgreementScreen as WizardScreen} from './CreateAgreementScreen';

export function CreateAgreementScreen() {
  const {width} = useWindowDimensions();
  return width >= 768 ? <CreateAgreementDesktop /> : <WizardScreen />;
}
