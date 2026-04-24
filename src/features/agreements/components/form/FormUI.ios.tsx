// iOS — adaptive FormUI components
// Mac Catalyst / iPad (width >= 768): large desktop styles from FormUI.windows
// iPhone (width < 768): compact mobile styles from FormUI.base
import React from 'react';
import {useWindowDimensions} from 'react-native';
import * as D from './FormUI.windows';
import * as M from './FormUI.base';

const DW = 768;

export function FormSection(props: React.ComponentProps<typeof D.FormSection>) {
  const {width} = useWindowDimensions();
  return width >= DW ? <D.FormSection {...props} /> : <M.FormSection {...props} />;
}

export function FieldRow(props: React.ComponentProps<typeof D.FieldRow>) {
  const {width} = useWindowDimensions();
  return width >= DW ? <D.FieldRow {...props} /> : <M.FieldRow {...props} />;
}

export function NumberRow(props: React.ComponentProps<typeof D.NumberRow>) {
  const {width} = useWindowDimensions();
  return width >= DW ? <D.NumberRow {...props} /> : <M.NumberRow {...props} />;
}

export function SelectRow(props: React.ComponentProps<typeof D.SelectRow>) {
  const {width} = useWindowDimensions();
  return width >= DW ? <D.SelectRow {...props} /> : <M.SelectRow {...props} />;
}

export function DropdownRow(props: React.ComponentProps<typeof D.DropdownRow>) {
  const {width} = useWindowDimensions();
  return width >= DW ? <D.DropdownRow {...props} /> : <M.DropdownRow {...props} />;
}

export function ToggleRow(props: React.ComponentProps<typeof D.ToggleRow>) {
  const {width} = useWindowDimensions();
  return width >= DW ? <D.ToggleRow {...props} /> : <M.ToggleRow {...props} />;
}

export function CalcRow(props: React.ComponentProps<typeof D.CalcRow>) {
  const {width} = useWindowDimensions();
  return width >= DW ? <D.CalcRow {...props} /> : <M.CalcRow {...props} />;
}

export function DollarRow(props: React.ComponentProps<typeof D.DollarRow>) {
  const {width} = useWindowDimensions();
  return width >= DW ? <D.DollarRow {...props} /> : <M.DollarRow {...props} />;
}

export function FormDivider() {
  const {width} = useWindowDimensions();
  return width >= DW ? <D.FormDivider /> : <M.FormDivider />;
}

export function StepIndicator(props: React.ComponentProps<typeof D.StepIndicator>) {
  const {width} = useWindowDimensions();
  return width >= DW ? <D.StepIndicator {...props} /> : <M.StepIndicator {...props} />;
}
