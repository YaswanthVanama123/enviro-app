import React, {useState, useEffect, useCallback} from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  StyleSheet,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {
  agreementsApi,
  SavedFileGroup,
  SavedFileListItem,
} from '../../../services/api/endpoints/agreements.api';
import {Colors} from '../../../theme/colors';
import {Spacing, Radius} from '../../../theme/spacing';
import {FontSize} from '../../../theme/typography';

interface EditHistoryItem {
  id: string;
  timestamp: string;
  changedBy: string;
  action: 'created' | 'edited' | 'version_added' | 'attachment_added';
  fileName?: string;
  fileType?: string;
}

function formatTimestamp(iso: string): string {
  if (!iso) return '—';
  const date = new Date(iso);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / 86400000);

  const timeStr = date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  if (diffDays === 0) return `Today at ${timeStr}`;
  if (diffDays === 1) return `Yesterday at ${timeStr}`;
  if (diffDays < 7) return `${diffDays} days ago at ${timeStr}`;

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  }) + ` at ${timeStr}`;
}

function getActionIcon(action: EditHistoryItem['action']): {name: string; color: string; bg: string} {
  switch (action) {
    case 'created':
      return {name: 'add-circle', color: '#16a34a', bg: '#dcfce7'};
    case 'edited':
      return {name: 'create', color: '#2563eb', bg: '#dbeafe'};
    case 'version_added':
      return {name: 'git-branch', color: '#7c3aed', bg: '#f3e8ff'};
    case 'attachment_added':
      return {name: 'attach', color: '#ea580c', bg: '#fff7ed'};
    default:
      return {name: 'ellipse', color: Colors.textMuted, bg: '#f1f5f9'};
  }
}

function getActionLabel(action: EditHistoryItem['action']): string {
  switch (action) {
    case 'created':
      return 'Created agreement';
    case 'edited':
      return 'Edited agreement';
    case 'version_added':
      return 'Added new version';
    case 'attachment_added':
      return 'Added attachment';
    default:
      return 'Modified';
  }
}

// Build edit history from agreement files
function buildEditHistory(agreement: SavedFileGroup): EditHistoryItem[] {
  const history: EditHistoryItem[] = [];

  // Sort files by creation date to find the original creation
  const sortedByCreation = [...agreement.files].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  // First file creation is the agreement creation
  if (sortedByCreation.length > 0) {
    const firstFile = sortedByCreation[0];
    history.push({
      id: `${firstFile.id}-created`,
      timestamp: firstFile.createdAt,
      changedBy: firstFile.createdBy || 'Unknown',
      action: 'created',
      fileName: firstFile.title || firstFile.fileName,
    });
  }

  // Collect all edits and additions
  agreement.files.forEach(file => {
    // If file was updated after creation, add edit entry
    if (file.updatedAt && file.updatedAt !== file.createdAt && file.updatedBy) {
      history.push({
        id: `${file.id}-edited-${file.updatedAt}`,
        timestamp: file.updatedAt,
        changedBy: file.updatedBy,
        action: 'edited',
        fileName: file.title || file.fileName,
        fileType: file.fileType,
      });
    }

    // Version PDFs added after initial file
    if (file.fileType === 'version_pdf' && file.createdBy) {
      const firstFileTime = sortedByCreation[0]?.createdAt;
      if (firstFileTime && file.createdAt !== firstFileTime) {
        history.push({
          id: `${file.id}-version`,
          timestamp: file.createdAt,
          changedBy: file.createdBy,
          action: 'version_added',
          fileName: `Version ${file.versionNumber || ''}`,
        });
      }
    }

    // Attachments
    if (file.fileType === 'attached_pdf' && file.createdBy) {
      history.push({
        id: `${file.id}-attached`,
        timestamp: file.createdAt,
        changedBy: file.createdBy,
        action: 'attachment_added',
        fileName: file.title || file.fileName,
      });
    }
  });

  // Sort by timestamp descending (most recent first), but keep creation at the bottom
  return history.sort((a, b) => {
    if (a.action === 'created') return 1;
    if (b.action === 'created') return -1;
    return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
  });
}

interface AgreementHistoryCardProps {
  agreement: SavedFileGroup;
}

function AgreementHistoryCard({agreement}: AgreementHistoryCardProps) {
  const [expanded, setExpanded] = useState(false);
  const history = buildEditHistory(agreement);

  // Get creator info
  const creationEntry = history.find(h => h.action === 'created');
  const createdBy = creationEntry?.changedBy || 'Unknown';
  const editCount = history.filter(h => h.action !== 'created').length;

  return (
    <View style={styles.card}>
      {/* Root - Agreement Header */}
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => setExpanded(p => !p)}
        style={styles.cardHeader}>
        <View style={[styles.folderBox, expanded && styles.folderBoxOpen]}>
          <Ionicons
            name={expanded ? 'folder-open' : 'folder'}
            size={22}
            color={Colors.primary}
          />
        </View>
        <View style={styles.cardInfo}>
          <Text style={styles.cardTitle} numberOfLines={1}>
            {agreement.agreementTitle}
          </Text>
          <View style={styles.cardMetaRow}>
            <View style={styles.creatorBadge}>
              <Ionicons name="person-add-outline" size={10} color="#16a34a" />
              <Text style={styles.creatorText}>Created by {createdBy}</Text>
            </View>
            {editCount > 0 && (
              <View style={styles.editCountBadge}>
                <Ionicons name="create-outline" size={10} color="#2563eb" />
                <Text style={styles.editCountText}>{editCount} edit{editCount !== 1 ? 's' : ''}</Text>
              </View>
            )}
          </View>
        </View>
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={18}
          color={expanded ? Colors.primary : Colors.textMuted}
        />
      </TouchableOpacity>

      {/* Expanded - Edit History */}
      {expanded && (
        <View style={styles.historyList}>
          <View style={styles.historyHeader}>
            <Ionicons name="time-outline" size={13} color={Colors.textMuted} />
            <Text style={styles.historyHeaderText}>Edit History</Text>
          </View>
          {history.length === 0 ? (
            <Text style={styles.noHistoryText}>No edit history available</Text>
          ) : (
            history.map((item, idx) => {
              const iconCfg = getActionIcon(item.action);
              const isLast = idx === history.length - 1;
              return (
                <View key={item.id} style={styles.historyItem}>
                  {/* Timeline connector */}
                  <View style={styles.timelineConnector}>
                    <View style={[styles.timelineDot, {backgroundColor: iconCfg.bg}]}>
                      <Ionicons name={iconCfg.name} size={12} color={iconCfg.color} />
                    </View>
                    {!isLast && <View style={styles.timelineLine} />}
                  </View>
                  {/* Content */}
                  <View style={styles.historyContent}>
                    <Text style={styles.historyAction}>{getActionLabel(item.action)}</Text>
                    {item.fileName && item.action !== 'created' && (
                      <Text style={styles.historyFileName} numberOfLines={1}>
                        {item.fileName}
                      </Text>
                    )}
                    <View style={styles.historyMeta}>
                      <Text style={styles.historyUser}>{item.changedBy}</Text>
                      <Text style={styles.historyTimestamp}>{formatTimestamp(item.timestamp)}</Text>
                    </View>
                  </View>
                </View>
              );
            })
          )}
        </View>
      )}
    </View>
  );
}

export function EditHistoryScreen() {
  const insets = useSafeAreaInsets();
  const [agreements, setAgreements] = useState<SavedFileGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchAgreements = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const result = await agreementsApi.getGrouped({
        page: 1,
        limit: 100,
        status: 'all',
        search: '',
        includeDeleted: false,
      });
      if (result?.groups) {
        setAgreements(result.groups);
      }
    } catch (err) {
      console.error('Failed to fetch agreements:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchAgreements();
  }, [fetchAgreements]);

  const filteredAgreements = agreements.filter(a =>
    a.agreementTitle.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderItem = useCallback(
    ({item}: {item: SavedFileGroup}) => <AgreementHistoryCard agreement={item} />,
    []
  );

  return (
    <View style={[styles.screen, {paddingTop: insets.top}]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Edit History</Text>
        <Text style={styles.headerSubtitle}>Track all agreement changes</Text>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <View style={styles.searchRow}>
          <Ionicons name="search-outline" size={18} color={Colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search agreements..."
            placeholderTextColor={Colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color={Colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading history...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredAgreements}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          ListHeaderComponent={
            <Text style={styles.countText}>
              {filteredAgreements.length} agreement{filteredAgreements.length !== 1 ? 's' : ''}
            </Text>
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="documents-outline" size={52} color={Colors.textMuted} />
              <Text style={styles.emptyTitle}>
                {searchQuery ? 'No Results' : 'No Agreements'}
              </Text>
              <Text style={styles.emptySub}>
                {searchQuery
                  ? 'Try a different search term'
                  : 'Agreement history will appear here'}
              </Text>
            </View>
          }
          contentContainerStyle={[
            styles.listContent,
            {paddingBottom: insets.bottom + 16},
          ]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchAgreements(true)}
              tintColor={Colors.primary}
              colors={[Colors.primary]}
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTitle: {
    fontSize: FontSize.xl,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  headerSubtitle: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    marginTop: 2,
  },
  searchContainer: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: FontSize.md,
    color: Colors.textPrimary,
    padding: 0,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.md,
  },
  loadingText: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
  },
  countText: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
    fontWeight: '500',
  },
  listContent: {
    paddingTop: Spacing.sm,
  },
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
    marginTop: Spacing.sm,
  },
  emptySub: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    textAlign: 'center',
  },

  // Card styles
  card: {
    backgroundColor: Colors.surface,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    gap: Spacing.md,
  },
  folderBox: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  folderBoxOpen: {
    backgroundColor: '#fecaca',
  },
  cardInfo: {
    flex: 1,
    minWidth: 0,
  },
  cardTitle: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  cardMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  creatorBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#dcfce7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.xs,
  },
  creatorText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#16a34a',
  },
  editCountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#dbeafe',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.xs,
  },
  editCountText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#2563eb',
  },

  // History list styles
  historyList: {
    backgroundColor: '#f8fafc',
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  historyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: '#f1f5f9',
  },
  historyHeaderText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textMuted,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  noHistoryText: {
    textAlign: 'center',
    color: Colors.textMuted,
    fontSize: FontSize.sm,
    paddingVertical: Spacing.lg,
  },
  historyItem: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  timelineConnector: {
    width: 32,
    alignItems: 'center',
  },
  timelineDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timelineLine: {
    flex: 1,
    width: 2,
    backgroundColor: Colors.borderLight,
    marginTop: 4,
  },
  historyContent: {
    flex: 1,
    paddingLeft: Spacing.sm,
    paddingBottom: Spacing.sm,
  },
  historyAction: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  historyFileName: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  historyMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  historyUser: {
    fontSize: FontSize.xs,
    fontWeight: '600',
    color: Colors.primary,
  },
  historyTimestamp: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
  },
});
