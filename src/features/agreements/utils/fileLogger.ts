// Price-change logger — ported 1:1 from the web app (src/utils/fileLogger.ts).
// Tracks field-level price changes in memory and posts a "version log" on save/
// generate, exactly like the web app. API calls go through the mobile formApi.

import {formApi} from '../../../services/api/endpoints/form.api';

export interface FieldChange {
  productKey: string;
  productName: string;
  productType: 'product' | 'dispenser' | 'service' | 'agreement_text';
  fieldType: string;
  fieldDisplayName: string;
  changeType?: 'numeric' | 'text';
  originalValue?: number;
  newValue?: number;
  changeAmount?: number;
  changePercentage?: number;
  originalText?: string;
  newText?: string;
  quantity?: number;
  frequency?: string;
  timestamp: string;
}

export interface LogData {
  agreementId: string;
  versionId: string;
  versionNumber: number;
  salespersonId: string;
  salespersonName: string;
  saveAction: 'save_draft' | 'generate_pdf' | 'manual_save';
  documentTitle: string;
  changes: FieldChange[];
}

class FileLogger {
  private changes: Map<string, FieldChange> = new Map();

  addChange(change: Omit<FieldChange, 'changeAmount' | 'changePercentage' | 'timestamp'>): void {
    const key = `${change.productKey}_${change.fieldType}`;
    const existingEntry = this.changes.get(key);

    if (change.changeType === 'text') {
      const resolvedOriginalText =
        existingEntry && existingEntry.originalText ? existingEntry.originalText : change.originalText || '';
      const fullChange: FieldChange = {
        ...change,
        originalText: resolvedOriginalText,
        changeAmount: 0,
        changePercentage: 0,
        timestamp: new Date().toISOString(),
      };
      this.changes.set(key, fullChange);
    } else {
      const resolvedOriginalValue =
        existingEntry && existingEntry.originalValue !== undefined
          ? existingEntry.originalValue
          : change.originalValue || 0;
      const newValue = change.newValue || 0;
      const changeAmount = newValue - resolvedOriginalValue;
      const changePercentage = resolvedOriginalValue !== 0 ? (changeAmount / resolvedOriginalValue) * 100 : 0;
      const fullChange: FieldChange = {
        ...change,
        changeType: 'numeric',
        originalValue: resolvedOriginalValue,
        newValue,
        changeAmount,
        changePercentage,
        timestamp: new Date().toISOString(),
      };
      this.changes.set(key, fullChange);
    }
    console.log(`[FILE-LOGGER] Total unique fields changed: ${this.changes.size}`);
  }

  removeChange(productKey: string, fieldType: string): void {
    this.changes.delete(`${productKey}_${fieldType}`);
  }

  getChanges(): FieldChange[] {
    return Array.from(this.changes.values());
  }

  hasChanges(): boolean {
    return this.changes.size > 0;
  }

  clearChanges(): void {
    this.changes = new Map();
  }

  getChangeCount(): number {
    return this.changes.size;
  }

  async createLogFile(
    logData: Omit<LogData, 'changes'>,
    options: {
      overwriteExisting?: boolean;
      overwriteReason?: 'draft_update' | 'version_update' | 'replace_version';
    } = {},
  ): Promise<any> {
    const currentChanges = this.getChanges();
    if (currentChanges.length === 0) {
      console.log('[FILE-LOGGER] No changes to log');
      return {success: true, message: 'No changes to log', log: null};
    }

    console.log(`[FILE-LOGGER] Creating log with ${currentChanges.length} field changes for version ${logData.versionNumber}`);

    let previousChanges: FieldChange[] = [];
    try {
      const previousLogs = await formApi.getVersionLogs(logData.agreementId);
      if (previousLogs?.success && Array.isArray(previousLogs.logs) && previousLogs.logs.length > 0) {
        previousLogs.logs.forEach((log: any) => {
          const isFromPreviousVersion = log.versionNumber < logData.versionNumber;
          const isFromSameVersionButEarlier = log.versionNumber === logData.versionNumber;
          if (isFromPreviousVersion || isFromSameVersionButEarlier) {
            const logChanges =
              log.currentChanges && log.currentChanges.length > 0 ? log.currentChanges : log.changes || [];
            if (logChanges.length > 0) {
              previousChanges.push(...logChanges);
            }
          }
        });
      }
    } catch (error) {
      console.warn('[FILE-LOGGER] Failed to fetch previous logs, continuing without history:', error);
    }

    const structuredLogData = {
      ...logData,
      currentChanges,
      allPreviousChanges: previousChanges,
      changes: currentChanges,
      overwriteExisting: options.overwriteExisting || false,
      overwriteReason: options.overwriteReason,
    };

    try {
      const result = await formApi.createVersionLog(structuredLogData);
      console.log('[FILE-LOGGER] Log created:', result?.log?.fileName ?? result?.log?.logId ?? 'ok');
      this.clearChanges();
      return result;
    } catch (error) {
      console.error('[FILE-LOGGER] Failed to create log:', error);
      throw error;
    }
  }
}

const fileLogger = new FileLogger();

export {fileLogger};

export const addPriceChange = (change: Omit<FieldChange, 'changeAmount' | 'changePercentage' | 'timestamp'>) => {
  fileLogger.addChange(change);
};

export const addTextChange = (change: Omit<FieldChange, 'changeAmount' | 'changePercentage' | 'timestamp'>) => {
  fileLogger.addChange({...change, changeType: 'text'});
};

export const clearPriceChanges = () => {
  fileLogger.clearChanges();
};

export const hasPriceChanges = (): boolean => fileLogger.hasChanges();

export const getPriceChangeCount = (): number => fileLogger.getChangeCount();

export const createVersionLogFile = async (
  logData: Omit<LogData, 'changes'>,
  options: {
    overwriteExisting?: boolean;
    overwriteReason?: 'draft_update' | 'version_update' | 'replace_version';
  } = {},
) => fileLogger.createLogFile(logData, options);

// Display name + rate fields tracked per service (matches the web app's hooks).
const SERVICE_NAMES: Record<string, string> = {
  sanipod: 'SaniPod',
  stripwax: 'Strip & Wax',
  carpetclean: 'Carpet Cleaning',
  electrostaticSpray: 'Electrostatic Spray',
  microfiberMopping: 'Microfiber Mopping',
  foamingDrain: 'Foaming Drain',
  rpmWindows: 'RPM Windows',
  saniscrub: 'SaniScrub',
  saniclean: 'SaniClean',
  greaseTrap: 'Grease Trap',
  refreshPowerScrub: 'Refresh Power Scrub',
};

const SERVICE_RATE_FIELDS: Record<string, string[]> = {
  sanipod: [
    'weeklyRatePerUnit', 'altWeeklyRatePerUnit', 'extraBagPrice', 'standaloneExtraWeeklyCharge',
    'installRatePerPod', 'customInstallationFee', 'customPerVisitPrice', 'customMonthlyPrice',
    'customAnnualPrice', 'customWeeklyPodRate', 'customPodServiceTotal', 'customExtraBagsTotal',
  ],
  stripwax: ['ratePerSqFt', 'minCharge', 'customPerVisit', 'customMonthly', 'customOngoingMonthly', 'customContractTotal'],
  carpetclean: ['firstUnitRate', 'additionalUnitRate', 'perVisitMinimum', 'customInstallationFee', 'customContractTotal'],
  electrostaticSpray: [
    'customRatePerRoom', 'customRatePerThousandSqFt', 'customTripChargePerVisit', 'customServiceCharge',
    'customPerVisitPrice', 'customMonthlyRecurring', 'customContractTotal', 'customFirstMonthTotal',
  ],
  microfiberMopping: [
    'customIncludedBathroomRate', 'customHugeBathroomRatePerSqFt', 'customExtraAreaRatePerUnit',
    'customStandaloneRatePerUnit',
  ],
  foamingDrain: [
    'standardDrainRate', 'altBaseCharge', 'altExtraPerDrain', 'volumeWeeklyRate', 'volumeBimonthlyRate',
    'greaseWeeklyRate', 'greaseInstallRate', 'greenWeeklyRate', 'greenInstallRate', 'plumbingAddonRate', 'filthyMultiplier',
  ],
  rpmWindows: [
    'baseSmall', 'baseMedium', 'baseLarge', 'baseTrip', 'installMultiplierFirstTime', 'installMultiplierClean',
    'customInstallationFee', 'customPerVisitPrice', 'customMonthlyRecurring', 'customContractTotal',
  ],
  saniscrub: ['rate', 'minimumChargePerVisit', 'nonBathFirstRate', 'nonBathAdditionalRate'],
  saniclean: [
    'allInclusiveWeeklyRatePerFixture', 'insideBeltwayRatePerFixture', 'outsideBeltwayRatePerFixture',
    'smallFacilityMinimum', 'luxuryUpgradePerDispenser', 'microfiberMoppingPerBathroom',
    'warrantyFeePerDispenserPerWeek', 'paperCreditPerFixture', 'urinalScreenMonthly', 'urinalMatMonthly',
    'toiletClipsMonthly', 'seatCoverDispenserMonthly', 'sanipodServiceMonthly',
  ],
};

// Diff the rate fields present in `fields` against their pre-edit resolved value
// and record each change (mirrors the web app hooks' addPriceChange behaviour).
export function trackServiceChanges(
  serviceId: string,
  fields: Record<string, any>,
  resolved: Record<string, any>,
  meta?: {quantity?: number; frequency?: string},
): void {
  const rateFields = SERVICE_RATE_FIELDS[serviceId];
  if (!rateFields) {
    return;
  }
  const serviceName = SERVICE_NAMES[serviceId] ?? serviceId;
  for (const f of rateFields) {
    if (!(f in fields)) {
      continue;
    }
    const newValue = Number(fields[f]);
    const original = Number(resolved?.[f]);
    if (!Number.isFinite(newValue)) {
      continue;
    }
    if (!Number.isFinite(original) || original === newValue) {
      continue;
    }
    addPriceChange({
      productKey: `${serviceId}_${f}`,
      productName: `${serviceName} - ${getFieldDisplayName(f)}`,
      productType: 'service',
      fieldType: f,
      fieldDisplayName: getFieldDisplayName(f),
      originalValue: original,
      newValue,
      quantity: meta?.quantity ?? 1,
      frequency: meta?.frequency ?? '',
    });
  }
}

// Track a single product/dispenser rate change (old value is the baseline).
export function trackProductChange(
  productType: 'product' | 'dispenser',
  productName: string,
  fieldType: string,
  originalValue: number,
  newValue: number,
  meta?: {quantity?: number; frequency?: string},
): void {
  if (!Number.isFinite(originalValue) || !Number.isFinite(newValue) || originalValue === newValue) {
    return;
  }
  addPriceChange({
    productKey: `${productType}_${productName}_${fieldType}`,
    productName,
    productType,
    fieldType,
    fieldDisplayName: getFieldDisplayName(fieldType),
    originalValue,
    newValue,
    quantity: meta?.quantity ?? 1,
    frequency: meta?.frequency ?? '',
  });
}

export const getProductTypeFromFamily = (familyKey: string,
): 'product' | 'dispenser' | 'service' | 'agreement_text' => {
  if (familyKey === 'dispensers') {
    return 'dispenser';
  }
  if (familyKey.includes('service') || familyKey.includes('Service')) {
    return 'service';
  }
  if (familyKey === 'agreement_text' || familyKey.includes('agreement') || familyKey.includes('terms')) {
    return 'agreement_text';
  }
  return 'product';
};

export const getFieldDisplayName = (fieldType: string): string => {
  const displayNames: Record<string, string> = {
    unitPrice: 'Unit Price',
    amount: 'Amount',
    warrantyPrice: 'Warranty Price',
    replacementPrice: 'Replacement Price',
    warrantyRate: 'Warranty Rate',
    replacementRate: 'Replacement Rate',
    total: 'Total',
    // sanipod
    weeklyRatePerUnit: 'Weekly Rate / Unit',
    altWeeklyRatePerUnit: 'Alternative Flat Rate',
    extraBagPrice: 'Extra Bag Price',
    standaloneExtraWeeklyCharge: 'Standalone Weekly Charge',
    installRatePerPod: 'Install Rate / Pod',
    // strip & wax
    floorAreaSqFt: 'Floor Area Sq Ft',
    ratePerSqFt: 'Rate Per Sq Ft',
    minCharge: 'Minimum Charge',
    // carpet
    firstUnitRate: 'First 500 sq ft Rate',
    additionalUnitRate: 'Additional 500 sq ft Rate',
    perVisitMinimum: 'Per Visit Minimum',
    // electrostatic
    ratePerRoom: 'Rate Per Room',
    ratePerThousandSqFt: 'Rate Per Thousand Sq Ft',
    tripChargePerVisit: 'Trip Charge Per Visit',
    // microfiber
    includedBathroomRate: 'Included Bathroom Rate',
    hugeBathroomRatePerSqFt: 'Huge Bathroom Rate per Sq Ft',
    extraAreaRatePerUnit: 'Extra Area Rate per Unit',
    standaloneRatePerUnit: 'Standalone Rate per Unit',
    dailyChemicalPerGallon: 'Daily Chemical per Gallon',
    // foaming drain
    standardDrainRate: 'Standard Drain Rate',
    altBaseCharge: 'Alt Base Charge',
    altExtraPerDrain: 'Alt Extra Per Drain',
    volumeWeeklyRate: 'Volume Weekly Rate',
    volumeBimonthlyRate: 'Volume Bimonthly Rate',
    greaseWeeklyRate: 'Grease Weekly Rate',
    greaseInstallRate: 'Grease Install Rate',
    greenWeeklyRate: 'Green Weekly Rate',
    greenInstallRate: 'Green Install Rate',
    plumbingAddonRate: 'Plumbing Addon Rate',
    filthyMultiplier: 'Filthy Multiplier',
    // rpm windows
    smallWindowRate: 'Small Window Rate',
    mediumWindowRate: 'Medium Window Rate',
    largeWindowRate: 'Large Window Rate',
    baseSmall: 'Small Window Rate',
    baseMedium: 'Medium Window Rate',
    baseLarge: 'Large Window Rate',
    tripCharge: 'Trip Charge',
    // saniscrub
    fixtureRateMonthly: 'Fixture Rate (Monthly)',
    fixtureRateBimonthly: 'Fixture Rate (Bimonthly)',
    fixtureRateQuarterly: 'Fixture Rate (Quarterly)',
    nonBathroomFirstUnitRate: 'Non-Bathroom First Unit Rate',
    nonBathroomAdditionalUnitRate: 'Non-Bathroom Additional Rate',
    // saniclean
    allInclusiveWeeklyRatePerFixture: 'All-Inclusive Rate / Fixture',
    insideBeltwayRatePerFixture: 'Inside Beltway Rate / Fixture',
    outsideBeltwayRatePerFixture: 'Outside Beltway Rate / Fixture',
    smallFacilityMinimum: 'Small Facility Minimum',
    luxuryUpgradePerDispenser: 'Luxury Upgrade / Dispenser',
    microfiberMoppingPerBathroom: 'Microfiber Mopping / Bathroom',
    warrantyFeePerDispenserPerWeek: 'Warranty Fee / Dispenser',
    paperCreditPerFixture: 'Paper Credit / Fixture',
    // refresh power scrub
    hourlyRate: 'Hourly Rate',
    minimumVisit: 'Minimum Visit',
    workerRate: 'Worker Rate',
    presetRate: 'Preset Rate',
    smallMediumRate: 'Small/Medium Rate',
    largeRate: 'Large Rate',
    insideRate: 'Inside Rate',
    outsideRate: 'Outside Rate',
    sqFtFixedFee: 'Sq Ft Fixed Fee',
    // custom overrides
    customPerVisit: 'Custom Per Visit',
    customMonthly: 'Custom Monthly',
    customContractTotal: 'Custom Contract Total',
    customInstallationFee: 'Custom Installation Fee',
    // electrostatic custom overrides (baseline = standard rate)
    customRatePerRoom: 'Rate Per Room',
    customRatePerThousandSqFt: 'Rate Per Thousand Sq Ft',
    customTripChargePerVisit: 'Trip Charge Per Visit',
    customServiceCharge: 'Service Charge',
    customPerVisitPrice: 'Per Visit Price',
    customMonthlyRecurring: 'Monthly Recurring',
    customFirstMonthTotal: 'First Month Total',
    // microfiber custom overrides (baseline = config rate)
    customIncludedBathroomRate: 'Included Bathroom Rate',
    customHugeBathroomRatePerSqFt: 'Huge Bathroom Rate per Sq Ft',
    customExtraAreaRatePerUnit: 'Extra Area Rate per Unit',
    customStandaloneRatePerUnit: 'Standalone Rate per Unit',
    // saniscrub fields
    rate: 'Fixture Rate',
    minimumChargePerVisit: 'Minimum Charge',
    nonBathFirstRate: 'Non-Bathroom First Block Rate',
    nonBathAdditionalRate: 'Non-Bathroom Additional Block Rate',
  };

  if (displayNames[fieldType]) {
    return displayNames[fieldType];
  }
  const underscoreIndex = fieldType.indexOf('_');
  if (underscoreIndex > 0) {
    const areaName = fieldType.slice(0, underscoreIndex);
    const rawField = fieldType.slice(underscoreIndex + 1);
    const rawDisplay = displayNames[rawField] || rawField;
    return `${areaName} ${rawDisplay}`;
  }
  return fieldType;
};
