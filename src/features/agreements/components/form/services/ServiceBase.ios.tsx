// iOS — adaptive ServiceBase components
// Mac Catalyst / iPad (width >= 768): large desktop cards from ServiceBase.windows
// iPhone (width < 768): compact mobile cards from ServiceBaseBase
import React from 'react';
import {useWindowDimensions} from 'react-native';
import * as D from './ServiceBase.windows';
import * as M from './ServiceBaseBase';

const DW = 768;

// Re-export shared utilities (same logic in both)
export {calcTotals, getFreqMultiplier, FREQ_OPTIONS, FREQ_LABELS,
        DropdownRow, DollarRow, FormDivider, NumberRow, ToggleRow, CalcRow} from './ServiceBase.windows';

export function ServiceCard(props: React.ComponentProps<typeof D.ServiceCard>) {
  const {width} = useWindowDimensions();
  return width >= DW ? <D.ServiceCard {...props} /> : <M.ServiceCard {...props} />;
}

export function TotalsBlock(props: React.ComponentProps<typeof D.TotalsBlock>) {
  const {width} = useWindowDimensions();
  return width >= DW ? <D.TotalsBlock {...props} /> : <M.TotalsBlock {...props} />;
}
