import React, {useCallback} from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
  Platform,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useSavedAgreements} from '../hooks/useSavedAgreements';
import {AgreementCard} from '../components/AgreementCard';
import {SavedFileGroup, FileType} from '../../../services/api/endpoints/agreements.api';
import {Colors} from '../../../theme/colors';
import {Spacing, Radius} from '../../../theme/spacing';
import {FontSize} from '../../../theme/typography';

// ─── Filter definitions ───────────────────────────────────────────────────────

const FILTERS = [
  {key: 'all', label: 'All'},
  {key: 'saved', label: 'Saved'},
  {key: 'draft', label: 'Draft'},
  {key: 'pending_approval', label: 'Pending'},
  {key: 'approved_salesman', label: 'Approved'},
  {key: 'finalized', label: 'Finalized'},
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function SearchBar({
  value,
  onChange,
}: {
  value: string;
  onChange: (t: string) => void;
}) {
  return (
    <View style={styles.searchRow}>
      <Ionicons name="search-outline" size={18} color={Colors.textMuted} />
      <TextInput
        style={styles.searchInput}
        placeholder="Search agreements..."
        placeholderTextColor={Colors.textMuted}
        value={value}
        onChangeText={onChange}
        autoCapitalize="none"
        autoCorrect={false}
        clearButtonMode="while-editing"
        returnKeyType="search"
      />
    </View>
  );
}

function FilterChips({
  active,
  onSelect,
}: {
  active: string;
  onSelect: (k: string) => void;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.filtersContent}
      style={styles.filtersRow}>
      {FILTERS.map(f => (
        <TouchableOpacity
          key={f.key}
          onPress={() => onSelect(f.key)}
          style={[styles.chip, f.key === active && styles.chipActive]}>
          <Text
            style={[styles.chipText, f.key === active && styles.chipTextActive]}>
            {f.label}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

function EmptyState({
  hasSearch,
  hasFilter,
  error,
  onRetry,
}: {
  hasSearch: boolean;
  hasFilter: boolean;
  error: string | null;
  onRetry: () => void;
}) {
  if (error) {
    return (
      <View style={styles.emptyState}>
        <Ionicons name="warning-outline" size={52} color={Colors.statusPending} />
        <Text style={styles.emptyTitle}>Connection Error</Text>
        <Text style={styles.emptySub}>{error}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={onRetry}>
          <Text style={styles.retryText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }
  if (hasSearch || hasFilter) {
    return (
      <View style={styles.emptyState}>
        <Ionicons name="search-outline" size={52} color={Colors.textMuted} />
        <Text style={styles.emptyTitle}>No Results</Text>
        <Text style={styles.emptySub}>Try a different search or filter</Text>
      </View>
    );
  }
  return (
    <View style={styles.emptyState}>
      <Ionicons name="documents-outline" size={52} color={Colors.textMuted} />
      <Text style={styles.emptyTitle}>No Agreements Yet</Text>
      <Text style={styles.emptySub}>
        Create your first agreement using the + tab
      </Text>
    </View>
  );
}

function SkeletonCard() {
  return (
    <View style={styles.skeletonCard}>
      <View style={styles.skeletonAvatar} />
      <View style={styles.skeletonMeta}>
        <View style={[styles.skeletonLine, {width: '70%'}]} />
        <View style={[styles.skeletonLine, {width: '45%', marginTop: 6}]} />
        <View style={[styles.skeletonLine, {width: '30%', marginTop: 6}]} />
      </View>
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export function SavedAgreementsScreen() {
  const insets = useSafeAreaInsets();
  const {
    agreements,
    loading,
    refreshing,
    apiError,
    total,
    hasMore,
    searchQuery,
    activeFilter,
    setSearchQuery,
    setActiveFilter,
    refresh,
    loadMore,
    deleteAgreement,
    deleteFile,
  } = useSavedAgreements();

  const handleDeleteAgreement = useCallback(
    async (agreement: SavedFileGroup) => {
      await deleteAgreement(agreement.id);
    },
    [deleteAgreement],
  );

  const handleDeleteFile = useCallback(
    async (fileId: string, agreementId: string, fileType: FileType) => {
      await deleteFile(fileId, agreementId, fileType);
    },
    [deleteFile],
  );

  const renderItem = useCallback(
    ({item}: {item: SavedFileGroup}) => (
      <AgreementCard
        agreement={item}
        onDelete={handleDeleteAgreement}
        onDeleteFile={handleDeleteFile}
        onRefresh={refresh}
      />
    ),
    [handleDeleteAgreement, handleDeleteFile, refresh],
  );

  const ListHeader = (
    <View>
      <View style={styles.searchContainer}>
        <SearchBar value={searchQuery} onChange={setSearchQuery} />
      </View>
      <FilterChips active={activeFilter} onSelect={setActiveFilter} />
      {!loading && (
        <Text style={styles.countText}>
          {total === 0
            ? 'No agreements'
            : `${total} agreements · ${agreements.reduce((s, a) => s + a.fileCount, 0)} files`}
        </Text>
      )}
    </View>
  );

  const ListFooter = hasMore ? (
    <TouchableOpacity style={styles.loadMoreBtn} onPress={loadMore}>
      <Text style={styles.loadMoreText}>Load More</Text>
    </TouchableOpacity>
  ) : null;

  return (
    <View style={[styles.screen, {paddingTop: insets.top}]}>
      {/* Sticky header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Saved Agreements</Text>
          {!loading && (
            <Text style={styles.headerSub}>
              {total} agreements
            </Text>
          )}
        </View>
        {refreshing && (
          <ActivityIndicator size="small" color={Colors.primary} />
        )}
      </View>

      {/* Skeleton loading state */}
      {loading && agreements.length === 0 ? (
        <View style={styles.skeletonList}>
          <View style={styles.searchContainer}>
            <View style={styles.skeletonSearch} />
          </View>
          <View style={styles.skeletonFiltersRow}>
            {[80, 60, 65, 70].map((w, i) => (
              <View key={i} style={[styles.skeletonChip, {width: w}]} />
            ))}
          </View>
          {[1, 2, 3, 4].map(i => (
            <SkeletonCard key={i} />
          ))}
        </View>
      ) : (
        <FlatList
          data={agreements}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          ListHeaderComponent={ListHeader}
          ListEmptyComponent={
            <EmptyState
              hasSearch={searchQuery.length > 0}
              hasFilter={activeFilter !== 'all'}
              error={apiError}
              onRetry={refresh}
            />
          }
          ListFooterComponent={ListFooter}
          contentContainerStyle={[
            styles.listContent,
            {paddingBottom: insets.bottom + 16},
          ]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={refresh}
              tintColor={Colors.primary}
              colors={[Colors.primary]}
            />
          }
          onEndReached={loadMore}
          onEndReachedThreshold={0.3}
        />
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const SKELETON_BG = '#e5e7eb';

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.background,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.surface,
    borderBottomWidth: 3,
    borderBottomColor: Colors.primary,   // brand red accent — matches webapp active nav
  },
  headerTitle: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.primary,               // webapp uses brand red for section titles
  },
  headerSub: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    marginTop: 2,
  },

  // Search
  searchContainer: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.md,
    paddingVertical: Platform.OS === 'ios' ? Spacing.md : Spacing.sm,
    gap: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: FontSize.md,
    color: Colors.textPrimary,
    padding: 0,
  },

  // Filter chips
  filtersRow: {
    paddingBottom: Spacing.sm,
  },
  filtersContent: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
  },
  chip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 7,
    borderRadius: Radius.full,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  chipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
    shadowColor: Colors.primary,
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  chipText: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  chipTextActive: {
    color: Colors.textWhite,
    fontWeight: '700',
  },

  // Count line — matches webapp "185 agreements · 47 files"
  countText: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.sm,
    fontWeight: '500',
  },

  // List — tight, like webapp table rows
  listContent: {
    paddingTop: Spacing.xs,
    paddingBottom: Spacing.sm,
  },

  // Load more
  loadMoreBtn: {
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.sm,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.primaryLight,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: '#fecaca',
    alignItems: 'center',
  },
  loadMoreText: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.primary,
  },

  // Empty state
  emptyState: {
    alignItems: 'center',
    paddingVertical: 64,
    paddingHorizontal: Spacing.xxxl,
    gap: Spacing.sm,
  },
  emptyTitle: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  emptySub: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
  retryBtn: {
    marginTop: Spacing.xl,
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.xxl,
    paddingVertical: Spacing.md,
    borderRadius: Radius.lg,
  },
  retryText: {
    color: Colors.textWhite,
    fontSize: FontSize.md,
    fontWeight: '600',
  },

  // Skeleton
  skeletonList: {
    flex: 1,
  },
  skeletonSearch: {
    height: 44,
    backgroundColor: SKELETON_BG,
    borderRadius: Radius.lg,
  },
  skeletonFiltersRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  skeletonChip: {
    height: 32,
    backgroundColor: SKELETON_BG,
    borderRadius: Radius.full,
  },
  skeletonCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  skeletonAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: SKELETON_BG,
  },
  skeletonMeta: {
    flex: 1,
  },
  skeletonLine: {
    height: 12,
    backgroundColor: SKELETON_BG,
    borderRadius: Radius.xs,
  },
});
