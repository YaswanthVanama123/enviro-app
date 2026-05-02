import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {FormState} from '../../hooks/useFormFilling';
import {Colors} from '../../../../theme/colors';
import {Spacing, Radius} from '../../../../theme/spacing';
import {FontSize} from '../../../../theme/typography';
import {formatCurrency} from '../../../../shared/utils/format.utils';

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
    const ct = p.costType ?? 'warranty';
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
  visibleServices.forEach(id => {
    const svc = services[id];
    if (!svc) {return;}
    const isOneTime = svc.frequency === 'oneTime';
    if (!isOneTime && typeof svc.perVisit === 'number' && svc.perVisit > 0) {
      totalPerVisit += svc.perVisit;
    }
  });
  const hasRecurringServices = totalPerVisit > 0;
  const perVisitMeetsMinimum = totalPerVisit >= CROSS_SERVICE_MIN_PER_VISIT;

  const displayDate = startDate
    ? new Date(startDate).toLocaleDateString('en-US', {year: 'numeric', month: 'long', day: 'numeric'})
    : 'Not set';

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
            const ct = p.costType ?? 'warranty';
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
});
