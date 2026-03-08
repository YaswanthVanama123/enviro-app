import React from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {ServiceAgreementData} from '../../../../services/api/endpoints/form.api';
import {Colors} from '../../../../theme/colors';
import {Spacing, Radius} from '../../../../theme/spacing';
import {FontSize} from '../../../../theme/typography';

// ─── Term metadata ────────────────────────────────────────────────────────────

const TERM_LABELS = [
  'Property Ownership',
  'Promise of Good Service',
  'Payment Terms',
  'Indemnification',
  'Expiration / Termination',
  'Install Warranty & Scope of Service',
  'Sale of Customer Business',
] as const;

// ─── Props ────────────────────────────────────────────────────────────────────

interface Step5AgreementProps {
  enviroOf: string;
  onEnviroOfChange: (v: string) => void;
  serviceAgreement: ServiceAgreementData;
  onUpdate: (data: Partial<ServiceAgreementData>) => void;
  loading: boolean;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionCard({icon, title, children}: {
  icon: string;
  title: string;
  children: React.ReactNode;
}) {
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

function FieldRow({label, children}: {label: string; children: React.ReactNode}) {
  return (
    <View style={styles.fieldRow}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
    </View>
  );
}

function ToggleChip({
  active, label, onPress,
}: {active: boolean; label: string; onPress: () => void}) {
  return (
    <TouchableOpacity
      style={[styles.chip, active && styles.chipActive]}
      onPress={onPress}>
      {active && (
        <Ionicons name="checkmark" size={12} color="#fff" style={styles.chipIcon} />
      )}
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function Step5Agreement({
  enviroOf,
  onEnviroOfChange,
  serviceAgreement,
  onUpdate,
  loading,
}: Step5AgreementProps) {

  if (loading) {
    return (
      <View style={styles.loadingBox}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Loading agreement template…</Text>
      </View>
    );
  }

  const termKey = (n: number) => `term${n}` as keyof ServiceAgreementData;

  return (
    <View style={styles.container}>

      {/* Header info */}
      <SectionCard icon="document-text-outline" title="Agreement Info">
        <FieldRow label="Enviro-Master Of">
          <TextInput
            style={styles.textInput}
            value={enviroOf}
            onChangeText={onEnviroOfChange}
            placeholder="e.g. Dallas, TX"
            placeholderTextColor={Colors.textMuted}
          />
        </FieldRow>
        <FieldRow label="Include in PDF">
          <View style={styles.chipRow}>
            <ToggleChip
              active={serviceAgreement.includeInPdf}
              label="Yes"
              onPress={() => onUpdate({includeInPdf: true})}
            />
            <ToggleChip
              active={!serviceAgreement.includeInPdf}
              label="No"
              onPress={() => onUpdate({includeInPdf: false})}
            />
          </View>
        </FieldRow>
      </SectionCard>

      {/* Dispenser options */}
      <SectionCard icon="cube-outline" title="Dispenser Options">
        <View style={styles.dispenserRow}>
          <ToggleChip
            active={serviceAgreement.retainDispensers}
            label="Retain Existing Dispensers"
            onPress={() =>
              onUpdate({
                retainDispensers:  !serviceAgreement.retainDispensers,
                disposeDispensers: false,
              })
            }
          />
          <ToggleChip
            active={serviceAgreement.disposeDispensers}
            label="Dispose of Existing Dispensers"
            onPress={() =>
              onUpdate({
                disposeDispensers: !serviceAgreement.disposeDispensers,
                retainDispensers:  false,
              })
            }
          />
        </View>
      </SectionCard>

      {/* 7 Agreement Terms */}
      <SectionCard icon="list-outline" title="Terms & Conditions">
        {TERM_LABELS.map((label, i) => {
          const key = termKey(i + 1);
          return (
            <View key={key} style={styles.termBlock}>
              <View style={styles.termLabelRow}>
                <View style={styles.termNum}>
                  <Text style={styles.termNumText}>{i + 1}</Text>
                </View>
                <Text style={styles.termLabel}>{label}</Text>
              </View>
              <TextInput
                style={styles.termInput}
                value={String(serviceAgreement[key] ?? '')}
                onChangeText={t => onUpdate({[key]: t})}
                multiline
                textAlignVertical="top"
                placeholder={`Enter ${label} terms…`}
                placeholderTextColor={Colors.textMuted}
              />
            </View>
          );
        })}
      </SectionCard>

      {/* Note text */}
      <SectionCard icon="create-outline" title="Agreement Note">
        <View style={styles.noteBlock}>
          <TextInput
            style={styles.termInput}
            value={serviceAgreement.noteText}
            onChangeText={t => onUpdate({noteText: t})}
            multiline
            textAlignVertical="top"
            placeholder="Enter additional agreement notes…"
            placeholderTextColor={Colors.textMuted}
          />
        </View>
      </SectionCard>

    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    paddingBottom: Spacing.xl,
  },
  loadingBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xxl,
    gap: Spacing.md,
  },
  loadingText: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
  },
  card: {
    marginHorizontal: Spacing.md,
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
    padding: Spacing.md,
    gap: Spacing.md,
  },
  fieldRow: {
    gap: Spacing.xs,
  },
  fieldLabel: {
    fontSize: FontSize.xs,
    fontWeight: '600',
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  textInput: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
    fontSize: FontSize.sm,
    color: Colors.textPrimary,
    backgroundColor: Colors.background,
  },
  chipRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    flexWrap: 'wrap',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: 7,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
    gap: 4,
  },
  chipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  chipIcon: {},
  chipText: {
    fontSize: FontSize.sm,
    fontWeight: '500',
    color: Colors.textSecondary,
  },
  chipTextActive: {
    color: '#fff',
    fontWeight: '700',
  },
  dispenserRow: {
    gap: Spacing.sm,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  termBlock: {
    gap: Spacing.xs,
    paddingBottom: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  termLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  termNum: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  termNumText: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: '#fff',
  },
  termLabel: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.textPrimary,
    flex: 1,
  },
  termInput: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
    fontSize: FontSize.sm,
    color: Colors.textPrimary,
    backgroundColor: Colors.background,
    minHeight: 90,
  },
  noteBlock: {
    gap: Spacing.xs,
  },
});
