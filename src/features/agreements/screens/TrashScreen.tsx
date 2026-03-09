import React, {useCallback} from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  RefreshControl,
  StyleSheet,
  Platform,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import {useTrash} from '../hooks/useTrash';
import {TrashCard} from '../components/TrashCard';
import {SavedFileGroup, FileType} from '../../../services/api/endpoints/agreements.api';
import {Colors} from '../../../theme/colors';
import {Spacing, Radius} from '../../../theme/spacing';
import {FontSize} from '../../../theme/typography';

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
        placeholder="Search trash..."
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

function EmptyState({
  hasSearch,
  error,
  onRetry,
}: {
  hasSearch: boolean;
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
  if (hasSearch) {
    return (
      <View style={styles.emptyState}>
        <Ionicons name="search-outline" size={52} color={Colors.textMuted} />
        <Text style={styles.emptyTitle}>No Results</Text>
        <Text style={styles.emptySub}>Try a different search</Text>
      </View>
    );
  }
  return (
    <View style={styles.emptyState}>
      <Ionicons name="trash-outline" size={52} color={Colors.textMuted} />
      <Text style={styles.emptyTitle}>Trash is Empty</Text>
      <Text style={styles.emptySub}>
        Deleted agreements and files will appear here
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

export function TrashScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const {
    agreements,
    loading,
    refreshing,
    apiError,
    total,
    hasMore,
    searchQuery,
    setSearchQuery,
    refresh,
    loadMore,
    restoreAgreement,
    restoreFile,
    permanentlyDeleteAgreement,
    permanentlyDeleteFile,
  } = useTrash();

  const handleRestore = useCallback(
    async (id: string) => {
      await restoreAgreement(id);
    },
    [restoreAgreement],
  );

  const handleRestoreFile = useCallback(
    async (fileId: string, agreementId: string, fileType: FileType) => {
      await restoreFile(fileId, agreementId, fileType);
    },
    [restoreFile],
  );

  const handlePermanentDelete = useCallback(
    async (id: string) => {
      await permanentlyDeleteAgreement(id);
    },
    [permanentlyDeleteAgreement],
  );

  const handlePermanentDeleteFile = useCallback(
    async (fileId: string, agreementId: string, fileType: FileType) => {
      await permanentlyDeleteFile(fileId, agreementId, fileType);
    },
    [permanentlyDeleteFile],
  );

  const renderItem = useCallback(
    ({item}: {item: SavedFileGroup}) => (
      <TrashCard
        agreement={item}
        onRestore={handleRestore}
        onRestoreFile={handleRestoreFile}
        onPermanentDelete={handlePermanentDelete}
        onPermanentDeleteFile={handlePermanentDeleteFile}
      />
    ),
    [handleRestore, handleRestoreFile, handlePermanentDelete, handlePermanentDeleteFile],
  );

  const ListFooter = hasMore ? (
    <TouchableOpacity style={styles.loadMoreBtn} onPress={loadMore}>
      <Text style={styles.loadMoreText}>Load More</Text>
    </TouchableOpacity>
  ) : null;

  return (
    <View style={[styles.screen, {paddingTop: insets.top}]}>
      {/* Back header */}
      <View style={styles.backHeader}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
          <Ionicons name="chevron-back" size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.backHeaderTitle}>Trash</Text>
      </View>

      {/* Sticky search */}
      <View style={styles.stickyTop}>
        <View style={styles.searchContainer}>
          <SearchBar value={searchQuery} onChange={setSearchQuery} />
        </View>
      </View>

      {/* Skeleton loading state */}
      {loading && agreements.length === 0 ? (
        <View style={styles.skeletonList}>
          {[1, 2, 3, 4].map(i => (
            <SkeletonCard key={i} />
          ))}
        </View>
      ) : (
        <FlatList
          data={agreements}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          ListHeaderComponent={
            !loading ? (
              <Text style={styles.countText}>
                {total === 0
                  ? 'Trash is empty'
                  : `${total} deleted ${total === 1 ? 'agreement' : 'agreements'}`}
              </Text>
            ) : null
          }
          ListEmptyComponent={
            <EmptyState
              hasSearch={searchQuery.length > 0}
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

  // Back header
  backHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: Spacing.sm,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backHeaderTitle: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Colors.textPrimary,
  },

  // Sticky top bar
  stickyTop: {
    backgroundColor: Colors.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
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

  // Count line
  countText: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.sm,
    fontWeight: '500',
  },

  // List
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
    width: 38,
    height: 38,
    borderRadius: Radius.md,
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
