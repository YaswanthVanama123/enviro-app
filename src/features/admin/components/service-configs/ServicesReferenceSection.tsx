import React, {useState, useMemo, useCallback, useEffect} from 'react';
import {
  View, Text, FlatList, TouchableOpacity, TextInput,
  ScrollView, StyleSheet, Platform, RefreshControl, Image, Linking,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {pricingApi, ServiceConfig} from '../../../../services/api/endpoints/pricing.api';
import {camelToLabel} from '../../utils/pricing.utils';
import {Colors} from '../../../../theme/colors';
import {Spacing, Radius} from '../../../../theme/spacing';
import {FontSize} from '../../../../theme/typography';

// ─── Per-service icon + accent colour (Ionicons) ──────────────────────────────
const SERVICE_META: Record<string, {icon: string; color: string; bg: string}> = {
  rpmWindows:         {icon: 'apps-outline',             color: '#0ea5e9', bg: '#e0f2fe'},
  saniclean:          {icon: 'sparkles-outline',         color: '#7c3aed', bg: '#ede9fe'},
  foamingDrain:       {icon: 'water-outline',            color: '#10b981', bg: '#d1fae5'},
  saniscrub:          {icon: 'shield-checkmark-outline', color: '#0284c7', bg: '#e0f2fe'},
  microfiberMopping:  {icon: 'brush-outline',            color: '#2563eb', bg: '#dbeafe'},
  electrostaticSpray: {icon: 'flash-outline',            color: '#dc2626', bg: '#fee2e2'},
  stripWax:           {icon: 'star-outline',             color: '#d97706', bg: '#fef3c7'},
  stripwax:           {icon: 'star-outline',             color: '#d97706', bg: '#fef3c7'},
  carpetCleaning:     {icon: 'layers-outline',           color: '#7c3aed', bg: '#ede9fe'},
  carpetclean:        {icon: 'layers-outline',           color: '#7c3aed', bg: '#ede9fe'},
  pureJanitorial:     {icon: 'business-outline',         color: '#059669', bg: '#d1fae5'},
  janitorial:         {icon: 'business-outline',         color: '#059669', bg: '#d1fae5'},
  refreshPowerScrub:  {icon: 'refresh-outline',          color: '#ea580c', bg: '#ffedd5'},
  sanipod:            {icon: 'cube-outline',             color: '#6d28d9', bg: '#ede9fe'},
  greaseTrap:         {icon: 'flask-outline',            color: '#b45309', bg: '#fef3c7'},
};
const FALLBACK_META = {icon: 'settings-outline', color: '#6b7280', bg: '#f3f4f6'};

// ─── HTML → structured segments ───────────────────────────────────────────────
type Segment =
  | {type: 'h1' | 'h2' | 'h3'; text: string}
  | {type: 'p';       text: string}
  | {type: 'bullet';  text: string}
  | {type: 'number';  text: string; index: number}
  | {type: 'quote';   text: string};

function decodeEntities(str: string): string {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ');
}

function stripInline(html: string): string {
  // Keep line breaks from <br>, strip everything else
  return decodeEntities(
    html
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<[^>]*>/g, ''),
  ).trim();
}

function parseHtmlSegments(html: string): Segment[] {
  if (!html) {return [];}
  const segments: Segment[] = [];

  // Normalise: collapse whitespace between tags
  const normalised = html.replace(/\s*\n\s*/g, '').trim();

  // Extract block-level elements in order
  const blockRe = /<(h[1-3]|p|li|blockquote)(\s[^>]*)?>[\s\S]*?<\/\1>/gi;
  let listIndex = 0;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = blockRe.exec(normalised)) !== null) {
    const tag  = match[1].toLowerCase() as string;
    const inner = stripInline(match[0].replace(/^<[^>]*>/, '').replace(/<\/[^>]*>$/, ''));
    if (!inner) {continue;}

    if (tag === 'h1') {segments.push({type: 'h1', text: inner}); listIndex = 0;}
    else if (tag === 'h2') {segments.push({type: 'h2', text: inner}); listIndex = 0;}
    else if (tag === 'h3') {segments.push({type: 'h3', text: inner}); listIndex = 0;}
    else if (tag === 'blockquote') {segments.push({type: 'quote', text: inner}); listIndex = 0;}
    else if (tag === 'li') {
      // Detect ordered vs unordered by looking at what wraps the li
      const before = normalised.slice(0, match.index);
      const lastOl = before.lastIndexOf('<ol');
      const lastUl = before.lastIndexOf('<ul');
      if (lastOl > lastUl) {
        listIndex += 1;
        segments.push({type: 'number', text: inner, index: listIndex});
      } else {
        listIndex = 0;
        segments.push({type: 'bullet', text: inner});
      }
    } else {
      listIndex = 0;
      segments.push({type: 'p', text: inner});
    }
    lastIndex = match.index + match[0].length;
  }

  // If nothing was parsed (plain text or simple HTML), fall back to stripped text
  if (segments.length === 0) {
    const plain = stripInline(normalised);
    if (plain) {segments.push({type: 'p', text: plain});}
  }

  return segments;
}

/** Plain text for the description strip preview (no tags). */
function htmlToPreview(html: string): string {
  if (!html) {return '';}
  return decodeEntities(
    html
      .replace(/<br\s*\/?>/gi, ' ')
      .replace(/<\/p>/gi, ' ')
      .replace(/<\/h[1-6]>/gi, ' ')
      .replace(/<li[^>]*>/gi, '• ')
      .replace(/<\/li>/gi, ' ')
      .replace(/<[^>]*>/g, ''),
  ).replace(/\s+/g, ' ').trim();
}

// ─── RichTextView — renders parsed segments ───────────────────────────────────
function RichTextView({html}: {html: string}) {
  const segments = useMemo(() => parseHtmlSegments(html), [html]);
  if (segments.length === 0) {return null;}
  return (
    <View style={richStyles.container}>
      {segments.map((seg, i) => {
        switch (seg.type) {
          case 'h1': return <Text key={i} style={richStyles.h1}>{seg.text}</Text>;
          case 'h2': return <Text key={i} style={richStyles.h2}>{seg.text}</Text>;
          case 'h3': return <Text key={i} style={richStyles.h3}>{seg.text}</Text>;
          case 'bullet':
            return (
              <View key={i} style={richStyles.listRow}>
                <Text style={richStyles.bullet}>•</Text>
                <Text style={richStyles.listText}>{seg.text}</Text>
              </View>
            );
          case 'number':
            return (
              <View key={i} style={richStyles.listRow}>
                <Text style={richStyles.bullet}>{seg.index}.</Text>
                <Text style={richStyles.listText}>{seg.text}</Text>
              </View>
            );
          case 'quote':
            return (
              <View key={i} style={richStyles.quoteBlock}>
                <Text style={richStyles.quoteText}>{seg.text}</Text>
              </View>
            );
          default:
            return <Text key={i} style={richStyles.p}>{seg.text}</Text>;
        }
      })}
    </View>
  );
}

const richStyles = StyleSheet.create({
  container: {gap: 6},
  h1: {fontSize: FontSize.lg, fontWeight: '700', color: '#1e293b', marginTop: 8, marginBottom: 2},
  h2: {fontSize: FontSize.md, fontWeight: '700', color: '#1e293b', marginTop: 6, marginBottom: 2},
  h3: {fontSize: FontSize.sm, fontWeight: '700', color: '#1e293b', marginTop: 4, marginBottom: 2},
  p:  {fontSize: FontSize.sm, color: '#374151', lineHeight: 21},
  listRow: {flexDirection: 'row', gap: 7, alignItems: 'flex-start'},
  bullet: {fontSize: FontSize.sm, color: Colors.textMuted, minWidth: 16},
  listText: {flex: 1, fontSize: FontSize.sm, color: '#374151', lineHeight: 21},
  quoteBlock: {
    borderLeftWidth: 3,
    borderLeftColor: Colors.border,
    paddingLeft: 10,
    marginVertical: 2,
  },
  quoteText: {fontSize: FontSize.sm, color: Colors.textMuted, fontStyle: 'italic', lineHeight: 20},
});

// ─── Value type classification ────────────────────────────────────────────────
type VType = 'dollar' | 'multiplier' | 'percent' | 'months' | 'sqft' | 'bool' | 'text' | 'count';

const VALUE_COLORS: Record<VType, string> = {
  dollar:     '#10b981',
  multiplier: '#667eea',
  percent:    '#7c3aed',
  months:     '#ea580c',
  sqft:       '#059669',
  count:      '#374151',
  bool:       '#374151',
  text:       '#374151',
};

function classifyKey(key: string): VType {
  const k = key.toLowerCase();
  if (/price|charge|rate|minimum|cost|fee|amount|surcharge/.test(k)) {return 'dollar';}
  if (/multiplier|factor|ratio/.test(k)) {return 'multiplier';}
  if (/percent|pct|percentage/.test(k)) {return 'percent';}
  if (/months|month/.test(k)) {return 'months';}
  if (/sqft|squarefeet|squarefoot/.test(k)) {return 'sqft';}
  return 'count';
}

function formatPrimitive(key: string, value: unknown): {display: string; unit: string; vtype: VType} {
  if (typeof value === 'boolean') {return {display: value ? 'Yes' : 'No', unit: '', vtype: 'bool'};}
  if (typeof value === 'string')  {return {display: value, unit: '', vtype: 'text'};}
  if (typeof value !== 'number')  {return {display: String(value), unit: '', vtype: 'text'};}
  const vtype = classifyKey(key);
  switch (vtype) {
    case 'dollar':     return {display: `$${value.toFixed(2)}`, unit: 'per visit',  vtype};
    case 'multiplier': return {display: `${value}×`,            unit: 'multiplier', vtype};
    case 'percent':    return {display: `${value}%`,            unit: 'percent',    vtype};
    case 'months':     return {display: String(value),          unit: 'months',     vtype};
    case 'sqft':       return {display: String(value),          unit: 'sq ft',      vtype};
    default:           return {display: String(value),          unit: '',           vtype: 'count'};
  }
}

// ─── Section / field types ────────────────────────────────────────────────────
type FieldEntry = {key: string; label: string; display: string; unit: string; vtype: VType};
type Section    = {sectionKey: string; title: string; icon: string; fields: FieldEntry[]; subsections: Section[]};

const SECTION_ICONS: Record<string, string> = {
  windowPricingBothSidesIncluded:       'apps-outline',
  installPricing:                       'flash-outline',
  minimumChargePerVisit:                'cash-outline',
  tripCharges:                          'flash-outline',
  frequencyPriceMultipliers:            'refresh-outline',
  frequencyMetadata:                    'calendar-outline',
  installationMultipliers:              'flash-outline',
  unitPricing:                          'resize-outline',
  minimums:                             'cash-outline',
  variants:                             'star-outline',
  standardFull:                         'star-outline',
  noSealant:                            'water-outline',
  wellMaintained:                       'sparkles-outline',
  standardRates:                        'water-outline',
  volumePricing:                        'bar-chart-outline',
  greaseTrapPricing:                    'flask-outline',
  greenDrainPricing:                    'leaf-outline',
  addOns:                               'add-outline',
  basicRates:                           'brush-outline',
  hugeBathroomPricing:                  'home-outline',
  extraAreaPricing:                     'business-outline',
  standalonePricingWithoutSaniClean:    'star-outline',
  baseRates:                            'time-outline',
  shortJobPricing:                      'flash-outline',
  serviceMultipliers:                   'close-outline',
  monthlyConversions:                   'calendar-outline',
  dustingVacuumingOptions:              'brush-outline',
  smoothBreakdown:                      'bar-chart-outline',
  geographicPricing:                    'location-outline',
  insideBeltway:                        'location-outline',
  outsideBeltway:                       'trail-sign-outline',
  allInclusivePackagePricing:           'cube-outline',
  smallBathroomMinimums:                'storefront-outline',
  soapUpgradePricing:                   'sparkles-outline',
  warrantyCredits:                      'ticket-outline',
  includedItems:                        'checkmark-outline',
  monthlyAddOnSupplyPricing:            'clipboard-outline',
  microfiberMoppingAddon:               'brush-outline',
  corePricingIncludedWithSaniClean:     'trash-outline',
  extraBagPricing:                      'bag-outline',
  bathroomPricing:                      'water-outline',
  nonBathroomPricing:                   'business-outline',
  serviceFrequencies:                   'calendar-outline',
  discountsAndFees:                     'ticket-outline',
  coreRates:                            'cash-outline',
  areaSpecificPricing:                  'restaurant-outline',
  squareFootagePricing:                 'resize-outline',
  rateCategories:                       'bar-chart-outline',
  __root__:                             'settings-outline',
};

function getSectionIcon(key: string): string {
  return SECTION_ICONS[key] ?? 'layers-outline';
}

function buildSections(obj: Record<string, unknown>): Section[] {
  const sections: Section[] = [];
  for (const [key, value] of Object.entries(obj)) {
    if (value === null || value === undefined) {continue;}
    if (typeof value === 'object' && !Array.isArray(value)) {
      const inner = value as Record<string, unknown>;
      const fields: FieldEntry[] = [];
      const subsections: Section[] = [];
      for (const [subKey, subVal] of Object.entries(inner)) {
        if (subVal === null || subVal === undefined) {continue;}
        if (typeof subVal === 'object' && !Array.isArray(subVal)) {
          subsections.push(...buildSections({[subKey]: subVal}));
        } else if (!Array.isArray(subVal)) {
          const {display, unit, vtype} = formatPrimitive(subKey, subVal);
          fields.push({key: subKey, label: camelToLabel(subKey), display, unit, vtype});
        }
      }
      sections.push({sectionKey: key, title: camelToLabel(key), icon: getSectionIcon(key), fields, subsections});
    } else if (!Array.isArray(value)) {
      const {display, unit, vtype} = formatPrimitive(key, value);
      const entry: FieldEntry = {key, label: camelToLabel(key), display, unit, vtype};
      const existing = sections.find(s => s.sectionKey === '__root__');
      if (existing) {existing.fields.push(entry);}
      else {sections.unshift({sectionKey: '__root__', title: 'General', icon: 'settings-outline', fields: [entry], subsections: []});}
    }
  }
  return sections;
}

// ─── FieldRow ─────────────────────────────────────────────────────────────────
function FieldRow({label, display, unit, vtype}: FieldEntry) {
  return (
    <View style={fieldStyles.row}>
      <Text style={fieldStyles.label}>{label}</Text>
      <View style={fieldStyles.right}>
        <Text style={[fieldStyles.value, {color: VALUE_COLORS[vtype]}]}>{display}</Text>
        {unit ? <Text style={fieldStyles.unit}>{unit}</Text> : null}
      </View>
    </View>
  );
}

const fieldStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.sm,
  },
  label: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.textPrimary,
    flex: 1,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 0,
  },
  value: {
    fontSize: FontSize.md,
    fontWeight: '700',
    textAlign: 'right',
  },
  unit: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
  },
});

// ─── SubSection ───────────────────────────────────────────────────────────────
function SubSection({section}: {section: Section}) {
  const [open, setOpen] = useState(true);
  if (section.fields.length === 0 && section.subsections.length === 0) {return null;}
  return (
    <View style={subStyles.container}>
      <TouchableOpacity style={subStyles.toggle} onPress={() => setOpen(o => !o)} activeOpacity={0.7}>
        <Ionicons name={section.icon} size={13} color="#9ca3af" />
        <Text style={subStyles.title}>{section.title.toUpperCase()}</Text>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={11} color="#9ca3af" style={subStyles.chevron} />
      </TouchableOpacity>
      {open && (
        <View style={subStyles.body}>
          {section.fields.map(f => <FieldRow key={f.key} {...f} />)}
          {section.subsections.map(sub => <SubSection key={sub.sectionKey} section={sub} />)}
        </View>
      )}
    </View>
  );
}

const subStyles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    overflow: 'hidden',
    backgroundColor: Colors.surface,
    marginTop: 4,
  },
  toggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: Spacing.md,
    backgroundColor: '#f9fafb',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  title: {
    flex: 1,
    fontSize: 11,
    fontWeight: '700',
    color: '#374151',
    letterSpacing: 0.4,
  },
  chevron: {marginLeft: 'auto' as any},
  body: {
    padding: Spacing.sm,
    gap: Spacing.xs,
  },
});

// ─── ServiceReferenceCard ─────────────────────────────────────────────────────
function ServiceReferenceCard({config}: {config: ServiceConfig}) {
  const [expanded, setExpanded] = useState(false);
  const [activeSection, setActiveSection] = useState<string | null>(null);

  const meta = SERVICE_META[config.serviceId] ?? FALLBACK_META;
  const sections = useMemo(() => buildSections(config.config ?? {}), [config.config]);

  // "__desc__" synthetic tab — only added when a description exists
  const hasDescription = Boolean(config.description);
  const allTabs = useMemo(() => {
    if (!hasDescription) {return sections;}
    return [
      {sectionKey: '__desc__', title: 'Description', icon: 'document-text-outline', fields: [], subsections: []},
      ...sections,
    ];
  }, [sections, hasDescription]);

  const activeKey = activeSection ?? allTabs[0]?.sectionKey ?? null;
  const activeSecObj = sections.find(s => s.sectionKey === activeKey) ?? sections[0];

  // Plain-text preview for the strip below the header
  const descPreview = useMemo(
    () => (config.description ? htmlToPreview(config.description) : ''),
    [config.description],
  );

  return (
    <View style={[cardStyles.card, expanded && cardStyles.cardOpen]}>
      {/* Header */}
      <TouchableOpacity
        style={[cardStyles.header, {borderLeftColor: meta.color}]}
        onPress={() => setExpanded(e => !e)}
        activeOpacity={0.8}>
        {/* Icon badge */}
        <View style={[cardStyles.iconWrap, {backgroundColor: meta.bg}]}>
          <Ionicons name={meta.icon} size={18} color={meta.color} />
        </View>

        {/* Name + ID */}
        <View style={cardStyles.titles}>
          <Text style={cardStyles.name} numberOfLines={1}>
            {config.label || config.serviceId}
          </Text>
          <Text style={cardStyles.id}>{config.serviceId}</Text>
        </View>

        {/* Active badge + chevron */}
        <View style={cardStyles.headerRight}>
          <View style={[cardStyles.activeBadge, !config.isActive && cardStyles.inactiveBadge]}>
            <View style={[cardStyles.dot, !config.isActive && cardStyles.dotInactive]} />
            <Text style={[cardStyles.badgeText, !config.isActive && cardStyles.inactiveBadgeText]}>
              {config.isActive ? 'Active' : 'Inactive'}
            </Text>
          </View>
          <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={14} color={meta.color} />
        </View>
      </TouchableOpacity>

      {/* Tags row */}
      {config.tags && config.tags.length > 0 && (
        <View style={cardStyles.tagsRow}>
          {config.version ? (
            <View style={cardStyles.versionBadge}>
              <Text style={cardStyles.versionText}>v{config.version}</Text>
            </View>
          ) : null}
          {config.tags.map(t => (
            <View key={t} style={cardStyles.tag}>
              <Text style={cardStyles.tagText}>{t}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Description strip — plain-text preview, always visible */}
      {descPreview ? (
        <View style={cardStyles.descStrip}>
          <Ionicons name="information-circle-outline" size={14} color="#93c5fd" />
          <Text style={cardStyles.descText} numberOfLines={2}>{descPreview}</Text>
        </View>
      ) : null}

      {/* Expanded body */}
      {expanded && (
        <View style={cardStyles.body}>
          {allTabs.length === 0 ? (
            <Text style={cardStyles.emptyText}>No pricing configuration available.</Text>
          ) : (
            <>
              {/* Tab strip */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={cardStyles.tabStrip}
                contentContainerStyle={cardStyles.tabStripContent}>
                {allTabs.map(s => {
                  const isActive = activeKey === s.sectionKey;
                  return (
                    <TouchableOpacity
                      key={s.sectionKey}
                      style={[cardStyles.tab, isActive && {backgroundColor: meta.color, borderColor: meta.color}]}
                      onPress={() => setActiveSection(s.sectionKey)}
                      activeOpacity={0.7}>
                      <Ionicons name={s.icon} size={12} color={isActive ? '#fff' : '#6b7280'} />
                      <Text style={[cardStyles.tabText, isActive && cardStyles.tabTextActive]}>
                        {s.title}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {/* Description tab body */}
              {activeKey === '__desc__' ? (
                <View style={cardStyles.sectionBody}>
                  <View style={cardStyles.descCard}>
                    <RichTextView html={config.description!} />
                  </View>
                </View>
              ) : (
                /* Pricing section fields */
                activeSecObj ? (
                  <View style={cardStyles.sectionBody}>
                    {activeSecObj.fields.map(f => <FieldRow key={f.key} {...f} />)}
                    {activeSecObj.subsections.map(sub => (
                      <SubSection key={sub.sectionKey} section={sub} />
                    ))}
                    {activeSecObj.fields.length === 0 && activeSecObj.subsections.length === 0 && (
                      <Text style={cardStyles.emptyText}>No fields in this section.</Text>
                    )}
                  </View>
                ) : null
              )}
            </>
          )}

          {/* ── Images gallery ── */}
          {config.images && config.images.length > 0 && (
            <View style={cardStyles.mediaSection}>
              <View style={cardStyles.mediaSectionHeader}>
                <Ionicons name="image-outline" size={13} color="#9ca3af" />
                <Text style={cardStyles.mediaSectionTitle}>IMAGES</Text>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={cardStyles.imageRow}>
                {config.images.map((img, idx) => (
                  <View key={idx} style={cardStyles.imageCard}>
                    <Image source={{uri: img.url}} style={cardStyles.imageThumb} resizeMode="cover" />
                    {img.caption ? <Text style={cardStyles.imageCaption} numberOfLines={1}>{img.caption}</Text> : null}
                  </View>
                ))}
              </ScrollView>
            </View>
          )}

          {/* ── Links ── */}
          {config.links && config.links.length > 0 && (
            <View style={cardStyles.mediaSection}>
              <View style={cardStyles.mediaSectionHeader}>
                <Ionicons name="link-outline" size={13} color="#9ca3af" />
                <Text style={cardStyles.mediaSectionTitle}>LINKS</Text>
              </View>
              <View style={cardStyles.linksList}>
                {config.links.map((link, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={cardStyles.linkItem}
                    onPress={() => Linking.openURL(link.url)}
                    activeOpacity={0.7}>
                    <Ionicons name="open-outline" size={13} color="#2563eb" />
                    <Text style={cardStyles.linkLabel} numberOfLines={1}>{link.label}</Text>
                    <Ionicons name="chevron-forward" size={12} color="#9ca3af" style={{marginLeft: 'auto' as any}} />
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const cardStyles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: Radius.xl,
    overflow: 'hidden',
  },
  cardOpen: {
    borderColor: '#2563eb',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
    borderLeftWidth: 4,
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  titles: {flex: 1, gap: 2, minWidth: 0},
  name: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  id: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 0,
  },
  activeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#d1fae5',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: Radius.full,
  },
  inactiveBadge: {backgroundColor: '#f1f5f9'},
  dot: {width: 6, height: 6, borderRadius: 3, backgroundColor: '#10b981'},
  dotInactive: {backgroundColor: '#9ca3af'},
  badgeText: {fontSize: 10, fontWeight: '700', color: '#065f46'},
  inactiveBadgeText: {color: '#6b7280'},
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  versionBadge: {
    backgroundColor: '#dbeafe',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: Radius.full,
  },
  versionText: {fontSize: 10, fontWeight: '700', color: '#1d4ed8'},
  tag: {
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.full,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  tagText: {fontSize: 11, color: Colors.textSecondary, fontWeight: '500'},
  descStrip: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: '#f8fafc',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  descText: {
    flex: 1,
    fontSize: FontSize.sm,
    color: '#4b5563',
    lineHeight: 20,
  },
  body: {
    borderTopWidth: 2,
    borderTopColor: Colors.border,
    backgroundColor: '#f9fafb',
  },
  tabStrip: {
    backgroundColor: '#f9fafb',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    maxHeight: 52,
  },
  tabStripContent: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: 6,
    alignItems: 'center',
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 7,
    paddingHorizontal: 12,
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: Radius.md,
  },
  tabText: {fontSize: FontSize.xs, fontWeight: '600', color: '#6b7280'},
  tabTextActive: {color: '#fff'},
  sectionBody: {
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  descCard: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    padding: Spacing.md,
  },
  emptyText: {
    textAlign: 'center',
    padding: Spacing.xl,
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    fontStyle: 'italic',
  },
  mediaSection: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    backgroundColor: '#f9fafb',
  },
  mediaSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: Spacing.sm,
  },
  mediaSectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#374151',
    letterSpacing: 0.5,
  },
  imageRow: {
    gap: Spacing.sm,
    paddingBottom: 2,
  },
  imageCard: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    overflow: 'hidden',
    backgroundColor: Colors.surface,
    width: 130,
  },
  imageThumb: {
    width: 130,
    height: 86,
  },
  imageCaption: {
    fontSize: 11,
    color: '#6b7280',
    padding: 5,
    backgroundColor: '#f8fafc',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  linksList: {
    gap: Spacing.xs,
  },
  linkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: Spacing.sm,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
  },
  linkLabel: {
    flex: 1,
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: '#2563eb',
  },
});

// ─── Main export ──────────────────────────────────────────────────────────────
export function ServicesReferenceSection() {
  const [configs, setConfigs] = useState<ServiceConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');

  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) {setRefreshing(true);} else {setLoading(true);}
    const data = await pricingApi.getAllServiceConfigs();
    setConfigs(data ?? []);
    if (isRefresh) {setRefreshing(false);} else {setLoading(false);}
  }, []);

  useEffect(() => {fetchData();}, [fetchData]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) {return configs;}
    return configs.filter(c =>
      c.label?.toLowerCase().includes(q) ||
      c.serviceId.toLowerCase().includes(q) ||
      c.description?.toLowerCase().includes(q) ||
      c.tags?.some(t => t.toLowerCase().includes(q)),
    );
  }, [configs, search]);

  if (loading) {
    return (
      <View style={styles.skeletonWrap}>
        {[1, 2, 3].map(i => (
          <View key={i} style={styles.skeletonCard}>
            <View style={[styles.skeletonLine, {width: 38, height: 38, borderRadius: Radius.md}]} />
            <View style={{flex: 1, gap: 8}}>
              <View style={[styles.skeletonLine, {width: '55%', height: 14}]} />
              <View style={[styles.skeletonLine, {width: '35%', height: 11}]} />
            </View>
          </View>
        ))}
      </View>
    );
  }

  return (
    <FlatList
      data={filtered}
      keyExtractor={c => c._id}
      renderItem={({item}) => <ServiceReferenceCard config={item} />}
      ListHeaderComponent={
        <View style={styles.listHeader}>
          <View style={styles.searchRow}>
            <View style={styles.searchWrap}>
              <Ionicons name="search-outline" size={15} color="#9ca3af" style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search by name, ID, tag…"
                placeholderTextColor="#9ca3af"
                value={search}
                onChangeText={setSearch}
                autoCorrect={false}
                autoCapitalize="none"
              />
              {search.length > 0 && (
                <TouchableOpacity onPress={() => setSearch('')} activeOpacity={0.7} style={styles.clearBtn}>
                  <Ionicons name="close-circle" size={16} color="#9ca3af" />
                </TouchableOpacity>
              )}
            </View>
            <Text style={styles.countText}>{filtered.length}/{configs.length}</Text>
          </View>
        </View>
      }
      ListEmptyComponent={
        <View style={styles.empty}>
          <Ionicons name="search-outline" size={40} color={Colors.textMuted} />
          <Text style={styles.emptyText}>No services match "{search}"</Text>
        </View>
      }
      contentContainerStyle={styles.list}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => fetchData(true)}
          tintColor={Colors.primary}
          colors={[Colors.primary]}
        />
      }
      ItemSeparatorComponent={() => <View style={{height: Spacing.sm}} />}
    />
  );
}

const styles = StyleSheet.create({
  list: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: 40,
  },
  listHeader: {
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  searchWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.sm,
    height: 40,
  },
  searchIcon: {marginRight: 4},
  searchInput: {
    flex: 1,
    fontSize: FontSize.sm,
    color: Colors.textPrimary,
    paddingVertical: 0,
    height: 40,
  },
  clearBtn: {padding: 4},
  countText: {
    fontSize: FontSize.xs,
    fontWeight: '600',
    color: Colors.textMuted,
  },
  skeletonWrap: {
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  skeletonCard: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    gap: Spacing.md,
    alignItems: 'center',
  },
  skeletonLine: {backgroundColor: '#e5e7eb', borderRadius: 4},
  empty: {
    alignItems: 'center',
    paddingVertical: 56,
    gap: Spacing.sm,
  },
  emptyText: {
    fontSize: FontSize.md,
    color: Colors.textMuted,
    marginTop: Spacing.sm,
  },
});
