import React, {useState, useMemo, useEffect} from 'react';
import {View, Text, StyleSheet, TouchableOpacity} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {FormState} from '../../hooks/useFormFilling';
import {Colors} from '../../../../theme/colors';
import {Spacing, Radius} from '../../../../theme/spacing';
import {FontSize} from '../../../../theme/typography';
import {formatCurrency} from '../../../../shared/utils/format.utils';
import {biginAuditApi} from '../../../../services/api/endpoints/biginAudit.api';
import {quotaApi} from '../../../../services/api/endpoints/quota.api';
import {useAdminAuth} from '../../../admin/context/AdminAuthContext';
import {
  QuotaLevel,
  AccountType,
  PricingLine,
  AgreementTerm,
  COMMISSION_RULES_V2,
  DEFAULT_COMMISSION_RULES,
  QUOTA_LEVEL_OPTIONS,
  ACCOUNT_TYPE_OPTIONS,
  ACCOUNT_TYPE_REVENUE_RULES,
  getPricingTier,
  DEFAULT_QUOTA_TIER_CUTOFFS,
  PIT_PER_VISIT_THRESHOLD,
  ANCHOR_PER_VISIT_THRESHOLD,
  ANCHOR_BONUS_MULTIPLIER,
  resolveCommissionRules,
  getPricingTierFromList,
  type ResolvedCommissionRules,
} from '../../../admin/types/commission.types';
import {commissionApi} from '../../../../services/api/endpoints/commission.api';

interface Step4ReviewProps {
  form: FormState;
}

const FREQ_MULT: Record<string, number> = {
  daily:          30,
  weekly:         4.33,
  biweekly:       2,
  monthly:        1,
  everyFourWeeks: 1.0833,
  quarterly:      1 / 3,
  yearly:         1 / 12,
};

function getFreqMult(freq: string): number {
  return FREQ_MULT[freq] ?? 1;
}

function SectionCard({icon, title, children}: {icon: string; title: string; children: React.ReactNode}) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Ionicons name={icon} size={15} color={Colors.primary} />
        <Text style={styles.cardTitle}>{title}</Text>
      </View>
      <View style={styles.cardBody}>{children}</View>
    </View>
  );
}

function ReviewRow({label, value}: {label: string; value: string | number}) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{String(value)}</Text>
    </View>
  );
}

export function Step4Review({form}: Step4ReviewProps) {
  const {
    headerTitle,
    headerRows,
    contractMonths,
    startDate,
    tripCharge,
    tripChargeFrequency,
    parkingCharge,
    parkingChargeFrequency,
    paymentOption,
    visibleServices,
    services,
    smallProducts,
    bigProducts,
    dispensers,
    enviroOf,
    serviceAgreement,
  } = form;

  const customer0 = headerRows[0] ?? {labelLeft: '', valueLeft: '', labelRight: '', valueRight: ''};
  const customer1 = headerRows[1] ?? {labelLeft: '', valueLeft: '', labelRight: '', valueRight: ''};
  const customer2 = headerRows[2] ?? {labelLeft: '', valueLeft: '', labelRight: '', valueRight: ''};

  const paymentLabel: Record<string, string> = {
    online: 'Online',
    cash:   'Cash',
    others: 'Others',
  };

  let serviceTotal = 0;
  visibleServices.forEach(id => {
    const svc = services[id];
    if (svc?.contractTotal) {serviceTotal += svc.contractTotal;}
  });

  let smallOnce = 0;
  let smallMonthly = 0;
  smallProducts.forEach(p => {
    const ct = p.costType ?? 'productCost';
    const base = p.qty * p.unitPrice;
    if (ct === 'productCost') { smallOnce += base; }
    else { smallMonthly += base * getFreqMult(p.frequency); }
  });

  const bigProductMonthly = bigProducts.reduce(
    (s, p) => s + p.qty * p.amount * getFreqMult(p.frequency), 0,
  );

  let dispOnce = 0;
  let dispMonthly = 0;
  dispensers.forEach(d => {
    const ct = d.costType ?? 'productCost';
    if (ct === 'warranty') { dispMonthly += d.qty * d.warrantyRate * getFreqMult(d.frequency); }
    else { dispOnce += d.qty * d.replacementRate; }
  });

  const productOnceTotal    = smallOnce + dispOnce;
  const productMonthlyTotal = smallMonthly + bigProductMonthly + dispMonthly;
  const productTotal        = productOnceTotal + productMonthlyTotal * contractMonths;

  const hasProducts = smallProducts.length > 0 || bigProducts.length > 0 || dispensers.length > 0;

  const tripTotal    = tripCharge    * tripChargeFrequency    * contractMonths;
  const parkingTotal = parkingCharge * parkingChargeFrequency * contractMonths;
  const grandTotal   = serviceTotal  + productTotal + tripTotal + parkingTotal;

  let totalCurrentContract  = 0;
  let totalOriginalContract = 0;
  visibleServices.forEach(id => {
    const svc = services[id];
    if (!svc) {return;}
    totalCurrentContract  += svc.contractTotal         ?? 0;
    totalOriginalContract += svc.originalContractTotal ?? svc.contractTotal ?? 0;
  });
  const greenThreshold = totalOriginalContract * 1.30;
  const pricingLine: 'red' | 'green' = totalCurrentContract > greenThreshold ? 'green' : 'red';

  const CROSS_SERVICE_MIN_PER_VISIT = 50;

  
  let totalPerVisit = 0;
  let totalMonthlyRecurring = 0;
  visibleServices.forEach(id => {
    const svc = services[id];
    if (!svc) {return;}
    const isOneTime = svc.frequency === 'oneTime';
    if (!isOneTime && typeof svc.perVisit === 'number' && svc.perVisit > 0) {
      totalPerVisit += svc.perVisit;
      
      const freqMult = getFreqMult(svc.frequency || 'monthly');
      totalMonthlyRecurring += svc.perVisit * freqMult;
    }
  });
  const hasRecurringServices = totalPerVisit > 0;
  const perVisitMeetsMinimum = totalPerVisit >= CROSS_SERVICE_MIN_PER_VISIT;

  const displayDate = startDate
    ? new Date(startDate).toLocaleDateString('en-US', {year: 'numeric', month: 'long', day: 'numeric'})
    : 'Not set';

  const {adminUser} = useAdminAuth();

  const [quotaLevel, setQuotaLevel] = useState<QuotaLevel>('above');
  const [accountType, setAccountType] = useState<AccountType>('Anchor');
  const [isInsideSales, setIsInsideSales] = useState<boolean>(false);

  const [isNewLocation, setIsNewLocation] = useState<boolean>(true);

  
  const [repActualSalesBefore, setRepActualSalesBefore] = useState<number>(0);
  const [isCommissionExpanded, setIsCommissionExpanded] = useState<boolean>(true);

  
  
  const [activeRules, setActiveRules] = useState<ResolvedCommissionRules>(() =>
    resolveCommissionRules(null),
  );

  useEffect(() => {
    let cancelled = false;
    commissionApi
      .getActiveRules()
      .then(loaded => {
        if (cancelled || !loaded) return;
        setActiveRules(resolveCommissionRules(loaded));
      })
      .catch(err => {
        console.error('[RULES] Failed to load active commission rules:', err);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const checkInsideSales = async () => {
      const salespersonName = adminUser?.fullName || adminUser?.username;
      if (!salespersonName) return;

      try {
        const result = await biginAuditApi.checkInsideSalesEligibility(salespersonName);
        if (result?.success && result.data) {
          setIsInsideSales(result.data.isInsideSales);
        }
      } catch (error) {
        console.error('Error checking inside sales:', error);
      }
    };

    checkInsideSales();
  }, [adminUser?.fullName, adminUser?.username]);

  
  
  useEffect(() => {
    const fetchActualSales = async () => {
      const salespersonId = adminUser?.username;
      if (!salespersonId) return;
      try {
        const result = await quotaApi.getCurrentLevel(salespersonId);
        if (result?.actualSales != null) {
          setRepActualSalesBefore(result.actualSales);
        }
      } catch (error) {
        console.error('[QUOTA] Failed to fetch actualSales:', error);
      }
    };
    fetchActualSales();
  }, [adminUser?.username]);

  const commissionCalc = useMemo(() => {
    const rules = DEFAULT_COMMISSION_RULES;       
    const rulesV2 = activeRules;                  

    
    const monthlyValue = totalMonthlyRecurring > 0
      ? totalMonthlyRecurring
      : (contractMonths > 0 ? totalCurrentContract / contractMonths : totalCurrentContract);

    
    const monthlyContractValue = contractMonths > 0
      ? totalCurrentContract / contractMonths
      : totalCurrentContract;
    const monthlyOriginalContractValue = contractMonths > 0
      ? totalOriginalContract / contractMonths
      : totalOriginalContract;
    const currentContract12Months = monthlyContractValue * 12;
    const originalContract12Months = monthlyOriginalContractValue * 12;

    const getAgreementTerm = (): AgreementTerm => {
      if (contractMonths >= 36) return '3-year';
      if (contractMonths >= 12) return '1-year';
      return 'MTM-with-install';
    };

    const derivedPricingLine: PricingLine = pricingLine === 'green' ? 'Greenline' : 'Redline';
    const agreementTerm = getAgreementTerm();

    const baseRate = rules.quotaRates[quotaLevel];
    const agreementMultiplier = rules.agreementMultipliers[agreementTerm];
    const accountTypeAdjustment = rules.accountTypeAdjustments[accountType];
    const greenlineBonus = derivedPricingLine === 'Greenline' ? rules.greenlineBonus : 0;
    const renewalBonus = 0; 
    const insideSalesDeduction = isInsideSales ? rules.insideSalesDeduction : 0;
    const effectiveBaseRate = baseRate + accountTypeAdjustment + greenlineBonus + renewalBonus + insideSalesDeduction;
    const finalCommissionRate = effectiveBaseRate * (agreementMultiplier / 100);
    const weeklyCommission = (monthlyValue / 4.33) * (finalCommissionRate / 100);
    const annualCommissionV1 = weeklyCommission * activeRules.weeksPerAnnualCommission;
    const contractCommission = annualCommissionV1;

    
    const pricingTierV2 = getPricingTierFromList(
      currentContract12Months,
      originalContract12Months,
      rulesV2.pricingTiers,
    );
    const pricingMultiplier = pricingTierV2.quotaMultiplier;
    const isGreenline = pricingTierV2.label === 'Greenline (130%+)';

    const visitsPerYear = rulesV2.frequencyVisitsPerYear.weekly;

    
    const effectiveAnchorThreshold = isGreenline
      ? rulesV2.anchorMinGreenline
      : rulesV2.anchorPerVisitThreshold;
    const effectivePitThreshold = rulesV2.pitPerVisitThreshold;

    const perVisitPenalty = rulesV2.perVisitPenalties[accountType];

    
    const v2AgreementMultiplier = rulesV2.agreementMultipliers[agreementTerm];
    const adjustedAnnual = currentContract12Months * pricingMultiplier * (v2AgreementMultiplier / 100);
    const adjustedPerVisit = visitsPerYear > 0 ? adjustedAnnual / visitsPerYear : 0;
    const commissionBaseRaw = adjustedAnnual;

    

    
    
    let commissionablePerVisit = 0;
    let v2RevenueDeduction = 0;
    let v2AnchorBonus = 0;

    if (accountType === 'Anchor') {
      const standardPortionRaw = Math.min(adjustedPerVisit, effectiveAnchorThreshold) -
        (isNewLocation ? Math.min(adjustedPerVisit, effectivePitThreshold) : 0);
      const standardSafe = Math.max(0, standardPortionRaw);
      const anchorPortion = Math.max(0, adjustedPerVisit - effectiveAnchorThreshold);
      v2AnchorBonus = anchorPortion * (rulesV2.anchorBonusMultiplier - 1);
      commissionablePerVisit = standardSafe + anchorPortion * rulesV2.anchorBonusMultiplier;
      v2RevenueDeduction = isNewLocation ? Math.min(adjustedPerVisit, effectivePitThreshold) : 0;
    } else if (accountType === 'Bread5' || accountType === 'Bread15') {
      v2RevenueDeduction = isNewLocation ? perVisitPenalty : 0;
      commissionablePerVisit = Math.max(0, adjustedPerVisit - v2RevenueDeduction);
    } else { 
      const isExistingAlreadyOverThreshold = !isNewLocation && adjustedPerVisit > perVisitPenalty;
      v2RevenueDeduction = isExistingAlreadyOverThreshold ? 0 : perVisitPenalty;
      commissionablePerVisit = Math.max(0, adjustedPerVisit - v2RevenueDeduction);
    }
    const commissionableAnnual = commissionablePerVisit * visitsPerYear;

    const annualContractTotal = currentContract12Months;
    const annualQuotaCredit = annualContractTotal * pricingMultiplier;

    const tierCutoffs = rulesV2.quotaTierCutoffs;
    const positionBefore = repActualSalesBefore;
    const positionAfter = positionBefore + annualQuotaCredit;
    const belowQuotaPortion = Math.max(0, Math.min(positionAfter, tierCutoffs.aboveQuota) - positionBefore);
    const aboveQuotaPortion = Math.max(0, Math.min(positionAfter, tierCutoffs.doubleQuota) - Math.max(positionBefore, tierCutoffs.aboveQuota));
    const doubleQuotaPortion = Math.max(0, positionAfter - Math.max(positionBefore, tierCutoffs.doubleQuota));

    const v2InsideSalesDeduction = isInsideSales ? rulesV2.insideSalesDeduction : 0;
    const belowRate = (rulesV2.quotaRates.below + v2InsideSalesDeduction) / 100;
    const aboveRate = (rulesV2.quotaRates.above + v2InsideSalesDeduction) / 100;
    const doubleRate = (rulesV2.quotaRates.double + v2InsideSalesDeduction) / 100;

    const totalQuotaCredit = belowQuotaPortion + aboveQuotaPortion + doubleQuotaPortion;
    const belowShare = totalQuotaCredit > 0 ? (belowQuotaPortion / totalQuotaCredit) * commissionableAnnual : 0;
    const aboveShare = totalQuotaCredit > 0 ? (aboveQuotaPortion / totalQuotaCredit) * commissionableAnnual : 0;
    const doubleShare = totalQuotaCredit > 0 ? (doubleQuotaPortion / totalQuotaCredit) * commissionableAnnual : 0;

    const belowQuotaCommission = belowShare * Math.max(0, belowRate);
    const aboveQuotaCommission = aboveShare * Math.max(0, aboveRate);
    const doubleQuotaCommission = doubleShare * Math.max(0, doubleRate);
    const annualCommissionV2 = belowQuotaCommission + aboveQuotaCommission + doubleQuotaCommission;

    return {
      
      monthlyValue,
      agreementTerm,
      derivedPricingLine,
      baseRate,
      agreementMultiplier,
      accountTypeAdjustment,
      greenlineBonus,
      renewalBonus,
      insideSalesDeduction,
      effectiveBaseRate,
      finalCommissionRate,
      weeklyCommission,
      annualCommission: annualCommissionV1,
      contractCommission,

      currentContract12Months,
      pricingTier: pricingTierV2.label,
      pricingMultiplier,
      visitsPerYear,
      isNewLocation,
      commissionBaseRaw,
      commissionableAnnual,
      v2AnchorBonus,
      v2RevenueDeduction,
      belowQuotaPortion,
      aboveQuotaPortion,
      doubleQuotaPortion,
      belowQuotaCommission,
      aboveQuotaCommission,
      doubleQuotaCommission,
      annualCommissionV2,

      annualContractTotal,
      annualQuotaCredit,
    };
  }, [
    totalCurrentContract,
    totalOriginalContract,
    totalMonthlyRecurring,
    contractMonths,
    pricingLine,
    quotaLevel,
    accountType,
    isInsideSales,
    isNewLocation,
    repActualSalesBefore,
    activeRules,
  ]);

  return (
    <View style={styles.container}>
      <View style={styles.titleBlock}>
        <Ionicons name="document-text" size={22} color={Colors.primary} />
        <Text style={styles.titleText} numberOfLines={2}>{headerTitle || 'New Agreement'}</Text>
      </View>

      <SectionCard icon="person-outline" title="Customer Information">
        {customer0.valueLeft  ? <ReviewRow label="Customer Name"    value={customer0.valueLeft}  /> : null}
        {customer0.valueRight ? <ReviewRow label="Customer Contact" value={customer0.valueRight} /> : null}
        {customer1.valueLeft  ? <ReviewRow label="Customer Number"  value={customer1.valueLeft}  /> : null}
        {customer1.valueRight ? <ReviewRow label="POC Email"        value={customer1.valueRight} /> : null}
        {customer2.valueLeft  ? <ReviewRow label="POC Name"         value={customer2.valueLeft}  /> : null}
        {customer2.valueRight ? <ReviewRow label="POC Phone"        value={customer2.valueRight} /> : null}
      </SectionCard>

      {hasProducts && (
        <SectionCard icon="cube-outline" title="Products">
          {smallProducts.map(p => {
            const ct = p.costType ?? 'productCost';
            const rowTotal = ct === 'productCost'
              ? p.qty * p.unitPrice
              : p.qty * p.unitPrice * getFreqMult(p.frequency) * contractMonths;
            const chargeLabel = ct === 'productCost' ? 'Direct' : 'Warranty';
            const freqInfo = ct === 'productCost' ? 'one-time' : p.frequency;
            return (
              <View key={p.id} style={styles.svcRow}>
                <View style={styles.svcInfo}>
                  <Text style={styles.svcName}>{p.displayName || '(unnamed)'}</Text>
                  <Text style={styles.svcFreq}>Paper · {chargeLabel} · {freqInfo} · qty {p.qty}</Text>
                </View>
                <Text style={styles.svcTotal}>{formatCurrency(rowTotal)}</Text>
              </View>
            );
          })}
          {bigProducts.map(p => (
            <View key={p.id} style={styles.svcRow}>
              <View style={styles.svcInfo}>
                <Text style={styles.svcName}>{p.displayName || '(unnamed)'}</Text>
                <Text style={styles.svcFreq}>Chemical · {p.frequency} · qty {p.qty}</Text>
              </View>
              <Text style={styles.svcTotal}>{formatCurrency(p.qty * p.amount)}</Text>
            </View>
          ))}
          {dispensers.map(d => {
            const ct = d.costType ?? 'productCost';
            const rowTotal = ct === 'warranty'
              ? d.qty * d.warrantyRate * getFreqMult(d.frequency) * contractMonths
              : d.qty * d.replacementRate;
            const chargeLabel = ct === 'productCost' ? 'Direct' : 'Warranty';
            const freqInfo = ct === 'productCost' ? 'one-time' : d.frequency;
            return (
              <View key={d.id} style={styles.svcRow}>
                <View style={styles.svcInfo}>
                  <Text style={styles.svcName}>{d.displayName || '(unnamed)'}</Text>
                  <Text style={styles.svcFreq}>Dispenser · {chargeLabel} · {freqInfo} · qty {d.qty}</Text>
                </View>
                <Text style={styles.svcTotal}>{formatCurrency(rowTotal)}</Text>
              </View>
            );
          })}
          <View style={styles.subTotalRow}>
            <Text style={styles.subTotalLabel}>Products Subtotal</Text>
            <Text style={styles.subTotalValue}>{formatCurrency(productTotal)}</Text>
          </View>
        </SectionCard>
      )}

      {visibleServices.length > 0 && (
        <SectionCard icon="construct-outline" title="Services">
          {visibleServices.map(id => {
            const svc = services[id];
            const name = svc?.displayName ?? id;
            const freq = svc?.frequency   ?? '—';
            const total = svc?.contractTotal ? formatCurrency(svc.contractTotal) : '—';
            return (
              <View key={id} style={styles.svcRow}>
                <View style={styles.svcInfo}>
                  <Text style={styles.svcName}>{name}</Text>
                  <Text style={styles.svcFreq}>{freq}</Text>
                </View>
                <Text style={styles.svcTotal}>{total}</Text>
              </View>
            );
          })}
        </SectionCard>
      )}

      <SectionCard icon="calendar-outline" title="Service Agreement">
        <ReviewRow label="Duration"       value={`${contractMonths} months`} />
        <ReviewRow label="Start Date"     value={displayDate} />
        <ReviewRow label="Payment"        value={paymentLabel[paymentOption] ?? paymentOption} />
        {enviroOf ? <ReviewRow label="Enviro-Master Of" value={enviroOf} /> : null}
        {tripCharge > 0    && <ReviewRow label="Trip Charge"    value={`${formatCurrency(tripCharge)} / visit`}    />}
        {parkingCharge > 0 && <ReviewRow label="Parking Charge" value={`${formatCurrency(parkingCharge)} / visit`} />}
      </SectionCard>

      {serviceAgreement?.includeInPdf && (
        <SectionCard icon="document-text-outline" title="Agreement Terms">
          {serviceAgreement.retainDispensers && (
            <ReviewRow label="Dispensers" value="Retain existing dispensers" />
          )}
          {serviceAgreement.disposeDispensers && (
            <ReviewRow label="Dispensers" value="Dispose of existing dispensers" />
          )}
          {([1,2,3,4,5,6,7] as const).map(n => {
            const key = `term${n}` as keyof typeof serviceAgreement;
            const val = String(serviceAgreement[key] ?? '');
            if (!val) {return null;}
            return (
              <View key={n} style={styles.row}>
                <Text style={[styles.rowLabel, {fontWeight: '700'}]}>Term {n}</Text>
                <Text style={[styles.rowValue, {maxWidth: '70%'}]} numberOfLines={2}>
                  {val}
                </Text>
              </View>
            );
          })}
        </SectionCard>
      )}

      {visibleServices.length > 0 && (
        <View style={[
          styles.pricingBanner,
          pricingLine === 'green' ? styles.pricingBannerGreen : styles.pricingBannerRed,
        ]}>
          <View style={styles.pricingBannerLeft}>
            <Ionicons
              name={pricingLine === 'green' ? 'checkmark-circle' : 'warning'}
              size={20}
              color={pricingLine === 'green' ? '#16a34a' : '#dc2626'}
            />
            <View style={styles.pricingBannerInfo}>
              <Text style={[styles.pricingBannerTitle, pricingLine === 'green' ? styles.pricingGreenText : styles.pricingRedText]}>
                {pricingLine === 'green' ? 'Green Line Pricing' : 'Red Line Pricing'}
              </Text>
              <Text style={styles.pricingBannerSub}>
                {pricingLine === 'green'
                  ? '30%+ above original – auto approved'
                  : 'Below 30% above original – requires approval'}
              </Text>
            </View>
          </View>
          <View style={styles.pricingBannerRight}>
            <Text style={[styles.pricingBannerAmount, pricingLine === 'green' ? styles.pricingGreenText : styles.pricingRedText]}>
              {formatCurrency(totalCurrentContract)}
            </Text>
            <Text style={styles.pricingBannerLabel}>Current Contract</Text>
            <Text style={[styles.pricingBannerAmount, pricingLine === 'green' ? styles.pricingGreenText : styles.pricingRedText]}>
              {formatCurrency(greenThreshold)}
            </Text>
            <Text style={styles.pricingBannerLabel}>Target (Original ×1.30)</Text>
          </View>
        </View>
      )}

      {hasRecurringServices && (
        <View style={[
          styles.crossMinBanner,
          perVisitMeetsMinimum ? styles.crossMinBannerGreen : styles.crossMinBannerRed,
        ]}>
          <View style={styles.crossMinHeader}>
            <Ionicons
              name={perVisitMeetsMinimum ? 'checkmark-circle' : 'warning'}
              size={18}
              color={perVisitMeetsMinimum ? '#16a34a' : '#dc2626'}
            />
            <Text style={styles.crossMinTitle}>Cross-Service Per Visit Minimum</Text>
          </View>
          <View style={styles.crossMinRows}>
            <View style={styles.crossMinRow}>
              <Text style={styles.crossMinLabel}>Total Per Visit (all services)</Text>
              <Text style={[styles.crossMinValue, perVisitMeetsMinimum ? styles.crossMinValueOk : styles.crossMinValueWarn]}>
                {formatCurrency(totalPerVisit)}
              </Text>
            </View>
            <View style={styles.crossMinRow}>
              <Text style={styles.crossMinLabel}>Required Minimum Per Visit</Text>
              <Text style={styles.crossMinValueTarget}>{formatCurrency(CROSS_SERVICE_MIN_PER_VISIT)}</Text>
            </View>
          </View>
          <View style={[styles.crossMinStatus, perVisitMeetsMinimum ? styles.crossMinStatusOk : styles.crossMinStatusWarn]}>
            <Text style={[styles.crossMinStatusText, perVisitMeetsMinimum ? styles.crossMinStatusOkText : styles.crossMinStatusWarnText]}>
              {perVisitMeetsMinimum
                ? `Meets minimum — ${formatCurrency(totalPerVisit - CROSS_SERVICE_MIN_PER_VISIT)} above $50.00`
                : `Below minimum — ${formatCurrency(CROSS_SERVICE_MIN_PER_VISIT - totalPerVisit)} short of $50.00`
              }
            </Text>
          </View>
        </View>
      )}

      {}
      <View style={styles.commissionCard}>
        <TouchableOpacity
          style={styles.commissionHeader}
          onPress={() => setIsCommissionExpanded(!isCommissionExpanded)}
          activeOpacity={0.7}
        >
          <View style={styles.commissionHeaderLeft}>
            <Ionicons name="calculator-outline" size={18} color="#d97706" />
            <Text style={styles.commissionTitle}>Sales Commission</Text>
          </View>
          <Ionicons
            name={isCommissionExpanded ? 'chevron-up' : 'chevron-down'}
            size={20}
            color="#d97706"
          />
        </TouchableOpacity>

        {isCommissionExpanded && (
          <View style={styles.commissionBody}>
            {}
            <View style={styles.commissionInputs}>
              {}
              <View style={styles.commissionInputGroup}>
                <Text style={styles.commissionInputLabel}>Quota Level</Text>
                <View style={styles.commissionPickerRow}>
                  {QUOTA_LEVEL_OPTIONS.map(opt => (
                    <TouchableOpacity
                      key={opt.value}
                      style={[styles.commissionChip, quotaLevel === opt.value && styles.commissionChipActive]}
                      onPress={() => setQuotaLevel(opt.value)}
                    >
                      <Text style={[styles.commissionChipText, quotaLevel === opt.value && styles.commissionChipTextActive]}>
                        {opt.label.replace(` (${opt.rate}%)`, '')}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {}
              <View style={styles.commissionInputGroup}>
                <Text style={styles.commissionInputLabel}>Account Type</Text>
                <View style={styles.commissionPickerRow}>
                  {ACCOUNT_TYPE_OPTIONS.map(opt => (
                    <TouchableOpacity
                      key={opt.value}
                      style={[styles.commissionChip, accountType === opt.value && styles.commissionChipActive]}
                      onPress={() => setAccountType(opt.value)}
                    >
                      <Text style={[styles.commissionChipText, accountType === opt.value && styles.commissionChipTextActive]}>
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {}
              <View style={[
                styles.insideSalesStatus,
                isInsideSales ? styles.insideSalesStatusWarning : styles.insideSalesStatusGood
              ]}>
                <View style={styles.insideSalesCheckbox}>
                  <Ionicons
                    name={isInsideSales ? 'checkbox' : 'checkbox-outline'}
                    size={20}
                    color={isInsideSales ? '#d97706' : '#059669'}
                  />
                </View>
                <Text style={[
                  styles.insideSalesText,
                  isInsideSales ? styles.insideSalesTextWarning : styles.insideSalesTextGood
                ]}>
                  {isInsideSales ? 'Inside Sales (-3%)' : 'No Inside Sales Deduction'}
                </Text>
                <View style={[
                  styles.autoDetectedBadge,
                  isInsideSales ? styles.autoDetectedBadgeWarning : styles.autoDetectedBadgeGood
                ]}>
                  <Text style={[
                    styles.autoDetectedText,
                    isInsideSales ? styles.autoDetectedTextWarning : styles.autoDetectedTextGood
                  ]}>
                    Auto-detected
                  </Text>
                </View>
              </View>
            </View>

            {}
            <View style={styles.commissionBreakdown}>
              <View style={styles.commissionRow}>
                <Text style={styles.commissionRowLabel}>Monthly Value</Text>
                <Text style={styles.commissionRowValue}>{formatCurrency(commissionCalc.monthlyValue)}</Text>
              </View>
              <View style={styles.commissionRow}>
                <Text style={styles.commissionRowLabel}>Agreement Term</Text>
                <Text style={styles.commissionRowValue}>{commissionCalc.agreementTerm} ({commissionCalc.agreementMultiplier}%)</Text>
              </View>
              <View style={styles.commissionRow}>
                <Text style={styles.commissionRowLabel}>Pricing Line</Text>
                <Text style={[styles.commissionRowValue, {color: commissionCalc.derivedPricingLine === 'Greenline' ? '#16a34a' : '#dc2626'}]}>
                  {commissionCalc.derivedPricingLine}
                </Text>
              </View>

              <View style={styles.commissionDivider} />

              <View style={styles.commissionRow}>
                <Text style={styles.commissionRowLabel}>Base Rate ({quotaLevel})</Text>
                <Text style={styles.commissionRowValue}>{commissionCalc.baseRate}%</Text>
              </View>
              {commissionCalc.accountTypeAdjustment !== 0 && (
                <View style={styles.commissionRow}>
                  <Text style={styles.commissionRowLabel}>Account Adj ({accountType})</Text>
                  <Text style={[styles.commissionRowValue, {color: commissionCalc.accountTypeAdjustment < 0 ? '#dc2626' : '#16a34a'}]}>
                    {commissionCalc.accountTypeAdjustment > 0 ? '+' : ''}{commissionCalc.accountTypeAdjustment}%
                  </Text>
                </View>
              )}
              {commissionCalc.greenlineBonus > 0 && (
                <View style={styles.commissionRow}>
                  <Text style={styles.commissionRowLabel}>Greenline Bonus</Text>
                  <Text style={[styles.commissionRowValue, {color: '#16a34a'}]}>+{commissionCalc.greenlineBonus}%</Text>
                </View>
              )}
              {commissionCalc.insideSalesDeduction !== 0 && (
                <View style={styles.commissionRow}>
                  <Text style={styles.commissionRowLabel}>Inside Sales</Text>
                  <Text style={[styles.commissionRowValue, {color: '#dc2626'}]}>{commissionCalc.insideSalesDeduction}%</Text>
                </View>
              )}

              <View style={styles.commissionDivider} />

              <View style={styles.commissionRow}>
                <Text style={styles.commissionRowLabel}>Effective Base Rate</Text>
                <Text style={styles.commissionRowValue}>{commissionCalc.effectiveBaseRate.toFixed(2)}%</Text>
              </View>
              <View style={styles.commissionHighlightRow}>
                <Text style={styles.commissionHighlightLabel}>Final Commission Rate</Text>
                <Text style={styles.commissionHighlightValue}>{commissionCalc.finalCommissionRate.toFixed(2)}%</Text>
              </View>

              <View style={styles.commissionDivider} />

              <View style={styles.commissionRow}>
                <Text style={styles.commissionRowLabel}>Weekly Commission</Text>
                <Text style={[styles.commissionRowValue, {color: '#16a34a', fontWeight: '700'}]}>
                  {formatCurrency(commissionCalc.weeklyCommission)}
                </Text>
              </View>
              <View style={styles.commissionRow}>
                <Text style={styles.commissionRowLabel}>Annual Commission</Text>
                <Text style={[styles.commissionRowValue, {color: '#16a34a', fontWeight: '700'}]}>
                  {formatCurrency(commissionCalc.annualCommission)}
                </Text>
              </View>
              <View style={styles.commissionTotalRow}>
                <Text style={styles.commissionTotalLabel}>Total Commission (12 mo)</Text>
                <Text style={styles.commissionTotalValue}>{formatCurrency(commissionCalc.contractCommission)}</Text>
              </View>
            </View>
          </View>
        )}
      </View>

      <View style={styles.grandTotal}>
        <Text style={styles.grandLabel}>Grand Total</Text>
        <Text style={styles.grandValue}>{formatCurrency(grandTotal)}</Text>
      </View>

      <Text style={styles.footer}>
        {contractMonths}-month agreement · All prices in USD
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: Spacing.xl,
  },
  titleBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    padding: Spacing.md,
    backgroundColor: Colors.primaryLight,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  titleText: {
    flex: 1,
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Colors.primary,
  },
  card: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: '#f8fafc',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary,
  },
  cardTitle: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.textPrimary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  cardBody: {
    paddingVertical: Spacing.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  rowLabel: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    fontWeight: '500',
    flex: 1,
  },
  rowValue: {
    fontSize: FontSize.sm,
    color: Colors.textPrimary,
    fontWeight: '600',
    textAlign: 'right',
    maxWidth: '55%',
  },
  svcRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  svcInfo: {
    flex: 1,
    gap: 2,
  },
  svcName: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  svcFreq: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
  },
  svcTotal: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.primary,
  },
  subTotalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: '#f0fdf4',
  },
  subTotalLabel: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  subTotalValue: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: '#16a34a',
  },
  grandTotal: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.sm,
    padding: Spacing.md,
    backgroundColor: Colors.primary,
    borderRadius: Radius.lg,
  },
  pricingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.sm,
    marginBottom: Spacing.xs,
    padding: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: 1,
  },
  pricingBannerGreen: {
    backgroundColor: '#f0fdf4',
    borderColor: '#bbf7d0',
  },
  pricingBannerRed: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
  },
  pricingBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flex: 1,
  },
  pricingBannerInfo: {
    flex: 1,
    gap: 2,
  },
  pricingBannerTitle: {
    fontSize: FontSize.sm,
    fontWeight: '700',
  },
  pricingBannerSub: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
  },
  pricingGreenText: {
    color: '#16a34a',
  },
  pricingRedText: {
    color: '#dc2626',
  },
  pricingBannerRight: {
    alignItems: 'flex-end',
  },
  pricingBannerAmount: {
    fontSize: FontSize.md,
    fontWeight: '800',
  },
  pricingBannerLabel: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
  },
  grandLabel: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: '#fff',
  },
  grandValue: {
    fontSize: FontSize.xl,
    fontWeight: '900',
    color: '#fff',
  },
  footer: {
    textAlign: 'center',
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    marginTop: Spacing.md,
    marginHorizontal: Spacing.lg,
  },
  crossMinBanner: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
    padding: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    gap: Spacing.sm,
  },
  crossMinBannerGreen: {
    backgroundColor: '#f0fdf4',
    borderColor: '#bbf7d0',
  },
  crossMinBannerRed: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
  },
  crossMinHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  crossMinTitle: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    color: Colors.textPrimary,
  },
  crossMinRows: {
    gap: Spacing.xs,
  },
  crossMinRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  crossMinLabel: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  crossMinValue: {
    fontSize: FontSize.sm,
    fontWeight: '700',
  },
  crossMinValueOk: {
    color: '#16a34a',
  },
  crossMinValueWarn: {
    color: '#dc2626',
  },
  crossMinValueTarget: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  crossMinStatus: {
    borderRadius: Radius.sm,
    paddingVertical: 4,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  crossMinStatusOk: {
    backgroundColor: '#dcfce7',
  },
  crossMinStatusWarn: {
    backgroundColor: '#fee2e2',
  },
  crossMinStatusText: {
    fontSize: FontSize.xs,
    fontWeight: '600',
  },
  crossMinStatusOkText: {
    color: '#166534',
  },
  crossMinStatusWarnText: {
    color: '#991b1b',
  },
  
  commissionCard: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: 2,
    borderColor: '#fde047',
    backgroundColor: '#fefce8',
    overflow: 'hidden',
  },
  commissionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#fde047',
  },
  commissionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  commissionTitle: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: '#92400e',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  commissionBody: {
    padding: Spacing.md,
    gap: Spacing.md,
  },
  commissionInputs: {
    gap: Spacing.sm,
  },
  commissionInputGroup: {
    gap: 4,
  },
  commissionInputLabel: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: '#374151',
  },
  commissionPickerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  commissionChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: Radius.sm,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  commissionChipActive: {
    backgroundColor: '#fbbf24',
    borderColor: '#d97706',
  },
  commissionChipText: {
    fontSize: FontSize.xs,
    fontWeight: '500',
    color: '#6b7280',
  },
  commissionChipTextActive: {
    color: '#78350f',
    fontWeight: '700',
  },
  commissionSwitchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.xs,
  },
  commissionBreakdown: {
    backgroundColor: '#fff',
    borderRadius: Radius.md,
    padding: Spacing.sm,
    borderWidth: 1,
    borderColor: '#fde047',
  },
  commissionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  commissionRowLabel: {
    fontSize: FontSize.sm,
    color: '#6b7280',
    fontWeight: '500',
  },
  commissionRowValue: {
    fontSize: FontSize.sm,
    color: '#1f2937',
    fontWeight: '600',
  },
  commissionDivider: {
    height: 1,
    backgroundColor: '#e5e7eb',
    marginVertical: 6,
  },
  commissionHighlightRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fef3c7',
    paddingVertical: 8,
    paddingHorizontal: 8,
    marginHorizontal: -8,
    borderRadius: Radius.sm,
  },
  commissionHighlightLabel: {
    fontSize: FontSize.sm,
    color: '#92400e',
    fontWeight: '700',
  },
  commissionHighlightValue: {
    fontSize: FontSize.md,
    color: '#92400e',
    fontWeight: '800',
  },
  commissionTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#dcfce7',
    paddingVertical: 10,
    paddingHorizontal: 10,
    marginHorizontal: -8,
    marginTop: 8,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: '#22c55e',
  },
  commissionTotalLabel: {
    fontSize: FontSize.sm,
    color: '#166534',
    fontWeight: '700',
  },
  commissionTotalValue: {
    fontSize: FontSize.md,
    color: '#166534',
    fontWeight: '800',
  },
  
  insideSalesStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: Radius.md,
    borderWidth: 1,
  },
  insideSalesStatusGood: {
    backgroundColor: '#f0fdf4',
    borderColor: '#86efac',
  },
  insideSalesStatusWarning: {
    backgroundColor: '#fef3c7',
    borderColor: '#fcd34d',
  },
  insideSalesCheckbox: {
    marginRight: 4,
  },
  insideSalesText: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    flex: 1,
  },
  insideSalesTextGood: {
    color: '#166534',
  },
  insideSalesTextWarning: {
    color: '#92400e',
  },
  autoDetectedBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  autoDetectedBadgeGood: {
    backgroundColor: '#bbf7d0',
  },
  autoDetectedBadgeWarning: {
    backgroundColor: '#fde68a',
  },
  autoDetectedText: {
    fontSize: 10,
    fontWeight: '600',
  },
  autoDetectedTextGood: {
    color: '#15803d',
  },
  autoDetectedTextWarning: {
    color: '#b45309',
  },
});
